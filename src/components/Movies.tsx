
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getMovies } from "@/services/epgService";
import type { EPGProgram } from "@/types/epg";
import { toast } from "sonner";

interface MoviesProps {
  yearFilter?: number;
  onYearChange: (year: number | undefined) => void;
  ratingFilter?: string;
  onRatingChange: (rating: string | undefined) => void;
}

const Movies = ({ yearFilter, onYearChange, ratingFilter, onRatingChange }: MoviesProps) => {
  const [movies, setMovies] = useState<EPGProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const data = await getMovies();
        setMovies(data);
      } catch (error) {
        toast.error("Failed to load movies");
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, []);

  const filteredMovies = movies.filter(movie => {
    if (yearFilter) {
      const year = new Date(movie.startTime).getFullYear();
      if (year !== yearFilter) return false;
    }
    if (ratingFilter && movie.rating !== ratingFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Movies</h2>
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
        <h2 className="text-2xl font-semibold">Movies</h2>
        <div className="flex gap-2">
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
              />
            ) : (
              <div className="absolute inset-0 bg-gray-800" />
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
    </section>
  );
};

export default Movies;
