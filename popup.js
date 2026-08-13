const SECTIONS = ["idle", "loading", "result", "no-key", "error"];

function showSection(id) {
  for (const sectionId of SECTIONS) {
    document.getElementById(sectionId).classList.toggle("hidden", sectionId !== id);
  }
}

function render(state) {
  if (!state || !state.status) {
    showSection("idle");
    return;
  }

  if (state.status === "loading") {
    document.getElementById("loading-tone").textContent = (state.tone || "").toLowerCase();
    showSection("loading");
    return;
  }

  if (state.status === "success") {
    document.getElementById("result-text").textContent = state.text || "";
    document.getElementById("result-provider").textContent = state.providerLabel || "";
    document.getElementById("result-model").textContent = state.model || "";
    document.getElementById("result-tone").textContent = (state.tone || "").toLowerCase();
    showSection("result");
    return;
  }

  if (state.status === "no-key") {
    document.getElementById("no-key-provider").textContent = state.providerLabel || "the selected provider";
    showSection("no-key");
    return;
  }

  if (state.status === "error") {
    document.getElementById("error-message").textContent = state.message || "Something went wrong.";
    showSection("error");
    return;
  }

  showSection("idle");
}

async function copyResultText() {
  const text = document.getElementById("result-text").textContent;
  const btn = document.getElementById("copy-btn");

  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback for environments where the Clipboard API is unavailable.
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
  }

  const original = btn.textContent;
  btn.textContent = "Copied!";
  setTimeout(() => (btn.textContent = original), 1500);
}

document.addEventListener("DOMContentLoaded", async () => {
  const { popupState } = await browser.storage.local.get("popupState");
  render(popupState);

  document.getElementById("copy-btn").addEventListener("click", copyResultText);
  document.getElementById("close-btn").addEventListener("click", () => window.close());
  document.getElementById("settings-link").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });
});

// Keep the popup live if it's already open when a new result arrives
// (e.g. it was opened via action.openPopup() right as the request started).
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.popupState) {
    render(changes.popupState.newValue);
  }
});
