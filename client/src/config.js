// ═══════════════════════════════════════════════════════════════════════════
// CLIENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// ✏️ CUSTOMIZE THIS FILE to change:
//    - App title and branding
//    - Sample queries
//    - API endpoint
//    - UI settings
// ═══════════════════════════════════════════════════════════════════════════

export const APP_CONFIG = {
  // ═══════════════════════════════════════════════════════════════════════════
  // BRANDING
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Change app name and tagline
  
  appName: 'Social Command Center',
  appTagline: 'AI-Powered Social Media Intelligence',
  appDescription: 'Ask anything about your social media performance',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // API CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  apiBaseUrl: 'http://localhost:3001',
  apiEndpoint: '/api/chat',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SAMPLE QUERIES (shown in sidebar)
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Add your own sample questions
  
  sampleQueries: [
    {
      category: 'Performance Insights',
      icon: '📊',
      queries: [
        'Most liked post on Instagram for the month of November?',
        'Which platform performed better in Q4?',
        'Show me engagement rate trends for December',
        'Compare Instagram vs LinkedIn performance this quarter'
      ]
    },
    {
      category: 'Content Strategy',
      icon: '💡',
      queries: [
        'Which is the worst performing post type and on which platform?',
        'What content themes work best on Instagram?',
        'Best time to post on each platform?',
        'Top 5 performing posts this month'
      ]
    },
    {
      category: 'Platform Analysis',
      icon: '🎯',
      queries: [
        'Which platform would you not recommend and why?',
        'Why did our engagement drop last week?',
        'Platform-wise engagement rate comparison',
        'Which platform has the best ROI?'
      ]
    },
    {
      category: 'Recommendations',
      icon: '🚀',
      queries: [
        'Draft 5 post ideas for our product launch',
        'Generate weekly performance summary for CMO',
        'What should we do to improve Facebook performance?',
        'Content strategy recommendations for next month'
      ]
    }
  ],
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UI SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Adjust UI behavior
  
  ui: {
    showSampleQueries: true,
    showProcessingTime: true,
    enableMarkdownFormatting: true,
    maxMessageLength: 500,
    placeholderText: 'Ask me anything about your social media performance...',
    submitButtonText: 'Send',
    loadingMessages: [
      'Analyzing your data...',
      'Crunching the numbers...',
      'Finding insights...',
      'Almost there...'
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WELCOME MESSAGE
  // ═══════════════════════════════════════════════════════════════════════════
  // ✏️ CUSTOMIZE: Change initial welcome message
  
  welcomeMessage: {
    show: true,
    title: 'Welcome to Social Command Center! 👋',
    content: `I'm your AI-powered social media analyst. I can help you:

• 📊 Analyze performance across all platforms
• 🎯 Compare engagement rates and reach
• 💡 Identify top-performing content
• 📈 Spot trends and patterns
• 🚀 Get actionable recommendations

Try asking me a question, or click one of the sample queries to get started!`,
    actions: [
      {
        text: 'Sample Queries →',
        action: 'showSamples'
      }
    ]
  }
};

export default APP_CONFIG;
