import Dexie, { Table } from 'dexie';

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
}

export interface AuthSession {
  username: string;
  password: string;
  serverUrl: string;
  token?: string;
  tokenExpiry?: Date;
  lastSync: Date;
}

export interface PlaybackHistory {
  channelId: string;
  timestamp: Date;
  duration: number;
  position: number;
}

export interface Setting {
  key: string;
  value: any;
}

export class StreamlyzerDB extends Dexie {
  channels!: Table<Channel>;
  epgPrograms!: Table<EPGProgram>;
  authSession!: Table<AuthSession>;
  playbackHistory!: Table<PlaybackHistory>;
  settings!: Table<Setting>;

  constructor() {
    super('StreamlyzerDB');
    
    this.version(1).stores({
      channels: '&id, group, epgId, lastAccessed',
      epgPrograms: '&id, channelId, startTime, endTime',
      authSession: '&username',
      playbackHistory: '++id, channelId, timestamp',
      settings: '&key'
    });

    // Add hooks for type checking
    this.channels.hook('creating', (primKey, obj) => {
      // Ensure required fields are present
      if (!obj.id || !obj.name || !obj.group || !obj.url) {
        throw new Error('Missing required channel fields');
      }
      return obj;
    });

    this.epgPrograms.hook('creating', (primKey, obj) => {
      // Ensure required fields are present
      if (!obj.id || !obj.channelId || !obj.title || !obj.startTime || !obj.endTime) {
        throw new Error('Missing required EPG program fields');
      }
      return obj;
    });

    // Initialize database
    this.init().catch(console.error);
  }

  private async init() {
    try {
      // Make sure database is open
      if (!this.isOpen()) {
        await this.open();
      }

      // Create indexes if they don't exist
      await this.transaction('rw', this.channels, this.epgPrograms, async () => {
        // Ensure channels table exists and has proper indexes
        if (!(await this.channels.count())) {
          console.log('Initializing channels table...');
        }

        // Ensure EPG programs table exists and has proper indexes
        if (!(await this.epgPrograms.count())) {
          console.log('Initializing EPG programs table...');
        }
      });

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
}

// Create and export a single instance
export const db = new StreamlyzerDB();
