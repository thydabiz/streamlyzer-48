import { useEffect, useRef, useState } from 'react';
import { Channel } from '../services/database/schema';
import { VideoPlayerService } from '../services/player/VideoPlayerService';

interface VideoPlayerProps {
  channel: Channel;
  autoQuality?: boolean;
}

export function VideoPlayer({ channel, autoQuality = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<VideoPlayerService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;

    setIsLoading(true);
    setError(null);

    // Initialize player
    playerRef.current = new VideoPlayerService(videoRef.current);
    if (autoQuality) {
      playerRef.current.enableAutoQuality();
    }

    // Load channel
    playerRef.current.loadChannel(channel)
      .then(() => {
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load channel:', err);
        setError('Failed to load channel. Please try again.');
        setIsLoading(false);
      });

    // Cleanup
    return () => {
      playerRef.current?.destroyPlayer();
    };
  }, [channel, autoQuality]);

  // Handle video errors
  const handleVideoError = () => {
    setError('Video playback error. Please try again.');
    setIsLoading(false);
  };

  return (
    <div className="relative w-full aspect-video bg-black">
      <video
        ref={videoRef}
        controls
        className="w-full h-full"
        playsInline
        onError={handleVideoError}
        poster={channel.logo}
      />

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
