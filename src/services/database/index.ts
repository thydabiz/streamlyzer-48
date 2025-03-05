import Dexie, { Table } from 'dexie';
import { Channel, EPGProgram, Setting } from './schema';

class StreamlyzerDB extends Dexie {
  channels!: Table<Channel>;
  epgPrograms!: Table<EPGProgram>;
  settings!: Table<Setting>;

  constructor() {
    super('streamlyzer');
    
    this.version(1).stores({
      channels: '++id, name, category',
      epgPrograms: '++id, channelId, startTime, endTime',
      settings: 'key, value'
    });
  }
}

export const db = new StreamlyzerDB();
