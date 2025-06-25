// BetScraper Background Service Worker - Screen Capture & Vision Analysis
console.log('🎲 BetScraper: Background script loaded - Vision Analysis Mode');

// Mock API implementations (inline to avoid import issues)
class PolymarketAPI {
  async searchMarkets(keywords) {
    console.log('🎲 BetScraper: Searching Polymarket with keywords:', keywords);
    
    // Mock Polymarket data
    const mockMarkets = [
      {
        id: 'poly_1',
        title: 'Will Bitcoin reach $100,000 by end of 2024?',
        url: 'https://polymarket.com/market/bitcoin-100k-2024',
        price: 0.45,
        volume: 1000000,
        category: 'crypto',
        endDate: '2024-12-31'
      },
      {
        id: 'poly_2',
        title: 'Will Trump win the 2024 presidential election?',
        url: 'https://polymarket.com/market/trump-2024-election',
        price: 0.52,
        volume: 5000000,
        category: 'politics',
        endDate: '2024-11-05'
      },
      {
        id: 'poly_3',
        title: 'Will the S&P 500 reach 6000 by end of 2024?',
        url: 'https://polymarket.com/market/sp500-6000-2024',
        price: 0.35,
        volume: 2000000,
        category: 'finance',
        endDate: '2024-12-31'
      }
    ];

    // Filter based on keywords
    const searchTerms = keywords.map(k => k.toLowerCase());
    return mockMarkets.filter(market => {
      const marketText = market.title.toLowerCase();
      return searchTerms.some(term => marketText.includes(term));
    });
  }
}

class KalshiAPI {
  async searchMarkets(keywords) {
    console.log('🎲 BetScraper: Searching Kalshi with keywords:', keywords);
    
    // Mock Kalshi data
    const mockMarkets = [
      {
        id: 'kalshi_1',
        title: 'Will the Fed cut rates in December 2024?',
        url: 'https://kalshi.com/markets/FED-DEC24',
        price: 0.75,
        volume: 500000,
        category: 'finance',
        endDate: '2024-12-31'
      },
      {
        id: 'kalshi_2',
        title: 'Will Democrats control the House after 2024?',
        url: 'https://kalshi.com/markets/DEMS-HOUSE-24',
        price: 0.42,
        volume: 800000,
        category: 'politics',
        endDate: '2024-11-05'
      },
      {
        id: 'kalshi_3',
        title: 'Will there be a recession in 2024?',
        url: 'https://kalshi.com/markets/RECESSION-24',
        price: 0.25,
        volume: 1200000,
        category: 'finance',
        endDate: '2024-12-31'
      }
    ];

    // Filter based on keywords
    const searchTerms = keywords.map(k => k.toLowerCase());
    return mockMarkets.filter(market => {
      const marketText = market.title.toLowerCase();
      return searchTerms.some(term => marketText.includes(term));
    });
  }
}

class BetScraperBackground {
  constructor() {
    this.polymarketAPI = new PolymarketAPI();
    this.kalshiAPI = new KalshiAPI();
    this.isAnalyzing = false;
    this.analysisQueue = [];
    this.init();
  }

