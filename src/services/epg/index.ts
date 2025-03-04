
import { supabase } from '@/integrations/supabase/client';
import { Channel, EPGProgram } from '@/types/epg';
import localforage from 'localforage';
import { refreshEPGData } from './epgRefreshService';
import { generateSampleChannels, generateSampleMovies, generateSampleTVShows } from '../sampleDataService';
import { toast } from 'sonner';

const CHANNELS_CACHE_KEY = 'epg_channels';

// Get channels from cache
const getChannelsFromCache = async (): Promise<Channel[]> => {
  try {
    return await localforage.getItem<Channel[]>(CHANNELS_CACHE_KEY) || [];
  } catch (error) {
    console.error('Error getting channels from cache:', error);
    return [];
  }
};

// Store channels in cache
const storeChannelsInCache = async (channels: Channel[]): Promise<void> => {
  try {
    await localforage.setItem(CHANNELS_CACHE_KEY, channels);
  } catch (error) {
    console.error('Error storing channels in cache:', error);
  }
};

// Fetch programs for a specific channel
export const fetchProgramsForChannel = async (channelId: string): Promise<EPGProgram[]> => {
  try {
    console.log(`Fetching programs for channel ${channelId}`);
    // Try to fetch from Supabase first
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('channel_id', channelId)
      .order('start_time', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} programs for channel ${channelId}`);
      // Convert database format to EPGProgram format
      const programs = data.map(item => ({
        id: item.id,
        channel: item.channel_id,
        channel_id: item.channel_id,
        title: item.title,
        description: item.description,
        startTime: item.start_time,
        start_time: item.start_time,
        endTime: item.end_time,
        end_time: item.end_time,
        category: item.category,
        rating: item.rating,
        thumbnail: item.thumbnail
      }));
      
      // Store in cache
      await storeProgramsInCache(programs);
      return programs;
    }
    
    // If no data from database, generate sample programs
    console.log(`No programs found for channel ${channelId}, generating samples`);
    const samplePrograms = generateSampleProgramsForChannel(channelId, 10);
    await storeProgramsInCache(samplePrograms);
    return samplePrograms;
  } catch (error) {
    console.error(`Error fetching programs for channel ${channelId}:`, error);
    // Generate sample programs as fallback
    const samplePrograms = generateSampleProgramsForChannel(channelId, 10);
    await storeProgramsInCache(samplePrograms);
    return samplePrograms;
  }
};

// Get all channels with pagination
export const getChannels = async (offset: number = 0, limit: number = 100): Promise<Channel[]> => {
  try {
    const cachedChannels = await getChannelsFromCache();
    
    if (cachedChannels && cachedChannels.length > 0) {
      const paginatedChannels = cachedChannels.slice(offset, offset + limit);
      return paginatedChannels;
    }
    
    // If no cached channels, get sample channels
    const sampleChannels = generateSampleChannels(50);
    await storeChannelsInCache(sampleChannels);
    return sampleChannels.slice(offset, offset + limit);
  } catch (error) {
    console.error('Error getting channels:', error);
    // Return sample channels if there's an error
    const sampleChannels = generateSampleChannels(50);
    return sampleChannels.slice(offset, offset + limit);
  }
};

// Get programs for a specific channel
export const getProgramSchedule = async (channelId: string): Promise<EPGProgram[]> => {
  try {
    const programs = await getProgramsFromCache(channelId);
    
    if (programs && programs.length > 0) {
      return programs.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    }
    
    // If no programs found, generate sample programs
    const samplePrograms = generateSampleProgramsForChannel(channelId, 10);
    await storeProgramsInCache(samplePrograms);
    return samplePrograms;
  } catch (error) {
    console.error('Error getting program schedule:', error);
    const samplePrograms = generateSampleProgramsForChannel(channelId, 10);
    return samplePrograms;
  }
};

// Get programs from cache for a specific channel
const getProgramsFromCache = async (channelId: string): Promise<EPGProgram[]> => {
  try {
    const programs = await localforage.getItem<Record<string, EPGProgram[]>>('epg_programs') || {};
    return programs[channelId] || [];
  } catch (error) {
    console.error('Error getting programs from cache:', error);
    return [];
  }
};

// Store programs in cache
const storeProgramsInCache = async (programs: EPGProgram[]): Promise<void> => {
  try {
    if (!programs || programs.length === 0) return;
    
    // Group programs by channel
    const programsByChannel: Record<string, EPGProgram[]> = {};
    
    // Get existing programs first
    const existingPrograms = await localforage.getItem<Record<string, EPGProgram[]>>('epg_programs') || {};
    
    // Merge with existing programs
    for (const channel in existingPrograms) {
      programsByChannel[channel] = [...existingPrograms[channel]];
    }
    
    // Add new programs
    for (const program of programs) {
      if (!program.channel_id && !program.channel) continue;
      
      const channelId = program.channel_id || program.channel;
      
      if (!programsByChannel[channelId]) {
        programsByChannel[channelId] = [];
      }
      
      // Check if program already exists (avoid duplicates)
      const exists = programsByChannel[channelId].some(p => 
        p.title === program.title && 
        p.startTime === program.startTime && 
        p.endTime === program.endTime
      );
      
      if (!exists) {
        programsByChannel[channelId].push(program);
      }
    }
    
    await localforage.setItem('epg_programs', programsByChannel);
  } catch (error) {
    console.error('Error storing programs in cache:', error);
  }
};

// Generate sample programs for a specific channel
const generateSampleProgramsForChannel = (channelId: string, count: number = 10): EPGProgram[] => {
  const programs: EPGProgram[] = [];
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < count; i++) {
    const startTime = new Date(startOfDay);
    startTime.setHours(startTime.getHours() + (i * 3)); // Programs every 3 hours
    
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 3); // 3-hour programs
    
    const program: EPGProgram = {
      id: `prog_${channelId}_${i}`,
      channel: channelId,
      channel_id: channelId,
      title: `Program ${i + 1} on ${channelId}`,
      description: `This is a sample program ${i + 1} for channel ${channelId}`,
      startTime: startTime.toISOString(),
      start_time: startTime.toISOString(),
      endTime: endTime.toISOString(),
      end_time: endTime.toISOString(),
      category: i % 3 === 0 ? 'Movie' : i % 2 === 0 ? 'Series' : 'News',
      rating: 'PG',
      thumbnail: null
    };
    
    programs.push(program);
  }
  
  return programs;
};

// Get current program for a channel
export const getCurrentProgram = async (channelId: string): Promise<EPGProgram | undefined> => {
  try {
    const now = new Date();
    const programs = await getProgramsFromCache(channelId);
    
    if (programs.length === 0) {
      // No programs found, return a generated current program
      const start = new Date(now);
      start.setHours(start.getHours() - 1);
      const end = new Date(now);
      end.setHours(end.getHours() + 1);
      
      return {
        id: `current_${channelId}`,
        channel: channelId,
        channel_id: channelId,
        title: `Current Program on ${channelId}`,
        description: `This is the current program for channel ${channelId}`,
        startTime: start.toISOString(),
        start_time: start.toISOString(),
        endTime: end.toISOString(),
        end_time: end.toISOString(),
        category: 'Live',
        rating: 'PG',
        thumbnail: null
      };
    }
    
    // Find the program that is currently playing
    return programs.find(program => {
      const startTime = new Date(program.startTime);
      const endTime = new Date(program.endTime);
      return now >= startTime && now <= endTime;
    });
  } catch (error) {
    console.error('Error getting current program for channel:', error);
    return undefined;
  }
};

// Get movies from the service
export const getMovies = async (offset: number = 0, limit: number = 100): Promise<EPGProgram[]> => {
  try {
    // Try to fetch from database first
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .ilike('category', '%movie%')
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} movies in database`);
      // Convert database format to EPGProgram format
      return data.map(item => ({
        id: item.id,
        channel: item.channel_id,
        channel_id: item.channel_id,
        title: item.title,
        description: item.description,
        startTime: item.start_time,
        start_time: item.start_time,
        endTime: item.end_time,
        end_time: item.end_time,
        category: item.category,
        rating: item.rating,
        thumbnail: item.thumbnail
      }));
    }
    
    // No data from database, generate sample movies
    console.log('Generating sample movies');
    const sampleMovies = generateSampleMovies(100);
    return sampleMovies.slice(offset, offset + limit);
    
  } catch (error) {
    console.error('Error fetching movies:', error);
    // Generate sample movies as fallback
    const sampleMovies = generateSampleMovies(100);
    return sampleMovies.slice(offset, offset + limit);
  }
};

// Get TV shows from the service
export const getTVShows = async (offset: number = 0, limit: number = 100): Promise<EPGProgram[]> => {
  try {
    // Try to fetch from database first
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .ilike('category', '%series%')
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} TV shows in database`);
      // Convert database format to EPGProgram format
      return data.map(item => ({
        id: item.id,
        channel: item.channel_id,
        channel_id: item.channel_id,
        title: item.title,
        description: item.description,
        startTime: item.start_time,
        start_time: item.start_time,
        endTime: item.end_time,
        end_time: item.end_time,
        category: item.category,
        rating: item.rating,
        thumbnail: item.thumbnail
      }));
    }
    
    // No data from database, generate sample TV shows
    console.log('Generating sample TV shows');
    const sampleShows = generateSampleTVShows(100);
    return sampleShows.slice(offset, offset + limit);
    
  } catch (error) {
    console.error('Error fetching TV shows:', error);
    // Generate sample TV shows as fallback
    const sampleShows = generateSampleTVShows(100);
    return sampleShows.slice(offset, offset + limit);
  }
};

// Refresh EPG data
export { refreshEPGData } from './epgRefreshService';
