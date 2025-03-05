import { db } from '../database/schema';
import { authService } from '../auth/authService';
import { Channel } from '../database/schema';
import { toast } from 'sonner';

interface XtreamChannel {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  category_name: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export class ChannelSyncService {
  private static instance: ChannelSyncService;
  private syncInProgress = false;

  private constructor() {}

  static getInstance(): ChannelSyncService {
    if (!ChannelSyncService.instance) {
      ChannelSyncService.instance = new ChannelSyncService();
    }
    return ChannelSyncService.instance;
  }

  async syncChannels(username: string, password: string, serverUrl: string): Promise<void> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    console.log('Starting channel sync...');
    this.syncInProgress = true;
    try {
      // First make sure the database is open
      if (!db.isOpen()) {
        await db.open();
      }

      const auth = await authService.authenticate(username, password, serverUrl);
      if (!auth.token) {
        throw new Error('Authentication failed');
      }
      console.log('Authentication successful');

      const baseUrl = this.normalizeUrl(serverUrl);
      console.log('Fetching channel list from:', baseUrl);
      const response = await this.fetchChannelList(baseUrl, username, password);
      
      if (!response.ok) {
        console.error('Channel list fetch failed:', response.status, response.statusText);
        throw new Error('Failed to fetch channel list');
      }

      const rawData = await response.text();
      console.log('Raw response:', rawData.substring(0, 200) + '...');
      
      let data;
      try {
        data = JSON.parse(rawData);
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        throw new Error('Invalid JSON response from server');
      }

      if (!Array.isArray(data)) {
        console.error('Invalid channel data received:', typeof data, data);
        throw new Error('Invalid channel data received from server');
      }

      console.log(`Received ${data.length} channels from API`);
      const channels = this.processChannelData(data, baseUrl, username, password);
      console.log(`Processed ${channels.length} channels`);

      // Log a few sample channels for debugging
      console.log('Sample channels:', channels.slice(0, 2));

      try {
        await db.transaction('rw', db.channels, async () => {
          console.log('Clearing existing channels...');
          await db.channels.clear();
          console.log('Adding new channels...');
          for (const channel of channels) {
            await db.channels.add(channel);
          }
          console.log('Channel sync complete');
        });
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        throw dbError;
      }

      // Verify channels were added
      const count = await db.channels.count();
      console.log(`Verified ${count} channels in database`);

      if (count === 0) {
        throw new Error('No channels were saved to the database');
      }

      console.log('Starting EPG sync...');
      await this.syncEPG(baseUrl, username, password);
    } catch (error) {
      console.error('Channel sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async fetchChannelList(baseUrl: string, username: string, password: string): Promise<Response> {
    const url = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
    console.log('Fetching channels from:', url);
    return fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
  }

  private processChannelData(data: XtreamChannel[], baseUrl: string, username: string, password: string): Channel[] {
    if (!Array.isArray(data)) {
      console.error('Invalid data format:', data);
      throw new Error('Invalid channel data format');
    }

    return data.map(item => {
      if (!item.stream_id) {
        console.warn('Channel missing stream_id:', item);
      }
      
      const channel: Channel = {
        id: item.stream_id.toString(),
        name: item.name || 'Unnamed Channel',
        group: item.category_name || 'Uncategorized',
        url: JSON.stringify({
          baseUrl,
          username,
          password,
          streamId: item.stream_id,
          streamType: item.stream_type
        }),
        logo: item.stream_icon || '',
        epgId: item.epg_channel_id || '',
        lastAccessed: new Date()
      };

      return channel;
    });
  }

  private async syncEPG(baseUrl: string, username: string, password: string): Promise<void> {
    try {
      console.log('Starting EPG sync...');
      const epgUrl = `${baseUrl}/xmltv.php?username=${username}&password=${password}`;
      const response = await fetch(epgUrl);
      
      if (!response.ok) {
        console.warn('EPG sync failed:', response.status, response.statusText);
        return;
      }

      const xmlContent = await response.text();
      console.log('Received EPG XML data, parsing...');
      const epgData = await this.parseEPG(xmlContent);
      console.log(`Parsed ${epgData.length} EPG programs`);

      await db.transaction('rw', db.epgPrograms, async () => {
        console.log('Clearing existing EPG data...');
        await db.epgPrograms.clear();
        console.log('Adding new EPG data...');
        await db.epgPrograms.bulkAdd(epgData);
        console.log('EPG sync complete');
      });
    } catch (error) {
      console.error('EPG sync failed:', error);
      // EPG sync is non-critical, continue without it
    }
  }

  private normalizeUrl(url: string): string {
    let baseUrl = url.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }
    return baseUrl.replace(/\/+$/, '');
  }

  private async parseEPG(xmlContent: string): Promise<any[]> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const programs: any[] = [];

    const programElements = xmlDoc.getElementsByTagName('programme');
    console.log(`Found ${programElements.length} program elements in EPG XML`);
    
    for (const elem of Array.from(programElements)) {
      try {
        const channelId = elem.getAttribute('channel');
        const title = elem.getElementsByTagName('title')[0]?.textContent;
        if (!channelId || !title) {
          console.warn('Skipping program with missing data:', { channelId, title });
          continue;
        }

        programs.push({
          id: `prog_${programs.length + 1}`,
          channelId,
          title,
          description: elem.getElementsByTagName('desc')[0]?.textContent,
          startTime: new Date(elem.getAttribute('start') ?? ''),
          endTime: new Date(elem.getAttribute('stop') ?? ''),
          category: elem.getElementsByTagName('category')[0]?.textContent
        });
      } catch (error) {
        console.error('Failed to parse program element:', error);
      }
    }

    return programs;
  }
}

export const channelSync = ChannelSyncService.getInstance();
