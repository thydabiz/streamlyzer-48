
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
  const playerRef = useRef<ReactPlayer>(null);

  // Check if HLS is supported in this environment
  useEffect(() => {
    if (url) {
      // Clear error state on new URL
      setIsError(false);
      setHasRetried(false);
      setIsPlaying(true);
      
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
      // Set a delay before retrying to allow network/resources to clear
      const timer = setTimeout(() => {
        setIsError(false);
        setHasRetried(true);
        // Force player to reload
        if (playerRef.current) {
          const player = playerRef.current.getInternalPlayer('hls');
          if (player && typeof player.recoverMediaError === 'function') {
            player.recoverMediaError();
          }
        }
      }, 2000);
      return () => clearTimeout(timer);
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
  };

  const handleError = (error: any) => {
    console.error("Playback error:", error);
    setIsError(true);
    
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
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
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
          url={url}
          width="100%"
          height={isFullscreen ? "100%" : "100%"}
          playing={isPlaying}
          controls={!isFullscreen} // Hide default controls in fullscreen mode
          onReady={handleReady}
          onError={handleError}
          onBuffer={handleBuffer}
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
                debug: false,
                fragLoadingTimeOut: 30000,
                manifestLoadingTimeOut: 30000,
                levelLoadingTimeOut: 30000,
                fragLoadingMaxRetry: 6,
                manifestLoadingMaxRetry: 6,
                levelLoadingMaxRetry: 6,
                maxBufferLength: 60,
                maxMaxBufferLength: 600,
                maxBufferSize: 60 * 1000 * 1000,
                startLevel: -1, // Auto quality level
                autoStartLoad: true,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10,
                // Recovery options
                enableSoftwareAES: true,
                // CORS options
                xhrSetup: (xhr: XMLHttpRequest) => {
                  xhr.withCredentials = false;
                }
              },
            },
          }}
          style={{ 
            objectFit: 'contain',
            background: '#000',
          }}
        />
        
        {/* Custom controls for fullscreen mode (TV-friendly) */}
        {isFullscreen && (
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
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
