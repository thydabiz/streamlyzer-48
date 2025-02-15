
export interface ContentFilters {
  genre?: string;
  year?: number;
  rating?: string;
  searchQuery?: string;
  sortBy?: 'name' | 'date' | 'rating';
  timeRange?: {
    start: Date;
    end: Date;
  };
}
