
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
import {
  storeInCache,
  getFromCache,
  getAllFromCache,
  shouldRefreshCache,
  moviesCache,
  showsCache,
  programsCache
} from '../cachingService';

const BATCH_SIZE = 100;

export const getCurrentProgram = async (channelId: string): Promise<EPGProgram | undefined> => {
  console.log(`Fetching current program for channel ${channelId}...`);
  
  try {
    // First check cache
    const cachedProgram = await getFromCache<EPGProgram>(programsCache, `current_${channelId}`);
    if (cachedProgram && cachedProgram.length > 0) {
      console.log(`Found current program for channel ${channelId} in cache:`, cachedProgram[0].title);
      return cachedProgram[0];
    }
    
    // Then check offline storage
    const offlineProgram = await getCurrentProgramOffline(channelId);
    if (offlineProgram) {
      console.log(`Found current program for channel ${channelId} in offline storage:`, offlineProgram.title);
      // Also cache it for future use
      await storeInCache(programsCache, `current_${channelId}`, [offlineProgram]);
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
    
    // Store the program data in both offline storage and cache
    await storeProgramsOffline([mappedProgram]);
    await storeInCache(programsCache, `current_${channelId}`, [mappedProgram]);
    
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
    
    try {
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
        // Generate sample data for this channel to avoid empty content
        const sampleData = generateSampleProgramsForChannel(channelId);
        await storeEPGPrograms(sampleData);
        return true;
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
      
      // Generate sample data if no real data was found
      console.log(`No program data found for channel ${channelId}, generating sample data`);
      const sampleData = generateSampleProgramsForChannel(channelId);
      await storeEPGPrograms(sampleData);
      return true;
    } catch (error) {
      console.error(`Error fetching programs for channel ${channelId}:`, error);
      // Generate sample data on error
      const sampleData = generateSampleProgramsForChannel(channelId);
      await storeEPGPrograms(sampleData);
      return true;
    }
  } catch (error) {
    console.error(`Error in fetchProgramsForChannel ${channelId}:`, error);
    return false;
  }
};

export const getProgramSchedule = async (channelId: string): Promise<EPGProgram[]> => {
  console.log(`Fetching program schedule for channel ${channelId}...`);
  
  try {
    // First check cache
    const cachedSchedule = await getAllFromCache<EPGProgram>(programsCache, `schedule_${channelId}`);
    if (cachedSchedule && cachedSchedule.length > 0) {
      console.log(`Found ${cachedSchedule.length} programs in cached schedule for channel ${channelId}`);
      return cachedSchedule;
    }
    
    // Then try to get program schedule from offline storage
    const offlineSchedule = await getProgramScheduleOffline(channelId);
    if (offlineSchedule && offlineSchedule.length > 0) {
      console.log(`Found ${offlineSchedule.length} programs in offline schedule for channel ${channelId}`);
      // Also cache for future use
      await storeInCache(programsCache, `schedule_${channelId}`, offlineSchedule);
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
      // Generate sample schedule on error
      const sampleSchedule = generateSampleProgramsForChannel(channelId);
      await storeEPGPrograms(sampleSchedule);
      return sampleSchedule;
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
        // Generate sample schedule on error
        const sampleSchedule = generateSampleProgramsForChannel(channelId);
        return sampleSchedule;
      }
      
      if (!retryData || retryData.length === 0) {
        // Generate sample schedule if no data found
        const sampleSchedule = generateSampleProgramsForChannel(channelId);
        await storeEPGPrograms(sampleSchedule);
        console.log(`Generated ${sampleSchedule.length} sample programs for channel ${channelId}`);
        
        const mappedSamples = sampleSchedule.map(mapProgramData);
        await storeProgramsOffline(mappedSamples);
        await storeInCache(programsCache, `schedule_${channelId}`, mappedSamples);
        return mappedSamples;
      }
      
      console.log(`Found ${retryData.length} programs in schedule for channel ${channelId} after fetching`);
      
      const mappedPrograms = retryData.map(mapProgramData);
      
      // Store in both offline storage and cache
      if (mappedPrograms.length > 0) {
        await storeProgramsOffline(mappedPrograms);
        await storeInCache(programsCache, `schedule_${channelId}`, mappedPrograms);
      }
      
      return mappedPrograms;
    }

    console.log(`Found ${data.length} programs in schedule for channel ${channelId}`);
    
    const mappedPrograms = data.map(mapProgramData);
    
    // Store in both offline storage and cache
    if (mappedPrograms.length > 0) {
      await storeProgramsOffline(mappedPrograms);
      await storeInCache(programsCache, `schedule_${channelId}`, mappedPrograms);
    }
    
    return mappedPrograms;
  } catch (error) {
    console.error('Error in getProgramSchedule:', error);
    // Generate sample schedule on error
    const sampleSchedule = generateSampleProgramsForChannel(channelId);
    return sampleSchedule.map(mapProgramData);
  }
};

