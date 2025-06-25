// Minimal BetScraper Background Service Worker for Testing
console.log('🎲 BetScraper: Minimal background script loaded');

// Test Chrome APIs
console.log('🎲 BetScraper: Testing Chrome APIs...');
console.log('🎲 BetScraper: chrome.runtime available:', !!chrome.runtime);
console.log('🎲 BetScraper: chrome.tabs available:', !!chrome.tabs);
console.log('🎲 BetScraper: chrome.storage available:', !!chrome.storage);

class MinimalBackground {
  constructor() {
    console.log('🎲 BetScraper: MinimalBackground constructor called');
    this.init();
  }

  init() {
    console.log('🎲 BetScraper: Initializing minimal background service worker');
    
    // Test message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('🎲 BetScraper: Received message:', message);
      
      switch (message.action) {
        case 'test':
          console.log('🎲 BetScraper: Test message received');
          sendResponse({ success: true, message: 'Background script is working!' });
          break;
          
        case 'captureScreen':
          console.log('🎲 BetScraper: Capture screen requested');
          this.testCapture().then(result => {
            sendResponse(result);
          });
          return true; // Will respond asynchronously
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    });

    // Test install listener
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('🎲 BetScraper: Extension installed/updated:', details.reason);
    });

    console.log('🎲 BetScraper: Minimal background script ready');
  }

  async testCapture() {
    try {
      console.log('🎲 BetScraper: Testing tab capture...');
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('🎲 BetScraper: Found tabs:', tabs.length);
      
      if (!tabs[0]) {
        throw new Error('No active tab found');
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
        format: 'png',
        quality: 90
      });

      console.log('🎲 BetScraper: Screenshot captured, size:', dataUrl.length);
      return { success: true, screenshotSize: dataUrl.length };

    } catch (error) {
      console.error('🎲 BetScraper: Capture error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize
console.log('🎲 BetScraper: About to create MinimalBackground...');
try {
  const background = new MinimalBackground();
  console.log('🎲 BetScraper: MinimalBackground created successfully');
} catch (error) {
  console.error('🎲 BetScraper: Error creating MinimalBackground:', error);
} 