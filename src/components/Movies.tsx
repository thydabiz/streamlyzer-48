
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getMovies, refreshEPGData } from "@/services/epg";
import type { EPGProgram } from "@/types/epg";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface MoviesProps {
  yearFilter?: number;
  onYearChange: (year: number | undefined) => void;
  ratingFilter?: string;
  onRatingChange: (rating: string | undefined) => void;
}

const BATCH_SIZE = 100;

const Movies = ({ yearFilter, onYearChange, ratingFilter, onRatingChange }: MoviesProps) => {
  const [movies, setMovies] = useState<EPGProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const loaderRef = useRef<HTMLDivElement>(null);
  
  // Fetch a batch of movies
  const fetchMoviesBatch = useCallback(async (pageIndex: number) => {
    try {
      if (pageIndex === 0) setLoading(true);
      
      const offset = pageIndex * BATCH_SIZE;
      console.log(`Fetching movies batch: page ${pageIndex}, offset ${offset}`);
      
      const data = await getMovies(offset, BATCH_SIZE);
      console.log(`Received ${data.length} movies for page ${pageIndex}`);
      
      if (data.length === 0) {
        setHasMore(false);
      } else if (data.length < BATCH_SIZE) {
        setHasMore(false);
        setMovies(prev => [...prev, ...data]);
      } else {
        setMovies(prev => [...prev, ...data]);
        setHasMore(true);
      }
    } catch (error) {
      console.error("Failed to load movies batch:", error);
      toast.error("Failed to load movies");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setMovies([]);
    setPage(0);
    setHasMore(true);
    fetchMoviesBatch(0);
  }, [fetchMoviesBatch]);

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !refreshing) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchMoviesBatch(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [fetchMoviesBatch, hasMore, loading, page, refreshing]);

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      const success = await refreshEPGData();
      if (success) {
        // Reset and reload movies after successful EPG refresh
        setMovies([]);
        setPage(0);
        setHasMore(true);
        const data = await getMovies(0, BATCH_SIZE);
        setMovies(data);
        toast.success(`Loaded ${data.length} movies after refresh`);
      }
    } catch (error) {
      console.error("Failed to refresh movie data:", error);
      toast.error("Failed to refresh movie data");
    } finally {
      setRefreshing(false);
    }
  };

  const filteredMovies = movies.filter(movie => {
    if (yearFilter) {
      const year = new Date(movie.startTime).getFullYear();
      if (year !== yearFilter) return false;
    }
    if (ratingFilter && movie.rating !== ratingFilter) return false;
    return true;
  });

  // Common section header with refresh button that's always visible
  const sectionHeader = (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-semibold">
        Movies {filteredMovies.length > 0 ? `(${filteredMovies.length})` : ''}
      </h2>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleRefreshData}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Movies
        </Button>
        {['Action', 'Drama', 'Comedy', 'Horror'].map(genre => (
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
          onClick={() => onRatingChange(ratingFilter === 'PG-13' ? undefined : 'PG-13')}
          className={`${ratingFilter === 'PG-13' ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
        >
          PG-13
        </Button>
      </div>
    </div>
  );

  if (loading && movies.length === 0) {
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
      {filteredMovies.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMovies.map((movie) => (
              <button
                key={movie.id}
                className="group relative aspect-[2/3] rounded-lg overflow-hidden focus:ring-4 focus:ring-white/20 focus:outline-none"
              >
                {movie.thumbnail ? (
                  <img 
                    src={movie.thumbnail} 
                    alt={movie.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy" // Use native lazy loading
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <span className="text-xl font-semibold text-center px-4">{movie.title}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-medium text-lg">{movie.title}</h3>
                  <p className="text-sm text-gray-400">
                    {new Date(movie.startTime).getFullYear()} • {movie.category}
                  </p>
                </div>
              </button>
            ))}
          </div>
          
          {/* Infinite scroll loader */}
          <div 
            ref={loaderRef} 
            className="h-20 flex items-center justify-center mt-4"
          >
            {hasMore && (
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <p className="text-gray-400">No movies found. Try refreshing the EPG data.</p>
          <Button 
            onClick={handleRefreshData}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Movies
          </Button>
        </div>
      )}
    </section>
  );
};

export default Movies;
