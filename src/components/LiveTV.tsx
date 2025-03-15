import { useState, useEffect, useCallback, useMemo } from "react";
import { refreshEPGData } from "@/services/epg";
import { toast } from "sonner";
import type { Channel, EPGProgram } from "@/types/epg";
import { LiveTVHeader } from "./LiveTVHeader";
import { NoChannelsMessage } from "./NoChannelsMessage";
import { ChannelList } from "./ChannelList";
import { ProgramGuide } from "./ProgramGuide";
import { useEPGData } from "@/hooks/useEPGData";
import { db } from "@/services/database/schema";
import { useLiveQuery } from "dexie-react-hooks";
import { authService } from "@/services/auth/authService";
import { channelSync } from "@/services/sync/channelSync";

interface LiveTVProps {
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  categoryFilter?: string;
  onCategoryChange: (category: string | undefined) => void;
}

// Common categories to look for in channel names
const COMMON_CATEGORIES = [
  'News',
  'Sports',
  'Shows',
  'Movies',
  'Kids',
  'Music',
  'Live',
  'Netflix',
  'HBO',
  'Hulu',
  'Amazon',
  'Disney',
  'ESPN',
  'Marvel',
  'NBC',
  'FOX',
  'Entertainment',
  'Lifestyle',
  'XX'
];

export const LiveTV = ({ selectedChannel, onChannelSelect, categoryFilter, onCategoryChange }: LiveTVProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>();
  const [showProgramGuide, setShowProgramGuide] = useState(false);
  
  // Use Dexie's live query to automatically update when channels change
  const channels = useLiveQuery(
    async () => {
      console.log('LiveTV: Fetching channels...');
      const result = await db.channels.toArray();
      console.log(`LiveTV: Retrieved ${result.length} channels`);
      return result;
    },
    [],
    []
  );

  // Get EPG data using our hook
  const { currentPrograms, loading: epgLoading, refreshPrograms } = useEPGData(channels || []);

  const handleRefreshChannels = useCallback(async () => {
    setRefreshing(true);
    try {
      const session = await db.authSession.toArray();
      if (!session.length) {
        throw new Error('No active session');
      }
      const { username, password, serverUrl } = session[0];
      
      // Re-authenticate and sync channels
      const auth = await authService.authenticate(username, password, serverUrl);
      if (auth.error) {
        throw new Error(auth.error);
      }
      
      await channelSync.syncChannels(username, password, serverUrl);
      toast.success("Channels refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh channels:", error);
      toast.error("Failed to refresh channels");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleRefreshEPG = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshEPGData();
      await refreshPrograms();
      toast.success("EPG data refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh EPG data:", error);
      toast.error("Failed to refresh EPG data");
    } finally {
      setRefreshing(false);
    }
  }, [refreshPrograms]);

  // Extract country from channel name using regex
  const getCountryFromName = (name: string): string => {
    if (!name) return 'Uncategorized'; // Check for null or undefined
    const match = name.match(/^\[(.*?)\]/);
    if (match) {
      const country = match[1];
      // Common country codes
      if (['CA', 'USA', 'UK', 'IN', 'PAK', 'JP', 'CR', 'TH', 'PH', 'VT', 'ID', 'HK', 'SK', 'F1', 'GP', 'TAM', 'INSPT', 'EN'].includes(country)) {
        return country;
      }
    }
    return 'Uncategorized';
  };

  // Extract category from channel name
  const getCategoryFromName = (name: string): string => {
    if (!name) return 'Uncategorized'; // Check for null or undefined
    const cleanName = name.replace(/^\[(.*?)\]/, '').trim();
    
    // Check for common categories in the name
    const foundCategory = COMMON_CATEGORIES.find(category => 
      cleanName.toLowerCase().includes(category.toLowerCase())
    );
    
    return foundCategory || 'Uncategorized';
  };

  // Process channels to get unique countries and categories
  const { countries, categories, processedChannels } = useMemo(() => {
    if (!channels) return { countries: [], categories: [], processedChannels: [] };

    const processedChannels = channels.map(channel => {
      //console.log(`Channel ID: ${channel.id}, EPG ID: ${channel.epgId}`);
      return ({
        ...channel,
        country: getCountryFromName(channel.name),
        category: getCategoryFromName(channel.name)
      });
    });

    const countries = Array.from(new Set(processedChannels.map(c => c.country))).sort();
    const categories = Array.from(new Set(processedChannels.map(c => c.category))).sort();

    return { countries, categories, processedChannels };
  }, [channels]);

  useEffect(() => {
    console.log('LiveTV component mounted or channels updated:', channels?.length);
    setLoading(false);
  }, [channels]);

  // Filter channels based on category and country
  const filteredChannels = useMemo(() => {
    return (processedChannels || []).filter(channel => {
      if (!channel) {
        console.warn('Found null channel in list');
        return false;
      }

      const matchesCategory = !categoryFilter || channel.category === categoryFilter;
      const matchesCountry = !countryFilter || channel.country === countryFilter;
      
      return matchesCategory && matchesCountry;
    });
  }, [processedChannels, categoryFilter, countryFilter]);

  if (loading && (!channels || channels.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mr-2"></div>
        Loading channels...
      </div>
    );
  }

  if (!channels || channels.length === 0) {
    return <NoChannelsMessage 
      onRefreshChannels={handleRefreshChannels}
      onRefreshEPG={handleRefreshEPG}
      isRefreshing={refreshing}
    />;
  }

  return (
    <div className="flex flex-col h-full">
      <LiveTVHeader
        showProgramGuide={showProgramGuide}
        onToggleProgramGuide={() => setShowProgramGuide(prev => !prev)}
        countries={countries}
        selectedCountry={countryFilter}
        onCountryChange={setCountryFilter}
        categories={categories}
        selectedCategory={categoryFilter}
        onCategoryChange={onCategoryChange}
        onRefreshChannels={handleRefreshChannels}
        onRefreshEPG={handleRefreshEPG}
        isRefreshing={refreshing}
        onRefreshComplete={() => {}}
        disabled={showProgramGuide} // Disable when program guide is shown
      />

      <div className="flex-1 overflow-y-auto h-[500px]"> 
        <ChannelList
          channels={filteredChannels}
          currentPrograms={currentPrograms}
          selectedChannel={selectedChannel}
          onChannelSelect={onChannelSelect}
        />
      </div>
    </div>
  );
};
