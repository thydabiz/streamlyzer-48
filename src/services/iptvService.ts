
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

export const authenticateXtream = async (credentials: XtreamCredentials) => {
  try {
    let url = credentials.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    url = url.replace(/\/$/, '');

    const { data, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url,
        username: credentials.username,
        password: credentials.password
      }
    });

    if (error) throw new Error(error.message || 'Failed to authenticate with IPTV provider');
    if (!data || !data.success) throw new Error(data?.error || 'Failed to authenticate with IPTV provider');

    await saveStreamCredentials({
      url,
      username: credentials.username,
      password: credentials.password
    });

    return data.data;
  } catch (error) {
    toast.error(error.message || 'Failed to authenticate with IPTV provider');
    throw error;
  }
};

export const getStoredCredentials = async () => {
  try {
    const { data, error } = await supabase
      .from('stream_credentials')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

export const saveStreamCredentials = async (credentials: XtreamCredentials) => {
  try {
    const { error } = await supabase
      .from('stream_credentials')
      .upsert({
        type: 'xtream',
        url: credentials.url.replace(/\/$/, ''),
        username: credentials.username,
        password: credentials.password,
        mac_address: null,
        serial_number: null
      });

    if (error) throw error;
    toast.success('Credentials saved successfully');
  } catch (error) {
    toast.error('Failed to save credentials');
    throw error;
  }
};

export const getEPGSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('epg_settings')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data ?? { refresh_days: 7, last_refresh: null };
  } catch (error) {
    throw error;
  }
};

export const saveEPGSettings = async (refreshDays: number) => {
  try {
    const { error } = await supabase
      .from('epg_settings')
      .upsert({
        refresh_days: refreshDays,
        last_refresh: new Date().toISOString()
      });

    if (error) throw error;
    toast.success('EPG settings updated');
  } catch (error) {
    toast.error('Failed to save EPG settings');
    throw error;
  }
};

export const startEPGRefreshMonitoring = async () => {
  try {
    const settings = await getEPGSettings();
    const refreshMs = settings.refresh_days * 24 * 60 * 60 * 1000;
    
    if (window.epgRefreshInterval) {
      clearInterval(window.epgRefreshInterval);
    }

    window.epgRefreshInterval = window.setInterval(async () => {
      const { data } = await supabase
        .from('epg_settings')
        .select('last_refresh')
        .maybeSingle();

      if (!data?.last_refresh) {
        await refreshEPGData();
        return;
      }

      const lastRefresh = new Date(data.last_refresh);
      const now = new Date();
      const diffMs = now.getTime() - lastRefresh.getTime();

      if (diffMs >= refreshMs) {
        await refreshEPGData();
      }
    }, 60000);
  } catch (error) {
    throw error;
  }
};

export const refreshEPGData = async () => {
  try {
    const credentials = await getStoredCredentials();
    if (!credentials) {
      throw new Error('No stream credentials found');
    }

    await supabase
      .from('epg_settings')
      .upsert({
        last_refresh: new Date().toISOString()
      });

    toast.success('EPG data refreshed');
  } catch (error) {
    toast.error('Failed to refresh EPG data');
    throw error;
  }
};

// Add TypeScript declaration for the global window object
declare global {
  interface Window {
    epgRefreshInterval?: number;
  }
}
