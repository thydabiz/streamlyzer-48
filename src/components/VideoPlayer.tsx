
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
  const playerRef = useRef<ReactPlayer>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any existing timers when component unmounts
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // Check if HLS is supported in this environment
  useEffect(() => {
    if (url) {
      console.log("Loading stream URL:", url);
      // Clear error state on new URL
      setIsError(false);
      setHasRetried(false);
      setIsPlaying(true);
      setIsLoading(true);
      
      if (!Hls.isSupported()) {
        console.log("HLS not supported in this browser");
        toast.error("Your browser doesn't support HLS playback. Please try a different browser.");
      }
    }
  }, [url]);

  // Attempt to reload player when there's an error
  useEffect(() => {
    if (isError && !hasRetried && playerRef.current) {
      console.log("Attempting to reload player after error...");
      
      // Clear any existing retry timer
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      
      // Set a delay before retrying to allow network/resources to clear
      retryTimerRef.current = setTimeout(() => {
        console.log("Retrying playback...");
        setIsError(false);
        setHasRetried(true);
        setIsLoading(true);
        
        // Force player to reload
        if (playerRef.current) {
          const player = playerRef.current.getInternalPlayer('hls');
          if (player && typeof player.recoverMediaError === 'function') {
            player.recoverMediaError();
          }
          
          // Try to manually load the source
          const videoElement = playerRef.current.getInternalPlayer();
          if (videoElement) {
            try {
              videoElement.load();
            } catch (e) {
              console.log("Error reloading video element:", e);
            }
          }
        }
      }, 2000);
      
      return () => {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
      };
    }
  }, [isError, hasRetried]);

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
  };

  const handleStart = () => {
    console.log("Playback started");
    setIsLoading(false);
  };

  const handleError = (error: any) => {
    console.error("Playback error:", error);
    setIsError(true);
    setIsLoading(true);
    
    if (onError) {
      onError();
    }
    
    // Provide more specific error messages based on error type
    if (error && error.type === 'networkError') {
      toast.error("Network error: Check your internet connection and try again.");
    } else if (error && error.type === 'mediaError') {
      toast.error("Media error: The stream format might be unsupported or corrupted.");
    } else {
      toast.error("Failed to load the video stream. Please try a different channel or refresh the page.");
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

  // Add direct M3U8 stream check
  const checkStreamDirectly = () => {
    if (!url || isReady) return;
    
    console.log("Checking stream directly...");
    
    // Try to fetch the M3U8 stream directly to check if it's accessible
    fetch(url, { method: 'HEAD' })
      .then(response => {
        console.log("Stream check response:", response.status);
        if (!response.ok) {
          throw new Error(`Stream check failed with status ${response.status}`);
        }
      })
      .catch(error => {
        console.error("Error checking stream:", error);
        if (!isError) {
          setIsError(true);
          toast.error("Stream URL may be invalid or inaccessible. Please try another channel.");
        }
      });
  };

  // Try to check the stream directly after a delay
  useEffect(() => {
    const streamCheckTimer = setTimeout(checkStreamDirectly, 5000);
    return () => clearTimeout(streamCheckTimer);
  }, [url]);

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
          url={url}
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
                // Add crossorigin attribute to help with CORS issues
                crossOrigin: "anonymous",
                // Improve mobile playback
                playsInline: true,
                // Auto quality adaptation
                autoQuality: true
              },
              hlsOptions: {
                // Enhance HLS options for better reliability
                enableWorker: true,
                debug: true, // Enable debug mode for HLS.js to get more logs
                fragLoadingTimeOut: 60000, // Increase timeout for fragment loading
                manifestLoadingTimeOut: 60000, // Increase timeout for manifest loading
                levelLoadingTimeOut: 60000, // Increase timeout for level loading
                fragLoadingMaxRetry: 8, // Increase retries
                manifestLoadingMaxRetry: 8,
                levelLoadingMaxRetry: 8,
                maxBufferLength: 60,
                maxMaxBufferLength: 600,
                maxBufferSize: 60 * 1000 * 1000,
                startLevel: -1, // Auto quality level
                autoStartLoad: true,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10,
                liveDurationInfinity: true, // For live streams
                // Recovery options
                enableSoftwareAES: true,
                // CORS options
                xhrSetup: (xhr: XMLHttpRequest) => {
                  xhr.withCredentials = false;
                  // Add additional headers if needed
                  // xhr.setRequestHeader('Cache-Control', 'no-cache');
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
            onClick={() => {
              setIsError(false);
              setHasRetried(false);
              setIsLoading(true);
            }}
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
