
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EPGProgram, Channel } from '@/types/epg';
import { getStoredCredentials } from './iptvService';

export const getChannels = async (): Promise<Channel[]> => {
  try {
    const credentials = await getStoredCredentials();
    if (!credentials) {
      throw new Error('No stream credentials found');
    }

    const { data, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password
      }
    });

    if (error || !data.success) {
      throw new Error('Failed to fetch channels');
    }

    // Map the API response to our Channel type
    const channels = data.data.available_channels.map((channel: any) => ({
      id: channel.stream_id.toString(),
      name: channel.name || 'Unnamed Channel',
      number: channel.num || 0,
      streamUrl: `${credentials.url}/live/${credentials.username}/${credentials.password}/${channel.stream_id}`,
      logo: channel.stream_icon || null
    }));

    // Store channels in the database
    await storeChannels(channels);

    return channels;
  } catch (error) {
    console.error('Error fetching channels:', error);
    toast.error('Failed to fetch channels');
    throw error;
  }
};

const storeChannels = async (channels: Channel[]) => {
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
  } catch (error) {
    console.error('Error storing channels:', error);
    toast.error('Failed to store channels');
  }
};

export const getCurrentProgram = async (channelId: string): Promise<EPGProgram | undefined> => {
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

    return data ? {
      id: data.id,
      title: data.title,
      description: data.description || '',
      startTime: data.start_time,
      endTime: data.end_time,
      category: data.category || 'Uncategorized',
      channel: data.channel_id,
      rating: data.rating,
      thumbnail: data.thumbnail
    } : undefined;
  } catch (error) {
    console.error('Error in getCurrentProgram:', error);
    return undefined;
  }
};

export const getProgramSchedule = async (channelId: string): Promise<EPGProgram[]> => {
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

    return data.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description || '',
      startTime: program.start_time,
      endTime: program.end_time,
      category: program.category || 'Uncategorized',
      channel: program.channel_id,
      rating: program.rating,
      thumbnail: program.thumbnail
    }));
  } catch (error) {
    console.error('Error in getProgramSchedule:', error);
    return [];
  }
};

export const getMovies = async (): Promise<EPGProgram[]> => {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('category', 'Movie')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching movies:', error);
      return [];
    }

    return data.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description || '',
      startTime: program.start_time,
      endTime: program.end_time,
      category: program.category || 'Movie',
      channel: program.channel_id,
      rating: program.rating,
      thumbnail: program.thumbnail
    }));
  } catch (error) {
    console.error('Error in getMovies:', error);
    return [];
  }
};

export const getShows = async (): Promise<EPGProgram[]> => {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .not('category', 'eq', 'Movie')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching shows:', error);
      return [];
    }

    return data.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description || '',
      startTime: program.start_time,
      endTime: program.end_time,
      category: program.category || 'TV Show',
      channel: program.channel_id,
      rating: program.rating,
      thumbnail: program.thumbnail
    }));
  } catch (error) {
    console.error('Error in getShows:', error);
    return [];
  }
};

export const refreshEPGData = async () => {
  try {
    const credentials = await getStoredCredentials();
    if (!credentials) {
      throw new Error('No stream credentials found');
    }

    const { data, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'get_epg'
      }
    });

    if (error || !data.success) {
      throw new Error('Failed to fetch EPG data');
    }

    // Store EPG data in the programs table
    if (data.data && Array.isArray(data.data.programs)) {
      const programs = data.data.programs.map((program: any) => ({
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
        .upsert(programs, {
          onConflict: 'channel_id,start_time'
        });

      if (insertError) {
        console.error('Error storing programs:', insertError);
        throw insertError;
      }
    }

    await supabase
      .from('epg_settings')
      .upsert({
        refresh_days: 7,
        last_refresh: new Date().toISOString()
      });

    toast.success('EPG data refreshed successfully');
    return data;
  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    toast.error('Failed to refresh EPG data');
    throw error;
  }
};
