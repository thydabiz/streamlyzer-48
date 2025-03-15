import { useEffect, useMemo, useCallback } from 'react';
import { Channel, EPGProgram } from '@/types/epg';

interface ChannelListProps {
  channels: Channel[];
  currentPrograms: Record<string, EPGProgram | undefined>;
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
}

export const ChannelList = ({
  channels,
  currentPrograms,
  selectedChannel,
  onChannelSelect,
}: ChannelListProps) => {
  useEffect(() => {
    /*console.log('ChannelList rendered with:', {
      channelCount: channels.length,
      programCount: Object.keys(currentPrograms).length,
      selectedChannelId: selectedChannel?.id
    });*/
  }, [channels, currentPrograms, selectedChannel]);

  const handleChannelSelect = useCallback((channel: Channel) => {
    onChannelSelect(channel);
  }, [onChannelSelect]);

  const channelButtons = useMemo(() => {
    return channels.map(channel => {
      if (!channel || !channel.id) {
        console.warn('Invalid channel in list:', channel);
        return null;
      }

      const currentProgram = currentPrograms[channel.id];
      return (
        <button
          key={channel.id}
          className={`w-full flex items-center gap-3 p-3 hover:bg-gray-100
            ${selectedChannel?.id === channel.id ? 'bg-blue-50' : ''}`}
          onClick={() => handleChannelSelect(channel)}
        >
          {/* Channel logo */}
          <div className="w-12 h-12 flex-shrink-0">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = ''; // Clear broken image
                  e.currentTarget.classList.add('bg-gray-200');
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                <span className="text-gray-400 text-xl">TV</span>
              </div>
            )}
          </div>

          {/* Channel info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{channel.name}</h3>
              {channel.group && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                  {channel.group}
                </span>
              )}
            </div>
            {currentProgram ? (
              <div className="text-sm text-gray-500">
                <p className="truncate">{currentProgram.title}</p>
                {currentProgram.category && (
                  <p className="text-xs text-gray-400">
                    {currentProgram.category}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No Program Available</div>
            )}
          </div>
        </button>
      );
    });
  }, [channels, currentPrograms, selectedChannel, handleChannelSelect]);

  return (
    <div className="flex flex-col h-full">
      {/* Channel list */}
      <div className="flex-1 overflow-y-auto h-[400px]">
        {channels.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4 text-gray-500">
            No channels available
          </div>
        ) : (
          channelButtons
        )}
      </div>
    </div>
  );
};
