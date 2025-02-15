import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getChannels, getPrograms, getCurrentProgram, getProgramSchedule } from "@/services/epgService";
import { StreamSetupDialog } from "@/components/StreamSetupDialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import type { Channel } from "@/types/epg";
import type { StreamCredentials } from "@/types/auth";
import type { ContentFilters } from "@/types/filters";

const Index = () => {
  const [selectedChannel, setSelectedChannel] = useState<Channel>(getChannels()[0]);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [streamCredentials, setStreamCredentials] = useState<StreamCredentials | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<number | undefined>();
  const [ratingFilter, setRatingFilter] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'rating'>('name');

  const debouncedSearch = useDebounce(searchQuery, 300);

  const channels = getChannels();
  const programs = getPrograms({ 
    category: categoryFilter,
    searchQuery: debouncedSearch 
  });
  const currentProgram = getCurrentProgram(selectedChannel.id);
  const programSchedule = getProgramSchedule(selectedChannel.id);

  const categories = Array.from(
    new Set(getPrograms().map(program => program.category))
  );

  const handleCredentialsSubmit = (credentials: StreamCredentials) => {
    setStreamCredentials(credentials);
    console.log('Stream credentials saved:', credentials);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const renderProgramTimeline = () => {
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

            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 py-6 text-lg"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setSortBy('name')}
                className={`${sortBy === 'name' ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
              >
                Name
              </Button>
              <Button
                variant="outline"
                onClick={() => setSortBy('date')}
                className={`${sortBy === 'date' ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
              >
                Date
              </Button>
              <Button
                variant="outline"
                onClick={() => setSortBy('rating')}
                className={`${sortBy === 'rating' ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
              >
                Rating
              </Button>
            </div>

            <TabsContent value="live" className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold mb-4">Now Playing</h2>
                <VideoPlayer 
                  url={selectedChannel.streamUrl} 
                  title={`${selectedChannel.name} - ${currentProgram?.title || 'No Program Info'}`} 
                />
                {currentProgram && (
                  <>
                    <div className="mt-4 p-4 glass rounded-lg">
                      <h3 className="text-xl font-semibold">{currentProgram.title}</h3>
                      <p className="text-gray-400">{currentProgram.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm bg-white/10 px-2 py-1 rounded">
                          {new Date(currentProgram.startTime).toLocaleTimeString()} - 
                          {new Date(currentProgram.endTime).toLocaleTimeString()}
                        </span>
                        <span className="text-sm bg-white/10 px-2 py-1 rounded">
                          {currentProgram.category}
                        </span>
                      </div>
                    </div>
                    {renderProgramTimeline()}
                  </>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold">Live Channels</h2>
                  <div className="flex gap-2">
                    {categories.map(category => (
                      <Button
                        key={category}
                        variant={categoryFilter === category ? "default" : "outline"}
                        onClick={() => setCategoryFilter(
                          categoryFilter === category ? undefined : category
                        )}
                        className="focus:ring-4 focus:ring-white/20 focus:outline-none"
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
                        onClick={() => setSelectedChannel(channel)}
                        className={`glass rounded-lg p-4 space-y-2 focus:ring-4 focus:ring-white/20 focus:outline-none transition-all ${
                          selectedChannel.id === channel.id ? 'ring-4 ring-white/20' : ''
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
            </TabsContent>

            <TabsContent value="movies" className="space-y-6">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold">Movies</h2>
                  <div className="flex gap-2">
                    {['Action', 'Drama', 'Comedy', 'Horror'].map(genre => (
                      <Button
                        key={genre}
                        variant="outline"
                        className="focus:ring-4 focus:ring-white/20 focus:outline-none"
                      >
                        {genre}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setYearFilter(2024)}
                      className={`${yearFilter === 2024 ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
                    >
                      2024
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRatingFilter('PG-13')}
                      className={`${ratingFilter === 'PG-13' ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
                    >
                      PG-13
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <button
                      key={i}
                      className="group relative aspect-[2/3] rounded-lg overflow-hidden focus:ring-4 focus:ring-white/20 focus:outline-none"
                    >
                      <div className="absolute inset-0 bg-gray-800 animate-pulse" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-medium text-lg">Movie Title</h3>
                        <p className="text-sm text-gray-400">2024 • Action</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="shows" className="space-y-6">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold">TV Shows</h2>
                  <div className="flex gap-2">
                    {['Drama', 'Comedy', 'Reality', 'Documentary'].map(genre => (
                      <Button
                        key={genre}
                        variant="outline"
                        className="focus:ring-4 focus:ring-white/20 focus:outline-none"
                      >
                        {genre}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setYearFilter(2024)}
                      className={`${yearFilter === 2024 ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
                    >
                      2024
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRatingFilter('TV-MA')}
                      className={`${ratingFilter === 'TV-MA' ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
                    >
                      TV-MA
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <button
                      key={i}
                      className="group relative aspect-[2/3] rounded-lg overflow-hidden focus:ring-4 focus:ring-white/20 focus:outline-none"
                    >
                      <div className="absolute inset-0 bg-gray-800 animate-pulse" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-medium text-lg">Show Title</h3>
                        <p className="text-sm text-gray-400">Season 1 • Drama</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
