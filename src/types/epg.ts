
export interface EPGProgram {
  id?: string;
  channel_id?: string; // For backward compatibility
  channel?: string;
  title: string;
  description: string;
  start_time?: string; // For backward compatibility
  startTime: string;
  end_time?: string; // For backward compatibility
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
  category?: string; // Add category to Channel interface
}
