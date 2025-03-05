import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Select } from "@/components/ui/select";

interface LiveTVHeaderProps {
  showProgramGuide: boolean;
  onToggleProgramGuide: () => void;
  countries: string[];
  selectedCountry?: string;
  onCountryChange: (country: string | undefined) => void;
  categories: string[];
  selectedCategory?: string;
  onCategoryChange: (category: string | undefined) => void;
  onRefreshChannels: () => void;
  onRefreshEPG: () => void;
  isRefreshing: boolean;
  onRefreshComplete: () => void;
}

export const LiveTVHeader = ({
  showProgramGuide,
  onToggleProgramGuide,
  countries,
  selectedCountry,
  onCountryChange,
  categories,
  selectedCategory,
  onCategoryChange,
  onRefreshChannels,
  onRefreshEPG,
  isRefreshing,
}: LiveTVHeaderProps) => {
  return (
    <div className="p-4 border-b border-gray-200 space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Country Filter */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <select
            id="country"
            value={selectedCountry || ''}
            onChange={(e) => onCountryChange(e.target.value || undefined)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">All Countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            value={selectedCategory || ''}
            onChange={(e) => onCategoryChange(e.target.value || undefined)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleProgramGuide}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              showProgramGuide
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {showProgramGuide ? 'Hide Program Guide' : 'Show Program Guide'}
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onRefreshChannels}
            disabled={isRefreshing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              'Refresh Channels'
            )}
          </button>

          <button
            onClick={onRefreshEPG}
            disabled={isRefreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              'Update EPG'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
