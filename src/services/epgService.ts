
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
    const { data, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password
      }
    });

    if (error) {
      console.error('Error fetching channels:', error);
      toast.error('Failed to fetch channels');
      return [];
    }

    if (!data.success || !data.data?.available_channels) {
      console.error('Invalid channel data received:', data);
      toast.error('Failed to fetch channels: Invalid data received');
      return [];
    }

    console.log(`Processing ${data.data.available_channels.length} channels...`);
    const channels = data.data.available_channels.map((channel: any) => ({
      id: channel.stream_id.toString(),
      name: channel.name || 'Unnamed Channel',
      number: channel.num || 0,
      streamUrl: `${credentials.url}/live/${credentials.username}/${credentials.password}/${channel.stream_id}`,
      logo: channel.stream_icon || null
    }));

    await storeChannels(channels);
    console.log(`Successfully processed ${channels.length} channels`);
    return channels;
  } catch (error) {
    console.error('Error in getChannels:', error);
    toast.error('Failed to fetch channels');
    return [];
  }
};

const storeChannels = async (channels: Channel[]) => {
  console.log('Storing channels in database...');
  try {
    const { error } = await supabase
      .from('channels')
      .upsert(
        channels.map(channel => ({
          channel_id: channel.id,
          name: channel.name,
          number: channel.number || 0,
          stream_url: channel.streamUrl,
          logo: channel.logo || null
        })),
        { onConflict: 'channel_id' }
      );

    if (error) {
      console.error('Error storing channels:', error);
      throw error;
    }
    console.log('Channels stored successfully');
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
      throw new Error('No stream credentials found');
    }

    console.log('Fetching EPG data from provider...');
    const { data: epgData, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'get_epg'
      }
    });

    if (error || !epgData.success) {
      console.error('Failed to fetch EPG data:', error || epgData.error);
      throw new Error('Failed to fetch EPG data');
    }

    // Store EPG data in the programs table
    if (epgData.data && Array.isArray(epgData.data.programs)) {
      console.log('Processing', epgData.data.programs.length, 'programs');
      
      // Process programs in smaller batches to avoid overwhelming the database
      const batchSize = 100;
      const programs = epgData.data.programs;
      let processedCount = 0;
      
      for (let i = 0; i < programs.length; i += batchSize) {
        const batch = programs.slice(i, i + batchSize).map((program: any) => ({
          title: program.title,
          description: program.description,
          start_time: program.start_time,
          end_time: program.end_time,
          channel_id: program.channel_id.toString(),
          category: program.category || 'Uncategorized',
          rating: program.rating,
          thumbnail: program.thumbnail
        }));

        const { error: insertError } = await supabase
          .from('programs')
          .upsert(batch, {
            onConflict: 'channel_id,start_time,title'
          });

        if (insertError) {
          console.error('Error storing programs batch:', insertError);
          throw insertError;
        }
        
        processedCount += batch.length;
        console.log(`Processed ${processedCount} of ${programs.length} programs`);
      }
    }

    const { error: settingsError } = await supabase
      .from('epg_settings')
      .upsert({
        refresh_days: 7,
        last_refresh: new Date().toISOString()
      });

    if (settingsError) {
      console.error('Error updating EPG settings:', settingsError);
      throw settingsError;
    }

    console.log('EPG refresh completed successfully');
    toast.success('EPG data refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    toast.error('Failed to refresh EPG data');
    throw error;
  }
};
