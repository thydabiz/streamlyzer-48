
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EPGProgram, Channel } from '@/types/epg';
import { getStoredCredentials } from './iptvService';

export const getChannels = async (): Promise<Channel[]> => {
  console.log('Fetching channels...');
  try {
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

    // Check if we have channels data directly
    if (Array.isArray(response.data)) {
      console.log(`Processing ${response.data.length} channels from direct response...`);
      const channels = response.data
        .filter((channel: any) => channel?.stream_id && channel?.name)
        .map((channel: any) => ({
          id: channel.stream_id.toString(),
          name: channel.name || 'Unnamed Channel',
          number: channel.num || parseInt(channel.stream_id) || 0,
          streamUrl: `${credentials.url}/live/${credentials.username}/${credentials.password}/${channel.stream_id}`,
          logo: channel.stream_icon || null
        }));

      console.log(`Mapped ${channels.length} channels, storing in database...`);
      await storeChannels(channels);
      console.log(`Successfully processed ${channels.length} channels`);
      return channels;
    } else if (response.data?.available_channels && Array.isArray(response.data.available_channels)) {
      // If we have channels in the available_channels array
      console.log(`Processing ${response.data.available_channels.length} channels from available_channels...`);
      const channels = response.data.available_channels
        .filter((channel: any) => channel?.stream_id && channel?.name)
        .map((channel: any) => ({
          id: channel.stream_id.toString(),
          name: channel.name || 'Unnamed Channel',
          number: channel.num || parseInt(channel.stream_id) || 0,
          streamUrl: `${credentials.url}/live/${credentials.username}/${credentials.password}/${channel.stream_id}`,
          logo: channel.stream_icon || null
        }));

      console.log(`Mapped ${channels.length} channels, storing in database...`);
      await storeChannels(channels);
      console.log(`Successfully processed ${channels.length} channels`);
      return channels;
    } else {
      // Try to fetch channels with a different action if both methods failed
      console.log('No channels found in response, trying alternative fetch method...');
      return await fetchChannelsFallback(credentials);
    }
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
      return existingChannels.map(channel => ({
        id: channel.channel_id,
        name: channel.name,
        number: channel.number || 0,
        streamUrl: channel.stream_url,
        logo: channel.logo || null
      }));
    }
    
    console.error('All channel fetching methods failed');
    toast.error('Failed to fetch channels from provider');
    return [];
  } catch (error) {
    console.error('Error in fetchChannelsFallback:', error);
    return [];
  }
};

const storeChannels = async (channels: Channel[]) => {
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
    console.log('All channel batches stored successfully');
  } catch (error) {
    console.error('Error in storeChannels:', error);
    toast.error('Failed to store channels');
  }
};

export const getCurrentProgram = async (channelId: string): Promise<EPGProgram | undefined> => {
  console.log(`Fetching current program for channel ${channelId}...`);
  const now = new Date().toISOString();
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('channel_id', channelId)
      .lte('start_time', now)
      .gte('end_time', now)
      .maybeSingle();

    if (error) {
      console.error('Error fetching current program:', error);
      return undefined;
    }

    if (!data) {
      console.log(`No current program found for channel ${channelId}`);
      return undefined;
    }

    console.log(`Found current program for channel ${channelId}:`, data.title);
    return mapProgramData(data);
  } catch (error) {
    console.error('Error in getCurrentProgram:', error);
    return undefined;
  }
};

export const getProgramSchedule = async (channelId: string): Promise<EPGProgram[]> => {
  console.log(`Fetching program schedule for channel ${channelId}...`);
  const now = new Date();
  const startTime = new Date(now.setHours(now.getHours() - 1)).toISOString();
  const endTime = new Date(now.setHours(now.getHours() + 4)).toISOString();

  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('channel_id', channelId)
      .gte('end_time', startTime)
      .lte('start_time', endTime)
      .order('start_time');

    if (error) {
      console.error('Error fetching program schedule:', error);
      return [];
    }

    console.log(`Found ${data.length} programs in schedule for channel ${channelId}`);
    return data.map(mapProgramData);
  } catch (error) {
    console.error('Error in getProgramSchedule:', error);
    return [];
  }
};

export const getMovies = async (): Promise<EPGProgram[]> => {
  console.log('Fetching movies...');
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .ilike('category', '%movie%')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching movies:', error);
      return [];
    }

    console.log(`Found ${data.length} movies`);
    return data.map(mapProgramData);
  } catch (error) {
    console.error('Error in getMovies:', error);
    return [];
  }
};

export const getShows = async (): Promise<EPGProgram[]> => {
  console.log('Fetching shows...');
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .not('category', 'ilike', '%movie%')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching shows:', error);
      return [];
    }

    console.log(`Found ${data.length} shows`);
    return data.map(mapProgramData);
  } catch (error) {
    console.error('Error in getShows:', error);
    return [];
  }
};

