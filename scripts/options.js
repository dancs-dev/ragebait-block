async function loadSettings() {
  const data = await browser.storage.local.get("settings");
  return data.settings || {};
}

async function saveSettings(settings) {
  await browser.storage.local.set({ settings });
  showStatus("Settings saved");
}

function showStatus(message) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = message;
  statusEl.className = "status success";
  setTimeout(() => {
    statusEl.className = "status";
  }, 2000);
}

async function init() {
  const settings = await loadSettings();

  // Site toggles.
  const siteTogglesEl = document.getElementById("site-toggles");
  for (const [site, enabled] of Object.entries(settings.enabledSites)) {
    const div = document.createElement("div");
    div.className = "site-toggle";
    div.innerHTML = `
      <span class="site-name">${site}</span>
      <label class="toggle">
        <input type="checkbox" data-site="${site}" ${enabled ? "checked" : ""}>
        <span class="slider"></span>
      </label>
    `;
    siteTogglesEl.appendChild(div);
  }

  // Debug mode toggle.
  document.getElementById("debug-mode").checked = settings.debugMode || false;

  // Threshold controls.
  const thresholdEl = document.getElementById("threshold-controls");
  for (const [label, value] of Object.entries(settings.thresholds)) {
    // Skip POSITIVE as we always want to keep positive content.
    if (label === "POSITIVE") continue;

    const div = document.createElement("div");
    div.className = "threshold-row";
    div.innerHTML = `
      <label>${label}</label>
      <input type="range" data-threshold="${label}" min="0.0" max="1.0" step="0.01" value="${value}">
      <span class="value">${value.toFixed(2)}</span>
    `;
    thresholdEl.appendChild(div);
  }

  // Event listeners.
  document.querySelectorAll("[data-site]").forEach((input) => {
    input.addEventListener("change", async () => {
      const settings = await loadSettings();
      settings.enabledSites[input.dataset.site] = input.checked;
      await saveSettings(settings);
    });
  });

  document
    .getElementById("debug-mode")
    .addEventListener("change", async (e) => {
      const settings = await loadSettings();
      settings.debugMode = e.target.checked;
      await saveSettings(settings);
    });

  document.querySelectorAll("[data-threshold]").forEach((input) => {
    const valueSpan = input.nextElementSibling;

    input.addEventListener("input", () => {
      valueSpan.textContent = parseFloat(input.value).toFixed(2);
    });

    input.addEventListener("change", async () => {
      const settings = await loadSettings();
      settings.thresholds[input.dataset.threshold] = parseFloat(input.value);
      await saveSettings(settings);
    });
  });
}

init();