  init() {
    console.log('🎲 BetScraper: Initializing background service worker');
    
    // Listen for messages from content script and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Will respond asynchronously
    });

    // Handle extension install/update
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('🎲 BetScraper: Extension installed/updated:', details.reason);
      this.setupDefaultSettings();
    });

    console.log('🎲 BetScraper: Background script ready');
  }

  async setupDefaultSettings() {
    const defaultSettings = {
      enabled: true,
      autoAnalyze: true,
      openaiApiKey: '',
      analysisFrequency: 'moderate', // low, moderate, high
      platforms: {
        polymarket: true,
        kalshi: true
      },
      confidenceThreshold: 0.6,
      maxRecommendations: 5
    };

    // Only set defaults if not already configured
    const existing = await chrome.storage.sync.get(Object.keys(defaultSettings));
    const updates = {};
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      if (!(key in existing)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length > 0) {
      await chrome.storage.sync.set(updates);
      console.log('🎲 BetScraper: Default settings applied:', updates);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    console.log('🎲 BetScraper: Background received message:', message.action);

    try {
      switch (message.action) {
        case 'captureScreen':
          console.log('🎲 BetScraper: Received captureScreen message:', message);
          await this.handleScreenCapture(message, sender);
          console.log('🎲 BetScraper: handleScreenCapture completed, sending success response');
          sendResponse({ success: true });
          break;

        case 'getRecommendations':
          const recommendations = await this.getStoredRecommendations();
          sendResponse({ recommendations });
          break;

        case 'getAnalysisStatus':
          sendResponse({ 
            isAnalyzing: this.isAnalyzing,
            queueLength: this.analysisQueue.length 
          });
          break;

        case 'clearRecommendations':
          await chrome.storage.local.remove(['recommendations', 'lastAnalysis']);
          sendResponse({ success: true });
          break;

        default:
          console.log('🎲 BetScraper: Unknown message action:', message.action);
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('🎲 BetScraper: Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async handleScreenCapture(message, sender) {
    if (this.isAnalyzing) {
      console.log('🎲 BetScraper: Analysis in progress, queueing request');
      this.analysisQueue.push({ message, sender });
      return;
    }

    console.log('🎲 BetScraper: Starting screen capture analysis');
    this.isAnalyzing = true;

    try {
      console.log('🎲 BetScraper: Step 1 - About to capture active tab...');
      
      // Capture the active tab
      const screenshot = await this.captureActiveTab();
      
      console.log('🎲 BetScraper: Step 2 - Screenshot capture result:', screenshot ? 'SUCCESS' : 'FAILED');
      
      if (!screenshot) {
        throw new Error('Failed to capture screenshot');
      }

      console.log('🎲 BetScraper: Step 3 - About to analyze screenshot...');
      
      // Analyze screenshot with GPT-4 Vision
      const analysis = await this.analyzeScreenshot(screenshot, message);
      
      console.log('🎲 BetScraper: Step 4 - Analysis result:', analysis);
      
      console.log('🎲 BetScraper: Step 5 - About to find relevant markets...');
      
      // Find relevant markets based on analysis
      const recommendations = await this.findRelevantMarkets(analysis);
      
      console.log('🎲 BetScraper: Step 6 - Found recommendations:', recommendations);
      
      console.log('🎲 BetScraper: Step 7 - About to store results...');
      
      // Store results
      await this.storeAnalysisResults(recommendations, message);
      
      console.log('🎲 BetScraper: Step 8 - Results stored, about to notify content script...');
      
      // Notify content script of completion
      if (sender.tab) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'analysisComplete',
          recommendations: recommendations.slice(0, 3) // Send top 3 for quick display
        }).catch(() => {
          console.log('🎲 BetScraper: Could not notify content script (tab may have changed)');
        });
      }

      console.log(`🎲 BetScraper: Step 9 - COMPLETE! Analysis finished - found ${recommendations.length} recommendations`);

    } catch (error) {
      console.error('🎲 BetScraper: Error in screen capture analysis:', error);
      
      // Store error for popup display
      await chrome.storage.local.set({
        lastError: {
          message: error.message,
          timestamp: Date.now(),
          url: message.url
        }
      });
    } finally {
      console.log('🎲 BetScraper: Step 10 - Cleaning up, setting isAnalyzing = false');
      this.isAnalyzing = false;
      
      // Process next item in queue
      if (this.analysisQueue.length > 0) {
        const next = this.analysisQueue.shift();
        setTimeout(() => this.handleScreenCapture(next.message, next.sender), 1000);
      }
    }
  }

  async captureActiveTab() {
    try {
      console.log('🎲 BetScraper: Capturing active tab screenshot');
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        throw new Error('No active tab found');
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
        format: 'png',
        quality: 90
      });

      console.log('🎲 BetScraper: Screenshot captured successfully');
      return dataUrl;

    } catch (error) {
      console.error('🎲 BetScraper: Error capturing screenshot:', error);
      return null;
    }
  }

  async analyzeScreenshot(screenshot, context) {
    console.log('🎲 BetScraper: Analyzing screenshot with OpenAI Vision');

    try {
      const settings = await chrome.storage.sync.get(['openaiApiKey']);
      if (!settings.openaiApiKey) {
        console.log('🎲 BetScraper: No OpenAI API key configured, using fallback analysis');
        return this.createFallbackAnalysis(context);
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this screenshot and identify content that could be relevant for prediction markets or betting opportunities. Look for:

1. News events, politics, elections, policy decisions
2. Economic indicators, market trends, financial news
3. Sports events, tournaments, competitions
4. Technology announcements, product launches
5. Entertainment industry news, awards, releases
6. Weather events, natural disasters
7. Scientific discoveries, research results
8. Social media trends, viral content

For each relevant topic you identify, provide:
- Topic/event name
- Brief description (1-2 sentences)
- Relevance score (0-1)
- Suggested search keywords for finding related prediction markets
- Time sensitivity (immediate, short-term, long-term)

Return your analysis as a JSON object with an array of "topics" where each topic has: name, description, relevance, keywords, timeSensitivity.

Context: Page URL is ${context.url}, Page Title is "${context.title}"`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: screenshot,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No analysis content received from OpenAI');
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('🎲 BetScraper: Non-JSON response, using fallback analysis');
        return this.createFallbackAnalysis(context);
      }

      const analysis = JSON.parse(jsonMatch[0]);
      console.log('🎲 BetScraper: GPT-4 Vision analysis complete:', analysis);
      return analysis;

    } catch (error) {
      console.error('🎲 BetScraper: Error in OpenAI analysis:', error);
      return this.createFallbackAnalysis(context);
    }
  }

  createFallbackAnalysis(context) {
    console.log('🎲 BetScraper: Creating fallback analysis');
    
    const url = context.url.toLowerCase();
    const title = context.title.toLowerCase();
    
    const topics = [];
    
    // Simple keyword-based analysis as fallback
    const topicDetectors = [
      {
        keywords: ['election', 'vote', 'poll', 'candidate', 'politics', 'senate', 'congress'],
        topic: { 
          name: 'Political Event', 
          description: 'Political news or election-related content detected',
          relevance: 0.8,
          keywords: ['politics', 'election', 'vote'],
          timeSensitivity: 'short-term'
        }
      },
      {
        keywords: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi'],
        topic: { 
          name: 'Cryptocurrency News', 
          description: 'Cryptocurrency or blockchain related content',
          relevance: 0.7,
          keywords: ['crypto', 'bitcoin', 'price'],
          timeSensitivity: 'immediate'
        }
      },
      {
        keywords: ['market', 'stock', 'dow', 'nasdaq', 'sp500', 'earnings'],
        topic: { 
          name: 'Financial Markets', 
          description: 'Financial market or economic news detected',
          relevance: 0.6,
          keywords: ['market', 'stock', 'economy'],
          timeSensitivity: 'immediate'
        }
      }
    ];
    
    const content = `${url} ${title}`;
    topicDetectors.forEach(detector => {
      if (detector.keywords.some(keyword => content.includes(keyword))) {
        topics.push(detector.topic);
      }
    });
    
    // Always include a general topic if nothing specific found
    if (topics.length === 0) {
      topics.push({
        name: 'General Content',
        description: 'Page content analyzed for potential betting opportunities',
        relevance: 0.4,
        keywords: ['news', 'events', 'trends'],
        timeSensitivity: 'long-term'
      });
    }
    
    return { topics };
  }

  async findRelevantMarkets(analysis) {
    console.log('🎲 BetScraper: Finding relevant markets for analysis topics');
    
    const recommendations = [];
    const settings = await chrome.storage.sync.get(['platforms', 'maxRecommendations']);
    
    for (const topic of analysis.topics || []) {
      if (topic.relevance < 0.4) continue; // Skip low relevance topics
      
      try {
        // Search Polymarket
        if (settings.platforms?.polymarket !== false) {
          const polymarketResults = await this.polymarketAPI.searchMarkets(topic.keywords);
          polymarketResults.forEach(market => {
            recommendations.push({
              ...market,
              platform: 'polymarket',
              relevance: topic.relevance,
              topic: topic.name,
              matchedKeywords: topic.keywords
            });
          });
        }
        
        // Search Kalshi
        if (settings.platforms?.kalshi !== false) {
          const kalshiResults = await this.kalshiAPI.searchMarkets(topic.keywords);
          kalshiResults.forEach(market => {
            recommendations.push({
              ...market,
              platform: 'kalshi',
              relevance: topic.relevance,
              topic: topic.name,
              matchedKeywords: topic.keywords
            });
          });
        }
        
      } catch (error) {
        console.error(`🎲 BetScraper: Error searching markets for topic "${topic.name}":`, error);
      }
    }
    
    // Sort by relevance and limit results
    const maxRecs = settings.maxRecommendations || 5;
    const sortedRecs = recommendations
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxRecs);
    
    console.log(`🎲 BetScraper: Found ${sortedRecs.length} relevant markets`);
    return sortedRecs;
  }

  async storeAnalysisResults(recommendations, context) {
    const results = {
      recommendations,
      analysis: {
        url: context.url,
        title: context.title,
        timestamp: Date.now(),
        topicsCount: recommendations.length > 0 ? Math.max(...recommendations.map(r => r.topic ? 1 : 0)) : 0
      }
    };
    
    await chrome.storage.local.set({
      recommendations: recommendations,
      lastAnalysis: results.analysis
    });
    
    console.log('🎲 BetScraper: Analysis results stored');
  }

  async getStoredRecommendations() {
    const stored = await chrome.storage.local.get(['recommendations', 'lastAnalysis']);
    return {
      recommendations: stored.recommendations || [],
      lastAnalysis: stored.lastAnalysis || null
    };
  }
}

// Initialize the background service
console.log('🎲 BetScraper: About to initialize BetScraperBackground...');
const background = new BetScraperBackground();
console.log('🎲 BetScraper: BetScraperBackground initialized successfully'); 