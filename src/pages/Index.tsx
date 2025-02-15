
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { StreamSetupDialog } from "@/components/StreamSetupDialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { getChannels } from "@/services/epgService";
import { useDebounce } from "@/hooks/use-debounce";
import SearchBar from "@/components/SearchBar";
import LiveTV from "@/components/LiveTV";
import Movies from "@/components/Movies";
import Shows from "@/components/Shows";
import type { Channel } from "@/types/epg";
import type { StreamCredentials } from "@/types/auth";

const Index = () => {
  const [selectedChannel, setSelectedChannel] = useState<Channel>(getChannels()[0]);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [streamCredentials, setStreamCredentials] = useState<StreamCredentials | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<number | undefined>();
  const [ratingFilter, setRatingFilter] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'rating'>('name');

  const debouncedSearch = useDebounce(searchQuery, 300);

  const handleCredentialsSubmit = (credentials: StreamCredentials) => {
    setStreamCredentials(credentials);
    console.log('Stream credentials saved:', credentials);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {!streamCredentials ? (
          <div className="flex items-center justify-center h-[50vh]">
            <StreamSetupDialog onCredentialsSubmit={handleCredentialsSubmit} />
          </div>
        ) : (
          <Tabs defaultValue="live" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-14 text-lg">
              <TabsTrigger 
                value="live"
                className="data-[state=active]:bg-white/10 focus:ring-4 focus:ring-white/20"
              >
                Live TV
              </TabsTrigger>
              <TabsTrigger 
                value="movies"
                className="data-[state=active]:bg-white/10 focus:ring-4 focus:ring-white/20"
              >
                Movies
              </TabsTrigger>
              <TabsTrigger 
                value="shows"
                className="data-[state=active]:bg-white/10 focus:ring-4 focus:ring-white/20"
              >
                TV Shows
              </TabsTrigger>
            </TabsList>

            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
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