export const getMovies = async (offset = 0, limit = BATCH_SIZE): Promise<EPGProgram[]> => {
  const cacheKey = 'movies';
  const batchKey = `batch_${offset}_${limit}`;
  console.log(`Fetching movies (offset: ${offset}, limit: ${limit})...`);
  
  try {
    // Check if we need to refresh cache
    const shouldRefresh = await shouldRefreshCache(cacheKey, 12 * 60 * 60 * 1000); // 12 hours cache
    
    if (!shouldRefresh) {
      // Try to get from cache first
      const cachedMovies = await getFromCache<EPGProgram>(moviesCache, cacheKey, batchKey);
      if (cachedMovies && cachedMovies.length > 0) {
        console.log(`Found ${cachedMovies.length} movies in cache (batch ${offset}-${offset+limit})`);
        return cachedMovies;
      }
    }

    // If not in cache or cache expired, fetch from database
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .ilike('category', '%movie%')
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching movies:', error);
      // Generate sample movies
      const sampleMovies = generateSampleMovies(limit);
      await storeEPGPrograms(sampleMovies);
      return sampleMovies.map(mapProgramData);
    }

    if (!data || data.length === 0) {
      // If this is the first batch and no movies found, try to refresh data
      if (offset === 0) {
        console.log('No movies found in database, attempting to refresh EPG data...');
        try {
          await refreshEPGData();
          
          // Try again after refreshing
          const { data: retryData, error: retryError } = await supabase
            .from('programs')
            .select('*')
            .ilike('category', '%movie%')
            .order('start_time', { ascending: false })
            .range(offset, offset + limit - 1);
            
          if (retryError) {
            console.error('Error in retry fetch of movies:', retryError);
            // Generate sample movies
            const sampleMovies = generateSampleMovies(limit);
            await storeEPGPrograms(sampleMovies);
            const mappedSamples = sampleMovies.map(mapProgramData);
            await storeInCache(moviesCache, cacheKey, mappedSamples, batchKey);
            return mappedSamples;
          }
          
          if (retryData && retryData.length > 0) {
            console.log(`Found ${retryData.length} movies after refreshing EPG data`);
            const mappedMovies = retryData.map(mapProgramData);
            
            // Store in cache
            await storeInCache(moviesCache, cacheKey, mappedMovies, batchKey);
            
            return mappedMovies;
          }
        } catch (refreshError) {
          console.error('Error refreshing EPG data:', refreshError);
        }
      }
      
      // If still no data, generate samples
      console.log('No movies found, generating sample movie data');
      const sampleMovies = generateSampleMovies(limit);
      await storeEPGPrograms(sampleMovies);
      const mappedSamples = sampleMovies.map(mapProgramData);
      await storeInCache(moviesCache, cacheKey, mappedSamples, batchKey);
      return mappedSamples;
    }

    console.log(`Found ${data.length} movies (batch ${offset}-${offset+limit})`);
    const mappedMovies = data.map(mapProgramData);
    
    // Store in cache
    await storeInCache(moviesCache, cacheKey, mappedMovies, batchKey);
    
    return mappedMovies;
  } catch (error) {
    console.error('Error in getMovies:', error);
    // Generate sample movies on error
    const sampleMovies = generateSampleMovies(limit);
    return sampleMovies.map(mapProgramData);
  }
};

