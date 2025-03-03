
import { useState, useEffect, useRef, useCallback } from "react";
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

const BATCH_SIZE = 100;

const LiveTV = ({ selectedChannel, onChannelSelect, categoryFilter, onCategoryChange }: LiveTVProps) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPrograms, setCurrentPrograms] = useState<Record<string, EPGProgram | undefined>>({});
  const [programSchedule, setProgramSchedule] = useState<Record<string, EPGProgram[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchChannelsBatch = useCallback(async (pageIndex: number) => {
    if (pageIndex === 0) setLoading(true);
    setLoadError(null);
    
    try {
      const offset = pageIndex * BATCH_SIZE;
      console.log(`Fetching channels batch: page ${pageIndex}, offset ${offset}`);
      
      const channelData = await getChannels(offset, BATCH_SIZE);
      console.log(`Loaded ${channelData.length} channels for page ${pageIndex}`);
      
      if (channelData.length === 0) {
        if (pageIndex === 0) {
          toast.error("No channels found. Your provider may not support channel listings.");
          setLoadError("No channels found. Please check your stream credentials.");
        }
        setHasMore(false);
        setLoading(false);
        return;
      }
      
      if (pageIndex === 0 && !selectedChannel && channelData.length > 0) {
        onChannelSelect(channelData[0]);
      }
      
      if (channelData.length < BATCH_SIZE) {
        setHasMore(false);
      }
      
      // Update channels list
      setChannels(prev => {
        const newChannels = [...prev];
        channelData.forEach(channel => {
          if (!newChannels.find(c => c.id === channel.id)) {
            newChannels.push(channel);
          }
        });
        return newChannels;
      });
      
      // Load current programs for this batch of channels
      const channelsToLoad = channelData.slice(0, 20); // Limit to first 20 channels per batch
      const programs = await Promise.all(
        channelsToLoad.map(async (channel) => {
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
      setCurrentPrograms(prev => ({
        ...prev,
        ...programsMap
      }));
      
      // Extract categories from programs
      const newCategories = Object.values(programsMap)
        .filter((program): program is EPGProgram => !!program)
        .map(program => program.category)
        .filter(Boolean);
      
      setCategories(prev => {
        const uniqueCategories = Array.from(new Set([...prev, ...newCategories]));
        return uniqueCategories;
      });
      
      // Load remaining channels in this batch in background
      if (channelData.length > 20) {
        setTimeout(async () => {
          try {
            const remainingChannels = channelData.slice(20);
            const remainingPrograms = await Promise.all(
              remainingChannels.map(async (channel) => {
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
            const additionalCategories = remainingPrograms
              .map(([_, program]) => program?.category)
              .filter(Boolean) as string[];
            
            setCategories(prev => {
              const uniqueCategories = Array.from(new Set([...prev, ...additionalCategories]));
              return uniqueCategories;
            });
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
  }, [onChannelSelect, selectedChannel]);

  // Initial load
  useEffect(() => {
    fetchChannelsBatch(0);
  }, [fetchChannelsBatch]);
  
  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !refreshing) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchChannelsBatch(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [fetchChannelsBatch, hasMore, loading, page, refreshing]);

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
      // Reset state
      setChannels([]);
      setCurrentPrograms({});
      setCategories([]);
      setPage(0);
      setHasMore(true);
      
      const channels = await getChannels(0, BATCH_SIZE);
      if (channels.length > 0) {
        fetchChannelsBatch(0);
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
      
      // Reset and reload
      setChannels([]);
      setCurrentPrograms({});
      setCategories([]);
      setPage(0);
      setHasMore(true);
      
      fetchChannelsBatch(0);
      toast.success("EPG data refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh EPG data:", error);
      toast.error("Failed to refresh EPG data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshComplete = async () => {
    // Reset and reload
    setChannels([]);
    setCurrentPrograms({});
    setCategories([]);
    setPage(0);
    setHasMore(true);
    
    fetchChannelsBatch(0);
  };

  if (loading && channels.length === 0) {
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
      
      {/* Infinite scroll loader */}
      <div 
        ref={loaderRef} 
        className="h-20 flex items-center justify-center mt-4"
      >
        {hasMore && !loading && !refreshing && channels.length > 0 && (
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        )}
      </div>
    </div>
  );
};

export default LiveTV;
