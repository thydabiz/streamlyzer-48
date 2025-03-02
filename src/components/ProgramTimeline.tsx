
import { Button } from "@/components/ui/button";
import { EPGProgram } from "@/types/epg";
import { fetchProgramsForChannel } from "@/services/epg";

interface ProgramTimelineProps {
  channelId: string;
  schedule: EPGProgram[];
  onLoadSchedule: (channelId: string) => void;
}

const ProgramTimeline = ({ channelId, schedule, onLoadSchedule }: ProgramTimelineProps) => {
  const now = new Date();
  const timelineStart = new Date(now.setHours(now.getHours() - 1));
  const timelineEnd = new Date(now.setHours(now.getHours() + 4));

  if (schedule.length === 0) {
    return (
      <div className="relative h-24 bg-gray-800/50 rounded-lg mt-4 overflow-x-auto flex items-center justify-center">
        <p className="text-gray-400">No program schedule available</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-4"
          onClick={() => fetchProgramsForChannel(channelId).then(() => onLoadSchedule(channelId))}
        >
          Load Schedule
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-24 bg-gray-800/50 rounded-lg mt-4 overflow-x-auto">
      <div className="absolute inset-0 flex items-stretch">
        {schedule.map((program) => {
          const start = new Date(program.startTime);
          const end = new Date(program.endTime);
          const duration = end.getTime() - start.getTime();
          const width = (duration / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
          const left = ((start.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;

          return (
            <div
              key={program.id}
              className="absolute h-full flex items-center justify-center px-4 text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              style={{
                left: `${left}%`,
                width: `${width}%`,
              }}
              title={`${program.title} (${start.toLocaleTimeString()} - ${end.toLocaleTimeString()})`}
            >
              <span className="truncate">{program.title}</span>
            </div>
          );
        })}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{
            left: `${((new Date().getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100}%`
          }}
        />
      </div>
    </div>
  );
};

export default ProgramTimeline;
