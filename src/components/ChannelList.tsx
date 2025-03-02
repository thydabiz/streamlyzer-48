
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Channel, EPGProgram } from "@/types/epg";
import ChannelCard from "./ChannelCard";

interface ChannelListProps {
  channels: Channel[];
  currentPrograms: Record<string, EPGProgram | undefined>;
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  categoryFilter?: string;
  onCategoryChange: (category: string | undefined) => void;
  categories: string[];
}

const ChannelList = ({
  channels,
  currentPrograms,
  selectedChannel,
  onChannelSelect,
  categoryFilter,
  onCategoryChange,
  categories,
}: ChannelListProps) => {
  const [categoryType, setCategoryType] = useState<string>("all");
  
  const channelTypes = ["all", "sports", "news", "movies", "kids", "24/7", "ppv", "entertainment"];

  const filteredChannels = channels.filter(channel => {
    const program = currentPrograms[channel.id];
    
    if (categoryFilter) {
      if (!program) return false;
      if (program.category !== categoryFilter) return false;
    }
    
    if (categoryType !== "all") {
      if (!program) return false;
      const categoryMatch = program.category?.toLowerCase().includes(categoryType.toLowerCase());
      if (!categoryMatch) return false;
    }
    
    return true;
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">All Channels ({filteredChannels.length})</h2>
        <div className="flex gap-4">
          <Select value={categoryType} onValueChange={setCategoryType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {channelTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto max-w-md pb-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={categoryFilter === category ? "default" : "outline"}
                  onClick={() => onCategoryChange(
                    categoryFilter === category ? undefined : category
                  )}
                  size="sm"
                >
                  {category}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChannels.length > 0 ? (
          filteredChannels.map((channel) => (
            <ChannelCard 
              key={channel.id}
              channel={channel}
              program={currentPrograms[channel.id]}
              isSelected={selectedChannel?.id === channel.id}
              onSelect={onChannelSelect}
            />
          ))
        ) : (
          <div className="col-span-3 text-center py-12">
            <p className="text-gray-400">No channels match the current filters</p>
            <Button
              variant="outline"
              onClick={() => {
                setCategoryType("all");
                onCategoryChange(undefined);
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ChannelList;
