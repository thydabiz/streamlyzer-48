
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Channel } from '@/types/epg';
import { getStoredCredentials } from '../iptvService';
import { storeChannelsOffline, getChannelsOffline } from '../offlineStorage';
import { 
  storeInCache, 
  getFromCache, 
  getAllFromCache, 
  shouldRefreshCache, 
  channelsCache 
} from '../cachingService';

const BATCH_SIZE = 100;

export const getChannels = async (offset = 0, limit = BATCH_SIZE): Promise<Channel[]> => {
  console.log(`Fetching channels (offset: ${offset}, limit: ${limit})...`);
  const cacheKey = 'channels';
  const batchKey = `batch_${offset}_${limit}`;
  
  try {
    // Check if we should refresh the cache
    const shouldRefresh = await shouldRefreshCache(cacheKey, 24 * 60 * 60 * 1000); // 24 hour cache
    
    if (!shouldRefresh) {
      // Check if we have any cached channels
      const cachedChannels = await getFromCache<Channel>(channelsCache, cacheKey, batchKey);
      if (cachedChannels && cachedChannels.length > 0) {
        console.log(`Found ${cachedChannels.length} channels in cache (batch ${offset}-${offset+limit})`);
        return cachedChannels;
      }
      
      // If we have a specific batch missing but have other batches, try to get all channels
      const allCachedChannels = await getAllFromCache<Channel>(channelsCache, cacheKey);
      if (allCachedChannels && allCachedChannels.length > 0) {
        // Filter just the batch we need
        const batchedChannels = allCachedChannels.slice(offset, offset + limit);
        if (batchedChannels.length > 0) {
          console.log(`Using ${batchedChannels.length} channels from all cached channels`);
          return batchedChannels;
        }
      }
    }
    
    // If batch not in cache, try offline storage next
    const offlineChannels = await getChannelsOffline();
    if (offlineChannels && offlineChannels.length > 0) {
      console.log(`Found ${offlineChannels.length} channels in offline storage`);
      
      // Store in cache for next time
      if (!shouldRefresh) {
        for (let i = 0; i < offlineChannels.length; i += BATCH_SIZE) {
          const batchedChannels = offlineChannels.slice(i, i + BATCH_SIZE);
          await storeInCache(
            channelsCache, 
            cacheKey, 
            batchedChannels, 
            `batch_${i}_${BATCH_SIZE}`
          );
        }
      }
      
      // Return just the batch requested
      return offlineChannels.slice(offset, offset + limit);
    }

    // If not in cache or offline storage, fetch from provider
    const credentials = await getStoredCredentials();
    if (!credentials) {
      console.error('No stream credentials found');
      toast.error('No stream credentials found');
      return [];
    }

    console.log('Authenticating with Xtream provider...');
    const { data: response, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'get_live_streams' // Explicitly request live streams
      }
    });

    if (error) {
      console.error('Error fetching channels:', error);
      toast.error('Failed to fetch channels: ' + error.message);
      return [];
    }

    if (!response?.success) {
      console.error('Failed to authenticate:', response);
      toast.error('Failed to authenticate with provider');
      return [];
    }

    console.log('Response from get_live_streams:', response);

    let channels: Channel[] = [];
    
    // Check if we have channels data directly
    if (Array.isArray(response.data)) {
      console.log(`Processing ${response.data.length} channels from direct response...`);
      channels = response.data
        .filter((channel: any) => channel?.stream_id && channel?.name)
        .map((channel: any) => ({
          id: channel.stream_id.toString(),
          name: channel.name || 'Unnamed Channel',
          number: channel.num || parseInt(channel.stream_id) || 0,
          streamUrl: `${credentials.url}/live/${credentials.username}/${credentials.password}/${channel.stream_id}`,
          logo: channel.stream_icon || null
        }));
    } else if (response.data?.available_channels && Array.isArray(response.data.available_channels)) {
      // If we have channels in the available_channels array
      console.log(`Processing ${response.data.available_channels.length} channels from available_channels...`);
      channels = response.data.available_channels
        .filter((channel: any) => channel?.stream_id && channel?.name)
        .map((channel: any) => ({
          id: channel.stream_id.toString(),
          name: channel.name || 'Unnamed Channel',
          number: channel.num || parseInt(channel.stream_id) || 0,
          streamUrl: `${credentials.url}/live/${credentials.username}/${credentials.password}/${channel.stream_id}`,
          logo: channel.stream_icon || null
        }));
    } else {
      // Try to fetch channels with a different action if both methods failed
      console.log('No channels found in response, trying alternative fetch method...');
      channels = await fetchChannelsFallback(credentials);
    }
    
    if (channels.length > 0) {
      console.log(`Mapped ${channels.length} channels, storing in cache and database...`);
      
      // Store all channels in database
      await storeChannels(channels);
      
      // Store channels in cache by batches
      for (let i = 0; i < channels.length; i += BATCH_SIZE) {
        const batchedChannels = channels.slice(i, i + BATCH_SIZE);
        await storeInCache(
          channelsCache, 
          cacheKey, 
          batchedChannels, 
          `batch_${i}_${BATCH_SIZE}`
        );
      }
      
      // Return just the batch requested
      return channels.slice(offset, offset + limit);
    }
    
    return [];
  } catch (error) {
    console.error('Error in getChannels:', error);
    toast.error('Failed to fetch channels: ' + (error instanceof Error ? error.message : 'Unknown error'));
    return [];
  }
};

