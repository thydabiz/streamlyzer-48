
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { getChannels, getPrograms, getCurrentProgram } from "@/services/epgService";
import type { Channel } from "@/types/epg";

const Index = () => {
  const [selectedChannel, setSelectedChannel] = useState<Channel>(getChannels()[0]);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  const channels = getChannels();
  const programs = getPrograms({ category: categoryFilter });
  const currentProgram = getCurrentProgram(selectedChannel.id);

  const categories = Array.from(
    new Set(getPrograms().map(program => program.category))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
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
      </div>
    </DashboardLayout>
  );
};

export default Index;
