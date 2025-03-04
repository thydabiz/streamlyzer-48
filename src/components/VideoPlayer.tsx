
import { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import Hls from 'hls.js';
import { toast } from 'sonner';

interface VideoPlayerProps {
  url: string;
  title?: string;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
  onError?: () => void;
}

const VideoPlayer = ({ 
  url, 
  title, 
  isFullscreen = false,
  onFullscreenToggle,
  onError
}: VideoPlayerProps) => {
  const [isReady, setIsReady] = useState(false);
  const [isError, setIsError] = useState(false);
  const [hasRetried, setHasRetried] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [streamCheckFailed, setStreamCheckFailed] = useState(false);
  const [adjustedUrl, setAdjustedUrl] = useState(url);
  const playerRef = useRef<ReactPlayer>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);

  // Clear any existing timers when component unmounts
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      
      // Cleanup any HLS instance
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, []);

  // Process URL when it changes to try alternative formats if needed
  useEffect(() => {
    if (url) {
      console.log("Original stream URL:", url);
      
      // Reset states for new URL
      setIsError(false);
      setHasRetried(false);
      setStreamCheckFailed(false);
      setIsPlaying(true);
      setIsLoading(true);
      setIsReady(false);
      
      // Try to normalize the URL for better compatibility
      let processedUrl = url;
      
      // If URL doesn't have a protocol, try to add one
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        processedUrl = 'http://' + url;
      }
      
      // Update the URL to use
      setAdjustedUrl(processedUrl);
      
      console.log("Using processed URL:", processedUrl);
      
      // Try alternative formats on error or after a delay
      const tryAlternativeFormatTimer = setTimeout(() => {
        if (isError || !isReady) {
          console.log("Trying alternative format after delay");
          if (processedUrl.endsWith('.m3u8')) {
            // Try without m3u8 extension
            setAdjustedUrl(processedUrl.replace('.m3u8', ''));
          } else if (!processedUrl.endsWith('.m3u8')) {
            // Add m3u8 extension if it doesn't have one
            setAdjustedUrl(processedUrl + '.m3u8');
          }
        }
      }, 8000);
      
      return () => {
        clearTimeout(tryAlternativeFormatTimer);
      };
    }
  }, [url, isError, isReady]);

  // Handle playback errors and try alternative formats
  useEffect(() => {
    if (isError && !hasRetried) {
      console.log("Handling playback error, trying alternative formats...");
      
      // Clear any existing retry timer
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      
      // Set a delay before retrying
      retryTimerRef.current = setTimeout(() => {
        console.log("Retrying with alternative URL format...");
        
        // Try different URL format
        let newUrl = adjustedUrl;
        
        if (adjustedUrl.endsWith('.m3u8')) {
          newUrl = adjustedUrl.replace('.m3u8', '');
        } else {
          newUrl = adjustedUrl + '.m3u8';
        }
        
        console.log("Retrying with URL:", newUrl);
        setAdjustedUrl(newUrl);
        setIsError(false);
        setHasRetried(true);
        setIsLoading(true);
      }, 3000);
      
      return () => {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
      };
    }
  }, [isError, hasRetried, adjustedUrl]);

  // Handle keyboard events for TV remote control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space or Enter for play/pause
      if (e.key === ' ' || e.key === 'Enter') {
        setIsPlaying(!isPlaying);
      }
      // F key or F11 for fullscreen
      else if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        onFullscreenToggle?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, onFullscreenToggle]);

  const handleReady = () => {
    console.log("Player ready");
    setIsReady(true);
    setIsError(false);
    setIsLoading(false);
    setStreamCheckFailed(false);
  };

  const handleStart = () => {
    console.log("Playback started");
    setIsLoading(false);
    setStreamCheckFailed(false);
  };

  const handleError = (error: any) => {
    console.error("Playback error:", error);
    setIsError(true);
    setIsLoading(false);
    
    if (onError) {
      onError();
    }
  };

  const handleBuffer = () => {
    console.log("Player buffering");
    setIsLoading(true);
  };

  const handleBufferEnd = () => {
    console.log("Buffer ended, playback continuing");
    setIsLoading(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const manualRetry = () => {
    console.log("Manual retry initiated");
    // Try a completely different approach on manual retry
    let newUrl = adjustedUrl;
    
    // Alternate between formats
    if (hasRetried) {
      // If we've already retried, try with http/https swap
      if (newUrl.startsWith('https://')) {
        newUrl = 'http://' + newUrl.substring(8);
      } else if (newUrl.startsWith('http://')) {
        newUrl = 'https://' + newUrl.substring(7);
      }
    } else {
      // First retry: toggle m3u8 extension
      if (newUrl.endsWith('.m3u8')) {
        newUrl = newUrl.replace('.m3u8', '');
      } else {
        newUrl = newUrl + '.m3u8';
      }
    }
    
    console.log("Manual retry with URL:", newUrl);
    setAdjustedUrl(newUrl);
    setIsError(false);
    setHasRetried(true);
    setStreamCheckFailed(false);
    setIsLoading(true);
  };

  return (
    <div className={`rounded-lg overflow-hidden glass ${isFullscreen ? 'h-full' : ''}`}>
      {title && !isFullscreen && (
        <div className="p-4 bg-black/50">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}
      <div 
        className={`video-player-wrapper relative ${!isReady || isError ? 'animate-pulse bg-gray-800' : ''}`}
        style={{ height: isFullscreen ? '100vh' : 'auto' }}
      >
        <ReactPlayer
          ref={playerRef}
          url={adjustedUrl}
          width="100%"
          height={isFullscreen ? "100%" : "100%"}
          playing={isPlaying}
          controls={!isFullscreen} // Hide default controls in fullscreen mode
          onReady={handleReady}
          onStart={handleStart}
          onError={handleError}
          onBuffer={handleBuffer}
          onBufferEnd={handleBufferEnd}
          playsinline
          config={{
            file: {
              forceHLS: true,
              forceVideo: true,
              attributes: {
                crossOrigin: "anonymous",
                playsInline: true,
                autoQuality: true
              },
              hlsOptions: {
                enableWorker: true,
                debug: false, // Disable debug to reduce console noise
                fragLoadingTimeOut: 8000, // Reduced for faster error detection
                manifestLoadingTimeOut: 8000, // Reduced for faster error detection
                levelLoadingTimeOut: 8000, // Reduced for faster error detection
                fragLoadingMaxRetry: 2, // Reduced for faster error recovery
                manifestLoadingMaxRetry: 2, // Reduced for faster error recovery
                levelLoadingMaxRetry: 2, // Reduced for faster error recovery
                maxBufferLength: 15, // Reduced for faster start
                maxMaxBufferLength: 30, // Reduced to prevent excessive buffering
                maxBufferSize: 15 * 1000 * 1000, // Reduced from 60MB to improve performance
                startLevel: -1, // Auto quality level
                autoStartLoad: true,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 6, // For less latency
                liveDurationInfinity: true, // For live streams
                enableSoftwareAES: true,
                lowLatencyMode: true,
                backBufferLength: 15,
                progressive: true,
                xhrSetup: (xhr: XMLHttpRequest) => {
                  xhr.withCredentials = false;
                  xhr.timeout = 8000; // Shorter timeout
                }
              },
            },
          }}
          style={{ 
            objectFit: 'contain',
            background: '#000',
          }}
        />
        
        {/* Loading spinner overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}
        
        {/* Custom controls for fullscreen mode (TV-friendly) */}
        {isFullscreen && !isLoading && (
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={handlePlayPause}
          >
            {!isPlaying && (
              <div className="bg-black/50 p-8 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
            )}
          </div>
        )}
      </div>
      {isError && !isFullscreen && (
        <div className="p-3 bg-red-900/20 text-center">
          <p className="text-sm text-red-200">
            Stream error - This channel may be temporarily unavailable
          </p>
          <button 
            onClick={manualRetry}
            className="mt-2 px-3 py-1 bg-red-800/50 text-white text-xs rounded hover:bg-red-700/50"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
