
import { EPGProgram, Channel } from '@/types/epg';

// Sample data - replace with actual EPG data source
const sampleChannels: Channel[] = [
  {
    id: '1',
    name: 'Sample Channel 1',
    number: 1,
    streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
  },
  {
    id: '2',
    name: 'Sample Channel 2',
    number: 2,
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
];

const samplePrograms: EPGProgram[] = [
  {
    id: '1',
    title: 'News Today',
    description: 'Latest news updates',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    category: 'News',
    channel: '1',
  },
  {
    id: '2',
    title: 'Sports World',
    description: 'Sports coverage',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    category: 'Sports',
    channel: '2',
  },
];

export const getChannels = (): Channel[] => {
  return sampleChannels;
};

export const getPrograms = (filters?: {
  category?: string;
  channel?: string;
  timeRange?: { start: string; end: string };
}): EPGProgram[] => {
  let filteredPrograms = [...samplePrograms];

  if (filters?.category) {
    filteredPrograms = filteredPrograms.filter(
      program => program.category === filters.category
    );
  }

  if (filters?.channel) {
    filteredPrograms = filteredPrograms.filter(
      program => program.channel === filters.channel
    );
  }

  if (filters?.timeRange) {
    filteredPrograms = filteredPrograms.filter(
      program =>
        new Date(program.startTime) >= new Date(filters.timeRange.start) &&
        new Date(program.endTime) <= new Date(filters.timeRange.end)
    );
  }

  return filteredPrograms;
};

export const getCurrentProgram = (channelId: string): EPGProgram | undefined => {
  const now = new Date();
  return samplePrograms.find(
    program =>
      program.channel === channelId &&
      new Date(program.startTime) <= now &&
      new Date(program.endTime) >= now
  );
};
