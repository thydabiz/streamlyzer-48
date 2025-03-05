import { Channel, EPGProgram } from '@/types/epg';
import { db } from './database/schema';

export async function getProgramSchedule(channelId: string): Promise<EPGProgram[]> {
  try {
    const programs = await db.epgPrograms
      .where('channelId')
      .equals(channelId)
      .toArray();
    
    return programs;
  } catch (error) {
    console.error('Error fetching EPG data:', error);
    throw error;
  }
}

export async function getChannels(offset: number, limit: number): Promise<Channel[]> {
  try {
    const response = await fetch(`/api/channels?offset=${offset}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch channels: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }
}

export async function refreshEPGData(): Promise<void> {
  try {
    const session = await db.authSession.toArray();
    if (!session.length) {
      throw new Error('No active session found');
    }

    const { username, password, serverUrl } = session[0];
    const baseUrl = normalizeUrl(serverUrl);
    const epgUrl = `${baseUrl}/xmltv.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    
    const response = await fetch(epgUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch EPG data: ${response.statusText}`);
    }

    const xmlContent = await response.text();
    const programs = await parseEPG(xmlContent);

    await db.transaction('rw', db.epgPrograms, async () => {
      await db.epgPrograms.clear();
      await db.epgPrograms.bulkAdd(programs);
    });
  } catch (error) {
    console.error('Error refreshing EPG data:', error);
    throw error;
  }
}

function normalizeUrl(url: string): string {
  let baseUrl = url.trim();
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'http://' + baseUrl;
  }
  return baseUrl.replace(/\/+$/, '');
}

async function parseEPG(xmlContent: string): Promise<EPGProgram[]> {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  const programs: EPGProgram[] = [];

  const programElements = xmlDoc.getElementsByTagName('programme');
  for (const elem of Array.from(programElements)) {
    programs.push({
      id: `prog_${programs.length + 1}`,
      channelId: elem.getAttribute('channel') || '',
      title: elem.getElementsByTagName('title')[0]?.textContent || 'Unknown Program',
      description: elem.getElementsByTagName('desc')[0]?.textContent || undefined,
      startTime: new Date(elem.getAttribute('start') || ''),
      endTime: new Date(elem.getAttribute('stop') || ''),
      category: elem.getElementsByTagName('category')[0]?.textContent || undefined
    });
  }

  return programs;
}
