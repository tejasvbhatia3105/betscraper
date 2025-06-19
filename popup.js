// Popup JavaScript for BetScraper

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.recommendations = [];
    this.init();
  }

  async init() {
    await this.getCurrentTab();
    this.setupEventListeners();
    this.setupMessageListeners();
    await this.loadRecommendations();
    this.updatePageInfo();
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
  }

  setupEventListeners() {
    // Analyze button
    document.getElementById('analyzeBtn').addEventListener('click', () => {
      this.analyzeCurrentPage();
    });

    // Capture button
    document.getElementById('captureBtn').addEventListener('click', () => {
      this.captureAndAnalyze();
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshRecommendations();
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Footer links
    document.getElementById('openOptions').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/yourusername/betscraper#help' });
    });

    document.getElementById('aboutLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/yourusername/betscraper' });
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'newRecommendations') {
        this.updateRecommendations(message.recommendations);
      }
    });
  }

  async analyzeCurrentPage() {
    if (!this.currentTab) return;

    this.showLoadingState();
    this.updateStatus('Analyzing page content...', true);

    try {
      // Request content extraction from the content script
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extractContent'
      });

      if (response) {
        // Send content to background script for analysis
        const analysisResponse = await chrome.runtime.sendMessage({
          action: 'analyzeContent',
          data: response
        });

        this.updateStatus('Analysis completed', false);
        
        // Recommendations will be updated via message listener
        setTimeout(() => this.loadRecommendations(), 2000);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      this.updateStatus('Analysis failed', false);
      this.showEmptyState();
    }
  }

  async captureAndAnalyze() {
    if (!this.currentTab) return;

    this.showLoadingState();
    this.updateStatus('Capturing screen...', true);

    try {
      // Capture screenshot via background script
      const captureResponse = await chrome.runtime.sendMessage({
        action: 'captureTab'
      });

      if (captureResponse.screenshot) {
        this.updateStatus('Analyzing captured content...', true);
        
        // Also get text content
        const contentResponse = await chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'extractContent'
        });

        // Combine screenshot and text data
        const combinedData = {
          ...contentResponse,
          screenshot: captureResponse.screenshot
        };

        // Send to background for analysis
        await chrome.runtime.sendMessage({
          action: 'analyzeContent',
          data: combinedData
        });

        this.updateStatus('Analysis completed', false);
        setTimeout(() => this.loadRecommendations(), 2000);
      }
    } catch (error) {
      console.error('Capture error:', error);
      this.updateStatus('Capture failed', false);
      this.showEmptyState();
    }
  }

  async refreshRecommendations() {
    this.showLoadingState();
    this.updateStatus('Refreshing markets...', true);

    try {
      await chrome.runtime.sendMessage({ action: 'refreshMarkets' });
      await this.loadRecommendations();
      this.updateStatus('Markets refreshed', false);
    } catch (error) {
      console.error('Refresh error:', error);
      this.updateStatus('Refresh failed', false);
    }
  }

  async loadRecommendations() {
    try {
      const recommendations = await chrome.runtime.sendMessage({
        action: 'getRecommendations'
      });

      this.updateRecommendations(recommendations || []);
    } catch (error) {
      console.error('Load recommendations error:', error);
      this.showEmptyState();
    }
  }

  updateRecommendations(recommendations) {
    this.recommendations = recommendations;
    
    if (recommendations.length === 0) {
      this.showEmptyState();
    } else {
      this.showRecommendations(recommendations);
    }

    this.updateRecommendationCount(recommendations.length);
    this.updateLastUpdated();
  }

  showLoadingState() {
    document.getElementById('loadingState').classList.add('show');
    document.getElementById('emptyState').classList.remove('show');
    document.getElementById('recommendationsList').classList.remove('show');
  }

  showEmptyState() {
    document.getElementById('loadingState').classList.remove('show');
    document.getElementById('emptyState').classList.add('show');
    document.getElementById('recommendationsList').classList.remove('show');
  }

  showRecommendations(recommendations) {
    document.getElementById('loadingState').classList.remove('show');
    document.getElementById('emptyState').classList.remove('show');
    document.getElementById('recommendationsList').classList.add('show');

    const container = document.getElementById('recommendationsList');
    container.innerHTML = '';

    recommendations.forEach(recommendation => {
      const card = this.createRecommendationCard(recommendation);
      container.appendChild(card);
    });
  }

  createRecommendationCard(recommendation) {
    const template = document.getElementById('recommendationTemplate');
    const card = template.content.cloneNode(true);

    // Platform badge
    const platformBadge = card.querySelector('.platform-badge');
    const platformName = card.querySelector('.platform-name');
    platformBadge.setAttribute('data-platform', recommendation.platform);
    platformName.textContent = recommendation.platform;

    // Relevance score
    const relevanceValue = card.querySelector('.relevance-value');
    relevanceValue.textContent = `${Math.round(recommendation.relevance * 100)}% match`;

    // Title
    const title = card.querySelector('.recommendation-title');
    title.textContent = recommendation.title;

    // Price
    const priceValue = card.querySelector('.price-value');
    priceValue.textContent = this.formatPrice(recommendation.price);

    // Volume
    const volumeValue = card.querySelector('.volume-value');
    volumeValue.textContent = this.formatVolume(recommendation.volume);

    // View Market button
    const viewMarketBtn = card.querySelector('.view-market-btn');
    viewMarketBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: recommendation.url });
    });

    // Save button
    const saveBtn = card.querySelector('.save-btn');
    saveBtn.addEventListener('click', () => {
      this.saveRecommendation(recommendation);
    });

    return card;
  }

  formatPrice(price) {
    if (typeof price === 'number') {
      return `${Math.round(price * 100)}¢`;
    }
    return 'N/A';
  }

  formatVolume(volume) {
    if (typeof volume === 'number') {
      if (volume >= 1000000) {
        return `$${(volume / 1000000).toFixed(1)}M`;
      } else if (volume >= 1000) {
        return `$${(volume / 1000).toFixed(1)}K`;
      } else {
        return `$${volume}`;
      }
    }
    return 'N/A';
  }

  async saveRecommendation(recommendation) {
    try {
      const saved = await chrome.storage.local.get(['savedRecommendations']);
      const savedRecommendations = saved.savedRecommendations || [];
      
      // Check if already saved
      const alreadySaved = savedRecommendations.some(r => r.id === recommendation.id);
      if (alreadySaved) {
        alert('This recommendation is already saved!');
        return;
      }

      savedRecommendations.push({
        ...recommendation,
        savedAt: Date.now()
      });

      await chrome.storage.local.set({ savedRecommendations });
      alert('Recommendation saved!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save recommendation.');
    }
  }

  updateStatus(message, isActive) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.querySelector('.status-dot');
    
    statusText.textContent = message;
    
    if (isActive) {
      statusDot.classList.remove('inactive');
    } else {
      statusDot.classList.add('inactive');
    }
  }

  updatePageInfo() {
    if (this.currentTab) {
      const pageTitle = document.getElementById('pageTitle');
      const title = this.currentTab.title;
      const maxLength = 50;
      
      if (title.length > maxLength) {
        pageTitle.textContent = title.substring(0, maxLength) + '...';
      } else {
        pageTitle.textContent = title;
      }
      
      pageTitle.title = title; // Full title on hover
    }
  }

  updateRecommendationCount(count) {
    document.getElementById('recommendationCount').textContent = count;
  }

  updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    lastUpdated.textContent = `Last updated: ${timeString}`;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
}); 