import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface NoChannelsMessageProps {
  onRefreshChannels: () => void;
  onRefreshEPG: () => void;
  isRefreshing: boolean;
}

export const NoChannelsMessage = ({
  onRefreshChannels,
  onRefreshEPG,
  isRefreshing
}: NoChannelsMessageProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <p className="text-lg text-gray-500">
        No channels found. Please check your stream credentials or try refreshing.
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onRefreshChannels}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Channels
        </Button>
        <Button
          variant="outline"
          onClick={onRefreshEPG}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh EPG
        </Button>
      </div>
    </div>
  );
};
