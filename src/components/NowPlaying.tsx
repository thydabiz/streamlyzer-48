import { useEffect, useState } from 'react';
import { Channel, EPGProgram } from '../types/epg';
import { db } from '../services/database';

interface NowPlayingProps {
  channel: Channel;
}

export function NowPlaying({ channel }: NowPlayingProps) {
  const [currentProgram, setCurrentProgram] = useState<EPGProgram | null>(null);
  const [nextProgram, setNextProgram] = useState<EPGProgram | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEPGData = async () => {
      try {
        const now = new Date();
        const programs = await db.epgPrograms
          .where('channelId')
          .equals(channel.id)
          .filter(program => 
            program.startTime <= now && 
            program.endTime >= now
          )
          .toArray();

        const nextPrograms = await db.epgPrograms
          .where('channelId')
          .equals(channel.id)
          .filter(program => 
            program.startTime > now
          )
          .limit(1)
          .toArray();

        setCurrentProgram(programs[0] || null);
        setNextProgram(nextPrograms[0] || null);
        setError(null);
      } catch (err) {
        console.error('Error fetching EPG data:', err);
        setError('Failed to load program information');
      }
    };

    fetchEPGData();
    const intervalId = setInterval(fetchEPGData, 900000); // Update every 15 minutes

    return () => clearInterval(intervalId);
  }, [channel.id]);

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!currentProgram && !nextProgram) {
    return (
      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
        No program information available
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {currentProgram && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Now Playing
          </h3>
          <div className="mt-1">
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {currentProgram.title}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatTime(currentProgram.startTime)} - {formatTime(currentProgram.endTime)}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {currentProgram.description}
            </p>
          </div>
        </div>
      )}

      {nextProgram && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Up Next
          </h3>
          <div className="mt-1">
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {nextProgram.title}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatTime(nextProgram.startTime)} - {formatTime(nextProgram.endTime)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { 
    hour: '2-digit',
    minute: '2-digit'
  });
}
