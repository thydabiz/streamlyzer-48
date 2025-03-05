export interface Channel {
  id: string;
  name: string;
  group: string;
  url: string;
  logo?: string;
  epgId?: string;
  lastAccessed?: Date;
}

export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  category?: string;
  rating?: string;
  language?: string;
}
