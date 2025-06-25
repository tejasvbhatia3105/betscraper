// Popup JavaScript for BetScraper - Screen Capture Mode

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.recommendations = [];
    this.isAnalyzing = false;
    this.init();
  }

  async init() {
    await this.getCurrentTab();
    this.setupEventListeners();
    this.setupMessageListeners();
    await this.loadRecommendations();
    this.updatePageInfo();
    this.checkAnalysisStatus();
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
  }

  setupEventListeners() {
    // Main capture and analyze button
    document.getElementById('analyzeBtn').addEventListener('click', () => {
      this.captureAndAnalyze();
    });

    // Note: Capture button removed from UI, now using single analyze button

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.loadRecommendations();
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
      if (message.action === 'analysisComplete') {
        this.handleAnalysisComplete(message.recommendations);
      }
    });
  }

  async captureAndAnalyze() {
    if (!this.currentTab || this.isAnalyzing) return;

    console.log('🎲 BetScraper Popup: Starting screen capture analysis');
    this.isAnalyzing = true;
    this.showLoadingState();
    this.updateStatus('📸 Capturing screen for analysis...', true);

    try {
      // Check if content script is loaded
      const pingResponse = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'getStatus'
      }).catch(() => null);

      if (!pingResponse) {
        throw new Error('Content script not loaded. Please refresh the page.');
      }

      // Request screen capture from content script
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'captureScreen'
      });

      this.updateStatus('🤖 AI is analyzing your screen...', true);

      // Poll for completion
      this.pollAnalysisStatus();

    } catch (error) {
      console.error('🎲 BetScraper Popup: Capture error:', error);
      this.updateStatus(`❌ Error: ${error.message}`, false);
      this.showEmptyState();
      this.isAnalyzing = false;
    }
  }

  async pollAnalysisStatus() {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    const checkStatus = async () => {
      attempts++;
      
      try {
        const status = await chrome.runtime.sendMessage({
          action: 'getAnalysisStatus'
        });

        if (!status.isAnalyzing) {
          // Analysis complete, load recommendations
          this.isAnalyzing = false;
          await this.loadRecommendations();
          return;
        }

        if (attempts >= maxAttempts) {
          throw new Error('Analysis timeout');
        }

        // Continue polling
        setTimeout(checkStatus, 1000);

      } catch (error) {
        console.error('🎲 BetScraper Popup: Status check error:', error);
        this.updateStatus('❌ Analysis failed', false);
        this.showEmptyState();
        this.isAnalyzing = false;
      }
    };

    checkStatus();
  }

  handleAnalysisComplete(recommendations) {
    console.log('🎲 BetScraper Popup: Analysis complete, got recommendations:', recommendations);
    this.isAnalyzing = false;
    
    if (recommendations && recommendations.length > 0) {
      this.updateRecommendations(recommendations);
      this.updateStatus('✅ Found betting opportunities!', false);
    } else {
      this.showEmptyState();
      this.updateStatus('🔍 No relevant markets found', false);
    }
  }

  async checkAnalysisStatus() {
    try {
      const status = await chrome.runtime.sendMessage({
        action: 'getAnalysisStatus'
      });

      if (status.isAnalyzing) {
        this.isAnalyzing = true;
        this.showLoadingState();
        this.updateStatus('🤖 Analysis in progress...', true);
        this.pollAnalysisStatus();
      }
    } catch (error) {
      console.log('🎲 BetScraper Popup: No analysis in progress');
    }
  }

  async loadRecommendations() {
    try {
      console.log('🎲 BetScraper Popup: Loading recommendations...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'getRecommendations'
      });

      console.log('🎲 BetScraper Popup: Got recommendations response:', response);
      
      const recommendations = response?.recommendations || [];
      this.updateRecommendations(recommendations);

      if (recommendations.length === 0 && !this.isAnalyzing) {
        this.showEmptyState();
      }

    } catch (error) {
      console.error('🎲 BetScraper Popup: Load recommendations error:', error);
      this.showEmptyState();
    }
  }

  updateRecommendations(recommendations) {
    this.recommendations = recommendations;
    
    if (recommendations.length === 0) {
      if (!this.isAnalyzing) {
        this.showEmptyState();
      }
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
      container.appendChild(this.createRecommendationCard(recommendation));
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