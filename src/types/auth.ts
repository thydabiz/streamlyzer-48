
export interface StreamCredentials {
  type: 'xtream' | 'm3u' | 'mac';
  username?: string;
  password?: string;
  url: string;
  macAddress?: string;
  serialNumber?: string;
}
