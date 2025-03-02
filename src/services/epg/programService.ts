
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EPGProgram } from '@/types/epg';
import { getStoredCredentials } from '../iptvService';
import { storeEPGPrograms } from './epgStorageService';
import { 
  getProgramScheduleOffline, 
  getCurrentProgramOffline,
  storeProgramsOffline 
} from '../offlineStorage';

export const getCurrentProgram = async (channelId: string): Promise<EPGProgram | undefined> => {
  console.log(`Fetching current program for channel ${channelId}...`);
  
  try {
    // First check offline storage
    const offlineProgram = await getCurrentProgramOffline(channelId);
    if (offlineProgram) {
      console.log(`Found current program for channel ${channelId} in offline storage:`, offlineProgram.title);
      return offlineProgram;
    }
    
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

    if (!data) {
      console.log(`No current program found for channel ${channelId}`);
      
      // Since we didn't find a program, let's try to fetch EPG data for this channel
      await fetchProgramsForChannel(channelId);
      
      return undefined;
    }

    console.log(`Found current program for channel ${channelId}:`, data.title);
    const mappedProgram = mapProgramData(data);
    
    // Store the program data offline
    await storeProgramsOffline([mappedProgram]);
    
    return mappedProgram;
  } catch (error) {
    console.error('Error in getCurrentProgram:', error);
    return undefined;
  }
};

// New function to specifically fetch program data for a single channel
export const fetchProgramsForChannel = async (channelId: string): Promise<boolean> => {
  try {
    console.log(`Fetching program data specifically for channel ${channelId}`);
    const credentials = await getStoredCredentials();
    if (!credentials) {
      console.error('No credentials found for fetching program data');
      return false;
    }
    
    const { data: response, error } = await supabase.functions.invoke('xtream-auth', {
      body: {
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        action: 'get_epg',
        stream_id: channelId
      }
    });
    
    if (error || !response?.success) {
      console.error('Failed to fetch program data for channel:', error || response);
      return false;
    }
    
    if (response.data && (Array.isArray(response.data.epg_listings) || Array.isArray(response.data.programs))) {
      const programsData = Array.isArray(response.data.epg_listings) 
        ? response.data.epg_listings 
        : (Array.isArray(response.data.programs) ? response.data.programs : []);
      
      if (programsData.length > 0) {
        console.log(`Processing ${programsData.length} programs for channel ${channelId}`);
        await storeEPGPrograms(programsData);
        return true;
      }
    }
    
    console.log(`No program data found for channel ${channelId}`);
    return false;
  } catch (error) {
    console.error(`Error fetching programs for channel ${channelId}:`, error);
    return false;
  }
};

export const getProgramSchedule = async (channelId: string): Promise<EPGProgram[]> => {
  console.log(`Fetching program schedule for channel ${channelId}...`);
  
  try {
    // First try to get program schedule from offline storage
    const offlineSchedule = await getProgramScheduleOffline(channelId);
    if (offlineSchedule && offlineSchedule.length > 0) {
      console.log(`Found ${offlineSchedule.length} programs in offline schedule for channel ${channelId}`);
      return offlineSchedule;
    }
    
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
      return [];
    }

    if (!data || data.length === 0) {
      console.log(`No program schedule found for channel ${channelId}, attempting to fetch`);
      await fetchProgramsForChannel(channelId);
      
      // Try fetching again after program data has been updated
      const { data: retryData, error: retryError } = await supabase
        .from('programs')
        .select('*')
        .eq('channel_id', channelId)
        .gte('end_time', startTime)
        .lte('start_time', endTime)
        .order('start_time');
        
      if (retryError) {
        console.error('Error in retry fetch of program schedule:', retryError);
        return [];
      }
      
      console.log(`Found ${retryData.length} programs in schedule for channel ${channelId} after fetching`);
      
      const mappedPrograms = retryData.map(mapProgramData);
      
      // Store program data offline
      if (mappedPrograms.length > 0) {
        await storeProgramsOffline(mappedPrograms);
      }
      
      return mappedPrograms;
    }

    console.log(`Found ${data.length} programs in schedule for channel ${channelId}`);
    
    const mappedPrograms = data.map(mapProgramData);
    
    // Store program data offline
    if (mappedPrograms.length > 0) {
      await storeProgramsOffline(mappedPrograms);
    }
    
    return mappedPrograms;
  } catch (error) {
    console.error('Error in getProgramSchedule:', error);
    return [];
  }
};

export const getMovies = async (): Promise<EPGProgram[]> => {
  console.log('Fetching movies...');
  try {
    // First check if we have any movies in the programs table
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .ilike('category', '%movie%')
      .order('start_time', { ascending: false })
      .limit(20);  // Limit the results to avoid performance issues

    if (error) {
      console.error('Error fetching movies:', error);
      return [];
    }

    if (!data || data.length === 0) {
      // If no movies found, try to fetch program data
      console.log('No movies found in database, attempting to refresh EPG data...');
      await refreshEPGData();
      
      // Try again after refreshing
      const { data: retryData, error: retryError } = await supabase
        .from('programs')
        .select('*')
        .ilike('category', '%movie%')
        .order('start_time', { ascending: false })
        .limit(20);
        
      if (retryError) {
        console.error('Error in retry fetch of movies:', retryError);
        return [];
      }
      
      console.log(`Found ${retryData.length} movies after refreshing EPG data`);
      return retryData.map(mapProgramData);
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
    // First check if we have any shows in the programs table
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .not('category', 'ilike', '%movie%')
      .order('start_time', { ascending: false })
      .limit(20);  // Limit the results to avoid performance issues

    if (error) {
      console.error('Error fetching shows:', error);
      return [];
    }

    if (!data || data.length === 0) {
      // If no shows found, try to refresh program data
      console.log('No shows found in database, attempting to refresh EPG data...');
      await refreshEPGData();
      
      // Try again after refreshing
      const { data: retryData, error: retryError } = await supabase
        .from('programs')
        .select('*')
        .not('category', 'ilike', '%movie%')
        .order('start_time', { ascending: false })
        .limit(20);
        
      if (retryError) {
        console.error('Error in retry fetch of shows:', retryError);
        return [];
      }
      
      console.log(`Found ${retryData.length} shows after refreshing EPG data`);
      return retryData.map(mapProgramData);
    }

    console.log(`Found ${data.length} shows`);
    return data.map(mapProgramData);
  } catch (error) {
    console.error('Error in getShows:', error);
    return [];
  }
};

export const mapProgramData = (program: any): EPGProgram => ({
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

// Import from epgRefreshService to avoid circular dependencies
import { refreshEPGData } from './epgRefreshService';
