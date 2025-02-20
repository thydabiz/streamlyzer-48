
import { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import Hls from 'hls.js';
import { toast } from 'sonner';

interface VideoPlayerProps {
  url: string;
  title?: string;
}

const VideoPlayer = ({ url, title }: VideoPlayerProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (url && !Hls.isSupported()) {
      console.log("HLS not supported in this browser");
      toast.error("Your browser doesn't support HLS playback.");
    }
  }, [url]);

  const handleReady = () => {
    console.log("Player ready");
    setIsReady(true);
  };

  const handleError = (error: any) => {
    console.error("Playback error:", error);
    toast.error("Failed to load the video stream. Please try refreshing the page.");
  };

  return (
    <div className="rounded-lg overflow-hidden glass">
      {title && (
        <div className="p-4 bg-black/50">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}
      <div className={`video-player-wrapper ${!isReady ? 'animate-pulse bg-gray-800' : ''}`}>
        <ReactPlayer
          url={url}
          width="100%"
          height="100%"
          playing
          controls
          onReady={handleReady}
          onError={handleError}
          playsinline
          config={{
            file: {
              forceHLS: true,
              hlsOptions: {
                enableWorker: true,
                debug: false,
                fragLoadingTimeOut: 20000,
                manifestLoadingTimeOut: 20000,
                levelLoadingTimeOut: 20000,
                fragLoadingMaxRetry: 3,
                manifestLoadingMaxRetry: 3,
                levelLoadingMaxRetry: 3,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                maxBufferSize: 60 * 1000 * 1000,
                startLevel: -1,
                autoStartLoad: true,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10
              },
            },
          }}
          style={{ 
            objectFit: 'contain',
            background: '#000',
          }}
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
