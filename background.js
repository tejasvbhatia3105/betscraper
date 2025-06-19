// Background script for BetScraper - handles LLM analysis and market matching

class BetScraperBackground {
  constructor() {
    this.cache = new Map();
    this.rateLimiter = new Map();
    this.isAnalyzing = false;
    this.lastAnalysis = 0;
    this.analysisQueue = [];
    
    this.init();
  }

  init() {
    this.setupMessageListeners();
    this.setupAlarms();
    this.loadSettings();
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'analyzeContent':
          this.handleContentAnalysis(request.data, sender.tab?.id);
          sendResponse({ status: 'queued' });
          break;
        
        case 'captureTab':
          this.captureTabScreenshot(sender.tab?.id).then(sendResponse);
          return true;
        
        case 'getRecommendations':
          this.getStoredRecommendations().then(sendResponse);
          return true;
        
        case 'refreshMarkets':
          this.refreshMarketData().then(sendResponse);
          return true;
        
        case 'updateSettings':
          this.updateSettings(request.settings).then(sendResponse);
          return true;
      }
    });
  }

  setupAlarms() {
    // Refresh market data every 30 minutes
    chrome.alarms.create('refreshMarkets', { periodInMinutes: 30 });
    
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'refreshMarkets') {
        this.refreshMarketData();
      }
    });
  }

  async loadSettings() {
    const settings = await chrome.storage.sync.get([
      'openaiApiKey',
      'enabled',
      'autoAnalyze',
      'analysisDelay',
      'maxRecommendations'
    ]);

    this.settings = {
      openaiApiKey: settings.openaiApiKey || '',
      enabled: settings.enabled !== false,
      autoAnalyze: settings.autoAnalyze !== false,
      analysisDelay: settings.analysisDelay || 5000,
      maxRecommendations: settings.maxRecommendations || 5
    };
  }

  async updateSettings(newSettings) {
    await chrome.storage.sync.set(newSettings);
    this.settings = { ...this.settings, ...newSettings };
    return { status: 'updated' };
  }

  async handleContentAnalysis(content, tabId) {
    console.log('BetScraper: Starting content analysis', { enabled: this.settings.enabled, hasApiKey: !!this.settings.openaiApiKey });
    
    if (!this.settings.enabled || !this.settings.openaiApiKey) {
      console.log('BetScraper: Analysis skipped - extension disabled or no API key');
      return;
    }

    // Rate limiting - don't analyze more than once every 5 seconds
    const now = Date.now();
    if (now - this.lastAnalysis < this.settings.analysisDelay) {
      console.log('BetScraper: Analysis skipped - rate limited');
      return;
    }

    this.lastAnalysis = now;
    this.analysisQueue.push({ content, tabId, timestamp: now });
    
    if (!this.isAnalyzing) {
      this.processAnalysisQueue();
    }
  }

  async processAnalysisQueue() {
    if (this.analysisQueue.length === 0) {
      this.isAnalyzing = false;
      console.log('BetScraper: Analysis queue empty');
      return;
    }

    this.isAnalyzing = true;
    const { content, tabId } = this.analysisQueue.shift();
    console.log('BetScraper: Processing analysis queue item', { contentLength: content.text?.length, tabId });

    try {
      console.log('BetScraper: Starting LLM analysis...');
      const analysis = await this.analyzeWithLLM(content);
      console.log('BetScraper: LLM analysis completed', analysis);
      
      console.log('BetScraper: Finding relevant markets...');
      const recommendations = await this.findRelevantMarkets(analysis);
      console.log('BetScraper: Found recommendations', recommendations);
      
      await this.storeRecommendations(recommendations, tabId);
      console.log('BetScraper: Stored recommendations');
      
      // Notify popup if it's open
      this.notifyPopup(recommendations);
      console.log('BetScraper: Notified popup');
      
    } catch (error) {
      console.error('BetScraper: Analysis error:', error);
      
      // Store empty recommendations on error so UI updates
      await this.storeRecommendations([], tabId);
      this.notifyPopup([]);
    }

    // Process next item in queue after a delay
    setTimeout(() => this.processAnalysisQueue(), 1000);
  }

  async analyzeWithLLM(content) {
    const prompt = this.createAnalysisPrompt(content);
    console.log('BetScraper: Sending request to OpenAI API...');
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.openaiApiKey}`
        },
        body: JSON.stringify({
          model: this.settings.llmModel || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant that analyzes web content to identify potential betting opportunities on prediction markets like Polymarket and Kalshi. 

Your task is to:
1. Extract key topics, entities, and events from the content
2. Identify potential future outcomes that could be bet on
3. Categorize the content by relevance to prediction markets
4. Return structured data for market matching

Response format should be JSON with this structure:
{
  "topics": ["topic1", "topic2"],
  "entities": ["person1", "company1"],
  "events": ["event1", "event2"],
  "predictions": ["prediction1", "prediction2"],
  "categories": ["politics", "crypto", "sports"],
  "relevance_score": 0.8,
  "summary": "Brief summary of content",
  "betting_angles": ["angle1", "angle2"]
}`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      console.log('BetScraper: OpenAI API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('BetScraper: OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      console.log('BetScraper: Raw LLM response:', analysisText);
      
      try {
        const parsed = JSON.parse(analysisText);
        console.log('BetScraper: Parsed LLM analysis:', parsed);
        return parsed;
      } catch (parseError) {
        console.error('BetScraper: Failed to parse LLM response:', analysisText);
        return this.createFallbackAnalysis(content);
      }
      
    } catch (error) {
      console.error('BetScraper: LLM Analysis error:', error);
      console.log('BetScraper: Using fallback analysis');
      return this.createFallbackAnalysis(content);
    }
  }

  createAnalysisPrompt(content) {
    return `Analyze this web content for potential betting opportunities:

URL: ${content.url}
Title: ${content.title}
Content: ${content.text.substring(0, 5000)}
Headings: ${content.metadata.headings?.join(', ') || 'None'}

Focus on identifying:
- Political events and elections
- Cryptocurrency and financial markets
- Sports outcomes
- Technology and business events
- Entertainment and media
- Any other predictable future outcomes

Return the analysis as JSON.`;
  }

  createFallbackAnalysis(content) {
    console.log('BetScraper: Creating fallback analysis');
    // Simple keyword-based fallback analysis
    const keywords = {
      politics: ['election', 'vote', 'candidate', 'poll', 'democrat', 'republican', 'biden', 'trump', 'congress', 'senate'],
      crypto: ['bitcoin', 'ethereum', 'crypto', 'btc', 'eth', 'blockchain', 'defi', 'coinbase', 'binance'],
      sports: ['nfl', 'nba', 'mlb', 'nhl', 'football', 'basketball', 'championship', 'super bowl', 'world series'],
      finance: ['stock', 'market', 'fed', 'interest rate', 'inflation', 'gdp', 'recession', 'economy']
    };

    const text = (content.text || '').toLowerCase();
    const title = (content.title || '').toLowerCase();
    const combinedText = `${text} ${title}`;
    
    const categories = [];
    const topics = [];

    for (const [category, words] of Object.entries(keywords)) {
      const matchedWords = words.filter(word => combinedText.includes(word));
      if (matchedWords.length > 0) {
        categories.push(category);
        topics.push(...matchedWords);
      }
    }

    // Always return at least some categories for testing
    if (categories.length === 0) {
      categories.push('general');
      topics.push('news', 'current events');
    }

    const analysis = {
      topics: [...new Set(topics)],
      entities: [],
      events: [],
      predictions: [],
      categories,
      relevance_score: categories.length > 0 ? 0.6 : 0.3,
      summary: content.title || 'Web page content',
      betting_angles: categories
    };

    console.log('BetScraper: Fallback analysis result:', analysis);
    return analysis;
  }

  async findRelevantMarkets(analysis) {
    const recommendations = [];

    try {
      // Search Polymarket
      const polymarketResults = await this.searchPolymarket(analysis);
      recommendations.push(...polymarketResults);

      // Search Kalshi
      const kalshiResults = await this.searchKalshi(analysis);
      recommendations.push(...kalshiResults);

      // Sort by relevance and limit results
      return recommendations
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, this.settings.maxRecommendations);

    } catch (error) {
      console.error('Market search error:', error);
      return [];
    }
  }

  async searchPolymarket(analysis) {
    try {
      // Note: This is a simplified example. You'll need to implement actual Polymarket API integration
      const markets = await this.fetchPolymarketData();
      
      return markets
        .filter(market => this.matchesAnalysis(market, analysis))
        .map(market => ({
          id: market.id,
          title: market.question,
          platform: 'Polymarket',
          url: `https://polymarket.com/market/${market.slug}`,
          price: market.prices?.[0]?.price || 0.5,
          volume: market.volume,
          relevance: this.calculateRelevance(market, analysis),
          category: market.category,
          endDate: market.end_date
        }));
    } catch (error) {
      console.error('Polymarket search error:', error);
      return [];
    }
  }

  async searchKalshi(analysis) {
    try {
      // Note: This is a simplified example. You'll need to implement actual Kalshi API integration
      const markets = await this.fetchKalshiData();
      
      return markets
        .filter(market => this.matchesAnalysis(market, analysis))
        .map(market => ({
          id: market.id,
          title: market.title,
          platform: 'Kalshi',
          url: `https://kalshi.com/markets/${market.ticker}`,
          price: market.last_price || 0.5,
          volume: market.volume,
          relevance: this.calculateRelevance(market, analysis),
          category: market.category,
          endDate: market.close_time
        }));
    } catch (error) {
      console.error('Kalshi search error:', error);
      return [];
    }
  }

  async fetchPolymarketData() {
    console.log('BetScraper: Fetching Polymarket data (mock)');
    // Implement actual Polymarket API calls
    // For now, return mock data
    return [
      {
        id: '1',
        question: 'Will Bitcoin reach $100,000 by end of 2024?',
        slug: 'bitcoin-100k-2024',
        category: 'crypto',
        volume: 1000000,
        prices: [{ price: 0.45 }],
        end_date: '2024-12-31'
      },
      {
        id: '2',
        question: 'Will Trump win the 2024 presidential election?',
        slug: 'trump-2024-election',
        category: 'politics',
        volume: 5000000,
        prices: [{ price: 0.52 }],
        end_date: '2024-11-05'
      },
      {
        id: '3',
        question: 'Will the S&P 500 reach 6000 by end of 2024?',
        slug: 'sp500-6000-2024',
        category: 'finance',
        volume: 2000000,
        prices: [{ price: 0.35 }],
        end_date: '2024-12-31'
      }
    ];
  }

  async fetchKalshiData() {
    console.log('BetScraper: Fetching Kalshi data (mock)');
    // Implement actual Kalshi API calls
    // For now, return mock data
    return [
      {
        id: '2',
        title: 'Will the Fed cut rates in December 2024?',
        ticker: 'FED-DEC24',
        category: 'finance',
        volume: 500000,
        last_price: 0.75,
        close_time: '2024-12-31'
      },
      {
        id: '3',
        title: 'Will Democrats control the House after 2024?',
        ticker: 'DEMS-HOUSE-24',
        category: 'politics',
        volume: 800000,
        last_price: 0.42,
        close_time: '2024-11-05'
      },
      {
        id: '4',
        title: 'Will there be a recession in 2024?',
        ticker: 'RECESSION-24',
        category: 'finance',
        volume: 1200000,
        last_price: 0.25,
        close_time: '2024-12-31'
      }
    ];
  }

  matchesAnalysis(market, analysis) {
    const marketText = (market.question || market.title || '').toLowerCase();
    const topics = analysis.topics || [];
    const categories = analysis.categories || [];

    // Check if market matches any topics or categories
    return topics.some(topic => marketText.includes(topic.toLowerCase())) ||
           categories.some(category => marketText.includes(category) || market.category === category);
  }

  calculateRelevance(market, analysis) {
    let score = 0;
    
    const marketText = (market.question || market.title || '').toLowerCase();
    
    // Topic matching
    (analysis.topics || []).forEach(topic => {
      if (marketText.includes(topic.toLowerCase())) {
        score += 0.3;
      }
    });

    // Category matching
    (analysis.categories || []).forEach(category => {
      if (marketText.includes(category) || market.category === category) {
        score += 0.4;
      }
    });

    // Volume bonus (higher volume = more liquid market)
    if (market.volume > 100000) score += 0.2;
    if (market.volume > 1000000) score += 0.1;

    return Math.min(score, 1.0);
  }

  async storeRecommendations(recommendations, tabId) {
    const key = `recommendations_${tabId}`;
    await chrome.storage.local.set({
      [key]: {
        recommendations,
        timestamp: Date.now(),
        tabId
      }
    });

    // Also store latest recommendations globally
    await chrome.storage.local.set({
      latestRecommendations: recommendations
    });
  }

  async getStoredRecommendations() {
    const data = await chrome.storage.local.get(['latestRecommendations']);
    return data.latestRecommendations || [];
  }

  async refreshMarketData() {
    try {
      // Refresh cached market data
      const [polymarketData, kalshiData] = await Promise.all([
        this.fetchPolymarketData(),
        this.fetchKalshiData()
      ]);

      await chrome.storage.local.set({
        polymarketCache: {
          data: polymarketData,
          timestamp: Date.now()
        },
        kalshiCache: {
          data: kalshiData,
          timestamp: Date.now()
        }
      });

      return { status: 'refreshed' };
    } catch (error) {
      console.error('Market refresh error:', error);
      return { status: 'error', error: error.message };
    }
  }

  async captureTabScreenshot(tabId) {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 80
      });
      
      return { screenshot: dataUrl };
    } catch (error) {
      console.error('Screenshot capture error:', error);
      return { error: error.message };
    }
  }

  notifyPopup(recommendations) {
    // Send message to popup if it's open
    chrome.runtime.sendMessage({
      action: 'newRecommendations',
      recommendations
    }).catch(() => {
      // Popup might not be open, that's fine
    });
  }
}

// Initialize the background service
console.log('BetScraper: Background script loaded');
const betScraperBackground = new BetScraperBackground();
console.log('BetScraper: Background service initialized'); 