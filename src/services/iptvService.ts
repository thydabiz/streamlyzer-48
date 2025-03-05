import { supabase } from '@/integrations/supabase/client';

import { 
  storeCredentialsOffline, 
  getCredentialsOffline,
  storeEPGSettingsOffline,
  getEPGSettingsOffline
} from './offlineStorage';

interface StreamCredentials {
  username: string;
  password: string;
  url: string;
}

// Helper function to test a single URL with timeout
const testUrlWithTimeout = async (url: string, username: string, password: string): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/plain',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Helper function to test different URL formats
const testUrlFormats = async (baseUrl: string, username: string, password: string) => {
  const urlFormats = [
    baseUrl,
    baseUrl.replace('/live/', '/'),
    baseUrl.replace('http://', 'https://'),
    baseUrl.replace('http://', 'http://www.'),
    baseUrl.includes(':80') ? baseUrl : baseUrl.replace('://', '://').replace('/', ':80/'),
    baseUrl.replace(':80', ':8080'),
    baseUrl.replace('lion.topcms.cc', 'www.lion.topcms.cc'),
    baseUrl.replace('lion.topcms.cc', 'lion.topcms.cc:8080'),
  ];

  for (const url of urlFormats) {
    try {
      // Try player_api.php endpoint
      const playerApiUrl = `${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      
      const response = await testUrlWithTimeout(playerApiUrl, username, password);
      
      if (response.ok) {
        try {
          const data = JSON.parse(await response.text());
          if (data.user_info || data.server_info) {
            return { success: true, url, data };
          }
        } catch (e) {
          // Continue to next format if parsing fails
          continue;
        }
      }

      // If player_api.php fails, try get.php endpoint
      const getApiUrl = `${url}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus`;
      
      const getResponse = await testUrlWithTimeout(getApiUrl, username, password);

      if (getResponse.ok) {
        const text = await getResponse.text();
        if (text.includes('EXTM3U') || text.includes('#EXTINF')) {
          return { success: true, url, data: { user_info: { status: 'Active' } } };
        }
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        continue; // Skip to next URL format if timeout
      }
      // Continue to next format for other errors
      continue;
    }
  }

  return { success: false, error: 'Could not connect to server. Please check your URL and try again.' };
};

// Function to save stream credentials
export const saveStreamCredentials = async (credentials: StreamCredentials) => {
  try {
    await authenticateXtream(credentials);
  } catch (error) {
    // Fail silently
  }
};

// Authenticate Xtream API and store credentials
export const authenticateXtream = async (credentials: StreamCredentials) => {
  try {
    const { username, password, url } = credentials;
    
    if (!username || !password || !url) {
      throw new Error('Please provide username, password, and URL');
    }
    
    // Normalize the URL
    let normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'http://' + normalizedUrl;
    }
    
    // Test different URL formats
    const result = await testUrlFormats(normalizedUrl, username, password);
    
    if (!result.success) {
      throw new Error('Failed to authenticate: Could not connect to server');
    }
    
    // If we get here, we found a working URL
    const credentialData = {
      username,
      password,
      url: result.url,
      type: 'xtream',
      user_info: result.data.user_info || { status: 'Active' }
    };
    
    // Store credentials offline first
    await storeCredentialsOffline({
      ...credentialData,
      id: 'local_credentials',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    // Try to store in Supabase if available
    try {
      const { error: storageError } = await supabase
        .from('stream_credentials')
        .upsert({
          username,
          password,
          url: result.url,
          type: 'xtream'
        });
      
      if (storageError) {
        // Fail silently
      }
    } catch (e) {
      // Fail silently
    }
    
    return { success: true, data: credentialData };
    
  } catch (error) {
    throw error;
  }
};

// Get stored credentials
export const getStoredCredentials = async () => {
  try {
    // Check if we have credentials stored offline
    const offlineCredentials = await getCredentialsOffline();
    if (offlineCredentials) {
      return offlineCredentials;
    }
    
    // If no offline credentials, try to get them from Supabase
    const { data, error } = await supabase
      .from('stream_credentials')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    // Store the credentials offline for future use
    await storeCredentialsOffline(data);
    
    return data;
  } catch (error) {
    return null;
  }
};

// Save EPG settings
export const saveEPGSettings = async (refreshDays: number) => {
  try {
    const { error } = await supabase
      .from('epg_settings')
      .upsert({
        refresh_days: refreshDays,
        last_refresh: new Date().toISOString()
      });
      
    if (error) {
      throw new Error(`Error saving EPG settings: ${error.message}`);
    }
    
    // Store settings offline
    await storeEPGSettingsOffline({
      refresh_days: refreshDays,
      last_refresh: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// Get EPG settings
export const getEPGSettings = async () => {
  try {
    // Check if we have settings stored offline
    const offlineSettings = await getEPGSettingsOffline();
    if (offlineSettings) {
      return offlineSettings;
    }
    
    // If no offline settings, try to get them from Supabase
    const { data, error } = await supabase
      .from('epg_settings')
      .select('*')
      .maybeSingle();
      
    if (error) {
      return { refresh_days: 7, last_refresh: new Date().toISOString() };
    }
    
    if (!data) {
      return { refresh_days: 7, last_refresh: new Date().toISOString() };
    }
    
    // Store settings offline for future use
    await storeEPGSettingsOffline(data);
    
    return data;
  } catch (error) {
    return { refresh_days: 7, last_refresh: new Date().toISOString() };
  }
};
