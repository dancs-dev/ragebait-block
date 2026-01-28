# Ragebait Block

A Firefox browser extension that uses on-device machine learning to detect and hide toxic, negative, or ragebait content on popular websites.

**Note:** This is an experimental hobby project built for fun and learning. It is not suitable for production and should be used accordingly.

## Disclaimers

### Experimental Firefox AI API

This extension relies on [Firefox's `trialML` permission, which is an experimental API](https://firefox-source-docs.mozilla.org/toolkit/components/ml/extensions.html). As a result:

- The API may be buggy, unstable, or behave unexpectedly.
- Firefox may change or remove the API.
- The extension may break in future Firefox releases.
- Not all Firefox installations support this feature.

### Model accuracy limitations

The machine learning model used for sentiment analysis is not perfect:

- **False positives:** some content may be incorrectly classified as negative and hidden.
- **False negatives:** not all negative content will be detected and hidden.

Use the debug mode (available in the extension's settings) to view what content would be being flagged as negative.

## How it works

Ragebait Block uses a three-part architecture:

1. **Content script** (`block.js`) runs on supported and enabled websites, scans the DOM for posts using site-specific CSS selectors, and extracts post titles/text content.
2. **Background script** (`background.js`) runs an ML engine (using Firefox's `trial.ml` API with a Hugging Face text classification model) and handles sentiment analysis requests from the content script.
3. **Message passing:** the content script sends title text to the background script via `browser.runtime.sendMessage()`, receive sentiment classification scores, and hide posts where the negative sentiment exceeds the user's configured threshold by setting `display: none`.

A `MutationObserver` monitors for dynamically loaded content, e.g. due to infinite scroll, and a `WeakSet` prevents re-processing posts that have already been analysed.

## Supported sites

Currently, the following sites are supported:

- Reddit (`reddit.com`)
- BBC News (`bbc.com`, `bbc.co.uk`)
- YouTube (`youtube.com`)

## Prerequisites

- [Firefox](https://www.firefox.com/) version that supports the experimental `trialML` permission (supported and enabled by default in recent vresions).

## Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/dancs-dev/ragebait-block.git
   cd ragebait-block
   ```
1. Install development dependencies (optional, only needed for code formatting):
   ```bash
   npm install
   ```
1. Open Firefox and navigate to `about:debugging`.
1. Click 'This Firefox' in the left sidebar.
1. Click 'Load Temporary Add-on'.
1. Navigate to the project directory and select the `manifest.json` file.
1. When prompted, grant the `trialML` permission on the setup page that opens automatically.

The extension is now loaded and will remain active until you restart Firefox. For permanent installation, you would need to package and sign the extension (not covered here).

## Configuration

To access the extension's settings page:

1. Click the extension's settings icon in the extensions tab of the toolbar and select 'Manage Extension'.
1. Open the 'Preferences' tab.

### Available settings

- **Enabled sites:** toggle the extension on or off for each supported site.
- **Toxicity threshold:** adjust the sensitivity of filtering per label (e.g., 'NEGATIVE'). Lower values (closer to 0.0) result in more aggressive filtering.
- **Debug mode:** Highlight flagged posts with a red outline and display prediction scores instead of hiding them. Useful for understanding what content is being filtered.

## Adding new sites

To add support for a new website, update these three files:

### 1. `scripts/block.js`

Add a new entry to the `SITE_CONFIG` object with the site's hostname as the key:

```javascript
const SITE_CONFIG = {
  "example.com": {
    postContainer: "article.post", // CSS selector for post containers.
    titleSelector: "h2.title a", // CSS selector for title elements.
  },
  // ...
};
```

### 2. `manifest.json`

Add a match pattern to the `content_scripts` section:

```json
"content_scripts": [
  {
    "matches": [
      "*://*.example.com/*",
      // ...
    ],
    "js": ["scripts/block.js"]
  }
]
```

### 3. `scripts/background.js`

Add a default enabled state in the `DEFAULT_SETTINGS` object:

```javascript
const DEFAULT_SETTINGS = {
  enabledSites: {
    "example.com": true, // or false to disable by default
    // ...
  },
  // ...
};
```

After making these changes, reload the extension in `about:debugging`.

## Development

### Project structure

```
ragebait-block/
├── icons/                 # Extension icons.
├── pages/
│   ├── options.html       # Settings page.
│   └── setup.html         # Initial permissions grant page.
├── scripts/
│   ├── background.js      # Background worker (runs ML engine).
│   ├── block.js           # Content script (DOM scanning and filtering).
│   ├── options.js         # Settings page logic.
│   └── setup.js           # Permission request handler.
├── manifest.json          # Extension metadata and permissions.
└── package.json           # Dev dependencies.
```

### Code formatting

This project uses [Prettier](https://prettier.io/) for code formatting:

```bash
npx prettier --write .
```

### No build step

All JavaScript is vanilla ES modules loaded directly by the browser.

### Changing the ML model

The ML model is configured in `scripts/background.js` in the `browser.trial.ml.createEngine()` call:

```javascript
await browser.trial.ml.createEngine({
  modelHub: "huggingface",
  taskName: "text-classification",
  modelId: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
});
```

Replace `modelId` with any compatible Hugging Face text classification model. Note that model changes may require adjusting threshold values and label names in the settings.

## AI disclosure

The concept, architecture, and overall approach behind this project are my own. AI was used as a development aid for tasks such as refactoring, styling, and adding support for some of the sites the extension covers.
