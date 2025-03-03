
import { supabase } from '@/integrations/supabase/client';

import { 
  storeCredentialsOffline, 
  getCredentialsOffline,
  storeEPGSettingsOffline,
  getEPGSettingsOffline
} from './offlineStorage';

// Function to save stream credentials
export const saveStreamCredentials = async (credentials: { username: string; password: string; url: string }) => {
  return await authenticateXtream(credentials);
};

// Modify the existing authenticateXtream function to store credentials offline
export const authenticateXtream = async (credentials: { username: string; password: string; url: string }) => {
  try {
    const { username, password, url } = credentials;
    
    if (!username || !password || !url) {
      throw new Error('Please provide username, password, and URL');
    }
    
    // Normalize the URL to ensure it works correctly
    const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    const { data, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        username,
        password,
        url: normalizedUrl
      }
    });
    
    if (error) {
      console.error('Authentication error:', error);
      throw new Error(`Failed to authenticate: ${error.message}`);
    }
    
    if (!data.success) {
      console.error('Authentication failed:', data);
      throw new Error(data.message || 'Authentication failed');
    }
    
    // Store credentials in the database with proper UUID handling
    const credentialData = {
      username,
      password,
      url: normalizedUrl,
      user_agent: navigator.userAgent,
      last_updated: new Date().toISOString()
    };
    
    // We'll let Supabase generate the UUID for us by not specifying an id
    const { error: storageError } = await supabase
      .from('stream_credentials')
      .upsert(credentialData);
    
    if (storageError) {
      console.error('Error storing credentials:', storageError);
      throw new Error(`Error storing credentials: ${storageError.message}`);
    }
    
    // Store credentials offline
    await storeCredentialsOffline({
      ...credentialData,
      id: 'local_credentials' // Use a consistent string ID for offline storage
    });
    
    return data;
  } catch (error) {
    console.error('Error in authenticateXtream:', error);
    throw error;
  }
};

// Modify getStoredCredentials to check offline storage first
export const getStoredCredentials = async () => {
  try {
    // Check if we have credentials stored offline
    const offlineCredentials = await getCredentialsOffline();
    if (offlineCredentials) {
      console.log('Using offline credentials');
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
      console.error('Error fetching credentials:', error);
      return null;
    }
    
    if (!data) {
      console.log('No credentials found');
      return null;
    }
    
    // Store the credentials offline for future use
    await storeCredentialsOffline(data);
    
    return data;
  } catch (error) {
    console.error('Error in getStoredCredentials:', error);
    return null;
  }
};

// Modify saveEPGSettings to store settings offline
export const saveEPGSettings = async (refreshDays: number) => {
  try {
    const { error } = await supabase
      .from('epg_settings')
      .upsert({
        refresh_days: refreshDays,
        last_refresh: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error saving EPG settings:', error);
      throw new Error(`Error saving EPG settings: ${error.message}`);
    }
    
    // Store settings offline
    await storeEPGSettingsOffline({
      refresh_days: refreshDays,
      last_refresh: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error in saveEPGSettings:', error);
    throw error;
  }
};

// Modify getEPGSettings to check offline storage first
export const getEPGSettings = async () => {
  try {
    // Check if we have settings stored offline
    const offlineSettings = await getEPGSettingsOffline();
    if (offlineSettings) {
      console.log('Using offline EPG settings');
      return offlineSettings;
    }
    
    // If no offline settings, try to get them from Supabase
    const { data, error } = await supabase
      .from('epg_settings')
      .select('*')
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching EPG settings:', error);
      return { refresh_days: 7, last_refresh: new Date().toISOString() };
    }
    
    if (!data) {
      return { refresh_days: 7, last_refresh: new Date().toISOString() };
    }
    
    // Store settings offline for future use
    await storeEPGSettingsOffline(data);
    
    return data;
  } catch (error) {
    console.error('Error in getEPGSettings:', error);
    return { refresh_days: 7, last_refresh: new Date().toISOString() };
  }
};
