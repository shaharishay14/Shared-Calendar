import OpenAI from 'openai';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_SETTINGS_KEY = 'ai_planner_settings';

// Default AI settings
const defaultAISettings = {
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
  model: 'gpt-4o-mini', // More cost-effective for planning tasks
  temperature: 0.3, // Lower temperature for more consistent planning
  maxTokens: 2000,
  systemPrompt: `You are an intelligent week planner assistant for a couple living in Israel. You have deep knowledge of:

1. **Locations**: Kfar Saba, Beit Dagan, Rishon Lezion, Nir Tzvi (tennis club)
2. **Transportation**: Israeli roads, traffic patterns, rush hours (7:30-10:00, 15:00-19:00)
3. **Public Transport**: Israel Railways connections, bus routes
4. **Relationship dynamics**: Optimizing time together while respecting work schedules

Your role is to analyze weekly schedules and provide personalized recommendations for:
- Optimal sleep locations (home vs partner's place)
- Travel time optimization
- Public transport vs car decisions
- Rush hour avoidance
- Energy and stress management
- Relationship time prioritization

Always be practical, considerate of both partners' needs, and factor in real Israeli traffic conditions.`,
  conversationStarters: [
    "How can I optimize my week for minimal driving?",
    "Where should I sleep each night for the best schedule?",
    "When should I use public transport vs driving?",
    "How can we maximize time together this week?",
    "What are the potential stress points in my schedule?"
  ]
};

class AIPlannerService {
  constructor() {
    this.openai = null;
    this.settings = defaultAISettings;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Load AI settings
      const stored = await AsyncStorage.getItem(AI_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...defaultAISettings, ...parsed };
      }

      // Initialize OpenAI if API key exists
      if (this.settings.apiKey) {
        this.openai = new OpenAI({
          apiKey: this.settings.apiKey,
        });
        this.initialized = true;
      }

      return this.initialized;
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      return false;
    }
  }

  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await AsyncStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(this.settings));
      
      // Reinitialize OpenAI if API key changed
      if (newSettings.apiKey) {
        this.openai = new OpenAI({
          apiKey: this.settings.apiKey,
        });
        this.initialized = true;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update AI settings:', error);
      return false;
    }
  }

  getSettings() {
    return this.settings;
  }

  isInitialized() {
    return this.initialized && this.openai !== null;
  }

  // Format week events for AI context
  formatWeekContext(weekPlan, preferences, publicTransportData = null) {
    if (!weekPlan) {
      return {
        week_overview: {
          week_of: 'No week plan available',
          total_driving_minutes: 0,
          daily_plans: []
        },
        user_preferences: preferences || {},
        public_transport: publicTransportData || {
          train_available: true,
          main_route: "Kfar Saba ↔ Kfar Chabad (45min)",
          bus_routes: "Limited between cities, mainly local"
        }
      };
    }

    const context = {
      week_overview: {
        week_of: weekPlan.weekOf,
        total_driving_minutes: weekPlan.totalDriving,
        daily_plans: (weekPlan.dailyPlans || []).map(day => ({
          date: day.date,
          day_name: day.dayName,
          events: day.events.map(event => ({
            title: event.title,
            time: new Date(event.date).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            location: event.location,
            duration: event.endDate ? 
              Math.round((new Date(event.endDate) - new Date(event.date)) / (1000 * 60)) : 
              60 // default 1 hour
          })),
          travel_times: day.travelTimes,
          daily_driving_minutes: day.dailyDriving,
          rush_hour_conflicts: day.rushHourConflicts || [],
          current_sleep_suggestion: day.sleepLocation
        }))
      },
      user_preferences: {
        locations: preferences.locations || {},
        max_daily_driving: preferences.maxDailyDriving || 180,
        max_weekly_driving: preferences.maxWeeklyDriving || 900,
        rush_hours: preferences.rushHours || {},
        preferred_sleep_location: preferences.preferredSleepLocation || 'optimal',
        avoid_rush_hour: preferences.avoidRushHour !== false
      },
      public_transport: publicTransportData || {
        train_available: true,
        main_route: "Kfar Saba ↔ Kfar Chabad (45min)",
        bus_routes: "Limited between cities, mainly local"
      }
    };

    return context;
  }

  // Generate AI response for week planning
  async generateWeekPlan(weekPlan, preferences, userMessage = null, conversationHistory = []) {
    if (!this.isInitialized()) {
      throw new Error('AI service not initialized. Please configure your OpenAI API key.');
    }

    try {
      const context = this.formatWeekContext(weekPlan, preferences);
      
      const messages = [
        {
          role: 'system',
          content: this.settings.systemPrompt
        },
        {
          role: 'user',
          content: `Here's my week schedule and preferences:\n\n${JSON.stringify(context, null, 2)}\n\n${userMessage || 'Please analyze this week and provide your best recommendations for optimizing my schedule, travel, and sleep locations.'}`
        }
      ];

      // Add conversation history if provided
      if (conversationHistory.length > 0) {
        // Insert conversation history before the current request
        messages.splice(-1, 0, ...conversationHistory);
      }

      const response = await this.openai.chat.completions.create({
        model: this.settings.model,
        messages: messages,
        temperature: this.settings.temperature,
        max_tokens: this.settings.maxTokens,
      });

      const aiResponse = response.choices[0].message.content;

      // Parse and structure the response
      return {
        success: true,
        message: aiResponse,
        usage: response.usage,
        model: this.settings.model,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('AI generation failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: 'AI service is currently unavailable. Using basic planning algorithm instead.'
      };
    }
  }

  // Chat with AI about specific planning questions
  async chatWithAI(message, weekPlan, preferences, conversationHistory = []) {
    if (!this.isInitialized()) {
      throw new Error('AI service not initialized. Please configure your OpenAI API key.');
    }

    try {
      const messages = [
        {
          role: 'system',
          content: this.settings.systemPrompt
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message
        }
      ];

      // Add week context if available
      if (weekPlan && preferences) {
        const context = this.formatWeekContext(weekPlan, preferences);
        messages[0].content += `\n\nCurrent week context: ${JSON.stringify(context, null, 2)}`;
      }

      const response = await this.openai.chat.completions.create({
        model: this.settings.model,
        messages: messages,
        temperature: this.settings.temperature,
        max_tokens: this.settings.maxTokens,
      });

      return {
        success: true,
        message: response.choices[0].message.content,
        usage: response.usage,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('AI chat failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get conversation starters based on current week
  getConversationStarters(weekPlan) {
    const starters = [...this.settings.conversationStarters];
    
    // Add dynamic starters based on week analysis
    if (weekPlan && weekPlan.totalDriving > 300) {
      starters.unshift("This looks like a heavy driving week - how can I optimize it?");
    }
    
    if (weekPlan && weekPlan.dailyPlans.some(day => day.rushHourConflicts?.length > 0)) {
      starters.unshift("I have rush hour conflicts - what are my best options?");
    }
    
    return starters.slice(0, 5); // Limit to 5 starters
  }
}

// Export singleton instance
export default new AIPlannerService();
