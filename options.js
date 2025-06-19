// Options page JavaScript for BetScraper

class OptionsManager {
  constructor() {
    this.defaultSettings = {
      openaiApiKey: '',
      llmModel: 'gpt-4o-mini',
      enabled: true,
      autoAnalyze: true,
      analysisDelay: 5,
      maxRecommendations: 5,
      includePolymarket: true,
      includeKalshi: true,
      categoryPolitics: true,
      categoryCrypto: true,
      categorySports: true,
      categoryFinance: true,
      categoryTech: true,
      categoryEntertainment: false,
      saveHistory: false,
      anonymizeData: true
    };
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.setupRangeInputs();
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(this.defaultSettings);
      this.populateForm(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showStatus('Failed to load settings', 'error');
    }
  }

  populateForm(settings) {
    // Populate all form fields with saved settings
    for (const [key, value] of Object.entries(settings)) {
      const element = document.getElementById(key);
      if (!element) continue;

      if (element.type === 'checkbox') {
        element.checked = value;
      } else if (element.type === 'range') {
        element.value = value;
        this.updateRangeDisplay(element);
      } else {
        element.value = value;
      }
    }
  }

  setupEventListeners() {
    // Form submission
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    // API key toggle
    document.getElementById('toggleApiKey').addEventListener('click', () => {
      this.toggleApiKeyVisibility();
    });

    // Clear data button
    document.getElementById('clearData').addEventListener('click', () => {
      this.clearAllData();
    });

    // Reset settings button
    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetToDefaults();
    });

    // Range input changes
    const rangeInputs = document.querySelectorAll('.form-range');
    rangeInputs.forEach(input => {
      input.addEventListener('input', () => {
        this.updateRangeDisplay(input);
      });
    });
  }

  setupRangeInputs() {
    // Initialize range displays
    const rangeInputs = document.querySelectorAll('.form-range');
    rangeInputs.forEach(input => {
      this.updateRangeDisplay(input);
    });
  }

  updateRangeDisplay(rangeInput) {
    const value = rangeInput.value;
    const displayId = rangeInput.id + 'Value';
    const displayElement = document.getElementById(displayId);
    
    if (displayElement) {
      displayElement.textContent = value;
    }
  }

  toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('openaiApiKey');
    const toggleButton = document.getElementById('toggleApiKey');
    
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `;
    } else {
      apiKeyInput.type = 'password';
      toggleButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }
  }

  async saveSettings() {
    try {
      const formData = new FormData(document.getElementById('settingsForm'));
      const settings = {};

      // Get all form values
      for (const [key, defaultValue] of Object.entries(this.defaultSettings)) {
        const element = document.getElementById(key);
        if (!element) continue;

        if (element.type === 'checkbox') {
          settings[key] = element.checked;
        } else if (element.type === 'range') {
          settings[key] = parseInt(element.value);
        } else {
          settings[key] = element.value;
        }
      }

      // Validate API key
      if (settings.openaiApiKey && !this.isValidApiKey(settings.openaiApiKey)) {
        this.showStatus('Invalid OpenAI API key format', 'error');
        return;
      }

      // Save to Chrome storage
      await chrome.storage.sync.set(settings);

      // Notify background script of settings update
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: settings
      });

      this.showStatus('Settings saved successfully!', 'success');

    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  isValidApiKey(apiKey) {
    // Very permissive validation for OpenAI API key format
    // Just check that it starts with 'sk-' and has reasonable length
    return apiKey.startsWith('sk-') && apiKey.length >= 20;
  }

  async clearAllData() {
    if (!confirm('Are you sure you want to clear all data? This will remove all recommendations, history, and cache. This action cannot be undone.')) {
      return;
    }

    try {
      // Clear local storage
      await chrome.storage.local.clear();
      
      // Keep sync storage (settings) but clear everything else
      const settings = await chrome.storage.sync.get();
      await chrome.storage.sync.clear();
      await chrome.storage.sync.set(settings);

      this.showStatus('All data cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to clear data:', error);
      this.showStatus('Failed to clear data', 'error');
    }
  }

  async resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    try {
      // Clear current settings
      await chrome.storage.sync.clear();
      
      // Set defaults
      await chrome.storage.sync.set(this.defaultSettings);
      
      // Reload the form
      this.populateForm(this.defaultSettings);
      
      // Notify background script
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: this.defaultSettings
      });

      this.showStatus('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showStatus('Failed to reset settings', 'error');
    }
  }

  showStatus(message, type = 'success') {
    const statusElement = document.getElementById('statusMessage');
    const statusText = statusElement.querySelector('.status-text');
    
    statusText.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }

  // Export settings for backup
  async exportSettings() {
    try {
      const settings = await chrome.storage.sync.get();
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `betscraper-settings-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      this.showStatus('Settings exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export settings:', error);
      this.showStatus('Failed to export settings', 'error');
    }
  }

  // Import settings from backup
  async importSettings(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const settings = JSON.parse(text);
      
      // Validate imported settings
      const validSettings = {};
      for (const [key, defaultValue] of Object.entries(this.defaultSettings)) {
        if (key in settings && typeof settings[key] === typeof defaultValue) {
          validSettings[key] = settings[key];
        } else {
          validSettings[key] = defaultValue;
        }
      }

      await chrome.storage.sync.set(validSettings);
      this.populateForm(validSettings);
      
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: validSettings
      });

      this.showStatus('Settings imported successfully', 'success');
    } catch (error) {
      console.error('Failed to import settings:', error);
      this.showStatus('Invalid settings file', 'error');
    }
  }
}

// Initialize options manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 's':
        e.preventDefault();
        document.getElementById('settingsForm').dispatchEvent(new Event('submit'));
        break;
      case 'r':
        e.preventDefault();
        document.getElementById('resetSettings').click();
        break;
    }
  }
}); 