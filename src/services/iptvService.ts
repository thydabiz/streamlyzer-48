
import { supabase } from '@/integrations/supabase/client';

interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

export const authenticateXtream = async (credentials: XtreamCredentials) => {
  const { data, error } = await supabase.functions.invoke('xtream-auth', {
    body: credentials
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);

  return data.data;
};

export const getStoredCredentials = async () => {
  const { data, error } = await supabase
    .from('stream_credentials')
    .select('*')
    .maybeSingle();  // Changed from .single() to .maybeSingle()

  if (error) throw error;
  return data;
};

export const saveStreamCredentials = async (credentials: XtreamCredentials) => {
  const { error } = await supabase
    .from('stream_credentials')
    .upsert({
      type: 'xtream',
      url: credentials.url,
      encrypted_username: credentials.username,  // Updated to match new schema
      encrypted_password: credentials.password   // Updated to match new schema
    }, {
      onConflict: 'type'  // Since we only want one set of credentials
    });

  if (error) throw error;
};

export const getEPGSettings = async () => {
  const { data, error } = await supabase
    .from('epg_settings')
    .select('*')
    .maybeSingle();  // Changed from .single() to .maybeSingle()

  if (error) throw error;
  return data ?? { refresh_days: 7 };
};

export const saveEPGSettings = async (refreshDays: number) => {
  const { error } = await supabase
    .from('epg_settings')
    .upsert({
      refresh_days: refreshDays,
      last_refresh: new Date().toISOString()
    }, {
      onConflict: 'id'
    });

  if (error) throw error;
};

let epgRefreshInterval: number;

export const startEPGRefreshMonitoring = async () => {
  const settings = await getEPGSettings();
  const refreshMs = settings.refresh_days * 24 * 60 * 60 * 1000;

  // Clear existing interval if any
  if (epgRefreshInterval) {
    clearInterval(epgRefreshInterval);
  }

  // Set up new interval
  epgRefreshInterval = window.setInterval(async () => {
    try {
      // Check if refresh is needed
      const { data } = await supabase
        .from('epg_settings')
        .select('last_refresh')
        .maybeSingle();  // Changed from .single() to .maybeSingle()

      if (!data?.last_refresh) return;

      const lastRefresh = new Date(data.last_refresh);
      const now = new Date();
      const diffMs = now.getTime() - lastRefresh.getTime();

      if (diffMs >= refreshMs) {
        // Trigger EPG refresh
        await refreshEPGData();
      }
    } catch (error) {
      console.error('Error checking EPG refresh:', error);
    }
  }, 60000); // Check every minute
};

export const refreshEPGData = async () => {
  try {
    const credentials = await getStoredCredentials();
    if (!credentials) throw new Error('No stream credentials found');

    // Update last refresh time
    await supabase
      .from('epg_settings')
      .upsert({
        last_refresh: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    // TODO: Implement actual EPG data fetching based on provider type
    console.log('Refreshing EPG data...');

  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    throw error;
  }
};
