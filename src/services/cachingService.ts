
import localforage from 'localforage';

// Initialize cache databases with specific configuration
const createCache = (storeName: string) => {
  return localforage.createInstance({
    name: 'streamlyzer-cache',
    storeName
  });
};

// Create separate caches for different content types
const channelsCache = createCache('channels');
const moviesCache = createCache('movies');
const showsCache = createCache('shows');
const programsCache = createCache('programs');

// Get timestamp for cache expiration checks
const getCacheTimestamp = async (cacheKey: string): Promise<number | null> => {
  try {
    const timestamp = await localforage.getItem<number>(`${cacheKey}_timestamp`);
    return timestamp;
  } catch (error) {
    console.error(`Error getting cache timestamp for ${cacheKey}:`, error);
    return null;
  }
};

// Set timestamp when updating cache
const setCacheTimestamp = async (cacheKey: string): Promise<void> => {
  try {
    await localforage.setItem(`${cacheKey}_timestamp`, Date.now());
  } catch (error) {
    console.error(`Error setting cache timestamp for ${cacheKey}:`, error);
  }
};

// Check if cache is expired (default 24 hours)
const isCacheExpired = async (cacheKey: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<boolean> => {
  const timestamp = await getCacheTimestamp(cacheKey);
  if (!timestamp) return true;
  
  const now = Date.now();
  return now - timestamp > maxAge;
};

// Generic function to store items in cache
export const storeInCache = async <T>(
  cache: LocalForage,
  key: string, 
  data: T[], 
  batchKey: string = 'default'
): Promise<void> => {
  try {
    // Store the current batch
    await cache.setItem(`${key}_${batchKey}`, data);
    
    // Update the list of available batches
    const batchList = await cache.getItem<string[]>(`${key}_batches`) || [];
    if (!batchList.includes(batchKey)) {
      batchList.push(batchKey);
      await cache.setItem(`${key}_batches`, batchList);
    }
    
    // Update timestamp
    await setCacheTimestamp(key);
    
    console.log(`Cached ${data.length} items for ${key} in batch ${batchKey}`);
  } catch (error) {
    console.error(`Error storing in cache for ${key}:`, error);
  }
};

// Generic function to retrieve items from cache
export const getFromCache = async <T>(
  cache: LocalForage,
  key: string,
  batchKey: string = 'default'
): Promise<T[] | null> => {
  try {
    const data = await cache.getItem<T[]>(`${key}_${batchKey}`);
    return data;
  } catch (error) {
    console.error(`Error retrieving from cache for ${key}:`, error);
    return null;
  }
};

// Get all items across all batches
export const getAllFromCache = async <T>(
  cache: LocalForage,
  key: string
): Promise<T[]> => {
  try {
    const batchList = await cache.getItem<string[]>(`${key}_batches`) || [];
    if (batchList.length === 0) return [];
    
    const allData: T[] = [];
    for (const batchKey of batchList) {
      const batchData = await getFromCache<T>(cache, key, batchKey);
      if (batchData) {
        allData.push(...batchData);
      }
    }
    
    return allData;
  } catch (error) {
    console.error(`Error retrieving all items from cache for ${key}:`, error);
    return [];
  }
};

// Clear all data for a specific key
export const clearCache = async (cache: LocalForage, key: string): Promise<void> => {
  try {
    const batchList = await cache.getItem<string[]>(`${key}_batches`) || [];
    
    // Remove all batches
    for (const batchKey of batchList) {
      await cache.removeItem(`${key}_${batchKey}`);
    }
    
    // Remove batch list and timestamp
    await cache.removeItem(`${key}_batches`);
    await localforage.removeItem(`${key}_timestamp`);
    
    console.log(`Cleared cache for ${key}`);
  } catch (error) {
    console.error(`Error clearing cache for ${key}:`, error);
  }
};

// Check if we need to refresh data based on timestamp
export const shouldRefreshCache = async (key: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<boolean> => {
  return await isCacheExpired(key, maxAge);
};

// Export caches for direct access
export { channelsCache, moviesCache, showsCache, programsCache };