const mapProgramData = (program: any): EPGProgram => ({
  id: program.id,
  title: program.title,
  description: program.description || '',
  startTime: program.start_time,
  endTime: program.end_time,
  category: program.category || 'Uncategorized',
  channel: program.channel_id,
  rating: program.rating,
  thumbnail: program.thumbnail
});

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
    const { data: existingChannels, error: channelError } = await supabase
      .from('channels')
      .select('channel_id')
      .limit(1);
      
    if (channelError) {
      console.error('Error checking for existing channels:', channelError);
    }
    
    if (!existingChannels || existingChannels.length === 0) {
      console.log('No channels found in the database, fetching channels first...');
      const channels = await getChannels();
      if (channels.length === 0) {
        console.error('No channels found, cannot refresh EPG');
        toast.error('No channels found. Please refresh channels first.');
        return false;
      }
      console.log(`Successfully fetched ${channels.length} channels`);
    } else {
      console.log('Channels found in database, proceeding with EPG refresh');
    }

    console.log('Fetching EPG data from provider...');
    const { data: response, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'get_epg'
      }
    });

    if (error) {
      console.error('Failed to fetch EPG data:', error);
      toast.error('Failed to fetch EPG data: ' + error.message);
      return false;
    }

    if (!response?.success) {
      console.error('Invalid response from EPG refresh:', response);
      toast.error('Failed to refresh EPG data: Invalid response from provider');
      return false;
    }

    // Store program data if available
    if (response.data && (Array.isArray(response.data.epg_listings) || Array.isArray(response.data.programs))) {
      const programsData = Array.isArray(response.data.epg_listings) 
        ? response.data.epg_listings 
        : (Array.isArray(response.data.programs) ? response.data.programs : []);
        
      console.log(`Processing ${programsData.length} EPG listings...`);
      await storeEPGPrograms(programsData);
    } else {
      console.log('No EPG listings found in response:', response);
      // Try to fetch EPG data with a different approach if needed
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

// Add a new function to store EPG program data and explicitly export it
// This makes it available for import in iptvService.ts
export const storeEPGPrograms = async (programs: any[]) => {
  console.log(`Storing ${programs.length} EPG programs...`);
  if (programs.length === 0) return;

  try {
    // Process in batches to avoid payload size issues
    const batchSize = 25; // Reduced batch size to avoid payload issues
    for (let i = 0; i < programs.length; i += batchSize) {
      const batch = programs.slice(i, i + batchSize);
      console.log(`Processing EPG batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(programs.length/batchSize)}, size: ${batch.length}`);
      
      const formattedPrograms = batch
        .filter(program => {
          // Normalize the program data structure
          const title = program.title || program.program_title || program.name || '';
          const startTime = program.start || program.start_time || program.program_start || program.start_timestamp || '';
          const endTime = program.end || program.end_time || program.program_end || program.stop_timestamp || '';
          const channelId = program.channel_id || program.channel || '';
          
          return title && startTime && endTime && channelId;
        })
        .map(program => {
          // Normalize the program data structure
          const title = program.title || program.program_title || program.name || '';
          const description = program.description || program.program_description || program.desc || '';
          const startTime = program.start || program.start_time || program.program_start || program.start_timestamp || '';
          const endTime = program.end || program.end_time || program.program_end || program.stop_timestamp || '';
          const channelId = program.channel_id || program.channel || '';
          const category = program.category || program.program_category || '';
          const rating = program.rating || program.program_rating || '';
          const thumbnail = program.thumbnail || program.image || '';
          
          // Make sure dates are properly formatted
          let startDate, endDate;
          try {
            startDate = new Date(startTime);
            endDate = new Date(endTime);
            
            // Check if dates are valid
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              // Try parsing as Unix timestamp if needed
              if (typeof startTime === 'number' || !isNaN(Number(startTime))) {
                startDate = new Date(Number(startTime) * 1000);
              }
              if (typeof endTime === 'number' || !isNaN(Number(endTime))) {
                endDate = new Date(Number(endTime) * 1000);
              }
            }
            
            // Final validation
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.error(`Invalid date format for program: ${title}`, { startTime, endTime });
              return null;
            }
          } catch (error) {
            console.error(`Error parsing dates for program: ${title}`, error);
            return null;
          }
          
          return {
            channel_id: channelId.toString(),
            title: title || 'Untitled Program',
            description: description || '',
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            category: category || 'Uncategorized',
            rating: rating || null,
            thumbnail: thumbnail || null
          };
        })
        .filter(Boolean); // Remove any null entries

      if (formattedPrograms.length === 0) {
        console.log('No valid programs in this batch, skipping');
        continue;
      }

      try {
        const { error } = await supabase
          .from('programs')
          .upsert(formattedPrograms, { 
            onConflict: 'channel_id,start_time,end_time,title' 
          });

        if (error) {
          console.error(`Error storing EPG programs batch ${Math.floor(i/batchSize) + 1}:`, error);
          // Continue with next batch instead of throwing
          console.log('Continuing with next batch...');
        } else {
          console.log(`Successfully stored batch ${Math.floor(i/batchSize) + 1} with ${formattedPrograms.length} programs`);
        }
      } catch (batchError) {
        console.error(`Exception storing EPG programs batch ${Math.floor(i/batchSize) + 1}:`, batchError);
        console.log('Continuing with next batch...');
      }
    }
    console.log('All EPG program batches processed');
  } catch (error) {
    console.error('Error storing EPG programs:', error);
    toast.error('Failed to store some EPG programs');
  }
};
