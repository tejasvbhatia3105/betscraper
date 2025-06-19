// Content script for BetScraper - monitors page content and extracts relevant information

class ContentExtractor {
  constructor() {
    this.isEnabled = true;
    this.lastContent = '';
    this.contentThreshold = 100; // Minimum characters to trigger analysis
    this.debounceTimer = null;
    this.init();
  }

  async init() {
    // Check if extension is enabled
    const settings = await chrome.storage.sync.get(['enabled', 'autoAnalyze']);
    this.isEnabled = settings.enabled !== false;
    
    if (this.isEnabled) {
      this.setupContentMonitoring();
      this.setupMessageListener();
    }
  }

  setupContentMonitoring() {
    // Monitor DOM changes
    const observer = new MutationObserver(() => {
      this.debounceContentAnalysis();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Initial content analysis
    this.debounceContentAnalysis();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'extractContent':
          this.extractPageContent().then(sendResponse);
          return true; // Will respond asynchronously
        
        case 'captureScreen':
          this.captureScreenContent().then(sendResponse);
          return true;
        
        case 'getSelectedText':
          sendResponse({ selectedText: window.getSelection().toString() });
          break;
      }
    });
  }

  debounceContentAnalysis() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.analyzeCurrentContent();
    }, 2000); // Wait 2 seconds after content stops changing
  }

  async analyzeCurrentContent() {
    try {
      const content = await this.extractPageContent();
      
      // Only analyze if content is substantial and different from last analysis
      if (content.text.length > this.contentThreshold && content.text !== this.lastContent) {
        this.lastContent = content.text;
        
        // Send to background script for LLM analysis
        chrome.runtime.sendMessage({
          action: 'analyzeContent',
          data: content
        });
      }
    } catch (error) {
      console.error('BetScraper: Error analyzing content:', error);
    }
  }

  async extractPageContent() {
    const content = {
      url: window.location.href,
      title: document.title,
      text: this.extractMainText(),
      metadata: this.extractMetadata(),
      images: this.extractImages(),
      timestamp: Date.now()
    };

    return content;
  }

  extractMainText() {
    // Remove scripts, styles, and other non-content elements
    const elementsToRemove = ['script', 'style', 'nav', 'header', 'footer', 'aside'];
    const clone = document.cloneNode(true);
    
    elementsToRemove.forEach(tag => {
      const elements = clone.getElementsByTagName(tag);
      for (let i = elements.length - 1; i >= 0; i--) {
        elements[i].remove();
      }
    });

    // Extract text from main content areas
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-body',
      'body'
    ];

    let mainText = '';
    for (const selector of contentSelectors) {
      const element = clone.querySelector(selector);
      if (element) {
        mainText = element.innerText || element.textContent || '';
        break;
      }
    }

    // Clean up the text
    return mainText
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 10000); // Limit to 10k characters
  }

  extractMetadata() {
    const metadata = {};
    
    // Meta tags
    const metaTags = ['description', 'keywords', 'author', 'category'];
    metaTags.forEach(tag => {
      const element = document.querySelector(`meta[name="${tag}"]`);
      if (element) {
        metadata[tag] = element.getAttribute('content');
      }
    });

    // Open Graph tags
    const ogTags = document.querySelectorAll('meta[property^="og:"]');
    ogTags.forEach(tag => {
      const property = tag.getAttribute('property').replace('og:', '');
      metadata[`og_${property}`] = tag.getAttribute('content');
    });

    // Headings
    const headings = [];
    document.querySelectorAll('h1, h2, h3').forEach(heading => {
      if (heading.textContent.trim()) {
        headings.push(heading.textContent.trim());
      }
    });
    metadata.headings = headings.slice(0, 10); // Limit to 10 headings

    return metadata;
  }

  extractImages() {
    const images = [];
    const imageElements = document.querySelectorAll('img');
    
    imageElements.forEach(img => {
      if (img.src && img.width > 100 && img.height > 100) { // Only larger images
        images.push({
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height
        });
      }
    });

    return images.slice(0, 5); // Limit to 5 images
  }

  async captureScreenContent() {
    try {
      // This will be handled by the background script since content scripts can't capture tabs
      const response = await chrome.runtime.sendMessage({
        action: 'captureTab'
      });
      
      return response;
    } catch (error) {
      console.error('BetScraper: Error capturing screen:', error);
      return null;
    }
  }

  // Utility method to highlight betting-related content
  highlightBettingContent(keywords) {
    if (!keywords || keywords.length === 0) return;

    const textNodes = this.getTextNodes(document.body);
    const keywordRegex = new RegExp(`(${keywords.join('|')})`, 'gi');

    textNodes.forEach(node => {
      if (keywordRegex.test(node.textContent)) {
        const parent = node.parentNode;
        const wrapper = document.createElement('span');
        wrapper.style.cssText = `
          background-color: rgba(255, 215, 0, 0.3);
          border-radius: 3px;
          padding: 1px 2px;
          margin: 0 1px;
        `;
        
        parent.insertBefore(wrapper, node);
        wrapper.appendChild(node);
      }
    });
  }

  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }

    return textNodes;
  }
}

// Initialize the content extractor
console.log('BetScraper: Content script loaded on', window.location.href);
const contentExtractor = new ContentExtractor();

// Export for popup/options access
window.betScraperContent = contentExtractor;

// Add a global indicator that the extension is active
window.betScraperLoaded = true; 