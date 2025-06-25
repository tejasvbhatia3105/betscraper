// BetScraper Content Script - Screen Capture Version
console.log('🎲 BetScraper: Content script loaded - Screen Capture Mode');

class BetScraperScreenCapture {
  constructor() {
    this.isAnalyzing = false;
    this.lastCaptureTime = 0;
    this.captureDelay = 3000; // Minimum 3 seconds between captures
    this.init();
  }

  init() {
    console.log('🎲 BetScraper: Initializing screen capture module');
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('🎲 BetScraper: Content script received message:', message);
      
      switch (message.action) {
        case 'captureScreen':
          this.captureAndAnalyze();
          sendResponse({ success: true });
          break;
        case 'getStatus':
          sendResponse({ 
            isAnalyzing: this.isAnalyzing,
            url: window.location.href,
            title: document.title
          });
          break;
      }
    });

    // Auto-capture on significant page changes
    this.setupAutoCapture();
    
    window.betScraperLoaded = true;
    console.log('🎲 BetScraper: Screen capture module ready');
  }

  setupAutoCapture() {
    // Capture on page load (after delay)
    setTimeout(() => {
      if (this.shouldAutoCapture()) {
        this.captureAndAnalyze();
      }
    }, 2000);

    // Capture on scroll end (debounced)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (this.shouldAutoCapture()) {
          this.captureAndAnalyze();
        }
      }, 1000);
    });

    // Capture on significant DOM changes (debounced)
    if (window.MutationObserver) {
      const observer = new MutationObserver(() => {
        if (this.shouldAutoCapture()) {
          clearTimeout(this.mutationTimeout);
          this.mutationTimeout = setTimeout(() => {
            this.captureAndAnalyze();
          }, 2000);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }
  }

  shouldAutoCapture() {
    const now = Date.now();
    const timeSinceLastCapture = now - this.lastCaptureTime;
    
    return !this.isAnalyzing && 
           timeSinceLastCapture > this.captureDelay &&
           document.visibilityState === 'visible';
  }

  async captureAndAnalyze() {
    if (this.isAnalyzing) {
      console.log('🎲 BetScraper: Already analyzing, skipping capture');
      return;
    }

    try {
      this.isAnalyzing = true;
      this.lastCaptureTime = Date.now();
      
      console.log('🎲 BetScraper: Starting screen capture...');
      
      // Show visual indicator
      this.showCaptureIndicator();
      
      // Request screen capture from background script
      chrome.runtime.sendMessage({
        action: 'captureScreen',
        url: window.location.href,
        title: document.title,
        timestamp: Date.now()
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('🎲 BetScraper: Error sending capture request:', chrome.runtime.lastError);
        } else {
          console.log('🎲 BetScraper: Capture request sent successfully');
        }
        this.isAnalyzing = false;
      });

    } catch (error) {
      console.error('🎲 BetScraper: Error in captureAndAnalyze:', error);
      this.isAnalyzing = false;
    }
  }

  showCaptureIndicator() {
    // Create visual indicator for capture
    const indicator = document.createElement('div');
    indicator.id = 'betscraper-capture-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(45deg, #667eea, #764ba2);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      animation: betscraper-pulse 2s ease-in-out;
      pointer-events: none;
    `;
    indicator.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: betscraper-blink 1s infinite;"></div>
        Analyzing screen for betting opportunities...
      </div>
    `;

    // Add CSS animations
    if (!document.getElementById('betscraper-styles')) {
      const style = document.createElement('style');
      style.id = 'betscraper-styles';
      style.textContent = `
        @keyframes betscraper-pulse {
          0% { transform: translateX(100%); opacity: 0; }
          10% { transform: translateX(0); opacity: 1; }
          90% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes betscraper-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(indicator);

    // Remove indicator after animation
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 4000);
  }
}

 // Initialize when DOM is ready
 if (document.readyState === 'loading') {
   document.addEventListener('DOMContentLoaded', () => {
     new BetScraperScreenCapture();
   });
 } else {
   new BetScraperScreenCapture();
 } 