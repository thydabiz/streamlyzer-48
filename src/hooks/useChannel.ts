
import { useState, useEffect } from "react";
import { Channel, EPGProgram } from "@/types/epg";
import { getCurrentProgram } from "@/services/epg";

export const useChannel = (channelId?: string) => {
  const [currentProgram, setCurrentProgram] = useState<EPGProgram | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!channelId) return;

    const fetchCurrentProgram = async () => {
      setLoading(true);
      try {
        const program = await getCurrentProgram(channelId);
        setCurrentProgram(program);
        setError(null);
      } catch (err) {
        console.error("Error fetching current program:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentProgram();
  }, [channelId]);

  return {
    currentProgram,
    loading,
    error,
  };
};
