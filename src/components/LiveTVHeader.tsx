
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import StreamCredentialsManager from "./StreamCredentialsManager";
import { EPGSettingsDialog } from "./EPGSettingsDialog";

interface LiveTVHeaderProps {
  onRefreshChannels: () => void;
  onRefreshEPG: () => void;
  isRefreshing: boolean;
  onRefreshComplete: () => void;
}

const LiveTVHeader = ({ 
  onRefreshChannels, 
  onRefreshEPG, 
  isRefreshing,
  onRefreshComplete 
}: LiveTVHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-semibold">Live Channels</h2>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshChannels}
          disabled={isRefreshing}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Channels
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshEPG}
          disabled={isRefreshing}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh EPG Data
        </Button>
        <StreamCredentialsManager />
        <EPGSettingsDialog onRefreshComplete={onRefreshComplete} />
      </div>
    </div>
  );
};

export default LiveTVHeader;
