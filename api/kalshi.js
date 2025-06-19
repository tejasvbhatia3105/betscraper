// Kalshi API integration module

class KalshiAPI {
  constructor() {
    this.baseUrl = 'https://trading-api.kalshi.com/trade-api/v2';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.accessToken = null;
  }

  /**
   * Authenticate with Kalshi (if using authenticated endpoints)
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<boolean>} Success status
   */
  async authenticate(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      if (!response.ok) {
        throw new Error(`Kalshi auth error: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.token;
      return true;
    } catch (error) {
      console.error('Kalshi authentication failed:', error);
      return false;
    }
  }

  /**
   * Get headers for API requests
   * @returns {Object} Request headers
   */
  getHeaders() {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Fetch markets from Kalshi
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of market data
   */
  async fetchMarkets(options = {}) {
    const {
      limit = 100,
      cursor = null,
      event_ticker = null,
      series_ticker = null,
      max_close_ts = null,
      min_close_ts = null,
      status = 'open',
      tickers = null
    } = options;

    const cacheKey = `markets_${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });

      if (cursor) params.append('cursor', cursor);
      if (event_ticker) params.append('event_ticker', event_ticker);
      if (series_ticker) params.append('series_ticker', series_ticker);
      if (max_close_ts) params.append('max_close_ts', max_close_ts.toString());
      if (min_close_ts) params.append('min_close_ts', min_close_ts.toString());
      if (status) params.append('status', status);
      if (tickers) params.append('tickers', tickers);

      const response = await fetch(`${this.baseUrl}/markets?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Kalshi API error: ${response.status}`);
      }

      const data = await response.json();
      const markets = data.markets || [];
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: markets,
        timestamp: Date.now()
      });

      return markets;
    } catch (error) {
      console.error('Error fetching Kalshi markets:', error);
      
      // Return cached data if available, even if expired
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey).data;
      }
      
      throw error;
    }
  }

  /**
   * Search markets by query
   * @param {string} query - Search query
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Matching markets
   */
  async searchMarkets(query, options = {}) {
    try {
      const allMarkets = await this.fetchMarkets(options);
      
      if (!query || query.length < 2) {
        return allMarkets;
      }

      const queryLower = query.toLowerCase();
      
      return allMarkets.filter(market => {
        const title = (market.title || '').toLowerCase();
        const subtitle = (market.subtitle || '').toLowerCase();
        const ticker = (market.ticker || '').toLowerCase();
        
        return title.includes(queryLower) || 
               subtitle.includes(queryLower) || 
               ticker.includes(queryLower);
      });
    } catch (error) {
      console.error('Error searching Kalshi markets:', error);
      return [];
    }
  }

  /**
   * Get market by ticker
   * @param {string} ticker - Market ticker
   * @returns {Promise<Object>} Market data
   */
  async getMarket(ticker) {
    const cacheKey = `market_${ticker}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/markets/${ticker}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Kalshi API error: ${response.status}`);
      }

      const data = await response.json();
      const market = data.market;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: market,
        timestamp: Date.now()
      });

      return market;
    } catch (error) {
      console.error('Error fetching Kalshi market:', error);
      throw error;
    }
  }

  /**
   * Get market orderbook
   * @param {string} ticker - Market ticker
   * @returns {Promise<Object>} Orderbook data
   */
  async getOrderbook(ticker) {
    const cacheKey = `orderbook_${ticker}`;
    
    // Check cache (shorter timeout for orderbook)
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30000) { // 30 seconds
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/markets/${ticker}/orderbook`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Kalshi API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error fetching Kalshi orderbook:', error);
      throw error;
    }
  }

  /**
   * Get trending markets
   * @returns {Promise<Array>} Trending markets
   */
  async getTrendingMarkets() {
    return this.fetchMarkets({
      limit: 20,
      status: 'open'
    });
  }

  /**
   * Get markets by category
   * @param {string} category - Category name
   * @returns {Promise<Array>} Markets in category
   */
  async getMarketsByCategory(category) {
    const allMarkets = await this.fetchMarkets({ limit: 200 });
    return this.filterByCategory(allMarkets, category);
  }

  /**
   * Filter markets by category
   * @param {Array} markets - Markets to filter
   * @param {string} category - Category to filter by
   * @returns {Array} Filtered markets
   */
  filterByCategory(markets, category) {
    if (!category) return markets;

    const categoryKeywords = {
      politics: ['congress', 'election', 'president', 'senate', 'house', 'vote', 'political', 'biden', 'trump'],
      crypto: ['bitcoin', 'ethereum', 'crypto', 'btc', 'eth', 'blockchain'],
      finance: ['fed', 'interest', 'rate', 'inflation', 'gdp', 'recession', 'economy', 'cpi'],
      sports: ['nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'championship', 'world series'],
      weather: ['hurricane', 'temperature', 'snow', 'weather', 'storm'],
      entertainment: ['oscar', 'emmy', 'movie', 'box office'],
      tech: ['ai', 'technology', 'apple', 'google', 'microsoft']
    };

    const keywords = categoryKeywords[category.toLowerCase()] || [];
    
    return markets.filter(market => {
      const text = `${market.title} ${market.subtitle} ${market.ticker}`.toLowerCase();
      return keywords.some(keyword => text.includes(keyword));
    });
  }

  /**
   * Format market data for display
   * @param {Object} market - Raw market data
   * @returns {Object} Formatted market data
   */
  formatMarket(market) {
    return {
      id: market.ticker,
      title: market.title,
      subtitle: market.subtitle,
      platform: 'Kalshi',
      url: `https://kalshi.com/markets/${market.ticker}`,
      price: market.last_price || market.yes_price || 0.5,
      volume: market.volume || market.volume_24h || 0,
      category: this.detectCategory(market),
      endDate: market.close_time,
      ticker: market.ticker,
      active: market.status === 'open',
      liquidity: market.open_interest || 0,
      canTrade: market.can_close_early || true
    };
  }

  /**
   * Detect market category from content
   * @param {Object} market - Market data
   * @returns {string} Detected category
   */
  detectCategory(market) {
    const text = `${market.title} ${market.subtitle} ${market.ticker}`.toLowerCase();
    
    const categories = {
      politics: ['congress', 'election', 'president', 'political'],
      crypto: ['bitcoin', 'ethereum', 'crypto'],
      finance: ['fed', 'rate', 'inflation', 'gdp'],
      sports: ['nfl', 'nba', 'championship', 'bowl'],
      weather: ['hurricane', 'temperature', 'weather'],
      entertainment: ['oscar', 'movie', 'emmy'],
      tech: ['ai', 'tech', 'apple', 'google']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Get series information
   * @param {string} seriesTicker - Series ticker
   * @returns {Promise<Object>} Series data
   */
  async getSeries(seriesTicker) {
    try {
      const response = await fetch(`${this.baseUrl}/series/${seriesTicker}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Kalshi API error: ${response.status}`);
      }

      const data = await response.json();
      return data.series;
    } catch (error) {
      console.error('Error fetching Kalshi series:', error);
      throw error;
    }
  }

  /**
   * Get events
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Events data
   */
  async getEvents(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.cursor) params.append('cursor', options.cursor);
      if (options.status) params.append('status', options.status);
      if (options.series_ticker) params.append('series_ticker', options.series_ticker);

      const response = await fetch(`${this.baseUrl}/events?${params}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Kalshi API error: ${response.status}`);
      }

      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Error fetching Kalshi events:', error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KalshiAPI;
} else if (typeof window !== 'undefined') {
  window.KalshiAPI = KalshiAPI;
} 