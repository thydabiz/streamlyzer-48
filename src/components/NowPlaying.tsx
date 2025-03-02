
import VideoPlayer from "@/components/VideoPlayer";
import { Channel, EPGProgram } from "@/types/epg";
import ProgramTimeline from "./ProgramTimeline";

interface NowPlayingProps {
  channel: Channel;
  currentProgram?: EPGProgram;
  programSchedule: EPGProgram[];
  onLoadSchedule: (channelId: string) => void;
}

const NowPlaying = ({ channel, currentProgram, programSchedule, onLoadSchedule }: NowPlayingProps) => {
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Now Playing</h2>
      <VideoPlayer 
        url={channel.streamUrl} 
        title={`${channel.name} - ${currentProgram?.title || 'No Program Info'}`} 
      />
      <ProgramTimeline 
        channelId={channel.id} 
        schedule={programSchedule} 
        onLoadSchedule={onLoadSchedule} 
      />
    </section>
  );
};

export default NowPlaying;
