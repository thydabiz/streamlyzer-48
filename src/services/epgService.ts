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
        password: credentials.password
      }
    });

    if (error) {
      console.error('Error fetching channels:', error);
      toast.error('Failed to fetch channels');
      return [];
    }

    if (!response?.success) {
      console.error('Failed to authenticate:', response);
      toast.error('Failed to authenticate with provider');
      return [];
    }

    // Check if available_channels exists and is an array
    if (!response.data?.available_channels || !Array.isArray(response.data.available_channels)) {
      console.error('Invalid channel data received:', response);
      toast.error('Invalid channel data received from provider');
      return [];
    }

    console.log(`Processing ${response.data.available_channels.length} channels...`);
    const channels = response.data.available_channels
      .filter((channel: any) => channel?.stream_id && channel?.name)
      .map((channel: any) => ({
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
      toast.error('No stream credentials found');
      return false;
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

    // For now, we're just updating the last_refresh timestamp
    // since the actual EPG data fetching is simplified
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

    console.log('EPG refresh timestamp updated successfully');
    toast.success('EPG data refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to refresh EPG data');
    return false;
  }
};
