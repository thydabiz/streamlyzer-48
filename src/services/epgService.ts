
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
        password: credentials.password,
      }
    });

    if (error || !data.success) {
      throw new Error('Failed to fetch channels');
    }

    // Map the API response to our Channel type
    const channels = data.data.available_channels.map((channel: any) => ({
      id: channel.stream_id.toString(),
      name: channel.name,
      number: channel.num || 0,
      streamUrl: `${credentials.url}/live/${credentials.username}/${credentials.password}/${channel.stream_id}`,
      logo: channel.stream_icon || null
    }));

    return channels;
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }
};

export const getCurrentProgram = async (channelId: string): Promise<EPGProgram | undefined> => {
  const now = new Date().toISOString();
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
};

export const getProgramSchedule = async (channelId: string): Promise<EPGProgram[]> => {
  const now = new Date();
  const startTime = new Date(now.setHours(now.getHours() - 1)).toISOString();
  const endTime = new Date(now.setHours(now.getHours() + 4)).toISOString();

  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('channel_id', channelId)
    .gte('end_time', startTime)
    .lte('start_time', endTime)
    .order('start_time');

  if (error) {
    console.error('Error fetching program schedule:', error);
    throw error;
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
};

export const refreshEPGData = async () => {
  try {
    const credentials = await getStoredCredentials();
    if (!credentials) {
      throw new Error('No stream credentials found');
    }

    // Fetch new EPG data using the Edge Function
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

    // Update the last refresh timestamp
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
