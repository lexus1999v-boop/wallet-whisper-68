import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { AuthForm } from '@/components/AuthForm';
import { FinanceTracker } from '@/components/FinanceTracker';
import { AdminPanel } from '@/components/AdminPanel';
import { AnalyticsIntegration } from '@/components/AnalyticsIntegration';
import { useUserRole } from '@/hooks/useUserRole';
import { useSessionTracking } from '@/hooks/useSessionTracking';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  
  const { role, loading: roleLoading, isAdmin } = useUserRole(user);
  
  // Track user sessions
  useSessionTracking(user);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthForm onSuccess={() => {}} />
        <AnalyticsIntegration />
      </>
    );
  }

  if (showAdmin && isAdmin) {
    return (
      <>
        <AdminPanel user={user} onBack={() => setShowAdmin(false)} />
        <AnalyticsIntegration />
      </>
    );
  }

  return (
    <>
      <FinanceTracker 
        user={user} 
        isAdmin={isAdmin}
        onShowAdmin={() => setShowAdmin(true)}
      />
      <AnalyticsIntegration />
    </>
  );
};

export default Index;
