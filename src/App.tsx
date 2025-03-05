import { useState, useEffect } from 'react';
import { Channel } from './services/database/schema';
import { VideoPlayer } from './components/VideoPlayer';
import { LiveTV } from './components/LiveTV';
import { LoginForm } from './components/LoginForm';
import { db } from './services/database/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    },
  },
});

function App() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>();

  // Check if we have any channels in the database
  const channels = useLiveQuery(
    async () => {
      console.log('App: Fetching channels...');
      const result = await db.channels.toArray();
      console.log('App: Found', result.length, 'channels');
      return result;
    }
  );

  // Set authenticated if we have channels
  useEffect(() => {
    if (channels && channels.length > 0) {
      setIsAuthenticated(true);
    }
  }, [channels]);

  const handleChannelSelect = (channel: Channel) => {
    console.log('App: Channel selected:', channel.name);
    setSelectedChannel(channel);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LoginForm onLoginSuccess={handleLoginSuccess} />
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex h-screen bg-gray-100">
          {/* Left sidebar - Channel List */}
          <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-semibold">Streamlyzer</h1>
            </div>
            <div className="flex-1">
              <LiveTV
                selectedChannel={selectedChannel}
                onChannelSelect={handleChannelSelect}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
              />
            </div>
          </div>

          {/* Main content - Video Player */}
          <div className="flex-1 flex flex-col">
            {selectedChannel ? (
              <div className="flex-1 flex flex-col">
                <div className="aspect-video bg-black">
                  <VideoPlayer
                    channel={selectedChannel}
                    autoQuality
                  />
                </div>
                <div className="flex-1 p-4">
                  <h2 className="text-2xl font-semibold mb-2">
                    {selectedChannel.name}
                  </h2>
                  <div className="text-gray-600">
                    {selectedChannel.group && (
                      <span className="inline-block px-2 py-1 bg-gray-200 rounded text-sm">
                        {selectedChannel.group}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a channel to start watching
              </div>
            )}
          </div>
        </div>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
