
import { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import Hls from 'hls.js';
import { useToast } from '@/components/ui/use-toast';

interface VideoPlayerProps {
  url: string;
  title?: string;
}

const VideoPlayer = ({ url, title }: VideoPlayerProps) => {
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (url && !Hls.isSupported()) {
      console.log("HLS not supported in this browser");
      toast({
        title: "Playback Error",
        description: "Your browser doesn't support HLS playback.",
        variant: "destructive",
      });
    }
  }, [url, toast]);

  const handleReady = () => {
    console.log("Player ready");
    setIsReady(true);
  };

  const handleError = (error: any) => {
    console.error("Playback error:", error);
    toast({
      title: "Playback Error",
      description: "Failed to load the video stream. Please try again later.",
      variant: "destructive",
    });
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
          playsinline // Important for mobile and TV devices
          config={{
            file: {
              forceHLS: true,
              hlsOptions: {
                debug: false, // Disable debug mode in production
                enableWorker: true,
                lowLatencyMode: false, // Disable low latency mode for better buffering
                backBufferLength: 90, // Increase buffer length for smoother playback
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                maxBufferSize: 60 * 1000 * 1000, // 60MB buffer size
                maxBufferHole: 0.5,
                highBufferWatchdogPeriod: 2,
                nudgeOffset: 0.2,
                startLevel: -1, // Auto quality selection
                autoStartLoad: true,
                abrEwmaDefaultEstimate: 500000, // 500kbps default bandwidth estimate
                abrBandWidthFactor: 0.95,
                abrBandWidthUpFactor: 0.7,
                abrMaxWithRealBitrate: true,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10,
                progressive: true, // Enable progressive download
                testBandwidth: true,
              },
            },
          }}
          playbackRate={1.0}
          volume={1}
          muted={false}
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
