
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
import { getChannels, getCurrentProgram, getProgramSchedule, refreshEPGData, fetchProgramsForChannel } from "@/services/epgService";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import StreamCredentialsManager from "./StreamCredentialsManager";
import { EPGSettingsDialog } from "./EPGSettingsDialog";
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
  const [categories, setCategories] = useState<string[]>([]);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const channelData = await getChannels();
      console.log(`Loaded ${channelData.length} channels`);
      setChannels(channelData);
      
      if (channelData.length === 0) {
        toast.error("No channels found. Your provider may not support channel listings.");
        setLoading(false);
        return;
      }
      
      // Select the first channel if none is selected
      if (!selectedChannel && channelData.length > 0) {
        onChannelSelect(channelData[0]);
      }
      
      // Load current programs for all channels
      const programs = await Promise.all(
        channelData.slice(0, 20).map(async (channel) => { // Limit to first 20 channels initially
          const program = await getCurrentProgram(channel.id);
          return [channel.id, program] as const;
        })
      );
      
      const programsMap = Object.fromEntries(programs);
      setCurrentPrograms(programsMap);
      
      // Extract categories from programs
      const uniqueCategories = Array.from(
        new Set(
          Object.values(programsMap)
            .filter((program): program is EPGProgram => !!program)
            .map(program => program.category)
            .filter(Boolean)
        )
      );
      setCategories(uniqueCategories);
      
      // Then load programs for remaining channels in background
      if (channelData.length > 20) {
        setTimeout(async () => {
          const remainingPrograms = await Promise.all(
            channelData.slice(20).map(async (channel) => {
              const program = await getCurrentProgram(channel.id);
              return [channel.id, program] as const;
            })
          );
          
          setCurrentPrograms(prev => ({
            ...prev,
            ...Object.fromEntries(remainingPrograms)
          }));
          
          // Update categories
          const allPrograms = [...Object.values(programsMap), ...remainingPrograms.map(([_, p]) => p)];
          const allUniqueCategories = Array.from(
            new Set(
              allPrograms
                .filter((program): program is EPGProgram => !!program)
                .map(program => program.category)
                .filter(Boolean)
            )
          );
          setCategories(allUniqueCategories);
        }, 500);
      }
    } catch (error) {
      console.error("Failed to load channels:", error);
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
      console.log(`Loading program schedule for channel ${channelId}`);
      const schedule = await getProgramSchedule(channelId);
      
      if (schedule.length === 0) {
        console.log(`No program schedule found for channel ${channelId}, attempting to fetch EPG data`);
        // Try to fetch program data specifically for this channel
        await fetchProgramsForChannel(channelId);
        
        // Try loading schedule again
        const retrySchedule = await getProgramSchedule(channelId);
        setProgramSchedule(prev => ({ ...prev, [channelId]: retrySchedule }));
      } else {
        setProgramSchedule(prev => ({ ...prev, [channelId]: schedule }));
      }
    } catch (error) {
      console.error('Error loading program schedule:', error);
    }
  };

  const handleRefreshChannels = async () => {
    setRefreshing(true);
    try {
      const channels = await getChannels();
      if (channels.length > 0) {
        await loadChannels();
        toast.success(`Refreshed ${channels.length} channels successfully`);
      } else {
        toast.error("No channels found during refresh");
      }
    } catch (error) {
      console.error("Failed to refresh channels:", error);
      toast.error("Failed to refresh channels");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshEPG = async () => {
    setRefreshing(true);
    try {
      await refreshEPGData();
      await loadChannels();
      toast.success("EPG data refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh EPG data:", error);
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

  // Handle case with no channels but authenticated
  if (!channels.length) {
    return (
      <div className="text-center p-8 space-y-6">
        <h2 className="text-2xl font-semibold mb-4">No Channels Available</h2>
        <p className="text-gray-400 mb-6">
          Your IPTV provider hasn't provided any channel listings or we couldn't fetch them.
        </p>
        <div className="flex items-center justify-center gap-4">
          <StreamCredentialsManager />
          <Button 
            onClick={handleRefreshChannels} 
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Channels
          </Button>
          <Button
            onClick={handleRefreshEPG}
            disabled={refreshing}
            className="flex items-center gap-2"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh EPG Data
          </Button>
        </div>
      </div>
    );
  }

  const channelTypes = ["all", "sports", "news", "movies", "kids", "24/7", "ppv", "entertainment"];

  const filteredChannels = channels.filter(channel => {
    const program = currentPrograms[channel.id];
    
    if (categoryFilter) {
      if (!program) return false;
      if (program.category !== categoryFilter) return false;
    }
    
    if (categoryType !== "all") {
      if (!program) return false;
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

    if (schedule.length === 0) {
      return (
        <div className="relative h-24 bg-gray-800/50 rounded-lg mt-4 overflow-x-auto flex items-center justify-center">
          <p className="text-gray-400">No program schedule available</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4"
            onClick={() => fetchProgramsForChannel(channelId).then(() => loadProgramSchedule(channelId))}
          >
            Load Schedule
          </Button>
        </div>
      );
    }

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshChannels}
            disabled={refreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Channels
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshEPG}
            disabled={refreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh EPG Data
          </Button>
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
          <h2 className="text-2xl font-semibold">All Channels ({filteredChannels.length})</h2>
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
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto max-w-md pb-2">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={categoryFilter === category ? "default" : "outline"}
                    onClick={() => onCategoryChange(
                      categoryFilter === category ? undefined : category
                    )}
                    size="sm"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChannels.length > 0 ? (
            filteredChannels.map((channel) => {
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
                  {program ? (
                    <p className="text-sm text-gray-400">
                      Now: {program.title}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No program info available
                    </p>
                  )}
                </button>
              );
            })
          ) : (
            <div className="col-span-3 text-center py-12">
              <p className="text-gray-400">No channels match the current filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setCategoryType("all");
                  onCategoryChange(undefined);
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default LiveTV;
