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
    private static instance: VideoPlayerService | null = null;
    private hls: Hls | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private currentStreamUrl: string | null = null;
    private streamLoadTimeout = 20000; // 20 seconds
    private resolve: (value: void | PromiseLike<void>) => void;
    private reject: (reason?: any) => void;

    private constructor() { // Make the constructor private
        console.log('Initializing HLS.js instance.');
        console.log('HLS.js instance initialized.');
        this.videoElement = document.createElement('video');
        this.videoElement.controls = true;
        this.videoElement.autoplay = true;
    }

    public static getInstance(): VideoPlayerService {
        if (!VideoPlayerService.instance) {
            VideoPlayerService.instance = new VideoPlayerService();
        }
        return VideoPlayerService.instance;
    }

    getVideoElement(): HTMLVideoElement | null {
        return this.videoElement;
    }

    private initHls() {
        if (!this.hls) {
            console.log('HLS.js instance is null, initializing...');
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
            console.log('HLS.js instance initialized.');
        }
        this.hls.attachMedia(this.videoElement);
        this.hls.on(Hls.Events.ERROR, this.onError);
    }

    async loadChannel(channel: Channel): Promise<void> {
        if (!this.videoElement) return;

        try {
            let streamUrl: string;
            try {
                // Try parsing as JSON first (new format)
                const streamInfo: StreamInfo = JSON.parse(channel.url);
                streamUrl = this.constructStreamUrl(streamInfo);
                console.log('Stream URL:', streamUrl);
            } catch (e) {
                // If parsing fails, assume it's the old direct URL format
                streamUrl = this.sanitizeUrl(channel.url);
            }

            // Reset player state
            await this.destroyPlayer(); // Wait for destroyPlayer to complete
            this.initHls(); // Call initHls() here!

            // Try loading with different extensions
            const extensions = ['', '.m3u8', '.ts'];
            let streamLoaded = false;
            for (const ext of extensions) {
                try {
                    const urlWithExt = this.addExtension(streamUrl, ext);
                    await this.tryLoadStream(urlWithExt);
                    streamLoaded = true;
                    this.currentStreamUrl = urlWithExt; // Update currentStreamUrl here!
                    return; // Stop further attempts if successful
                } catch (error) {
                    console.warn(`Attempt failed with extension ${ext}:`, error);
                }
            }
            if (!streamLoaded) {
                this.currentStreamUrl = null;
            }
            if (this.currentStreamUrl === streamUrl) {
                console.log('Already playing this stream, skipping further attempts.');
                return; // Already playing this stream
            }

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
        console.log(`Attempting to load stream from URL: ${url}`);
        if (!this.hls) {
            console.error('HLS.js instance is not initialized.');
            return Promise.reject(new Error('HLS.js instance is not initialized.'));
        }
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            let timeoutId: NodeJS.Timeout;

            // Set timeout for load attempt
            timeoutId = setTimeout(() => {
                reject(new Error('Stream load timeout'));
            }, this.streamLoadTimeout);

            this.hls.on(Hls.Events.ERROR, this.onError);
            this.hls.on(Hls.Events.MANIFEST_PARSED, this.onManifestParsed);
            this.hls.loadSource(url);
        });
    }

    private constructStreamUrl(info: StreamInfo): string {
        const baseUrl = this.sanitizeUrl(info.baseUrl);
        const path = `/live/${encodeURIComponent(info.username)}/${encodeURIComponent(info.password)}/${info.streamId}`;
        return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) + path : baseUrl + path;
    }

    private handleNetworkError() {
        console.log('Network error, attempting to recover...');
        if (!this.hls) {
            console.error('HLS.js instance is not initialized.');
            return Promise.reject(new Error('HLS.js instance is not initialized.'));
        }
        if (this.hls.media?.readyState) {
            this.hls.startLoad();
            return Promise.resolve();
        } else {
            // If media isn't ready, reinitialize the player
            this.destroyPlayer();
            this.initHls();
            if (this.currentStreamUrl) {
                return this.loadChannel({ url: this.currentStreamUrl } as Channel); // Line 199
            } else {
                return Promise.reject(new Error('No current stream URL to reload.')); // Line 201
            }
        }
    }

    private handleMediaError(): Promise<void> {
        console.log('Media error, attempting to recover...');
        if (!this.hls) {
            console.error('HLS.js instance is not initialized.');
            return Promise.reject(new Error('HLS.js instance is not initialized.'));
        }
        this.hls.recoverMediaError();
        return new Promise<void>((resolve, reject) => { // Explicitly Promise<void>
            setTimeout(() => {
                if (this.hls?.media?.error) {
                    console.error('Media error recovery failed.');
                    reject(new Error('Media error recovery failed.'));
                } else {
                    resolve(); // Resolving with void (no value)
                }
            }, 3000); // Check after 3 seconds
        });
    }

    setQuality(level: number) {
        if (this.hls) { // Check if the player exists before trying to use it.
            this.hls.currentLevel = level;
        } else {
            console.warn("Attempted to call 'setQuality' but HLS.js instance is not initialized.");
        }
    }

    enableAutoQuality() {
        if (this.hls) { // Check if the player exists before trying to use it.
            this.hls.currentLevel = -1; // Auto quality
        } else {
            console.warn("Attempted to call 'enableAutoQuality' but HLS.js instance is not initialized.");
        }
    }

    destroyPlayer(): Promise<void> { // Return a Promise
        return new Promise((resolve) => {
            if (this.hls) {
                console.log('Destroying HLS.js instance.');
                this.cleanup(); // Remove event listeners
                this.hls.destroy();
                console.log('HLS.js instance destroyed.');
                this.hls = null;
                // Resolve the promise after destruction is complete
                resolve();
            } else {
                resolve(); // Resolve immediately if there's no HLS instance
            }
        });
    }

    private cleanup() {
        if (this.hls) {
            this.hls.off(Hls.Events.ERROR, this.onError);
            this.hls.off(Hls.Events.MANIFEST_PARSED, this.onManifestParsed);
        }
    }

    private onError = (event: any, data: any) => {
        if (data.fatal) {
            let errorMessage = 'An unknown error occurred.';
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    if (data.response?.code === 509) {
                        errorMessage = 'Bandwidth limit exceeded. Please try again later.';
                    } else {
                        errorMessage = 'Network error encountered.';
                    }
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                case Hls.ErrorTypes.OTHER_ERROR:
                    errorMessage = 'Error encountered.';
                    break;
            }
            console.error('Error encountered:', data);
            this.reject(new Error(errorMessage));
        }
    };

    private onManifestParsed = () => {
        this.cleanup();
        if (!this.videoElement) {
            console.error('Video element is not initialized.');
            return;
        }
        this.videoElement.play()
            .then(() => {
                this.resolve(); // Successfully loaded, stop further attempts
                return; // Prevent further execution
            })
            .catch(error => {
                console.error('Error playing video:', error);
                this.reject(error);
            });
    };
}