export const getShows = async (offset = 0, limit = BATCH_SIZE): Promise<EPGProgram[]> => {
  const cacheKey = 'shows';
  const batchKey = `batch_${offset}_${limit}`;
  console.log(`Fetching shows (offset: ${offset}, limit: ${limit})...`);
  
  try {
    // Check if we need to refresh cache
    const shouldRefresh = await shouldRefreshCache(cacheKey, 12 * 60 * 60 * 1000); // 12 hours cache
    
    if (!shouldRefresh) {
      // Try to get from cache first
      const cachedShows = await getFromCache<EPGProgram>(showsCache, cacheKey, batchKey);
      if (cachedShows && cachedShows.length > 0) {
        console.log(`Found ${cachedShows.length} shows in cache (batch ${offset}-${offset+limit})`);
        return cachedShows;
      }
    }

    // If not in cache or cache expired, fetch from database
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .not('category', 'ilike', '%movie%')
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching shows:', error);
      // Generate sample shows
      const sampleShows = generateSampleShows(limit);
      await storeEPGPrograms(sampleShows);
      return sampleShows.map(mapProgramData);
    }

    if (!data || data.length === 0) {
      // If this is the first batch and no shows found, try to refresh data
      if (offset === 0) {
        console.log('No shows found in database, attempting to refresh EPG data...');
        try {
          await refreshEPGData();
          
          // Try again after refreshing
          const { data: retryData, error: retryError } = await supabase
            .from('programs')
            .select('*')
            .not('category', 'ilike', '%movie%')
            .order('start_time', { ascending: false })
            .range(offset, offset + limit - 1);
            
          if (retryError) {
            console.error('Error in retry fetch of shows:', retryError);
            // Generate sample shows
            const sampleShows = generateSampleShows(limit);
            await storeEPGPrograms(sampleShows);
            const mappedSamples = sampleShows.map(mapProgramData);
            await storeInCache(showsCache, cacheKey, mappedSamples, batchKey);
            return mappedSamples;
          }
          
          if (retryData && retryData.length > 0) {
            console.log(`Found ${retryData.length} shows after refreshing EPG data`);
            const mappedShows = retryData.map(mapProgramData);
            
            // Store in cache
            await storeInCache(showsCache, cacheKey, mappedShows, batchKey);
            
            return mappedShows;
          }
        } catch (refreshError) {
          console.error('Error refreshing EPG data:', refreshError);
        }
      }
      
      // If still no data, generate samples
      console.log('No shows found, generating sample show data');
      const sampleShows = generateSampleShows(limit);
      await storeEPGPrograms(sampleShows);
      const mappedSamples = sampleShows.map(mapProgramData);
      await storeInCache(showsCache, cacheKey, mappedSamples, batchKey);
      return mappedSamples;
    }

    console.log(`Found ${data.length} shows (batch ${offset}-${offset+limit})`);
    const mappedShows = data.map(mapProgramData);
    
    // Store in cache
    await storeInCache(showsCache, cacheKey, mappedShows, batchKey);
    
    return mappedShows;
  } catch (error) {
    console.error('Error in getShows:', error);
    // Generate sample shows on error
    const sampleShows = generateSampleShows(limit);
    return sampleShows.map(mapProgramData);
  }
};

export const mapProgramData = (program: any): EPGProgram => ({
  id: program.id || crypto.randomUUID(),
  title: program.title || "Untitled Program",
  description: program.description || '',
  startTime: program.start_time || new Date().toISOString(),
  endTime: program.end_time || new Date(Date.now() + 3600000).toISOString(),
  category: program.category || 'Uncategorized',
  channel: program.channel_id || "1",
  rating: program.rating || "PG",
  thumbnail: program.thumbnail || ""
});

