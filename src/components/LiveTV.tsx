import { useState, useEffect } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getChannels, getCurrentProgram, getProgramSchedule, refreshEPGData } from "@/services/epgService";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import StreamCredentialsManager from "./StreamCredentialsManager";
import EPGSettingsDialog from "./EPGSettingsDialog";
import type { Channel, EPGProgram } from "@/types/epg";

interface LiveTVProps {
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  categoryFilter?: string;
  onCategoryChange: (category: string | undefined) => void;
}

const LiveTV = ({ selectedChannel, onChannelSelect, categoryFilter, onCategoryChange }: LiveTVProps) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPrograms, setCurrentPrograms] = useState<Record<string, EPGProgram | undefined>>({});
  const [programSchedule, setProgramSchedule] = useState<Record<string, EPGProgram[]>>({});
  const [categoryType, setCategoryType] = useState<string>("all");

  const loadChannels = async () => {
    try {
      const channelData = await getChannels();
      setChannels(channelData);
      
      // Load current programs for all channels
      const programs = await Promise.all(
        channelData.map(async (channel) => {
          const program = await getCurrentProgram(channel.id);
          return [channel.id, program] as const;
        })
      );
      setCurrentPrograms(Object.fromEntries(programs));
    } catch (error) {
      toast.error("Failed to load channels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      loadProgramSchedule(selectedChannel.id);
    }
  }, [selectedChannel]);

  const loadProgramSchedule = async (channelId: string) => {
    try {
      const schedule = await getProgramSchedule(channelId);
      setProgramSchedule(prev => ({ ...prev, [channelId]: schedule }));
    } catch (error) {
      console.error('Error loading program schedule:', error);
    }
  };

  const handleRefreshEPG = async () => {
    setRefreshing(true);
    try {
      await refreshEPGData();
      await loadChannels();
      toast.success("EPG data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh EPG data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshComplete = async () => {
    await loadChannels();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading channels...</div>;
  }

  if (!channels.length) {
    return <div className="text-center p-4">No channels available</div>;
  }

  const categories = Array.from(
    new Set(Object.values(currentPrograms)
      .filter((program): program is EPGProgram => !!program)
      .map(program => program.category)
      .filter(Boolean))
  );

  const channelTypes = ["all", "sports", "news", "movies", "kids", "24/7", "ppv", "entertainment"];

  const filteredChannels = channels.filter(channel => {
    const program = currentPrograms[channel.id];
    if (!program) return true;
    
    if (categoryFilter && program.category !== categoryFilter) return false;
    if (categoryType !== "all") {
      const categoryMatch = program.category?.toLowerCase().includes(categoryType.toLowerCase());
      if (!categoryMatch) return false;
    }
    return true;
  });

  const renderProgramTimeline = (channelId: string) => {
    const schedule = programSchedule[channelId] || [];
    const now = new Date();
    const timelineStart = new Date(now.setHours(now.getHours() - 1));
    const timelineEnd = new Date(now.setHours(now.getHours() + 4));

    return (
      <div className="relative h-24 bg-gray-800/50 rounded-lg mt-4 overflow-x-auto">
        <div className="absolute inset-0 flex items-stretch">
          {schedule.map((program) => {
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
              left: `${((new Date().getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100}%`
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Live Channels</h2>
        <div className="flex items-center gap-2">
          <StreamCredentialsManager />
          <EPGSettingsDialog onRefreshComplete={handleRefreshComplete} />
        </div>
      </div>

      {selectedChannel && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Now Playing</h2>
          <VideoPlayer 
            url={selectedChannel.streamUrl} 
            title={`${selectedChannel.name} - ${currentPrograms[selectedChannel.id]?.title || 'No Program Info'}`} 
          />
          {renderProgramTimeline(selectedChannel.id)}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">All Channels</h2>
          <div className="flex gap-4">
            <Select value={categoryType} onValueChange={setCategoryType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {channelTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChannels.map((channel) => {
            const program = currentPrograms[channel.id];
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
