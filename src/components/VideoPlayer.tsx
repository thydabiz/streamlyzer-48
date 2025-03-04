
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

  // Check if HLS is supported and initialize with new URL
  useEffect(() => {
    if (url) {
      console.log("Loading stream URL:", url);
      // Reset states for new URL
      setIsError(false);
      setHasRetried(false);
      setStreamCheckFailed(false);
      setIsPlaying(true);
      setIsLoading(true);
      setIsReady(false);
      
      // Check HLS support
      if (!Hls.isSupported()) {
        console.log("HLS not supported in this browser");
        toast.error("Your browser doesn't support HLS playback. Please try a different browser.");
        return;
      }
      
      // Pre-validate the stream URL (check if it's accessible)
      checkStreamAvailability(url);
    }
  }, [url]);

  // Check if the stream URL is available and valid
  const checkStreamAvailability = async (streamUrl: string) => {
    try {
      // Modern approach: Create a temporary HLS instance to validate the stream
      if (Hls.isSupported()) {
        // Destroy any existing instance
        if (hlsInstanceRef.current) {
          hlsInstanceRef.current.destroy();
        }
        
        const tempHls = new Hls({
          debug: false,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 1,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          }
        });
        
        hlsInstanceRef.current = tempHls;
        
        // Set up event listeners for validation
        tempHls.once(Hls.Events.ERROR, (event, data) => {
          console.log("Stream validation error:", data);
          if (data.fatal) {
            setStreamCheckFailed(true);
            tempHls.destroy();
            hlsInstanceRef.current = null;
            
            // Show appropriate error
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              toast.error("Stream not accessible. Try another channel.");
            } else {
              toast.error("Stream format issue. Try another channel.");
            }
          }
        });
        
        tempHls.once(Hls.Events.MANIFEST_PARSED, () => {
          console.log("Stream validation succeeded - manifest parsed");
          // Stream is valid, clean up the temp instance
          tempHls.destroy();
          hlsInstanceRef.current = null;
          setStreamCheckFailed(false);
        });
        
        // Start validation
        tempHls.loadSource(streamUrl);
        tempHls.attachMedia(document.createElement('video'));
      }
    } catch (error) {
      console.error("Error in stream validation:", error);
      setStreamCheckFailed(true);
    }
  };

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

  const manualRetry = () => {
    console.log("Manual retry initiated");
    setIsError(false);
    setHasRetried(false);
    setStreamCheckFailed(false);
    setIsLoading(true);
    
    // Force reload the stream
    if (playerRef.current) {
      const player = playerRef.current.getInternalPlayer();
      if (player) {
        try {
          player.load();
          setIsPlaying(true);
        } catch (e) {
          console.error("Error during manual retry:", e);
        }
      }
    }
  };

  // If initial stream check failed, show early error
  if (streamCheckFailed && !isFullscreen) {
    return (
      <div className="rounded-lg overflow-hidden glass">
        {title && (
          <div className="p-4 bg-black/50">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        )}
        <div className="p-8 bg-gray-900 flex flex-col items-center justify-center">
          <div className="text-red-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <p className="text-center text-white mb-4">
            This stream is unavailable or cannot be accessed
          </p>
          <button 
            onClick={manualRetry}
            className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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
                fragLoadingTimeOut: 20000, // Reduced from 60000 for faster error detection
                manifestLoadingTimeOut: 20000, // Reduced from 60000 for faster error detection
                levelLoadingTimeOut: 20000, // Reduced from 60000 for faster error detection
                fragLoadingMaxRetry: 3, // Reduced from 8 for faster error recovery
                manifestLoadingMaxRetry: 3, // Reduced from 8 for faster error recovery
                levelLoadingMaxRetry: 3, // Reduced from 8 for faster error recovery
                maxBufferLength: 30, // Reduced from 60 for faster start
                maxMaxBufferLength: 60, // Reduced from 600 to prevent excessive buffering
                maxBufferSize: 30 * 1000 * 1000, // Reduced from 60MB to improve performance
                startLevel: -1, // Auto quality level
                autoStartLoad: true,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 6, // Reduced from 10 for less latency
                liveDurationInfinity: true, // For live streams
                // Recovery options
                enableSoftwareAES: true,
                lowLatencyMode: true, // Added for better live streaming
                backBufferLength: 30, // Reduced for better live performance
                progressive: true, // Try to use progressive loading when possible
                // CORS options
                xhrSetup: (xhr: XMLHttpRequest) => {
                  xhr.withCredentials = false;
                  xhr.timeout = 20000; // Add a timeout for XHR requests
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
