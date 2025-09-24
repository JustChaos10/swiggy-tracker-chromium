# Swiggy Order Tracker (Chromium)

A definitive, robust extension to track and analyze Swiggy orders via DOM scraping and API interception.

## Features

- **Real-time Order Tracking**: Automatically captures orders as you browse Swiggy
- **Analytics Dashboard**: Visual charts showing spending patterns, restaurant preferences, and order trends
- **Data Export**: Export your order history to CSV
- **Privacy-First**: All data is stored locally in your browser
- **No External Dependencies**: Works offline with bundled Chart.js

## Installation

1. Download or clone this repository
2. Open Chrome/Edge and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your browser toolbar

## Usage

1. Navigate to [Swiggy](https://www.swiggy.com) and log in to your account
2. Go to "My Account" → "Orders" to view your order history
3. The extension will automatically start tracking and display analytics
4. Use the "FULL SYNC" button to manually sync all orders
5. Export your data using the "EXPORT CSV" button

## Recent Fixes

### Chart.js CSP Issue (Fixed)
- **Problem**: Charts were failing to load due to Content Security Policy violations when loading Chart.js from external CDNs
- **Solution**: Bundled Chart.js directly with the extension and created a fallback implementation
- **Result**: Charts now load reliably without external dependencies

### Error Handling Improvements
- Added robust error handling for chart generation
- Implemented fallback chart rendering when Chart.js fails to load
- Better null reference protection in chart UI components

## Configuration

### Groq API (Optional)
For enhanced chart generation, you can configure the Groq API:

1. Get a free API key from [Groq Console](https://console.groq.com/)
2. Open `background.js` and replace the `API_KEY` value
3. The extension will use local chart generation as fallback if API is unavailable

## Troubleshooting

### Charts Not Loading
- Ensure the extension is properly installed and enabled
- Refresh the Swiggy page and try again
- Check the browser console for any error messages
- The extension includes fallback chart rendering if Chart.js fails

### No Data Showing
- Make sure you're logged into Swiggy
- Navigate to your order history page
- Use the "FULL SYNC" button to manually sync orders
- Check that you have orders in your Swiggy account

### Extension Not Working
- Disable and re-enable the extension
- Clear browser cache and cookies for Swiggy
- Ensure you're using a supported browser (Chrome, Edge, or other Chromium-based browsers)

## Privacy

- All data is stored locally in your browser
- No data is sent to external servers (except optional Groq API calls)
- You can clear all data using the "CLEAR DATA" button

## Development

The extension consists of several key files:

- `content.js`: Main content script that scrapes order data
- `charts-ui.js`: Chart rendering and UI components
- `chart-generator.js`: Chart data generation logic
- `storage.js`: Local data storage management
- `background.js`: Service worker for API proxying
- `chart.js`: Bundled Chart.js library

## License

This project is licensed under the MIT License - see the LICENSE file for details.