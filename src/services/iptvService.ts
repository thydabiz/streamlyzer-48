
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}

export const authenticateXtream = async (credentials: XtreamCredentials) => {
  try {
    console.log('Starting authentication with provided credentials...');
    let url = credentials.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    url = url.replace(/\/$/, '');

    console.log('Sending auth request to Edge Function...');
    const { data, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url,
        username: credentials.username,
        password: credentials.password
      }
    });

    if (error) {
      console.error('Authentication error from Edge Function:', error);
      throw new Error(error.message || 'Failed to authenticate with IPTV provider');
    }
    
    console.log('Auth response received:', data);
    
    if (!data || !data.success) {
      console.error('Authentication failed:', data);
      throw new Error(data?.error || 'Failed to authenticate with IPTV provider');
    }

    // Validate that we have at least user_info in the response
    if (!data.data || !data.data.user_info) {
      console.error('Invalid authentication response:', data);
      throw new Error('Invalid response from IPTV provider. Missing user information.');
    }

    console.log('Authentication successful, saving credentials...');
    // Save the credentials after successful authentication
    await saveStreamCredentials({
      url,
      username: credentials.username,
      password: credentials.password
    });

    console.log('Authentication successful:', data);
    return data.data;
  } catch (error) {
    console.error('Authentication error:', error);
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
    console.error('Error fetching stored credentials:', error);
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
    console.log('Credentials saved successfully');
    toast.success('Credentials saved successfully');
  } catch (error) {
    console.error('Error saving credentials:', error);
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
    console.error('Error fetching EPG settings:', error);
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
    console.error('Error saving EPG settings:', error);
    toast.error('Failed to save EPG settings');
    throw error;
  }
};

// Function to start monitoring EPG refresh
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
    console.error('Error starting EPG refresh monitoring:', error);
    throw error;
  }
};

export const refreshEPGData = async () => {
  try {
    const credentials = await getStoredCredentials();
    if (!credentials) {
      console.error('No stream credentials found');
      toast.error('No stream credentials found');
      throw new Error('No stream credentials found');
    }

    // First, check if we have channels in the database
    console.log('Checking for channels before refreshing EPG...');
    const { count, error: countError } = await supabase
      .from('channels')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error checking channel count:', countError);
    } else if (count === 0) {
      console.log('No channels found in database, fetching channels first...');
      
      // Import dynamically to avoid circular dependencies
      const { getChannels } = await import('./epgService');
      const channels = await getChannels();
      
      if (!channels || channels.length === 0) {
        console.error('No channels could be fetched, cannot refresh EPG');
        toast.error('No channels available. Please refresh channels first.');
        throw new Error('No channels available');
      }
      
      console.log(`Successfully fetched ${channels.length} channels`);
    } else {
      console.log(`Found ${count} channels in database, proceeding with EPG refresh`);
    }

    console.log('Refreshing EPG data with stored credentials...');
    const { data, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'get_epg'
      }
    });

    if (error) {
      console.error('Error refreshing EPG data:', error);
      toast.error('Failed to refresh EPG data: ' + error.message);
      throw error;
    }

    if (!data || !data.success) {
      console.error('Invalid response from EPG refresh:', data);
      toast.error('Failed to refresh EPG data: Invalid response from provider');
      throw new Error('Invalid response from EPG refresh');
    }

    // Process EPG data if it exists
    if (data.data && (data.data.programs || data.data.epg_listings)) {
      const programsData = data.data.programs || data.data.epg_listings || [];
      
      if (Array.isArray(programsData) && programsData.length > 0) {
        console.log(`Processing ${programsData.length} EPG entries...`);
        
        // Import dynamically to avoid circular dependencies
        const { storeEPGPrograms } = await import('./epgService');
        if (typeof storeEPGPrograms === 'function') {
          await storeEPGPrograms(programsData);
        } else {
          console.error('storeEPGPrograms function not found in epgService');
        }
      } else {
        console.log('No EPG programs found in response');
      }
    } else {
      console.log('No EPG data found in response:', data);
    }

    await supabase
      .from('epg_settings')
      .upsert({
        last_refresh: new Date().toISOString()
      });

    console.log('EPG data refresh request sent successfully');
    toast.success('EPG data refreshed');
    
    return data;
  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    toast.error('Failed to refresh EPG data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    throw error;
  }
};

// Add TypeScript declaration for the global window object
declare global {
  interface Window {
    epgRefreshInterval?: number;
  }
}
