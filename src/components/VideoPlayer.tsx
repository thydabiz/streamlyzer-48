
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
      toast({
        title: "Playback Error",
        description: "Your browser doesn't support HLS playback.",
        variant: "destructive",
      });
    }
  }, [url, toast]);

  const handleReady = () => {
    setIsReady(true);
  };

  const handleError = () => {
    toast({
      title: "Playback Error",
      description: "Failed to load the video stream.",
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
          config={{
            file: {
              forceHLS: true,
            },
          }}
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
