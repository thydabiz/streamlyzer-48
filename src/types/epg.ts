
export interface EPGProgram {
  id?: string;
  channel_id?: string;
  channel?: string;
  title: string;
  description: string;
  start_time?: string;
  startTime: string;
  end_time?: string;
  endTime: string;
  category: string;
  rating?: string;
  thumbnail?: string | null;
}

export interface Channel {
  id: string;
  name: string;
  number: number;
  streamUrl: string;
  logo?: string | null;
  epgChannelId?: string;
  category?: string;
}
