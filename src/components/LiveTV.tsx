
import { useState, useEffect } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { getChannels, getCurrentProgram, getProgramSchedule } from "@/services/epgService";
import { toast } from "sonner";
import type { Channel } from "@/types/epg";

interface LiveTVProps {
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  categoryFilter?: string;
  onCategoryChange: (category: string | undefined) => void;
}

const LiveTV = ({ selectedChannel, onChannelSelect, categoryFilter, onCategoryChange }: LiveTVProps) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const channelData = await getChannels();
        setChannels(channelData);
      } catch (error) {
        toast.error("Failed to load channels");
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading channels...</div>;
  }

  if (!channels.length) {
    return <div className="text-center p-4">No channels available</div>;
  }

  const categories = Array.from(
    new Set(channels.map(channel => getCurrentProgram(channel.id)?.category).filter(Boolean))
  );

  const renderProgramTimeline = (channelId: string) => {
    const programSchedule = getProgramSchedule(channelId);
    const now = new Date();
    const timelineStart = new Date(now.setHours(now.getHours() - 1));
    const timelineEnd = new Date(now.setHours(now.getHours() + 4));

    return (
      <div className="relative h-24 bg-gray-800/50 rounded-lg mt-4 overflow-x-auto">
        <div className="absolute inset-0 flex items-stretch">
          {programSchedule.map((program) => {
            const start = new Date(program.startTime);
            const end = new Date(program.endTime);
            const duration = end.getTime() - start.getTime();
            const width = (duration / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
            const left = ((start.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;

            return (
              <div
                key={program.id}
                className="absolute h-full flex items-center justify-center px-4 text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`${program.title} (${start.toLocaleTimeString()} - ${end.toLocaleTimeString()})`}
              >
                <span className="truncate">{program.title}</span>
              </div>
            );
          })}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{
              left: `${((now.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100}%`
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {selectedChannel && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Now Playing</h2>
          <VideoPlayer 
            url={selectedChannel.streamUrl} 
            title={`${selectedChannel.name} - ${getCurrentProgram(selectedChannel.id)?.title || 'No Program Info'}`} 
          />
          {renderProgramTimeline(selectedChannel.id)}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Live Channels</h2>
          <div className="flex gap-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={categoryFilter === category ? "default" : "outline"}
                onClick={() => onCategoryChange(
                  categoryFilter === category ? undefined : category
                )}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => {
            const program = getCurrentProgram(channel.id);
            return (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel)}
                className={`glass rounded-lg p-4 space-y-2 focus:ring-4 focus:ring-white/20 focus:outline-none transition-all ${
                  selectedChannel?.id === channel.id ? 'ring-4 ring-white/20' : ''
                }`}
              >
                <div className="aspect-video bg-gray-800 rounded flex items-center justify-center">
                  {channel.logo ? (
                    <img src={channel.logo} alt={channel.name} className="h-12" />
                  ) : (
                    <span className="text-2xl font-bold">{channel.number}</span>
                  )}
                </div>
                <h3 className="font-medium">{channel.name}</h3>
                {program && (
                  <p className="text-sm text-gray-400">
                    Now: {program.title}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default LiveTV;
