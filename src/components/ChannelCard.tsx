
import { Channel, EPGProgram } from "@/types/epg";

interface ChannelCardProps {
  channel: Channel;
  program?: EPGProgram;
  isSelected: boolean;
  onSelect: (channel: Channel) => void;
}

const ChannelCard = ({ channel, program, isSelected, onSelect }: ChannelCardProps) => {
  return (
    <button
      onClick={() => onSelect(channel)}
      className={`glass rounded-lg p-4 space-y-2 focus:ring-4 focus:ring-white/20 focus:outline-none transition-all ${
        isSelected ? 'ring-4 ring-white/20' : ''
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
      {program ? (
        <p className="text-sm text-gray-400">
          Now: {program.title}
        </p>
      ) : (
        <p className="text-sm text-gray-400">
          No program info available
        </p>
      )}
    </button>
  );
};

export default ChannelCard;
