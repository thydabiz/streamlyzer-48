
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getShows } from "@/services/epgService";
import type { EPGProgram } from "@/types/epg";
import { toast } from "sonner";

interface ShowsProps {
  yearFilter?: number;
  onYearChange: (year: number | undefined) => void;
  ratingFilter?: string;
  onRatingChange: (rating: string | undefined) => void;
}

const Shows = ({ yearFilter, onYearChange, ratingFilter, onRatingChange }: ShowsProps) => {
  const [shows, setShows] = useState<EPGProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShows = async () => {
      try {
        const data = await getShows();
        setShows(data);
      } catch (error) {
        toast.error("Failed to load TV shows");
      } finally {
        setLoading(false);
      }
    };

    loadShows();
  }, []);

  const filteredShows = shows.filter(show => {
    if (yearFilter) {
      const year = new Date(show.startTime).getFullYear();
      if (year !== yearFilter) return false;
    }
    if (ratingFilter && show.rating !== ratingFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">TV Shows</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">TV Shows</h2>
        <div className="flex gap-2">
          {['Drama', 'Comedy', 'Reality', 'Documentary'].map(genre => (
            <Button
              key={genre}
              variant="outline"
              className="focus:ring-4 focus:ring-white/20 focus:outline-none"
            >
              {genre}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => onYearChange(yearFilter === 2024 ? undefined : 2024)}
            className={`${yearFilter === 2024 ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
          >
            2024
          </Button>
          <Button
            variant="outline"
            onClick={() => onRatingChange(ratingFilter === 'TV-MA' ? undefined : 'TV-MA')}
            className={`${ratingFilter === 'TV-MA' ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
          >
            TV-MA
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredShows.map((show) => (
          <button
            key={show.id}
            className="group relative aspect-[2/3] rounded-lg overflow-hidden focus:ring-4 focus:ring-white/20 focus:outline-none"
          >
            {show.thumbnail ? (
              <img 
                src={show.thumbnail} 
                alt={show.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gray-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-medium text-lg">{show.title}</h3>
              <p className="text-sm text-gray-400">
                {show.category}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default Shows;
