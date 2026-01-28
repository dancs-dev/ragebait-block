const DEFAULT_SETTINGS = {
  enabledSites: {
    "bbc.co.uk": false,
    "bbc.com": false,
    "reddit.com": true,
    "youtube.com": true,
  },
  debugMode: false,
  thresholds: {
    NEGATIVE: 0.95,
    POSITIVE: 1.0,
  },
};

let engineCreated = false;

// Initialize settings and check permissions on install.
browser.runtime.onInstalled.addListener(async () => {
  const data = await browser.storage.local.get("settings");
  const settings = {
    enabledSites: {
      ...DEFAULT_SETTINGS.enabledSites,
      ...data.settings?.enabledSites,
    },
    debugMode: data.settings?.debugMode ?? DEFAULT_SETTINGS.debugMode,
    thresholds: {
      ...DEFAULT_SETTINGS.thresholds,
      ...data.settings?.thresholds,
    },
  };
  await browser.storage.local.set({ settings });

  const hasPermission = await browser.permissions.contains({
    permissions: ["trialML"],
  });
  if (!hasPermission) {
    // Open setup page to request trialML permission.
    browser.tabs.create({ url: browser.runtime.getURL("/pages/setup.html") });
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message.type !== "runML") {
    return;
  }

  return (async () => {
    try {
      if (!engineCreated) {
        await browser.trial.ml.createEngine({
          modelHub: "huggingface",
          taskName: "text-classification",
          // modelId: "Xenova/toxic-bert",
          modelId: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
        });
        engineCreated = true;
      }

      const result = await browser.trial.ml.runEngine({
        args: [message.text],
        options: { top_k: null },
      });
      return result;
    } catch (err) {
      console.error("ML Engine error:", err);
      return { error: err.message };
    }
  })();
});
