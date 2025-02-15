
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { getChannels, getPrograms, getCurrentProgram } from "@/services/epgService";
import { StreamSetupDialog } from "@/components/StreamSetupDialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { Channel } from "@/types/epg";
import type { StreamCredentials } from "@/types/auth";

const Index = () => {
  const [selectedChannel, setSelectedChannel] = useState<Channel>(getChannels()[0]);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [streamCredentials, setStreamCredentials] = useState<StreamCredentials | null>(null);

  const channels = getChannels();
  const programs = getPrograms({ category: categoryFilter });
  const currentProgram = getCurrentProgram(selectedChannel.id);

  const categories = Array.from(
    new Set(getPrograms().map(program => program.category))
  );

  const handleCredentialsSubmit = (credentials: StreamCredentials) => {
    setStreamCredentials(credentials);
    console.log('Stream credentials saved:', credentials);
    // Here you would typically initialize your streaming service
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

            <TabsContent value="live" className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold mb-4">Now Playing</h2>
                <VideoPlayer 
                  url={selectedChannel.streamUrl} 
                  title={`${selectedChannel.name} - ${currentProgram?.title || 'No Program Info'}`} 
                />
                {currentProgram && (
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
