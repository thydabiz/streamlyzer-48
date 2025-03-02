
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import StreamCredentialsManager from "./StreamCredentialsManager";

interface NoChannelsMessageProps {
  onRefreshChannels: () => void;
  onRefreshEPG: () => void;
  isRefreshing: boolean;
}

const NoChannelsMessage = ({ onRefreshChannels, onRefreshEPG, isRefreshing }: NoChannelsMessageProps) => {
  return (
    <div className="text-center p-8 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">No Channels Available</h2>
      <p className="text-gray-400 mb-6">
        Your IPTV provider hasn't provided any channel listings or we couldn't fetch them.
      </p>
      <div className="flex items-center justify-center gap-4">
        <StreamCredentialsManager />
        <Button 
          onClick={onRefreshChannels} 
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Channels
        </Button>
        <Button
          onClick={onRefreshEPG}
          disabled={isRefreshing}
          className="flex items-center gap-2"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh EPG Data
        </Button>
      </div>
    </div>
  );
};

export default NoChannelsMessage;
