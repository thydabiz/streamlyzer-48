
import localforage from 'localforage';
import { Channel, EPGProgram } from '@/types/epg';

// Initialize databases
const channelsDB = localforage.createInstance({
  name: 'streamlyzer',
  storeName: 'channels'
});

const programsDB = localforage.createInstance({
  name: 'streamlyzer',
  storeName: 'programs'
});

const settingsDB = localforage.createInstance({
  name: 'streamlyzer',
  storeName: 'settings'
});

const credentialsDB = localforage.createInstance({
  name: 'streamlyzer',
  storeName: 'credentials'
});

// Channel operations
export const storeChannelsOffline = async (channels: Channel[]): Promise<void> => {
  try {
    console.log(`Storing ${channels.length} channels offline`);
    // Store each channel by ID for easy retrieval
    for (const channel of channels) {
      await channelsDB.setItem(channel.id, channel);
    }
    // Also store the list of all channel IDs for listing
    await channelsDB.setItem('all_channel_ids', channels.map(c => c.id));
    console.log('Successfully stored channels offline');
  } catch (error) {
    console.error('Error storing channels offline:', error);
    throw error;
  }
};

export const getChannelsOffline = async (): Promise<Channel[]> => {
  try {
    const channelIds = await channelsDB.getItem<string[]>('all_channel_ids');
    if (!channelIds || channelIds.length === 0) {
      return [];
    }
    
    const channels: Channel[] = [];
    for (const id of channelIds) {
      const channel = await channelsDB.getItem<Channel>(id);
      if (channel) {
        channels.push(channel);
      }
    }
    return channels;
  } catch (error) {
    console.error('Error retrieving offline channels:', error);
    return [];
  }
};

// Programs operations
export const storeProgramsOffline = async (programs: EPGProgram[]): Promise<void> => {
  try {
    console.log(`Storing ${programs.length} programs offline`);
    
    // Group programs by channel for easier retrieval
    const programsByChannel: { [key: string]: EPGProgram[] } = {};
    for (const program of programs) {
      if (!program.channel) continue;
      
      if (!programsByChannel[program.channel]) {
        programsByChannel[program.channel] = [];
      }
      programsByChannel[program.channel].push(program);
    }
    
    // Store programs by channel
    for (const [channelId, channelPrograms] of Object.entries(programsByChannel)) {
      await programsDB.setItem(`channel_${channelId}`, channelPrograms);
    }
    
    // Store all program IDs
    await programsDB.setItem('all_program_ids', programs.map(p => p.id));
    console.log('Successfully stored programs offline');
  } catch (error) {
    console.error('Error storing programs offline:', error);
    throw error;
  }
};

export const getProgramScheduleOffline = async (channelId: string): Promise<EPGProgram[]> => {
  try {
    const programs = await programsDB.getItem<EPGProgram[]>(`channel_${channelId}`);
    return programs || [];
  } catch (error) {
    console.error(`Error retrieving offline program schedule for channel ${channelId}:`, error);
    return [];
  }
};

export const getCurrentProgramOffline = async (channelId: string): Promise<EPGProgram | undefined> => {
  try {
    const programs = await getProgramScheduleOffline(channelId);
    const now = new Date();
    
    return programs.find(program => {
      const startTime = new Date(program.startTime);
      const endTime = new Date(program.endTime);
      return startTime <= now && endTime >= now;
    });
  } catch (error) {
    console.error(`Error retrieving current program for channel ${channelId}:`, error);
    return undefined;
  }
};

// Credentials storage
export const storeCredentialsOffline = async (credentials: any): Promise<void> => {
  try {
    await credentialsDB.setItem('stream_credentials', credentials);
    console.log('Successfully stored credentials offline');
  } catch (error) {
    console.error('Error storing credentials offline:', error);
    throw error;
  }
};

export const getCredentialsOffline = async (): Promise<any | null> => {
  try {
    return await credentialsDB.getItem('stream_credentials');
  } catch (error) {
    console.error('Error retrieving offline credentials:', error);
    return null;
  }
};

// Settings storage
export const storeEPGSettingsOffline = async (settings: any): Promise<void> => {
  try {
    await settingsDB.setItem('epg_settings', settings);
  } catch (error) {
    console.error('Error storing EPG settings offline:', error);
    throw error;
  }
};

export const getEPGSettingsOffline = async (): Promise<any> => {
  try {
    const settings = await settingsDB.getItem('epg_settings');
    return settings || { refresh_days: 7, last_refresh: new Date().toISOString() };
  } catch (error) {
    console.error('Error retrieving offline EPG settings:', error);
    return { refresh_days: 7, last_refresh: new Date().toISOString() };
  }
};

// Data synchronization
export const synchronizeData = async (): Promise<void> => {
  // This function would be called when the app comes online
  // to sync offline data with the remote database
  console.log('Synchronizing offline data with remote database...');
  // Implement synchronization logic here
};
