import { useState, useCallback, useEffect } from 'react';
import { Channel, EPGProgram } from '@/types/epg';
import { db } from '@/services/database/schema';

const BATCH_SIZE = 20;

export const useEPGData = (channels: Channel[]) => {
  const [currentPrograms, setCurrentPrograms] = useState<Record<string, EPGProgram | undefined>>({});
  const [loading, setLoading] = useState(false);

  const getCurrentProgram = useCallback(async (channelId: string): Promise<EPGProgram | undefined> => {
    const now = new Date();
    try {
      const program = await db.epgPrograms
        .where('channelId')
        .equals(channelId)
        .filter(prog => 
          new Date(prog.startTime) <= now && 
          new Date(prog.endTime) > now
        )
        .first();
      return program;
    } catch (error) {
      console.error(`Error getting current program for channel ${channelId}:`, error);
      return undefined;
    }
  }, []);

  const loadProgramBatch = useCallback(async (channelBatch: Channel[]) => {
    const programs = await Promise.all(
      channelBatch.map(async (channel) => {
        if (!channel.epgId) return [channel.id, undefined] as const;
        try {
          const program = await getCurrentProgram(channel.id);
          return [channel.id, program] as const;
        } catch (error) {
          console.error(`Error fetching program for channel ${channel.id}:`, error);
          return [channel.id, undefined] as const;
        }
      })
    );

    return Object.fromEntries(programs);
  }, [getCurrentProgram]);

  const loadPrograms = useCallback(async () => {
    if (!channels.length) return;
    
    setLoading(true);
    try {
      // Load first batch immediately
      const firstBatch = channels.slice(0, BATCH_SIZE);
      const firstBatchPrograms = await loadProgramBatch(firstBatch);
      
      setCurrentPrograms(prev => ({
        ...prev,
        ...firstBatchPrograms
      }));

      // Load remaining batches in the background
      if (channels.length > BATCH_SIZE) {
        const remainingChannels = channels.slice(BATCH_SIZE);
        const batches = [];
        
        for (let i = 0; i < remainingChannels.length; i += BATCH_SIZE) {
          batches.push(remainingChannels.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
          const batchPrograms = await loadProgramBatch(batch);
          setCurrentPrograms(prev => ({
            ...prev,
            ...batchPrograms
          }));
          // Small delay between batches to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [channels, loadProgramBatch]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  return {
    currentPrograms,
    loading,
    refreshPrograms: loadPrograms
  };
};
