
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getStoredCredentials } from '../iptvService';
import { storeEPGPrograms } from './epgStorageService';
import { getChannels } from './channelService';
import { fetchProgramsForChannel } from './programService';

export const refreshEPGData = async () => {
  console.log('Starting EPG refresh...');
  try {
    const credentials = await getStoredCredentials();
    if (!credentials) {
      console.error('No stream credentials found');
      toast.error('No stream credentials found');
      return false;
    }

    // Make sure we have channels first
    console.log('Checking for channels before EPG refresh...');
    const { count, error: countError } = await supabase
      .from('channels')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error checking channel count:', countError);
    } else if (count === 0) {
      console.log('No channels found in database, fetching channels first...');
      
      const channels = await getChannels();
      
      if (channels.length === 0) {
        console.error('No channels found, cannot refresh EPG');
        toast.error('No channels found. Please refresh channels first.');
        return false;
      }
      console.log(`Successfully fetched ${channels.length} channels`);
    } else {
      console.log(`Found ${count} channels in database, proceeding with EPG refresh`);
    }

    // Get the full list of channels to fetch EPG data for each
    const { data: allChannels } = await supabase
      .from('channels')
      .select('channel_id')
      .order('channel_id')
      .limit(50);  // Start with a reasonable batch size
      
    if (allChannels && allChannels.length > 0) {
      console.log(`Found ${allChannels.length} channels, fetching EPG data for each...`);
      let successCount = 0;
      
      // Process channels in smaller batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < allChannels.length; i += batchSize) {
        const batch = allChannels.slice(i, i + batchSize);
        console.log(`Processing EPG data for channel batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(allChannels.length/batchSize)}`);
        
        // Process channels in parallel but with a limit
        const results = await Promise.all(
          batch.map(async (channel) => {
            try {
              const success = await fetchProgramsForChannel(channel.channel_id);
              return success;
            } catch (error) {
              console.error(`Error fetching programs for channel ${channel.channel_id}:`, error);
              return false;
            }
          })
        );
        
        successCount += results.filter(Boolean).length;
        
        // Add a small delay between batches to prevent rate limiting
        if (i + batchSize < allChannels.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`Completed EPG data fetch for ${successCount} out of ${allChannels.length} channels`);
    }

    // Also try the general EPG fetch endpoint
    console.log('Fetching general EPG data from provider...');
    const { data: response, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'get_epg'
      }
    });

    if (error) {
      console.error('Failed to fetch general EPG data:', error);
      toast.error('Failed to fetch EPG data: ' + error.message);
      // Continue with individual channel data we fetched
    } else if (response?.success) {
      // Store program data if available
      if (response.data && (Array.isArray(response.data.epg_listings) || Array.isArray(response.data.programs))) {
        const programsData = Array.isArray(response.data.epg_listings) 
          ? response.data.epg_listings 
          : (Array.isArray(response.data.programs) ? response.data.programs : []);
          
        console.log(`Processing ${programsData.length} EPG listings from general fetch...`);
        await storeEPGPrograms(programsData);
      } else {
        console.log('No EPG listings found in general response:', response);
        // Try to extract EPG data from response if it's in a different format
        if (response.data && typeof response.data === 'object') {
          console.log('Attempting to extract EPG data from response object...');
          
          // Some providers may return EPG data in a different format
          // Try to find arrays that might contain program data
          const possibleEPGArrays = Object.entries(response.data)
            .filter(([_, value]) => Array.isArray(value) && (value as any[]).length > 0)
            .map(([key, value]) => ({ key, data: value }));
            
          if (possibleEPGArrays.length > 0) {
            console.log(`Found ${possibleEPGArrays.length} potential EPG data arrays in response`);
            
            for (const { key, data } of possibleEPGArrays) {
              console.log(`Checking array '${key}' with ${(data as any[]).length} items for EPG data...`);
              
              // Sample the first item to see if it looks like EPG data
              const sample = (data as any[])[0];
              if (sample && (
                (sample.title && (sample.start || sample.start_time) && (sample.end || sample.end_time)) ||
                (sample.program_title && sample.program_start && sample.program_end) ||
                (sample.name && sample.start_timestamp && sample.stop_timestamp)
              )) {
                console.log(`Array '${key}' appears to contain EPG data, processing...`);
                await storeEPGPrograms(data as any[]);
                break;
              }
            }
          }
        }
      }
    }

    // Update the last_refresh timestamp
    const { error: settingsError } = await supabase
      .from('epg_settings')
      .upsert({
        refresh_days: 7,
        last_refresh: new Date().toISOString()
      });

    if (settingsError) {
      console.error('Error updating EPG settings:', settingsError);
      toast.error('Error updating EPG settings: ' + settingsError.message);
      return false;
    }

    console.log('EPG refresh completed successfully');
    toast.success('EPG data refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to refresh EPG data');
    return false;
  }
};
