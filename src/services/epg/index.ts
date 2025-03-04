
import { getChannelsFromCache, storeChannelsInCache } from './channelService';
import { getProgramsFromCache, storeProgramsInCache, getCurrentProgramForChannel } from './programService';
import { refreshEPGDataFromAPI } from './epgRefreshService';
import { Channel, EPGProgram } from '@/types/epg';
import { generateSampleChannels, generateSampleMovies, generateSampleTVShows } from '../sampleDataService';
import { toast } from 'sonner';

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
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
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

// Fetch programs for a specific channel
export const fetchProgramsForChannel = async (channelId: string): Promise<EPGProgram[]> => {
  try {
    // Try to get from cache first
    const programs = await getProgramsFromCache(channelId);
    
    if (programs && programs.length > 0) {
      return programs;
    }
    
    // Generate sample programs
    const samplePrograms = generateSampleProgramsForChannel(channelId, 10);
    await storeProgramsInCache(samplePrograms);
    return samplePrograms;
  } catch (error) {
    console.error('Error fetching programs for channel:', error);
    const samplePrograms = generateSampleProgramsForChannel(channelId, 10);
    return samplePrograms;
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
      channel_id: channelId,
      title: `Program ${i + 1} on ${channelId}`,
      description: `This is a sample program ${i + 1} for channel ${channelId}`,
      start_time: startTime.toISOString(),
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
    return await getCurrentProgramForChannel(channelId);
  } catch (error) {
    console.error('Error getting current program:', error);
    // Generate a sample current program
    const now = new Date();
    const start = new Date(now);
    start.setHours(start.getHours() - 1);
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    
    return {
      channel_id: channelId,
      title: `Current Program on ${channelId}`,
      description: `This is the current program for channel ${channelId}`,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      category: 'Live',
      rating: 'PG',
      thumbnail: null
    };
  }
};

// Refresh EPG data
export const refreshEPGData = async (): Promise<void> => {
  try {
    toast.info("Refreshing EPG data...");
    await refreshEPGDataFromAPI();
    toast.success("EPG data refreshed successfully");
  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    // Generate and store sample data as a fallback
    const sampleChannels = generateSampleChannels(50);
    await storeChannelsInCache(sampleChannels);
    
    const sampleMovies = generateSampleMovies(100);
    await storeProgramsInCache(sampleMovies);
    
    const sampleShows = generateSampleTVShows(100);
    await storeProgramsInCache(sampleShows);
    
    toast.success("Generated sample data since API refresh failed");
  }
};

// Export other functions
export { getMovies, getTVShows } from './programService';
