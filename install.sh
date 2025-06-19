#!/bin/bash

# BetScraper Chrome Extension Installation Script

echo "🎲 BetScraper Chrome Extension Setup"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found. Please run this script from the extension directory."
    exit 1
fi

echo "✅ Extension files found"

# Create placeholder icons if they don't exist
echo "🎨 Setting up icons..."
mkdir -p icons

# Check if icon files exist
ICON_MISSING=false
for size in 16 32 48 128; do
    if [ ! -f "icons/icon${size}.png" ]; then
        ICON_MISSING=true
        break
    fi
done

if [ "$ICON_MISSING" = true ]; then
    echo "⚠️  Icon files missing. You'll need to add the following files to the icons/ directory:"
    echo "   - icon16.png (16x16 pixels)"
    echo "   - icon32.png (32x32 pixels)"
    echo "   - icon48.png (48x48 pixels)"
    echo "   - icon128.png (128x128 pixels)"
    echo ""
    echo "💡 For now, you can use simple colored squares as placeholders."
    echo ""
else
    echo "✅ All icon files found"
fi

# Check Chrome installation
echo "🔍 Checking Chrome installation..."
if command -v google-chrome >/dev/null 2>&1; then
    echo "✅ Google Chrome found"
elif command -v chromium >/dev/null 2>&1; then
    echo "✅ Chromium found"
elif command -v google-chrome-stable >/dev/null 2>&1; then
    echo "✅ Google Chrome (stable) found"
else
    echo "⚠️  Chrome/Chromium not found in PATH, but it might still be installed"
fi

echo ""
echo "📋 Installation Instructions:"
echo "=============================="
echo ""
echo "1. Open Chrome and navigate to: chrome://extensions/"
echo ""
echo "2. Enable 'Developer mode' (toggle in top-right corner)"
echo ""
echo "3. Click 'Load unpacked' button"
echo ""
echo "4. Select this directory: $(pwd)"
echo ""
echo "5. The BetScraper extension should now appear in your extensions list"
echo ""
echo "⚙️  Initial Setup:"
echo "=================="
echo ""
echo "1. Click the BetScraper icon in your toolbar"
echo ""
echo "2. Click 'Settings' to open the options page"
echo ""
echo "3. Add your OpenAI API key in the 'API Configuration' section"
echo "   Get your key from: https://platform.openai.com/api-keys"
echo ""
echo "4. Configure your preferences and save settings"
echo ""
echo "🎯 Usage:"
echo "========="
echo ""
echo "- Browse any webpage with betting-relevant content"
echo "- The extension will automatically analyze content"
echo "- Click the extension icon to see betting recommendations"
echo "- Use 'Analyze This Page' for manual analysis"
echo "- Use 'Capture & Analyze' for visual content analysis"
echo ""
echo "📚 Need Help?"
echo "============="
echo ""
echo "- Check the README.md file for detailed documentation"
echo "- Visit: https://github.com/yourusername/betscraper"
echo "- Report issues: https://github.com/yourusername/betscraper/issues"
echo ""
echo "⚠️  Important Disclaimer:"
echo "========================"
echo ""
echo "This extension is for informational purposes only."
echo "Please bet responsibly and ensure prediction market"
echo "betting is legal in your jurisdiction."
echo ""
echo "🎉 Setup complete! Happy betting!" 