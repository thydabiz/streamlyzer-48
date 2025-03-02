import { useState, useEffect } from "react";
import { getChannels, getProgramSchedule, refreshEPGData, fetchProgramsForChannel } from "@/services/epg";
import { toast } from "sonner";
import type { Channel, EPGProgram } from "@/types/epg";
import LiveTVHeader from "./LiveTVHeader";
import NoChannelsMessage from "./NoChannelsMessage";
import NowPlaying from "./NowPlaying";
import ChannelList from "./ChannelList";

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
  const [categories, setCategories] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadChannels = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const channelData = await getChannels();
      console.log(`Loaded ${channelData.length} channels`);
      setChannels(channelData);
      
      if (channelData.length === 0) {
        toast.error("No channels found. Your provider may not support channel listings.");
        setLoading(false);
        setLoadError("No channels found. Please check your stream credentials.");
        return;
      }
      
      // Select the first channel if none is selected
      if (!selectedChannel && channelData.length > 0) {
        onChannelSelect(channelData[0]);
      }
      
      // Load current programs for all channels
      const programs = await Promise.all(
        channelData.slice(0, 20).map(async (channel) => { // Limit to first 20 channels initially
          try {
            const program = await fetchProgramsForChannel(channel.id).then(() => {
              // Get the current program for this channel
              return import("@/services/epg").then(({ getCurrentProgram }) => getCurrentProgram(channel.id));
            });
            return [channel.id, program] as const;
          } catch (error) {
            console.error(`Error fetching program for channel ${channel.id}:`, error);
            return [channel.id, undefined] as const;
          }
        })
      );
      
      const programsMap = Object.fromEntries(programs.filter(([_, program]) => program !== undefined));
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
          try {
            const remainingPrograms = await Promise.all(
              channelData.slice(20).map(async (channel) => {
                try {
                  const program = await fetchProgramsForChannel(channel.id).then(() => {
                    return import("@/services/epg").then(({ getCurrentProgram }) => getCurrentProgram(channel.id));
                  });
                  return [channel.id, program] as const;
                } catch (error) {
                  console.error(`Error fetching program for channel ${channel.id}:`, error);
                  return [channel.id, undefined] as const;
                }
              })
            );
            
            setCurrentPrograms(prev => ({
              ...prev,
              ...Object.fromEntries(remainingPrograms.filter(([_, program]) => program !== undefined))
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
          } catch (error) {
            console.error("Error loading remaining programs:", error);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Failed to load channels:", error);
      toast.error("Failed to load channels");
      setLoadError("Failed to load channels. Please check your connection and try again.");
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
      setProgramSchedule(prev => ({ ...prev, [channelId]: [] }));
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
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mr-2"></div> 
      Loading channels...
    </div>;
  }

  // Handle case with no channels but authenticated
  if (!channels.length) {
    return (
      <NoChannelsMessage 
        onRefreshChannels={handleRefreshChannels} 
        onRefreshEPG={handleRefreshEPG}
        isRefreshing={refreshing}
      />
    );
  }

  return (
    <div className="space-y-6">
      <LiveTVHeader 
        onRefreshChannels={handleRefreshChannels}
        onRefreshEPG={handleRefreshEPG}
        isRefreshing={refreshing}
        onRefreshComplete={handleRefreshComplete}
      />

      {loadError && (
        <div className="p-4 bg-red-900/20 rounded-lg text-red-200">
          <p>{loadError}</p>
          <button 
            onClick={handleRefreshChannels} 
            className="mt-2 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      {selectedChannel && (
        <NowPlaying 
          channel={selectedChannel}
          currentProgram={currentPrograms[selectedChannel.id]}
          programSchedule={programSchedule[selectedChannel.id] || []}
          onLoadSchedule={loadProgramSchedule}
        />
      )}

      <ChannelList 
        channels={channels}
        currentPrograms={currentPrograms}
        selectedChannel={selectedChannel}
        onChannelSelect={onChannelSelect}
        categoryFilter={categoryFilter}
        onCategoryChange={onCategoryChange}
        categories={categories}
      />
    </div>
  );
};

export default LiveTV;
