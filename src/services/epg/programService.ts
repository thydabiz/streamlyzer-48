
import { supabase } from '@/integrations/supabase/client';
import { EPGProgram } from '@/types/epg';
import localforage from 'localforage';
import { generateSampleMovies, generateSampleTVShows } from '../sampleDataService';

const PROGRAMS_CACHE_KEY = 'epg_programs';

// Get programs from cache for a specific channel
export const getProgramsFromCache = async (channelId: string): Promise<EPGProgram[]> => {
  try {
    const programs = await localforage.getItem<Record<string, EPGProgram[]>>(PROGRAMS_CACHE_KEY) || {};
    return programs[channelId] || [];
  } catch (error) {
    console.error('Error getting programs from cache:', error);
    return [];
  }
};

// Store programs in cache
export const storeProgramsInCache = async (programs: EPGProgram[]): Promise<void> => {
  try {
    if (!programs || programs.length === 0) return;
    
    // Group programs by channel
    const programsByChannel: Record<string, EPGProgram[]> = {};
    
    // Get existing programs first
    const existingPrograms = await localforage.getItem<Record<string, EPGProgram[]>>(PROGRAMS_CACHE_KEY) || {};
    
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
    
    await localforage.setItem(PROGRAMS_CACHE_KEY, programsByChannel);
  } catch (error) {
    console.error('Error storing programs in cache:', error);
  }
};

// Get current program for a channel
export const getCurrentProgramForChannel = async (channelId: string): Promise<EPGProgram | undefined> => {
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
        channel_id: channelId,
        channel: channelId,
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

// Get movies from the database or generate sample ones
export const getMovies = async ({
  search = '',
  categoryFilter,
  yearFilter,
  ratingFilter,
  offset = 0,
  limit = 100
}: {
  search?: string;
  categoryFilter?: string;
  yearFilter?: number;
  ratingFilter?: string;
  offset?: number;
  limit?: number;
}): Promise<EPGProgram[]> => {
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
      
      return filterPrograms(programs, search, categoryFilter, yearFilter, ratingFilter);
    }
    
    // No data from database, generate sample movies
    console.log('Generating sample movies');
    const sampleMovies = generateSampleMovies(100);
    return filterPrograms(sampleMovies, search, categoryFilter, yearFilter, ratingFilter)
      .slice(offset, offset + limit);
    
  } catch (error) {
    console.error('Error fetching movies:', error);
    // Generate sample movies as fallback
    const sampleMovies = generateSampleMovies(100);
    return filterPrograms(sampleMovies, search, categoryFilter, yearFilter, ratingFilter)
      .slice(offset, offset + limit);
  }
};

// Get TV shows from the database or generate sample ones
export const getTVShows = async ({
  search = '',
  categoryFilter,
  yearFilter,
  ratingFilter,
  offset = 0,
  limit = 100
}: {
  search?: string;
  categoryFilter?: string;
  yearFilter?: number;
  ratingFilter?: string;
  offset?: number;
  limit?: number;
}): Promise<EPGProgram[]> => {
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
      
      return filterPrograms(programs, search, categoryFilter, yearFilter, ratingFilter);
    }
    
    // No data from database, generate sample TV shows
    console.log('Generating sample TV shows');
    const sampleShows = generateSampleTVShows(100);
    return filterPrograms(sampleShows, search, categoryFilter, yearFilter, ratingFilter)
      .slice(offset, offset + limit);
    
  } catch (error) {
    console.error('Error fetching TV shows:', error);
    // Generate sample TV shows as fallback
    const sampleShows = generateSampleTVShows(100);
    return filterPrograms(sampleShows, search, categoryFilter, yearFilter, ratingFilter)
      .slice(offset, offset + limit);
  }
};

// Filter programs based on search, category, year, and rating
const filterPrograms = (
  programs: EPGProgram[],
  search?: string,
  categoryFilter?: string,
  yearFilter?: number,
  ratingFilter?: string
): EPGProgram[] => {
  return programs.filter(program => {
    // Search filter
    if (search && !program.title?.toLowerCase().includes(search.toLowerCase()) && 
        !program.description?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (categoryFilter && !program.category?.includes(categoryFilter)) {
      return false;
    }
    
    // Year filter
    if (yearFilter) {
      const programYear = new Date(program.startTime).getFullYear();
      if (programYear !== yearFilter) {
        return false;
      }
    }
    
    // Rating filter
    if (ratingFilter && program.rating !== ratingFilter) {
      return false;
    }
    
    return true;
  });
};

// Delete all programs from cache
export const clearProgramsCache = async (): Promise<void> => {
  try {
    await localforage.removeItem(PROGRAMS_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing programs cache:', error);
  }
};
