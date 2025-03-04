
import { Channel, EPGProgram } from "@/types/epg";

// Generate sample movies for when the API fails
export const generateSampleMovies = (count: number = 20): EPGProgram[] => {
  const categories = ["Action", "Comedy", "Drama", "Thriller", "Sci-Fi", "Horror", "Romance", "Documentary"];
  const ratings = ["G", "PG", "PG-13", "R"];
  const movies: EPGProgram[] = [];
  
  for (let i = 1; i <= count; i++) {
    const startDate = new Date();
    // Randomize the start date to be within the last 30 days
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
    startDate.setHours(Math.floor(Math.random() * 24));
    
    const endDate = new Date(startDate);
    // Movies last 1.5 to 3 hours
    endDate.setHours(endDate.getHours() + 1.5 + Math.floor(Math.random() * 1.5));
    
    const categoryIndex = Math.floor(Math.random() * categories.length);
    const ratingIndex = Math.floor(Math.random() * ratings.length);
    
    movies.push({
      id: `movie_${i}`,
      channel: `movie_${i}`,
      channel_id: `movie_${i}`,
      title: `Sample Movie ${i}: ${categories[categoryIndex]} Adventure`,
      description: `This is a sample movie in the ${categories[categoryIndex]} genre created because the API data couldn't be loaded.`,
      startTime: startDate.toISOString(),
      start_time: startDate.toISOString(),
      endTime: endDate.toISOString(),
      end_time: endDate.toISOString(),
      category: `Movie - ${categories[categoryIndex]}`,
      rating: ratings[ratingIndex],
      thumbnail: null
    });
  }
  
  return movies;
};

// Generate sample TV shows for when the API fails
export const generateSampleTVShows = (count: number = 20): EPGProgram[] => {
  const categories = ["Drama Series", "Comedy Series", "Reality TV", "News", "Documentary Series", "Talk Show"];
  const ratings = ["TV-Y", "TV-G", "TV-PG", "TV-14", "TV-MA"];
  const shows: EPGProgram[] = [];
  
  for (let i = 1; i <= count; i++) {
    const startDate = new Date();
    // Randomize the start date to be within the last 30 days
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
    startDate.setHours(Math.floor(Math.random() * 24));
    
    const endDate = new Date(startDate);
    // Shows last 30 minutes to 1 hour
    endDate.setMinutes(endDate.getMinutes() + 30 + Math.floor(Math.random() * 30));
    
    const categoryIndex = Math.floor(Math.random() * categories.length);
    const ratingIndex = Math.floor(Math.random() * ratings.length);
    
    shows.push({
      id: `show_${i}`,
      channel: `show_${i}`,
      channel_id: `show_${i}`,
      title: `Sample Show ${i}: ${categories[categoryIndex].replace(' Series', '').replace(' TV', '')} Show`,
      description: `This is a sample TV show in the ${categories[categoryIndex]} category created because the API data couldn't be loaded.`,
      startTime: startDate.toISOString(),
      start_time: startDate.toISOString(),
      endTime: endDate.toISOString(),
      end_time: endDate.toISOString(),
      category: categories[categoryIndex],
      rating: ratings[ratingIndex],
      thumbnail: null
    });
  }
  
  return shows;
};

// Generate sample channels for when the API fails
export const generateSampleChannels = (count: number = 10): Channel[] => {
  const channels: Channel[] = [];
  
  // Add test channel
  channels.push({
    id: 'test',
    name: 'Test Stream',
    streamUrl: 'http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444',
    logo: null,
    number: 0,
    epgChannelId: 'test',
    category: 'Test'
  });
  
  // Add sample channels
  for (let i = 1; i <= count; i++) {
    channels.push({
      id: `sample_${i}`,
      name: `Sample Channel ${i}`,
      streamUrl: 'http://lion.topcms.cc/live/vC8q5551/r6Vf5130/469444', // Use test URL for all sample channels
      logo: null,
      number: i,
      epgChannelId: `sample_${i}`,
      category: i % 4 === 0 ? 'News' : i % 3 === 0 ? 'Sports' : i % 2 === 0 ? 'Entertainment' : 'Movies'
    });
  }
  
  return channels;
};
