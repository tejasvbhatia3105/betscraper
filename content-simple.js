// Minimal BetScraper Content Script for Testing
console.log('🎲 BetScraper: Minimal content script loaded');

class MinimalContent {
  constructor() {
    console.log('🎲 BetScraper: MinimalContent constructor called');
    this.init();
  }

  init() {
    console.log('🎲 BetScraper: Initializing minimal content script');
    
    // Test message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('🎲 BetScraper: Content script received message:', message);
      
      switch (message.action) {
        case 'test':
          console.log('🎲 BetScraper: Test message in content script');
          sendResponse({ success: true, message: 'Content script is working!' });
          break;
        case 'getStatus':
          sendResponse({ 
            isLoaded: true,
            url: window.location.href,
            title: document.title
          });
          break;
        case 'captureScreen':
          this.testCapture();
          sendResponse({ success: true });
          break;
      }
    });

    // Visual indicator
    this.showLoadIndicator();
    
    console.log('🎲 BetScraper: Minimal content script ready');
    window.betScraperLoaded = true;
  }

  testCapture() {
    console.log('🎲 BetScraper: Test capture requested in content script');
    
    // Send message to background
    chrome.runtime.sendMessage({
      action: 'captureScreen',
      url: window.location.href,
      title: document.title,
      timestamp: Date.now()
    }, (response) => {
      console.log('🎲 BetScraper: Background response:', response);
    });
  }

  showLoadIndicator() {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 999999;
      font-family: monospace;
      font-size: 12px;
    `;
    indicator.textContent = 'BetScraper: Content Script Loaded ✅';
    document.body.appendChild(indicator);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 3000);
  }
}

// Initialize
console.log('🎲 BetScraper: About to create MinimalContent...');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new MinimalContent();
  });
} else {
  new MinimalContent();
} 