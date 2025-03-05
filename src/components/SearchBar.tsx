import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sortBy: 'name' | 'date' | 'rating';
  onSortChange: (sort: 'name' | 'date' | 'rating') => void;
}

const SearchBar = ({ searchQuery, onSearchChange, sortBy, onSortChange }: SearchBarProps) => {
  return (
    <div className='flex items-center gap-4 mb-6'>
      <div className='relative flex-1'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
        <Input
          placeholder='Search content...'
          value={searchQuery}
          onChange={onSearchChange}
          className='pl-10 py-6 text-lg'
        />
      </div>
      <Button
        variant='outline'
        onClick={() => onSortChange('name')}
        className={`${sortBy === 'name' ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
      >
        Name
      </Button>
      <Button
        variant='outline'
        onClick={() => onSortChange('date')}
        className={`${sortBy === 'date' ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
      >
        Date
      </Button>
      <Button
        variant='outline'
        onClick={() => onSortChange('rating')}
        className={`${sortBy === 'rating' ? 'bg-white/10' : ''} focus:ring-4 focus:ring-white/20`}
      >
        Rating
      </Button>
    </div>
  );
};

export default SearchBar;
