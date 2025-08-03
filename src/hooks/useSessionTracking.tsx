import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useSessionTracking = (user: User | null) => {
  const sessionIdRef = useRef<string | null>(null);
  const loginTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!user) {
      // Log out session if user becomes null
      if (sessionIdRef.current && loginTimeRef.current) {
        logLogout();
      }
      return;
    }

    // Start new session when user logs in
    logLogin();

    // Cleanup function to log logout
    return () => {
      if (sessionIdRef.current && loginTimeRef.current) {
        logLogout();
      }
    };
  }, [user]);

  const logLogin = async () => {
    if (!user) return;

    try {
      loginTimeRef.current = new Date();
      
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          login_time: loginTimeRef.current.toISOString(),
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging session start:', error);
        return;
      }

      sessionIdRef.current = data.id;
    } catch (error) {
      console.error('Error logging session start:', error);
    }
  };

  const logLogout = async () => {
    if (!sessionIdRef.current || !loginTimeRef.current) return;

    try {
      const logoutTime = new Date();
      const sessionDuration = logoutTime.getTime() - loginTimeRef.current.getTime();

      await supabase
        .from('user_sessions')
        .update({
          logout_time: logoutTime.toISOString(),
          session_duration: `${Math.floor(sessionDuration / 1000)} seconds`,
        })
        .eq('id', sessionIdRef.current);

    } catch (error) {
      console.error('Error logging session end:', error);
    } finally {
      sessionIdRef.current = null;
      loginTimeRef.current = null;
    }
  };

  const getClientIP = async (): Promise<string | null> => {
    try {
      // This is a simple approach - in production you might want to use a more reliable service
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting client IP:', error);
      return null;
    }
  };

  return { logLogout };
};