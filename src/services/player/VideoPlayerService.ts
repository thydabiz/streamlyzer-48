import Hls from 'hls.js';
import { Channel } from '../database/schema';

interface StreamInfo {
  baseUrl: string;
  username: string;
  password: string;
  streamId: number;
  streamType: string;
}

export class VideoPlayerService {
  private hls: Hls | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private currentStreamUrl: string | null = null;
  private retryAttempts = 3;
  private retryDelay = 2000; // 2 seconds

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    if (Hls.isSupported()) {
      this.initHls();
    }
  }

  private initHls() {
    this.hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferSize: 60 * 1000 * 1000, // 60MB
      maxBufferHole: 0.5,
      lowLatencyMode: true,
      debug: false,
      xhrSetup: (xhr, url) => {
        // Add timestamp to prevent caching
        const separator = url.includes('?') ? '&' : '?';
        xhr.open('GET', `${url}${separator}_=${Date.now()}`, true);
      }
    });

    if (this.videoElement) {
      this.hls.attachMedia(this.videoElement);
    }

    // Handle HLS events
    this.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            this.handleNetworkError();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            this.handleMediaError();
            break;
          default:
            this.destroyPlayer();
            break;
        }
      }
    });
  }

  async loadChannel(channel: Channel): Promise<void> {
    if (!this.hls || !this.videoElement) return;

    try {
      let streamUrl: string;
      try {
        // Try parsing as JSON first (new format)
        const streamInfo: StreamInfo = JSON.parse(channel.url);
        streamUrl = this.constructStreamUrl(streamInfo);
      } catch (e) {
        // If parsing fails, assume it's the old direct URL format
        streamUrl = this.sanitizeUrl(channel.url);
      }

      if (this.currentStreamUrl === streamUrl) {
        return; // Already playing this stream
      }

      // Reset player state
      this.destroyPlayer();
      this.initHls();
      this.currentStreamUrl = streamUrl;

      // Try loading with different extensions
      const extensions = ['', '.m3u8', '.ts'];
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
        for (const ext of extensions) {
          try {
            const urlWithExt = this.addExtension(streamUrl, ext);
            await this.tryLoadStream(urlWithExt);
            return; // Success!
          } catch (error) {
            lastError = error as Error;
            console.warn(`Attempt ${attempt + 1} failed with extension ${ext}:`, error);
            continue;
          }
        }
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }

      throw lastError || new Error('Failed to load stream after all attempts');

    } catch (error) {
      console.error('Error loading channel:', error);
      throw error;
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Ensure protocol is http or https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
      return parsed.toString();
    } catch (e) {
      throw new Error('Invalid stream URL');
    }
  }

  private addExtension(url: string, ext: string): string {
    if (!ext || url.includes('?') || url.endsWith(ext)) {
      return url;
    }
    return `${url}${ext}`;
  }

  private async tryLoadStream(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      
      const cleanup = () => {
        clearTimeout(timeoutId);
        this.hls?.off(Hls.Events.ERROR, onError);
        this.hls?.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
      };

      const onError = (event: any, data: any) => {
        if (data.fatal) {
          cleanup();
          reject(new Error(data.details));
        }
      };

      const onManifestParsed = () => {
        cleanup();
        this.videoElement?.play()
          .then(() => resolve())
          .catch(error => {
            console.error('Error playing video:', error);
            reject(error);
          });
      };

      // Set timeout for load attempt
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Stream load timeout'));
      }, 10000); // 10 second timeout

      this.hls?.on(Hls.Events.ERROR, onError);
      this.hls?.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
      this.hls?.loadSource(url);
    });
  }

  private constructStreamUrl(info: StreamInfo): string {
    const baseUrl = this.sanitizeUrl(info.baseUrl);
    const path = `/live/${encodeURIComponent(info.username)}/${encodeURIComponent(info.password)}/${info.streamId}`;
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) + path : baseUrl + path;
  }

  private handleNetworkError() {
    console.log('Network error, attempting to recover...');
    if (this.hls?.media?.readyState) {
      this.hls?.startLoad();
    } else {
      // If media isn't ready, reinitialize the player
      this.destroyPlayer();
      this.initHls();
      if (this.currentStreamUrl) {
        this.loadChannel({ url: this.currentStreamUrl } as Channel);
      }
    }
  }

  private handleMediaError() {
    console.log('Media error, attempting to recover...');
    this.hls?.recoverMediaError();
  }

  setQuality(level: number) {
    if (this.hls) {
      this.hls.currentLevel = level;
    }
  }

  enableAutoQuality() {
    if (this.hls) {
      this.hls.currentLevel = -1; // Auto quality
    }
  }

  destroyPlayer() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    this.currentStreamUrl = null;
  }
}
