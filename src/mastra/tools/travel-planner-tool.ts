import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const travelPlannerTool = createTool({
  id: 'travel-planner',
  description: 'Provide travel advice, clothing recommendations, and activities based on temperature (Celsius) and conditions.',
  inputSchema: z.object({
    temperature: z.number().describe('Current temperature in Celsius'),
    conditions: z.string().describe('Weather conditions (e.g., Rain, Snow, Clear sky)'),
  }),
  outputSchema: z.object({
    recommendations: z.array(z.string()).describe('List of recommended items/clothing to pack'),
    activities: z.array(z.string()).describe('List of suitable activities'),
  }),
  execute: async ({ temperature, conditions }) => {
    let recommendations: string[] = [];
    let activities: string[] = [];

    if (temperature < 10) {
      recommendations.push('Heavy coat', 'Gloves', 'Scarf', 'Thermal wear');
      activities.push('Visit indoor museums', 'Ice skating', 'Cozy up in a cafe');
    } else if (temperature >= 10 && temperature < 20) {
      recommendations.push('Light jacket', 'Layered clothing', 'Sneakers');
      activities.push('Sightseeing walk', 'Outdoor dining', 'Visit parks');
    } else {
      recommendations.push('T-shirt', 'Shorts', 'Sunglasses', 'Sunscreen');
      activities.push('Beach trip', 'Swimming', 'Hiking');
    }

    if (conditions.toLowerCase().includes('rain') || conditions.toLowerCase().includes('drizzle')) {
      recommendations.push('Umbrella', 'Waterproof boots', 'Raincoat');
      activities = activities.filter(a => !a.toLowerCase().includes('outdoor') && !a.toLowerCase().includes('beach'));
      activities.push('Go to a theater or cinema', 'Board games at a local pub');
    } else if (conditions.toLowerCase().includes('snow')) {
      recommendations.push('Snow boots', 'Thermal gloves');
      activities.push('Build a snowman', 'Skiing');
    }

    return { recommendations, activities };
  },
});
