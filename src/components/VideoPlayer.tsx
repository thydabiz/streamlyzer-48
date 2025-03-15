import { useEffect, useRef, useState } from 'react';
import { Channel } from '../services/database/schema';
import { VideoPlayerService } from '../services/player/VideoPlayerService';

interface VideoPlayerProps {
  channel: Channel;
  autoQuality?: boolean;
}

export function VideoPlayer({ channel, autoQuality = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const videoPlayerService = VideoPlayerService.getInstance();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChannelLoaded, setIsChannelLoaded] = useState(false); // New state

  useEffect(() => {
    if (!videoRef.current) return;

    setIsLoading(true);
    setError(null);
    setIsChannelLoaded(false); // Reset on channel change

    // Get the video element from VideoPlayerService
    const videoElement = videoPlayerService.getVideoElement();
    if (videoElement) {
      videoRef.current.appendChild(videoElement);
    }

    // Load channel
    videoPlayerService.loadChannel(channel)
      .then(() => {
        setIsLoading(false);
        setIsChannelLoaded(true); // Set to true after successful load
      })
      .catch(err => {
        console.error('Failed to load channel:', err);
        setError('Failed to load channel. Please try again.');
        setIsLoading(false);
      });

    // Cleanup
    return () => {
      if (isChannelLoaded) {
        videoPlayerService.destroyPlayer();
      }
    };
  }, [channel]);

  useEffect(() => {
    if (isChannelLoaded && autoQuality) {
      videoPlayerService.enableAutoQuality();
    }
  }, [isChannelLoaded, autoQuality, videoPlayerService]);

  return (
    <div className="relative w-full aspect-video bg-black" ref={videoRef}>
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center p-4">
            <p className="text-lg font-semibold">Error</p>
            <p className="text-sm opacity-75">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
