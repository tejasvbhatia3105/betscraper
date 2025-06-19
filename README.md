# BetScraper - Smart Betting Assistant

**BetScraper** is an AI-powered Chrome extension that analyzes your screen content and suggests relevant betting opportunities on Polymarket and Kalshi prediction markets.

## 🚀 Features

- **🤖 AI-Powered Analysis**: Uses OpenAI's GPT models to understand webpage content
- **📈 Real-time Market Matching**: Finds relevant betting opportunities from Polymarket and Kalshi
- **🖥️ Screen Content Monitoring**: Analyzes text and images on your current tab
- **⚡ Auto-Analysis**: Automatically analyzes content as you browse
- **🎯 Smart Relevance Scoring**: Ranks betting opportunities by relevance to content
- **🔒 Privacy-Focused**: All analysis happens locally or via your own API keys
- **⚙️ Highly Configurable**: Extensive settings for customization

## 📋 Requirements

- Chrome browser (or Chromium-based browsers)
- OpenAI API key for content analysis
- Internet connection for market data

## 🛠️ Installation

### From Source (Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/betscraper.git
   cd betscraper
   ```

2. **Add Extension Icons**:
   - Add `icon16.png`, `icon32.png`, `icon48.png`, and `icon128.png` to the `icons/` directory
   - Or use placeholder images for testing

3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the extension directory
   - The BetScraper extension should now appear in your extensions list

4. **Configure API Key**:
   - Click the BetScraper icon in the toolbar
   - Click "Settings" to open the options page
   - Enter your OpenAI API key in the "API Configuration" section
   - Save settings

## 🔧 Setup

### Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and paste it in the extension settings
5. **Important**: Keep your API key secure and never share it

### First Time Setup

1. Install the extension following the instructions above
2. Open the extension popup and click "Settings"
3. Configure your preferences:
   - **API Configuration**: Add your OpenAI API key
   - **Analysis Settings**: Choose auto-analysis preferences
   - **Platform Settings**: Select which markets to include
   - **Privacy Settings**: Configure data handling preferences

## 🎯 How It Works

### Content Analysis Flow

1. **Content Extraction**: The extension monitors your active tab for text and images
2. **AI Analysis**: Content is sent to OpenAI's API for topic and event extraction
3. **Market Matching**: Relevant betting markets are found on Polymarket and Kalshi
4. **Relevance Scoring**: Markets are ranked by relevance to your content
5. **Display**: Top recommendations are shown in the extension popup

### Supported Content Types

- **Text Content**: Articles, blog posts, news, social media
- **Images**: Screenshots, infographics, memes (with OCR)
- **Mixed Content**: Pages with both text and visual elements

### Market Categories

- **Politics**: Elections, policy outcomes, political events
- **Cryptocurrency**: Price predictions, adoption metrics
- **Sports**: Game outcomes, season predictions, player performance
- **Finance**: Market movements, economic indicators
- **Technology**: Product launches, company performance
- **Entertainment**: Award shows, movie box office, celebrity events

## 🎮 Usage

### Basic Usage

1. **Automatic Analysis**: Browse any webpage - the extension automatically analyzes content
2. **Manual Analysis**: Click the extension icon and press "Analyze This Page"
3. **Screen Capture**: Use "Capture & Analyze" for visual content analysis
4. **View Recommendations**: Betting opportunities appear in the popup
5. **Place Bets**: Click "View Market" to go directly to the betting platform

### Manual Analysis

- Click the BetScraper icon in your toolbar
- Click "Analyze This Page" to manually trigger analysis
- Use "Capture & Analyze" to include visual content

### Managing Recommendations

- **Save Opportunities**: Click "Save" to bookmark interesting markets
- **View Details**: Click "View Market" to open the betting platform
- **Refresh**: Click the refresh icon to update market data

## ⚙️ Configuration

### Analysis Settings

- **Enable/Disable**: Master switch for the extension
- **Auto-Analysis**: Automatically analyze content as you browse
- **Analysis Delay**: Time to wait before analyzing (to avoid excessive API calls)
- **Max Recommendations**: Number of betting opportunities to show

### Platform Settings

- **Include Polymarket**: Show/hide Polymarket opportunities
- **Include Kalshi**: Show/hide Kalshi opportunities  
- **Category Filters**: Choose which types of markets to show

### Privacy & Data

- **Save History**: Keep local history of analyzed pages
- **Anonymize Data**: Remove personal info before analysis
- **Clear Data**: Remove all stored recommendations and cache

## 🛡️ Privacy & Security

- **Local Processing**: Most data processing happens locally
- **API Security**: Your OpenAI API key is stored securely in Chrome's sync storage
- **No Data Collection**: We don't collect or store your browsing data
- **Anonymization**: Personal information is removed before analysis
- **Secure Communications**: All API calls use HTTPS

## 🐛 Troubleshooting

### Common Issues

**Extension not working**:
- Check that you have a valid OpenAI API key
- Ensure the extension is enabled in Chrome settings
- Try refreshing the page and analyzing again

**No recommendations appearing**:
- Check that your content is related to supported categories
- Verify your API key is working
- Try manual analysis instead of auto-analysis

**Analysis taking too long**:
- Reduce the analysis delay in settings
- Choose a faster LLM model (GPT-3.5 Turbo)
- Check your internet connection

**API errors**:
- Verify your OpenAI API key is valid and has credits
- Check API usage limits on your OpenAI account
- Try switching to a different model

### Error Messages

- **"Analysis failed"**: Usually an API issue - check your key and credits
- **"No API key"**: Add your OpenAI API key in settings
- **"Invalid API key format"**: Check that your key starts with "sk-"
- **"Capture failed"**: Try refreshing the page and capturing again

## 🤝 Contributing

We welcome contributions! Here's how to help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

### Development Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/betscraper.git
cd betscraper

# Make changes to the code
# Load the extension in Chrome (chrome://extensions/, Developer mode, Load unpacked)
# Test your changes
```

## 📝 API Integration

### Polymarket API

The extension currently uses mock data for Polymarket. To implement real API integration:

1. Get API access from Polymarket
2. Update the `fetchPolymarketData()` function in `background.js`
3. Add proper error handling and rate limiting

### Kalshi API

Similar to Polymarket, update the `fetchKalshiData()` function with real API calls.

## 🔮 Future Features

- **More Platforms**: Support for additional prediction markets
- **Better Vision Analysis**: Enhanced image and video analysis
- **Alerts**: Notifications for high-value opportunities
- **Historical Tracking**: Track performance of recommendations
- **Social Features**: Share interesting markets with friends
- **Mobile Support**: Extension for mobile browsers

## ⚠️ Disclaimer

**Important**: This extension is for informational purposes only. Please:

- **Bet Responsibly**: Only bet what you can afford to lose
- **Do Your Research**: Always verify market information independently
- **Follow Laws**: Ensure prediction market betting is legal in your jurisdiction
- **No Guarantees**: Past performance doesn't guarantee future results

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the GPT models
- **Polymarket** and **Kalshi** for prediction market data
- **Chrome Extensions Team** for the excellent developer platform
- **Contributors** who help improve this project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/betscraper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/betscraper/discussions)
- **Email**: support@betscraper.com

---

**Happy Betting! 🎲** 