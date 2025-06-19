// Polymarket API integration module

class PolymarketAPI {
  constructor() {
    this.baseUrl = 'https://gamma-api.polymarket.com';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Fetch markets from Polymarket
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of market data
   */
  async fetchMarkets(options = {}) {
    const {
      limit = 20,
      offset = 0,
      active = true,
      closed = false,
      order = 'volume24hr',
      ascending = false
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
        limit: limit.toString(),
        offset: offset.toString(),
        active: active.toString(),
        closed: closed.toString(),
        order,
        ascending: ascending.toString()
      });

      const response = await fetch(`${this.baseUrl}/markets?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error fetching Polymarket markets:', error);
      
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
        const question = (market.question || '').toLowerCase();
        const description = (market.description || '').toLowerCase();
        const tags = (market.tags || []).join(' ').toLowerCase();
        
        return question.includes(queryLower) || 
               description.includes(queryLower) || 
               tags.includes(queryLower);
      });
    } catch (error) {
      console.error('Error searching Polymarket markets:', error);
      return [];
    }
  }

  /**
   * Get market by ID
   * @param {string} marketId - Market ID
   * @returns {Promise<Object>} Market data
   */
  async getMarket(marketId) {
    const cacheKey = `market_${marketId}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/markets/${marketId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error fetching Polymarket market:', error);
      throw error;
    }
  }

  /**
   * Get trending markets
   * @returns {Promise<Array>} Trending markets
   */
  async getTrendingMarkets() {
    return this.fetchMarkets({
      limit: 10,
      order: 'volume24hr',
      ascending: false
    });
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
      politics: ['election', 'president', 'congress', 'senate', 'vote', 'political', 'biden', 'trump'],
      crypto: ['bitcoin', 'ethereum', 'crypto', 'btc', 'eth', 'blockchain', 'defi', 'nft'],
      sports: ['nfl', 'nba', 'mlb', 'nhl', 'soccer', 'football', 'basketball', 'championship', 'super bowl'],
      finance: ['fed', 'interest rate', 'inflation', 'gdp', 'stock', 'market', 'recession', 'economy'],
      tech: ['apple', 'google', 'microsoft', 'tesla', 'ai', 'technology', 'tech', 'startup'],
      entertainment: ['oscar', 'movie', 'celebrity', 'music', 'award', 'box office', 'streaming']
    };

    const keywords = categoryKeywords[category.toLowerCase()] || [];
    
    return markets.filter(market => {
      const text = `${market.question} ${market.description} ${(market.tags || []).join(' ')}`.toLowerCase();
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
      id: market.id,
      title: market.question,
      description: market.description,
      platform: 'Polymarket',
      url: `https://polymarket.com/market/${market.slug || market.id}`,
      price: market.outcomes?.[0]?.price || 0.5,
      volume: market.volume || market.volume24hr || 0,
      category: this.detectCategory(market),
      endDate: market.end_date || market.endDate,
      tags: market.tags || [],
      active: market.active !== false,
      liquidity: market.liquidity || 0,
      participants: market.participants || 0
    };
  }

  /**
   * Detect market category from content
   * @param {Object} market - Market data
   * @returns {string} Detected category
   */
  detectCategory(market) {
    const text = `${market.question} ${market.description} ${(market.tags || []).join(' ')}`.toLowerCase();
    
    const categories = {
      politics: ['election', 'president', 'congress', 'political'],
      crypto: ['bitcoin', 'ethereum', 'crypto', 'blockchain'],
      sports: ['nfl', 'nba', 'sports', 'championship'],
      finance: ['fed', 'market', 'economy', 'inflation'],
      tech: ['tech', 'ai', 'apple', 'google'],
      entertainment: ['movie', 'celebrity', 'award', 'music']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'other';
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
  module.exports = PolymarketAPI;
} else if (typeof window !== 'undefined') {
  window.PolymarketAPI = PolymarketAPI;
} 