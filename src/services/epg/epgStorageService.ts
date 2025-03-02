
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Add a function to store EPG program data and explicitly export it
export const storeEPGPrograms = async (programs: any[]) => {
  console.log(`Storing ${programs.length} EPG programs...`);
  if (programs.length === 0) return;

  try {
    // Process in batches to avoid payload size issues
    const batchSize = 25; // Reduced batch size to avoid payload issues
    for (let i = 0; i < programs.length; i += batchSize) {
      const batch = programs.slice(i, i + batchSize);
      console.log(`Processing EPG batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(programs.length/batchSize)}, size: ${batch.length}`);
      
      const formattedPrograms = batch
        .filter(program => {
          // Normalize the program data structure
          const title = program.title || program.program_title || program.name || '';
          const startTime = program.start || program.start_time || program.program_start || program.start_timestamp || '';
          const endTime = program.end || program.end_time || program.program_end || program.stop_timestamp || '';
          const channelId = program.channel_id || program.channel || program.id || '';
          
          return title && startTime && endTime && channelId;
        })
        .map(program => {
          // Normalize the program data structure
          const title = program.title || program.program_title || program.name || '';
          const description = program.description || program.program_description || program.desc || '';
          const startTime = program.start || program.start_time || program.program_start || program.start_timestamp || '';
          const endTime = program.end || program.end_time || program.program_end || program.stop_timestamp || '';
          const channelId = program.channel_id || program.channel || program.id || '';
          const category = program.category || program.program_category || program.genre || '';
          const rating = program.rating || program.program_rating || '';
          const thumbnail = program.thumbnail || program.image || program.icon || '';
          
          // Make sure dates are properly formatted
          let startDate, endDate;
          try {
            startDate = new Date(startTime);
            endDate = new Date(endTime);
            
            // Check if dates are valid
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              // Try parsing as Unix timestamp if needed
              if (typeof startTime === 'number' || !isNaN(Number(startTime))) {
                startDate = new Date(Number(startTime) * 1000);
              }
              if (typeof endTime === 'number' || !isNaN(Number(endTime))) {
                endDate = new Date(Number(endTime) * 1000);
              }
            }
            
            // Final validation
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.error(`Invalid date format for program: ${title}`, { startTime, endTime });
              return null;
            }
          } catch (error) {
            console.error(`Error parsing dates for program: ${title}`, error);
            return null;
          }
          
          // Add debugging to see what's being saved
          console.log(`Storing program: ${title} for channel ${channelId}, category: ${category}, dates: ${startDate.toISOString()} - ${endDate.toISOString()}`);
          
          return {
            channel_id: channelId.toString(),
            title: title || 'Untitled Program',
            description: description || '',
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            category: category || 'Uncategorized',
            rating: rating || null,
            thumbnail: thumbnail || null
          };
        })
        .filter(Boolean); // Remove any null entries

      if (formattedPrograms.length === 0) {
        console.log('No valid programs in this batch, skipping');
        continue;
      }

      try {
        const { error } = await supabase
          .from('programs')
          .upsert(formattedPrograms, { 
            onConflict: 'channel_id,start_time,end_time,title' 
          });

        if (error) {
          console.error(`Error storing EPG programs batch ${Math.floor(i/batchSize) + 1}:`, error);
          // Continue with next batch instead of throwing
          console.log('Continuing with next batch...');
        } else {
          console.log(`Successfully stored batch ${Math.floor(i/batchSize) + 1} with ${formattedPrograms.length} programs`);
        }
      } catch (batchError) {
        console.error(`Exception storing EPG programs batch ${Math.floor(i/batchSize) + 1}:`, batchError);
        console.log('Continuing with next batch...');
      }
    }
    console.log('All EPG program batches processed');
  } catch (error) {
    console.error('Error storing EPG programs:', error);
    toast.error('Failed to store some EPG programs');
  }
};
