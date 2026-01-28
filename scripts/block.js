/*
 * Content script that hides posts classified as negative/ragebait using sentiment analysis via Firefox's ML API.
 */

// Site-specific configuration for finding post containers and title elements.
const SITE_CONFIG = {
  "reddit.com": {
    postContainer: "article",
    titleSelector: "faceplate-screen-reader-content",
  },
  "bbc.com": {
    postContainer: '[data-testid="promo"], .gel-promo, [class*="promo"]',
    titleSelector:
      '[data-testid="promo-headline"], .gel-promo__headline, [class*="promo-headline"], h3 a, h2 a',
  },
  "bbc.co.uk": {
    postContainer: '[data-testid="promo"], .gel-promo, [class*="promo"]',
    titleSelector:
      '[data-testid="promo-headline"], .gel-promo__headline, [class*="promo-headline"], h3 a, h2 a',
  },
  "youtube.com": {
    postContainer:
      "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer",
    titleSelector: "#video-title",
  },
};

const MIN_TEXT_LENGTH = 30;

function getCurrentSiteKey() {
  const hostname = window.location.hostname.replace("www.", "");
  for (const site of Object.keys(SITE_CONFIG)) {
    if (hostname.includes(site)) {
      return site;
    }
  }
  return null;
}

async function loadSettings() {
  const data = await browser.storage.local.get("settings");
  return data.settings || {};
}

async function shouldRunOnSite() {
  const settings = await loadSettings();
  const siteKey = getCurrentSiteKey();

  if (!siteKey) {
    return false;
  }
  return settings.enabledSites?.[siteKey] ?? false;
}

function getSiteConfig() {
  const siteKey = getCurrentSiteKey();
  return SITE_CONFIG[siteKey];
}

// Track processed posts to avoid multiple ML calls for the same post.
const processedPosts = new WeakSet();

/**
 * Recursively scans text nodes and hides parent posts if classified as negative.
 * @param {Node} node - the DOM node to process.
 * @param {Object} config - site configuration.
 * @param {Object} thresholds - toxicity thresholds.
 * @param {boolean} debugMode - whether to highlight with debug info instead of hide negative posts.
 */
async function processNode(node, config, thresholds, debugMode) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Skip editable elements.
    if (
      node.parentNode?.nodeName === "TEXTAREA" ||
      node.parentNode?.nodeName === "INPUT"
    ) {
      return;
    }

    const content = node.textContent;
    const postContainer = node.parentNode?.closest(config.postContainer);

    if (!postContainer || processedPosts.has(postContainer)) {
      return;
    }

    // Check if this text node is in a title element.
    const isValidTitle =
      !config.titleSelector || node.parentNode?.closest(config.titleSelector);

    if (isValidTitle && content.length > MIN_TEXT_LENGTH) {
      processedPosts.add(postContainer);
      try {
        const result = await browser.runtime.sendMessage({
          type: "runML",
          text: content,
        });

        if (result?.error) {
          console.error("Ragebait Block: ML error:", result.error);
          return;
        }

        // Check if any label exceeds its threshold - current model is only negative/positive but some models have
        // additional labels.
        const isToxic = result?.some((item) => {
          const threshold = thresholds[item.label];
          return threshold !== undefined && item.score > threshold;
        });

        if (isToxic) {
          if (debugMode) {
            postContainer.style.outline = "3px solid red";
            postContainer.style.position = "relative";
            const badge = document.createElement("div");
            badge.style.cssText =
              "position:absolute;top:0;right:0;background:red;color:white;" +
              "font:bold 11px monospace;padding:2px 6px;z-index:999999;" +
              "border-radius:0 0 0 4px;pointer-events:none;";
            badge.textContent = result
              .map((r) => `${r.label}: ${r.score.toFixed(3)}`)
              .join(" | ");
            postContainer.appendChild(badge);
          } else {
            postContainer.style.display = "none";
          }
        }
      } catch (err) {
        console.error("Ragebait Block: Failed to analyze post:", err);
      }
    }
  } else {
    // Recursively call function on child nodes.
    for (const child of node.childNodes) {
      processNode(child, config, thresholds, debugMode);
    }
  }
}

async function init() {
  if (!(await shouldRunOnSite())) {
    return;
  }

  const config = getSiteConfig();
  const settings = await loadSettings();
  const thresholds = settings.thresholds || {};
  const debugMode = settings.debugMode || false;

  // Process initial content.
  processNode(document.body, config, thresholds, debugMode);

  // Process dynamically loaded content e.g. infinite scroll.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        processNode(node, config, thresholds, debugMode);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

init();
