import { Agent } from '@mastra/core/agent';
import { weatherTool } from '../tools/weather-tool';
import { travelPlannerTool } from '../tools/travel-planner-tool';

export const travelAdvisorAgent = new Agent({
  id: 'travel-advisor-agent',
  name: 'Travel Advisor Agent',
  instructions: `You are a helpful travel planning assistant.
Your job is to help users prepare for their travels.
When a user asks about preparing for a trip or asks what to pack/do in a specific location:
1. Fetch the weather for that location using the get-weather tool.
2. Pass the fetched temperature and conditions to the travel-planner tool to get clothing and activity recommendations.
3. Formulate a cohesive, friendly response that reports the weather first, then suggests what to pack, and finally recommends things to do.`,
  model: 'google/gemini-3.5-flash',
  tools: { weatherTool, travelPlannerTool },
});