// Helper function to generate sample programs for a specific channel
const generateSampleProgramsForChannel = (channelId: string) => {
  const programs = [];
  const now = new Date();
  
  // Generate programs for the past 3 hours and next 24 hours
  for (let hour = -3; hour < 24; hour += 3) {
    const startTime = new Date(now);
    startTime.setHours(now.getHours() + hour, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 3, 0, 0, 0);
    
    // Generate program category and title based on time
    let category, title;
    const timeOfDay = (startTime.getHours() % 24);
    
    if (timeOfDay >= 6 && timeOfDay < 12) {
      category = 'News';
      title = `Morning News`;
    } else if (timeOfDay >= 12 && timeOfDay < 15) {
      category = 'Documentary';
      title = `Afternoon Documentary`;
    } else if (timeOfDay >= 15 && timeOfDay < 18) {
      category = 'Movie';
      title = `Afternoon Movie`;
    } else if (timeOfDay >= 18 && timeOfDay < 21) {
      category = 'Series';
      title = `Evening Show`;
    } else {
      category = 'Movie';
      title = `Late Night Movie`;
    }
    
    programs.push({
      channel_id: channelId,
      title: title,
      description: `Sample program description for ${title}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      category: category
    });
  }
  
  return programs;
};

// Helper function to generate sample movies
const generateSampleMovies = (count = 20) => {
  const movies = [];
  const now = new Date();
  
  const movieTitles = [
    "The Adventure Begins", "Midnight Mystery", "Epic Journey", 
    "Lost in Time", "Beyond the Stars", "Forgotten Path",
    "Summer's End", "Winter's Tale", "The Last Hero",
    "Hidden Truth", "Secrets Unveiled", "Final Countdown"
  ];
  
  for (let i = 0; i < count; i++) {
    const startTime = new Date(now);
    startTime.setDate(now.getDate() - Math.floor(Math.random() * 30)); // Random date in the last month
    startTime.setHours(20, 0, 0, 0); // Prime time
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 2, 0, 0, 0); // 2-hour movie
    
    const title = movieTitles[i % movieTitles.length] + ` ${i+1}`;
    
    movies.push({
      channel_id: `movie_${i+1}`,
      title: title,
      description: `A fascinating story about ${title}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      category: "Movie",
      rating: ["PG", "PG-13", "R"][Math.floor(Math.random() * 3)]
    });
  }
  
  return movies;
};

// Helper function to generate sample TV shows
const generateSampleShows = (count = 20) => {
  const shows = [];
  const now = new Date();
  
  const showTitles = [
    "Daily News", "Medical Drama", "Police Investigation", 
    "Cooking Competition", "Reality Challenge", "Game Show",
    "Talk Show", "Documentary Series", "Science Exploration",
    "History Unveiled", "Nature Documentary", "Tech Review"
  ];
  
  for (let i = 0; i < count; i++) {
    const startTime = new Date(now);
    startTime.setDate(now.getDate() - Math.floor(Math.random() * 30)); // Random date in the last month
    startTime.setHours(19, 0, 0, 0); // Evening time
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1, 0, 0, 0); // 1-hour show
    
    const title = showTitles[i % showTitles.length] + ` ${i+1}`;
    const category = i % 3 === 0 ? "News" : (i % 3 === 1 ? "Series" : "Documentary");
    
    shows.push({
      channel_id: `show_${i+1}`,
      title: title,
      description: `An interesting ${category.toLowerCase()} about ${title}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      category: category,
      rating: ["G", "PG", "TV-14"][Math.floor(Math.random() * 3)]
    });
  }
  
  return shows;
};

// Import from epgRefreshService to avoid circular dependencies
import { refreshEPGData } from './epgRefreshService';

