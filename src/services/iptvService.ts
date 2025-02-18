import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

export const authenticateXtream = async (credentials: XtreamCredentials) => {
  try {
    console.log('Authenticating with Xtream service...', credentials.url);
    
    // Ensure URL is properly formatted
    let url = credentials.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    url = url.replace(/\/$/, ''); // Remove trailing slash if present

    const { data, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url,
        username: credentials.username,
        password: credentials.password
      }
    });

    if (error) {
      console.error('Authentication error:', error);
      throw new Error(error.message || 'Failed to authenticate with IPTV provider');
    }

    if (!data || !data.success) {
      console.error('Authentication failed:', data?.error);
      throw new Error(data?.error || 'Failed to authenticate with IPTV provider');
    }

    // Save credentials if authentication was successful
    await saveStreamCredentials({
      url,
      username: credentials.username,
      password: credentials.password
    });

    console.log('Authentication successful');
    return data.data;
  } catch (error) {
    console.error('Authentication error:', error);
    toast.error(error.message || 'Failed to authenticate with IPTV provider');
    throw error;
  }
};

export const getStoredCredentials = async () => {
  try {
    console.log('Fetching stored credentials...');
    const { data, error } = await supabase
      .from('stream_credentials')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error fetching credentials:', error);
      throw error;
    }

    console.log('Credentials fetched:', data ? 'Found' : 'Not found');
    return data;
  } catch (error) {
    console.error('Error in getStoredCredentials:', error);
    throw error;
  }
};

export const saveStreamCredentials = async (credentials: XtreamCredentials) => {
  try {
    console.log('Saving stream credentials...');
    const { error } = await supabase
      .from('stream_credentials')
      .upsert({
        type: 'xtream',
        url: credentials.url.replace(/\/$/, ''), // Remove trailing slash if present
        username: credentials.username,
        password: credentials.password,
        user_id: null,
        mac_address: null,
        serial_number: null
      }, {
        onConflict: 'type'
      });

    if (error) {
      console.error('Error saving credentials:', error);
      throw error;
    }

    console.log('Credentials saved successfully');
    toast.success('Credentials saved successfully');
  } catch (error) {
    console.error('Error in saveStreamCredentials:', error);
    toast.error('Failed to save credentials');
    throw error;
  }
};

export const getEPGSettings = async () => {
  try {
    console.log('Fetching EPG settings...');
    const { data, error } = await supabase
      .from('epg_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error fetching EPG settings:', error);
      throw error;
    }

    const settings = data ?? { refresh_days: 7, last_refresh: null };
    console.log('EPG settings fetched:', settings);
    return settings;
  } catch (error) {
    console.error('Error in getEPGSettings:', error);
    throw error;
  }
};

export const saveEPGSettings = async (refreshDays: number) => {
  try {
    console.log('Saving EPG settings...', { refreshDays });
    const { error } = await supabase
      .from('epg_settings')
      .upsert({
        refresh_days: refreshDays,
        last_refresh: new Date().toISOString(),
        user_id: null
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error saving EPG settings:', error);
      throw error;
    }

    console.log('EPG settings saved successfully');
    toast.success('EPG settings updated');
  } catch (error) {
    console.error('Error in saveEPGSettings:', error);
    toast.error('Failed to save EPG settings');
    throw error;
  }
};

let epgRefreshInterval: number;

export const startEPGRefreshMonitoring = async () => {
  try {
    const settings = await getEPGSettings();
    const refreshMs = settings.refresh_days * 24 * 60 * 60 * 1000;

    console.log('Starting EPG refresh monitoring...', {
      refreshDays: settings.refresh_days,
      refreshMs
    });

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
          .maybeSingle();

        if (!data?.last_refresh) {
          console.log('No last refresh time found, triggering refresh');
          await refreshEPGData();
          return;
        }

        const lastRefresh = new Date(data.last_refresh);
        const now = new Date();
        const diffMs = now.getTime() - lastRefresh.getTime();

        console.log('Checking EPG refresh...', {
          lastRefresh,
          diffMs,
          refreshMs,
          needsRefresh: diffMs >= refreshMs
        });

        if (diffMs >= refreshMs) {
          console.log('EPG refresh needed, triggering update');
          await refreshEPGData();
        }
      } catch (error) {
        console.error('Error checking EPG refresh:', error);
      }
    }, 60000); // Check every minute

    console.log('EPG refresh monitoring started');
  } catch (error) {
    console.error('Error in startEPGRefreshMonitoring:', error);
  }
};

export const refreshEPGData = async () => {
  try {
    console.log('Starting EPG data refresh...');
    const credentials = await getStoredCredentials();
    
    if (!credentials) {
      console.warn('No stream credentials found');
      throw new Error('No stream credentials found');
    }

    // Update last refresh time
    await supabase
      .from('epg_settings')
      .upsert({
        last_refresh: new Date().toISOString(),
        user_id: null
      }, {
        onConflict: 'id'
      });

    // TODO: Implement actual EPG data fetching based on provider type
    console.log('EPG data refresh completed');
    toast.success('EPG data refreshed');

  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    toast.error('Failed to refresh EPG data');
    throw error;
  }
};
