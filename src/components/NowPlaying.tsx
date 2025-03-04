
import VideoPlayer from "@/components/VideoPlayer";
import { Channel, EPGProgram } from "@/types/epg";
import ProgramTimeline from "./ProgramTimeline";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

interface NowPlayingProps {
  channel: Channel;
  currentProgram?: EPGProgram;
  programSchedule: EPGProgram[];
  onLoadSchedule: (channelId: string) => void;
}

const NowPlaying = ({ channel, currentProgram, programSchedule, onLoadSchedule }: NowPlayingProps) => {
  const [loadingError, setLoadingError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  
  // Reset error state when channel changes
  useEffect(() => {
    setLoadingError(false);
  }, [channel.id]);

  // Handle fullscreen toggles for TV remote compatibility
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    // For Android TV, we need to handle fullscreen specially
    const videoElement = document.querySelector('video');
    if (videoElement) {
      if (!isFullscreen) {
        if (videoElement.requestFullscreen) {
          videoElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Determine stream URL - use test URL if specified or fall back to channel stream URL
  const streamUrl = channel.id === 'test' 
    ? "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444"
    : channel.streamUrl;

  return (
    <section className={isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}>
      {!isFullscreen && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Now Playing</h2>
          <div className="flex space-x-2">
            {channel.id !== 'test' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Create a temporary test channel
                  const testChannel: Channel = {
                    ...channel,
                    id: 'test',
                    name: 'Test Channel',
                    streamUrl: "http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444"
                  };
                  
                  // Navigate to test channel
                  navigate('/', { 
                    state: { selectedChannel: testChannel } 
                  });
                }}
                className="text-xs"
              >
                Test Stream
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleFullscreen}
              className="text-xs"
            >
              Fullscreen
            </Button>
          </div>
        </div>
      )}
      
      <VideoPlayer 
        url={streamUrl}
        title={`${channel.name} - ${currentProgram?.title || 'No Program Info'}`}
        isFullscreen={isFullscreen}
        onFullscreenToggle={toggleFullscreen}
        onError={() => setLoadingError(true)}
      />
      
      {loadingError && !isFullscreen && (
        <div className="mt-2 p-3 bg-orange-900/20 rounded-md">
          <p className="text-sm text-orange-200">
            If this channel isn't working, try selecting another channel.
          </p>
        </div>
      )}
      
      {!isFullscreen && (
        <ProgramTimeline 
          channelId={channel.id} 
          schedule={programSchedule} 
          onLoadSchedule={onLoadSchedule} 
        />
      )}
      
      {isFullscreen && (
        <div className="absolute top-4 left-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleFullscreen}
            className="bg-black/50 text-white hover:bg-black/70"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit Fullscreen
          </Button>
        </div>
      )}
    </section>
  );
};

export default NowPlaying;
