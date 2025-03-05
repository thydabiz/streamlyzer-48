import { useEffect, useState, useRef, useCallback } from 'react';
import { Channel, EPGProgram } from '@/types/epg';
import { getProgramSchedule } from '@/services/epg';
import { format, addHours, isWithinInterval } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProgramGuideProps {
  channels: Channel[];
  onProgramSelect?: (channel: Channel, program: EPGProgram) => void;
}

const HOURS_TO_DISPLAY = 4;
const CHANNELS_PER_PAGE = 20;

export const ProgramGuide = ({ channels, onProgramSelect }: ProgramGuideProps) => {
  const [schedules, setSchedules] = useState<Record<string, EPGProgram[]>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const observerRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const endTime = addHours(now, HOURS_TO_DISPLAY);

  const loadScheduleBatch = useCallback(async (channelBatch: Channel[]) => {
    const batchSchedules: Record<string, EPGProgram[]> = {};
    
    await Promise.all(
      channelBatch.map(async (channel) => {
        if (!channel.epgId) {
          batchSchedules[channel.id] = [];
          return;
        }

        try {
          const schedule = await getProgramSchedule(channel.id);
          // Filter to only show programs in the next few hours
          const relevantPrograms = schedule.filter(program => {
            const startTime = new Date(program.startTime);
            const endTime = new Date(program.endTime);
            return isWithinInterval(startTime, { start: now, end: endTime }) ||
                   isWithinInterval(endTime, { start: now, end: endTime }) ||
                   (startTime <= now && endTime >= endTime);
          });
          batchSchedules[channel.id] = relevantPrograms;
        } catch (error) {
          console.error(`Error loading schedule for channel ${channel.id}:`, error);
          batchSchedules[channel.id] = [];
        }
      })
    );

    return batchSchedules;
  }, [now, endTime]);

  const loadMoreSchedules = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const start = page * CHANNELS_PER_PAGE;
      const channelBatch = channels.slice(start, start + CHANNELS_PER_PAGE);
      
      if (channelBatch.length === 0) return;
      
      const batchSchedules = await loadScheduleBatch(channelBatch);
      setSchedules(prev => ({
        ...prev,
        ...batchSchedules
      }));
      setPage(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [channels, loading, page, loadScheduleBatch]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMoreSchedules();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadMoreSchedules, loading]);

  // Calculate time slots for the header
  const timeSlots = Array.from({ length: HOURS_TO_DISPLAY * 2 }, (_, i) => {
    const slotTime = addHours(now, i * 0.5);
    return format(slotTime, 'HH:mm');
  });

  return (
    <ScrollArea className="h-full">
      <div className="min-w-[800px] p-4">
        {/* Time header */}
        <div className="flex border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="w-48 flex-shrink-0 p-2 font-medium">Channel</div>
          <div className="flex-1 flex">
            {timeSlots.map((time, i) => (
              <div key={i} className="w-32 p-2 text-sm text-center border-l">
                {time}
              </div>
            ))}
          </div>
        </div>

        {/* Channel rows */}
        <div className="space-y-1">
          {channels.slice(0, (page + 1) * CHANNELS_PER_PAGE).map(channel => {
            const programs = schedules[channel.id] || [];
            
            return (
              <div key={channel.id} className="flex border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                {/* Channel info */}
                <div className="w-48 flex-shrink-0 p-2 flex items-center gap-2">
                  {channel.logo && (
                    <img src={channel.logo} alt="" className="w-8 h-8 object-contain" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{channel.name}</div>
                    {channel.group && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{channel.group}</div>
                    )}
                  </div>
                </div>

                {/* Programs timeline */}
                <div className="flex-1 flex relative min-h-[80px]">
                  {programs.map((program, i) => {
                    const start = new Date(program.startTime);
                    const end = new Date(program.endTime);
                    const startOffset = Math.max(0, start.getTime() - now.getTime());
                    const duration = end.getTime() - Math.max(start.getTime(), now.getTime());
                    const widthPercent = (duration / (HOURS_TO_DISPLAY * 3600000)) * 100;
                    const leftPercent = (startOffset / (HOURS_TO_DISPLAY * 3600000)) * 100;

                    if (leftPercent > 100 || widthPercent <= 0) return null;

                    return (
                      <button
                        key={i}
                        className="absolute top-0 h-full bg-blue-50 hover:bg-blue-100 
                                 dark:bg-blue-900/20 dark:hover:bg-blue-900/30
                                 border-l border-blue-200 dark:border-blue-800 p-2 text-left overflow-hidden
                                 transition-colors"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${Math.min(widthPercent, 100 - leftPercent)}%`
                        }}
                        onClick={() => onProgramSelect?.(channel, program)}
                      >
                        <div className="text-sm font-medium truncate">{program.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                        </div>
                        {program.category && (
                          <div className="text-xs text-blue-500 dark:text-blue-400">{program.category}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="py-4 text-center text-gray-500 dark:text-gray-400">
            Loading more channels...
          </div>
        )}

        {/* Intersection observer target */}
        <div ref={observerRef} className="h-20" />
      </div>
    </ScrollArea>
  );
};
