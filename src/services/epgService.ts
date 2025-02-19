
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EPGProgram, Channel } from '@/types/epg';

export const getChannels = async (): Promise<Channel[]> => {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('number');

  if (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }

  return data.map(channel => ({
    id: channel.id,
    name: channel.name,
    number: channel.number || 0,
    streamUrl: channel.stream_url,
    logo: channel.logo
  }));
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
    // First, delete all existing EPG data
    const { error: deleteError } = await supabase
      .from('programs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) throw deleteError;

    // Get credentials to fetch new EPG data
    const { data: credentials } = await supabase
      .from('stream_credentials')
      .select('*')
      .maybeSingle();

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

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Failed to fetch EPG data');

    toast.success('EPG data refreshed successfully');
    return data;
  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    toast.error('Failed to refresh EPG data');
    throw error;
  }
};
