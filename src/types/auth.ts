
export interface StreamCredentials {
  type: 'xtream' | 'm3u' | 'mac';
  url: string;
  username?: string;
  password?: string;
  mac_address?: string;
  serial_number?: string;
}

export interface XtreamCredentials {
  url: string;
  username: string;
  password: string;
}
