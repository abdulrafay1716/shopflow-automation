import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SiteSettings } from '@/types';

export function DiscountTicker() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('site_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .single();

    if (!error && data) {
      setSettings(data as SiteSettings);
    }
  };

  if (!settings?.ticker_enabled || !settings?.ticker_text) {
    return null;
  }

  return (
    <div className="ticker-wrapper py-2">
      <div className="ticker-content text-sm font-medium text-primary-foreground">
        <span className="inline-block px-8">
          {settings.ticker_text}
        </span>
        <span className="inline-block px-8">
          {settings.ticker_text}
        </span>
        <span className="inline-block px-8">
          {settings.ticker_text}
        </span>
      </div>
    </div>
  );
}
