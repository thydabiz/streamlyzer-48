
export interface EPGProgram {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  category: string;
  channel: string;
  rating?: string;
  thumbnail?: string;
}

export interface Channel {
  id: string;
  name: string;
  number: number;
  streamUrl: string;
  logo?: string;
}
