import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsSetting {
  id: string;
  name: string;
  provider: string;
  tracking_id: string;
  script_url?: string;
  is_active: boolean;
}

export const AnalyticsIntegration = () => {
  useEffect(() => {
    const loadAnalyticsScripts = async () => {
      try {
        const { data: settings } = await supabase
          .from('analytics_settings')
          .select('*')
          .eq('is_active', true);

        if (!settings || settings.length === 0) return;

        settings.forEach((setting: AnalyticsSetting) => {
          if (setting.provider === 'yandex') {
            loadYandexMetrika(setting.tracking_id);
          } else if (setting.provider === 'google') {
            loadGoogleAnalytics(setting.tracking_id);
          } else if (setting.script_url) {
            loadCustomScript(setting.script_url, setting.tracking_id);
          }
        });
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
    };

    loadAnalyticsScripts();
  }, []);

  const loadYandexMetrika = (counterId: string) => {
    // Check if already loaded
    if (document.querySelector(`script[src*="mc.yandex.ru"]`)) return;

    // Create Yandex Metrika script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js';
    
    script.onload = () => {
      // Initialize Yandex Metrika
      const ymScript = document.createElement('script');
      ymScript.type = 'text/javascript';
      ymScript.innerHTML = `
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        ym(${counterId}, "init", {
          clickmap:true,
          trackLinks:true,
          accurateTrackBounce:true,
          webvisor:true
        });
      `;
      document.head.appendChild(ymScript);

      // Add noscript fallback
      const noscript = document.createElement('noscript');
      noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${counterId}" style="position:absolute; left:-9999px;" alt="" /></div>`;
      document.body.appendChild(noscript);
    };

    document.head.appendChild(script);
  };

  const loadGoogleAnalytics = (trackingId: string) => {
    // Check if already loaded
    if (document.querySelector(`script[src*="googletagmanager.com"]`)) return;

    // Create Google Analytics gtag script
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    document.head.appendChild(gtagScript);

    // Initialize Google Analytics
    const configScript = document.createElement('script');
    configScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${trackingId}');
    `;
    document.head.appendChild(configScript);
  };

  const loadCustomScript = (scriptUrl: string, trackingId: string) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${scriptUrl}"]`)) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = scriptUrl;
    script.setAttribute('data-tracking-id', trackingId);
    document.head.appendChild(script);
  };

  return null; // This component doesn't render anything
};