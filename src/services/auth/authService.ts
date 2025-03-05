import { db } from '../database/schema';

interface AuthResponse {
  token?: string;
  expiry?: Date;
  error?: string;
}

class AuthService {
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  private static readonly OFFLINE_GRACE_PERIOD = 24 * 60 * 60 * 1000; // 24 hours

  async authenticate(username: string, password: string, serverUrl: string): Promise<AuthResponse> {
    console.log('Starting authentication...');
    try {
      const existingSession = await this.getValidSession();
      if (existingSession) {
        console.log('Found existing valid session:', existingSession);
        return {
          token: existingSession.token,
          expiry: existingSession.tokenExpiry
        };
      }

      console.log('No existing session found, attempting to authenticate...');
      const baseUrl = this.normalizeUrl(serverUrl);
      const authUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      console.log('Authenticating with URL:', authUrl);

      const response = await this.makeAuthRequest(authUrl);
      if (!response.ok) {
        console.error('Auth request failed:', response.status, response.statusText);
        throw new Error('Authentication request failed');
      }

      const data = await response.json();
      console.log('Received auth response:', JSON.stringify(data, null, 2));

      if (!this.isValidAuthResponse(data)) {
        console.error('Invalid server response:', data);
        throw new Error('Invalid server response');
      }

      // Use the auth value from user_info as the token
      const token = data.user_info?.auth?.toString() || 'authenticated';
      const authData = {
        token,
        expiry: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
      };

      await db.authSession.put({
        username,
        password,
        serverUrl,
        token: authData.token,
        tokenExpiry: authData.expiry,
        lastSync: new Date()
      });
      console.log('Auth session stored successfully');

      return authData;
    } catch (error) {
      console.error('Authentication failed:', error);
      return this.authenticateOffline(username, password);
    }
  }

  private async authenticateOffline(username: string, password: string): Promise<AuthResponse> {
    console.log('Attempting offline authentication...');
    const session = await db.authSession.get(username);
    if (!session) {
      console.log('No stored credentials found');
      return { error: 'No stored credentials found' };
    }

    const gracePeriodValid = (Date.now() - session.lastSync.getTime()) < AuthService.OFFLINE_GRACE_PERIOD;
    if (!gracePeriodValid) {
      console.log('Offline access expired');
      return { error: 'Offline access expired' };
    }

    if (session.password !== password) {
      console.log('Invalid credentials');
      return { error: 'Invalid credentials' };
    }

    console.log('Offline authentication successful');
    return {
      token: session.token,
      expiry: session.tokenExpiry
    };
  }

  private async getValidSession(): Promise<any | null> {
    console.log('Checking for valid session...');
    const sessions = await db.authSession.toArray();
    return sessions.find(session => {
      if (!session.tokenExpiry) return false;
      const timeUntilExpiry = session.tokenExpiry.getTime() - Date.now();
      return timeUntilExpiry > AuthService.TOKEN_REFRESH_THRESHOLD;
    });
  }

  private normalizeUrl(url: string): string {
    console.log('Normalizing URL:', url);
    let baseUrl = url.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }
    return baseUrl.replace(/\/+$/, '');
  }

  private async makeAuthRequest(url: string): Promise<Response> {
    console.log('Making auth request to:', url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      return await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private isValidAuthResponse(data: any): boolean {
    console.log('Validating auth response:', data);
    if (!data || !data.user_info) return false;
    
    // Check if user_info contains valid auth info
    const { auth, status } = data.user_info;
    
    // auth can be 1 (number) or "1" (string)
    const isAuthValid = auth === 1 || auth === "1";
    const isStatusActive = status === 'Active';

    return isAuthValid || isStatusActive;
  }
}

export const authService = new AuthService();
