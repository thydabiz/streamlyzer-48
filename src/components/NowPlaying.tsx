
import VideoPlayer from "@/components/VideoPlayer";
import { Channel, EPGProgram } from "@/types/epg";
import ProgramTimeline from "./ProgramTimeline";
import { useState, useEffect } from "react";

interface NowPlayingProps {
  channel: Channel;
  currentProgram?: EPGProgram;
  programSchedule: EPGProgram[];
  onLoadSchedule: (channelId: string) => void;
}

const NowPlaying = ({ channel, currentProgram, programSchedule, onLoadSchedule }: NowPlayingProps) => {
  const [loadingError, setLoadingError] = useState(false);
  
  // Reset error state when channel changes
  useEffect(() => {
    setLoadingError(false);
  }, [channel.id]);

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Now Playing</h2>
      <VideoPlayer 
        url={channel.streamUrl} 
        title={`${channel.name} - ${currentProgram?.title || 'No Program Info'}`} 
      />
      {loadingError && (
        <div className="mt-2 p-3 bg-orange-900/20 rounded-md">
          <p className="text-sm text-orange-200">
            If this channel isn't working, try selecting another channel.
          </p>
        </div>
      )}
      <ProgramTimeline 
        channelId={channel.id} 
        schedule={programSchedule} 
        onLoadSchedule={onLoadSchedule} 
      />
    </section>
  );
};

export default NowPlaying;
