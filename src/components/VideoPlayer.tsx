
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
  const [directPlaybackUrl, setDirectPlaybackUrl] = useState("");
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

  // Process URL when it changes
  useEffect(() => {
    if (url) {
      console.log("Original stream URL:", url);
      
      // Reset states for new URL
      setIsError(false);
      setHasRetried(false);
      setIsPlaying(true);
      setIsLoading(true);
      setIsReady(false);
      setDirectPlaybackUrl("");
      
      // Try to normalize the URL for better compatibility
      let processedUrl = url;
      
      // If URL doesn't have a protocol, try to add one
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        processedUrl = 'http://' + url;
      }
      
      // Check if the URL is the specific test URL
      if (url === "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444") {
        // For this specific URL, we'll ensure we're using the direct format
        processedUrl = url;
        console.log("Using test URL in direct format:", processedUrl);
      }
      
      // Update the URL to use
      setAdjustedUrl(processedUrl);
      
      // Pre-validate stream using HLS.js for HLS streams
      if (Hls.isSupported() && processedUrl.includes('/live/')) {
        console.log("Attempting to pre-validate HLS stream:", processedUrl);
        
        // Clean up any existing HLS instance
        if (hlsInstanceRef.current) {
          hlsInstanceRef.current.destroy();
          hlsInstanceRef.current = null;
        }
        
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          fragLoadingTimeOut: 5000, // Shorter timeout for faster failure detection
          manifestLoadingTimeOut: 5000
        });
        
        hlsInstanceRef.current = hls;
        
        // Attempt to load the stream to check if it's valid
        hls.loadSource(processedUrl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("HLS stream pre-validation succeeded");
          
          // Get the direct URL from the loaded manifest if possible
          if (hls.levels && hls.levels.length > 0) {
            // Use highest quality level URL
            const highestLevel = hls.levels[hls.levels.length - 1];
            if (highestLevel && highestLevel.url) {
              setDirectPlaybackUrl(highestLevel.url);
              console.log("Setting direct playback URL:", highestLevel.url);
            }
          }
          
          // Clean up this validation instance
          hls.destroy();
          hlsInstanceRef.current = null;
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error("Fatal HLS pre-validation error:", data.type, data.details);
            hls.destroy();
            hlsInstanceRef.current = null;
            
            // If this is the test URL, try an alternative format
            if (url === "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444") {
              // Try alternative direct format
              const alternativeUrl = "http://lion.topcms.cc:80/vC8q5551/r6Vf5130/469444";
              console.log("Trying alternative format for test URL:", alternativeUrl);
              setAdjustedUrl(alternativeUrl);
            }
          }
        });
      }
    }
  }, [url]);

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
        
        // For test URL, try specific formats known to work
        if (url === "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444") {
          const alternativeFormats = [
            "http://lion.topcms.cc:80/vC8q5551/r6Vf5130/469444",
            "http://lion.topcms.cc/vC8q5551/r6Vf5130/469444",
            "http://lion.topcms.cc:80/live/vC8q5551/r6Vf5130/469444.ts",
            "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444.m3u8"
          ];
          
          const newUrl = alternativeFormats[0]; // Try first alternative
          console.log("Retrying test URL with alternative format:", newUrl);
          setAdjustedUrl(newUrl);
        } else {
          // Try different URL formats for other streams
          let newUrl = adjustedUrl;
          
          // Try with and without m3u8 extension
          if (adjustedUrl.endsWith('.m3u8')) {
            newUrl = adjustedUrl.replace('.m3u8', '');
          } else if (!adjustedUrl.endsWith('.m3u8') && !adjustedUrl.endsWith('.ts')) {
            newUrl = adjustedUrl + '.m3u8';
          }
          
          // Also try with port 80 explicitly if not already specified
          if (!newUrl.includes(':80/') && newUrl.startsWith('http://')) {
            const urlParts = newUrl.split('//');
            if (urlParts.length > 1) {
              const hostAndPath = urlParts[1].split('/');
              if (hostAndPath.length > 1) {
                newUrl = `http://${hostAndPath[0]}:80/${hostAndPath.slice(1).join('/')}`;
              }
            }
          }
          
          console.log("Retrying with URL:", newUrl);
          setAdjustedUrl(newUrl);
        }
        
        setIsError(false);
        setHasRetried(true);
        setIsLoading(true);
      }, 1000); // Faster retry (1 second)
      
      return () => {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
      };
    }
  }, [isError, hasRetried, adjustedUrl, url]);

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
    
    // Show success toast for test URL
    if (url === "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444") {
      toast.success("Test stream loaded successfully!");
    }
  };

  const handleStart = () => {
    console.log("Playback started");
    setIsLoading(false);
  };

  const handleError = (error: any) => {
    console.error("Playback error:", error);
    setIsError(true);
    setIsLoading(false);
    
    if (onError) {
      onError();
    }
    
    // Show specific error for test URL
    if (url === "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444") {
      console.log("Test URL failed, will try alternative formats");
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
    
    // For test URL, cycle through alternative formats
    if (url === "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444") {
      const alternativeFormats = [
        "http://lion.topcms.cc:80/vC8q5551/r6Vf5130/469444",
        "http://lion.topcms.cc/vC8q5551/r6Vf5130/469444",
        "http://lion.topcms.cc:80/live/vC8q5551/r6Vf5130/469444.ts",
        "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444.m3u8"
      ];
      
      // Find current format in the array and move to the next one
      const currentIndex = alternativeFormats.indexOf(adjustedUrl);
      const nextIndex = (currentIndex + 1) % alternativeFormats.length;
      const newUrl = alternativeFormats[nextIndex];
      
      console.log(`Trying format ${nextIndex + 1}/${alternativeFormats.length}: ${newUrl}`);
      setAdjustedUrl(newUrl);
    } else {
      // Standard alternating approach for other URLs
      let newUrl = adjustedUrl;
      
      // First try: toggle m3u8 extension
      if (hasRetried) {
        // Second retry: try with http/https swap
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
    }
    
    setIsError(false);
    setHasRetried(true);
    setIsLoading(true);
  };

  // Determine which URL to use - direct playback URL if available, otherwise adjusted URL
  const effectiveUrl = directPlaybackUrl || adjustedUrl;

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
          url={effectiveUrl}
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
            {url === "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444" 
              ? "Test stream connection failed - trying alternative format" 
              : "Stream error - This channel may be temporarily unavailable"
            }
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
