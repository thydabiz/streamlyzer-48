
import DashboardLayout from "@/components/DashboardLayout";
import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";

const Index = () => {
  // Sample HLS stream - replace with your actual stream URL
  const sampleStream = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Now Playing</h2>
          <VideoPlayer url={sampleStream} title="Sample Stream" />
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Live Channels</h2>
            <Button variant="link">View All</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-lg p-4 space-y-2">
                <div className="aspect-video bg-gray-800 rounded animate-pulse" />
                <h3 className="font-medium">Channel {i + 1}</h3>
                <p className="text-sm text-gray-400">Live Now</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Index;
