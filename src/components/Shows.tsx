
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getShows, refreshEPGData } from "@/services/epgService";
import type { EPGProgram } from "@/types/epg";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface ShowsProps {
  yearFilter?: number;
  onYearChange: (year: number | undefined) => void;
  ratingFilter?: string;
  onRatingChange: (rating: string | undefined) => void;
}

const Shows = ({ yearFilter, onYearChange, ratingFilter, onRatingChange }: ShowsProps) => {
  const [shows, setShows] = useState<EPGProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadShows = async () => {
      setLoading(true);
      try {
        const data = await getShows();
        console.log(`Loaded ${data.length} TV shows`);
        setShows(data);
      } catch (error) {
        console.error("Failed to load TV shows:", error);
        toast.error("Failed to load TV shows");
      } finally {
        setLoading(false);
      }
    };

    loadShows();
  }, []);

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      const success = await refreshEPGData();
      if (success) {
        // Reload shows after successful EPG refresh
        const data = await getShows();
        setShows(data);
        toast.success(`Loaded ${data.length} TV shows after refresh`);
      }
    } catch (error) {
      console.error("Failed to refresh show data:", error);
      toast.error("Failed to refresh show data");
    } finally {
      setRefreshing(false);
    }
  };

  const filteredShows = shows.filter(show => {
    if (yearFilter) {
      const year = new Date(show.startTime).getFullYear();
      if (year !== yearFilter) return false;
    }
    if (ratingFilter && show.rating !== ratingFilter) return false;
    return true;
  });

  // Common section header with refresh button that's always visible
  const sectionHeader = (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-semibold">
        TV Shows {filteredShows.length > 0 ? `(${filteredShows.length})` : ''}
      </h2>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleRefreshData}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Shows
        </Button>
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
  );

  if (loading) {
    return (
      <section>
        {sectionHeader}
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
      {sectionHeader}
      {filteredShows.length > 0 ? (
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
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <span className="text-xl font-semibold text-center px-4">{show.title}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-medium text-lg">{show.title}</h3>
                <p className="text-sm text-gray-400">
                  {show.category || 'TV Show'}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <p className="text-gray-400">No TV shows found. Try refreshing the EPG data.</p>
          <Button 
            onClick={handleRefreshData}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Shows
          </Button>
        </div>
      )}
    </section>
  );
};

export default Shows;
