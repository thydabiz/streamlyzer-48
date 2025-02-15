
import { Button } from "@/components/ui/button";

interface ShowsProps {
  yearFilter?: number;
  onYearChange: (year: number | undefined) => void;
  ratingFilter?: string;
  onRatingChange: (rating: string | undefined) => void;
}

const Shows = ({ yearFilter, onYearChange, ratingFilter, onRatingChange }: ShowsProps) => {
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
        {Array.from({ length: 10 }).map((_, i) => (
          <button
            key={i}
            className="group relative aspect-[2/3] rounded-lg overflow-hidden focus:ring-4 focus:ring-white/20 focus:outline-none"
          >
            <div className="absolute inset-0 bg-gray-800 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-medium text-lg">Show Title</h3>
              <p className="text-sm text-gray-400">Season 1 • Drama</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default Shows;
