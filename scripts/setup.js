const button = document.getElementById("grant");
const status = document.getElementById("status");

button.addEventListener("click", async () => {
  try {
    const granted = await browser.permissions.request({
      permissions: ["trialML"],
    });
    if (granted) {
      status.textContent = "Permission granted! You can close this tab.";
      status.className = "success";
      button.disabled = true;
      button.textContent = "Done";
    } else {
      status.textContent =
        "Permission denied. The extension will not work without ML access.";
      status.className = "error";
    }
  } catch (err) {
    status.textContent = "Error: " + err.message;
    status.className = "error";
  }
});

browser.permissions
  .contains({ permissions: ["trialML"] })
  .then((hasPermission) => {
    if (hasPermission) {
      status.textContent =
        "Permission already granted! You can close this tab.";
      status.className = "success";
      button.disabled = true;
      button.textContent = "Done";
    }
  });