// Function to fetch channels separately if the auth endpoint doesn't return them
const fetchChannelsSeparately = async (credentials: any): Promise<Channel[] | null> => {
  try {
    console.log('Fetching channels separately...');
    const { data: response, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'get_live_streams'
      }
    });

    if (error || !response?.success || !Array.isArray(response.data)) {
      console.error('Failed to fetch channels separately:', error || response);
      return null;
    }

    console.log(`Received ${response.data.length} channels from separate call`);
    return response.data
      .filter((channel: any) => channel?.stream_id && channel?.name)
      .map((channel: any) => ({
        id: channel.stream_id.toString(),
        name: channel.name || 'Unnamed Channel',
        number: channel.num || parseInt(channel.stream_id) || 0,
        streamUrl: `${credentials.url}/live/${credentials.username}/${credentials.password}/${channel.stream_id}`,
        logo: channel.stream_icon || null
      }));
  } catch (error) {
    console.error('Error fetching channels separately:', error);
    return null;
  }
};

// New function to try multiple channel fetching methods
const fetchChannelsFallback = async (credentials: any): Promise<Channel[]> => {
  try {
    console.log('Trying fallback channel fetch methods...');
    
    // Try fetching categories first
    const { data: categoryResponse, error: categoryError } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'get_live_categories'
      }
    });
    
    if (categoryError) {
      console.error('Error fetching channel categories:', categoryError);
    } else {
      console.log('Categories response:', categoryResponse);
      
      // If we have categories, try to fetch streams for each category
      if (categoryResponse?.success && Array.isArray(categoryResponse.data) && categoryResponse.data.length > 0) {
        console.log(`Found ${categoryResponse.data.length} live categories, fetching streams...`);
        
        let allChannels: Channel[] = [];
        
        // Try fetching channels by category
        for (const category of categoryResponse.data) {
          if (!category.category_id) continue;
          
          const { data: channelResponse, error: channelError } = await supabase.functions.invoke('xtream-auth', {
            body: {
              url: credentials.url,
              username: credentials.username,
              password: credentials.password,
              action: 'get_live_streams',
              category_id: category.category_id
            }
          });
          
          if (channelError) {
            console.error(`Error fetching channels for category ${category.category_name}:`, channelError);
            continue;
          }
          
          if (channelResponse?.success && Array.isArray(channelResponse.data)) {
            console.log(`Found ${channelResponse.data.length} channels in category ${category.category_name}`);
            
            const categoryChannels = channelResponse.data
              .filter((channel: any) => channel?.stream_id && channel?.name)
              .map((channel: any) => ({
                id: channel.stream_id.toString(),
                name: channel.name || 'Unnamed Channel',
                number: channel.num || parseInt(channel.stream_id) || 0,
                streamUrl: `${credentials.url}/live/${credentials.username}/${credentials.password}/${channel.stream_id}`,
                logo: channel.stream_icon || null
              }));
            
            allChannels = [...allChannels, ...categoryChannels];
          }
        }
        
        if (allChannels.length > 0) {
          console.log(`Found a total of ${allChannels.length} channels across all categories`);
          await storeChannels(allChannels);
          return allChannels;
        }
      }
    }
    
    // If we still don't have channels, try a direct fetch with panel_api
    console.log('Trying direct panel_api fetch...');
    const { data: panelResponse, error: panelError } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'panel_api'
      }
    });
    
    if (panelError) {
      console.error('Error with panel_api fetch:', panelError);
    } else if (panelResponse?.success && panelResponse.data?.live && Array.isArray(panelResponse.data.live)) {
      console.log(`Found ${panelResponse.data.live.length} channels via panel_api`);
      
      const channels = panelResponse.data.live
        .filter((channel: any) => channel?.stream_id && channel?.name)
        .map((channel: any) => ({
          id: channel.stream_id.toString(),
          name: channel.name || 'Unnamed Channel',
          number: channel.num || parseInt(channel.stream_id) || 0,
          streamUrl: `${credentials.url}/live/${credentials.username}/${credentials.password}/${channel.stream_id}`,
          logo: channel.stream_icon || null
        }));
      
      await storeChannels(channels);
      return channels;
    }
    
    // Last resort: check if there are any channels already in the database
    console.log('Checking for existing channels in database...');
    const { data: existingChannels, error: existingError } = await supabase
      .from('channels')
      .select('*');
    
    if (existingError) {
      console.error('Error fetching existing channels:', existingError);
      return [];
    }
    
    if (existingChannels && existingChannels.length > 0) {
      console.log(`Found ${existingChannels.length} existing channels in database`);
      const mappedChannels = existingChannels.map(channel => ({
        id: channel.channel_id,
        name: channel.name,
        number: channel.number || 0,
        streamUrl: channel.stream_url,
        logo: channel.logo || null
      }));
      
      // Store channels offline
      await storeChannelsOffline(mappedChannels);
      
      return mappedChannels;
    }
    
    console.error('All channel fetching methods failed');
    toast.error('Failed to fetch channels from provider');
    return [];
  } catch (error) {
    console.error('Error in fetchChannelsFallback:', error);
    return [];
  }
};

export const storeChannels = async (channels: Channel[]) => {
  console.log(`Storing ${channels.length} channels in database...`);
  if (channels.length === 0) {
    console.warn('No channels to store');
    return;
  }
  
  try {
    // Process in batches to avoid payload size issues
    const batchSize = 100;
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);
      console.log(`Storing batch ${i/batchSize + 1} of ${Math.ceil(channels.length/batchSize)}, size: ${batch.length}`);
      
      const { error } = await supabase
        .from('channels')
        .upsert(
          batch.map(channel => ({
            channel_id: channel.id,
            name: channel.name,
            number: channel.number || 0,
            stream_url: channel.streamUrl,
            logo: channel.logo || null
          })),
          { onConflict: 'channel_id' }
        );

      if (error) {
        console.error(`Error storing channels batch ${i/batchSize + 1}:`, error);
        throw error;
      }
    }
    
    // Also store channels offline
    await storeChannelsOffline(channels);
    
    console.log('All channel batches stored successfully');
  } catch (error) {
    console.error('Error in storeChannels:', error);
    toast.error('Failed to store channels');
  }
};
