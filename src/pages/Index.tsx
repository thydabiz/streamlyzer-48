
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { EPGSettingsDialog } from "@/components/EPGSettingsDialog";
import { CredentialsForm } from "@/components/CredentialsForm";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getStoredCredentials } from "@/services/iptvService";
import { useDebounce } from "@/hooks/use-debounce";
import SearchBar from "@/components/SearchBar";
import LiveTV from "@/components/LiveTV";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import type { Channel } from "@/types/epg";

const Index = () => {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<number | undefined>();
  const [ratingFilter, setRatingFilter] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'rating'>('name');

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Privacy-focused credentials query that doesn't store user data
  const { data: credentials, isLoading: isLoadingCredentials } = useQuery({
    queryKey: ['credentials'],
    queryFn: getStoredCredentials,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    meta: {
      anonymous: true, // Mark this query as anonymous (no user tracking)
    }
  });

  const handleCredentialsSuccess = () => {
    // Refresh the page without storing user history 
    window.location.replace(window.location.pathname);
  };

  // Remove any user tracking on component unmount
  useEffect(() => {
    return () => {
      // Clean up any potential user data when navigating away
      sessionStorage.removeItem('lastSearch');
      sessionStorage.removeItem('lastChannel');
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {!credentials ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <CredentialsForm onSuccess={handleCredentialsSuccess} />
          </div>
        ) : (
          <Tabs defaultValue="live" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full grid-cols-3 h-14 text-lg">
                <TabsTrigger value="live">Live TV</TabsTrigger>
                <TabsTrigger value="movies">Movies</TabsTrigger>
                <TabsTrigger value="shows">TV Shows</TabsTrigger>
              </TabsList>
              <EPGSettingsDialog />
            </div>

            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={(e) => setSearchQuery(e.target.value)}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            <TabsContent value="live">
              <LiveTV
                selectedChannel={selectedChannel}
                onChannelSelect={setSelectedChannel}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
              />
            </TabsContent>

            <TabsContent value="movies">
              <Movies
                yearFilter={yearFilter}
                onYearChange={setYearFilter}
                ratingFilter={ratingFilter}
                onRatingChange={setRatingFilter}
              />
            </TabsContent>

            <TabsContent value="shows">
              <Shows
                yearFilter={yearFilter}
                onYearChange={setYearFilter}
                ratingFilter={ratingFilter}
                onRatingChange={setRatingFilter}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
