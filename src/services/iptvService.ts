
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database';
import type { StreamCredentials } from '@/types/auth';

type StreamCreds = Database['public']['Tables']['stream_credentials']['Insert'];
type EPGSettings = Database['public']['Tables']['epg_settings']['Insert'];

export const saveStreamCredentials = async (credentials: StreamCredentials) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('stream_credentials')
    .upsert({
      user_id: user.id,
      type: credentials.type,
      url: credentials.url,
      username: credentials.username,
      password: credentials.password,
      mac_address: credentials.macAddress,
      serial_number: credentials.serialNumber,
    });

  if (error) throw error;
};

export const getStreamCredentials = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('stream_credentials')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
};

export const saveEPGSettings = async (refreshDays: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('epg_settings')
    .upsert({
      user_id: user.id,
      refresh_days: refreshDays,
      last_refresh: new Date().toISOString(),
    });

  if (error) throw error;
};

export const getEPGSettings = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('epg_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? { refresh_days: 7 };
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
        .single();

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const credentials = await getStreamCredentials();
    if (!credentials) throw new Error('No stream credentials found');

    // Update last refresh time
    await supabase
      .from('epg_settings')
      .upsert({
        user_id: user.id,
        last_refresh: new Date().toISOString(),
      });

    // TODO: Implement actual EPG data fetching based on provider type
    // This will vary based on whether it's Xtream, M3U, or MAC

  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    throw error;
  }
};
