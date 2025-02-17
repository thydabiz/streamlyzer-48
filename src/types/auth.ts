
export interface StreamCredentials {
  type: 'xtream' | 'm3u' | 'mac';
  url: string;
  username?: string;
  password?: string;
  macAddress?: string;
  serialNumber?: string;
}
