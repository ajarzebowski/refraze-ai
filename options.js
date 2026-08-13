const PROVIDER_IDS = ["openai", "gemini", "groq"];

function highlightActiveBlock(providerId) {
  for (const id of PROVIDER_IDS) {
    document.getElementById(`block-${id}`).classList.toggle("active", id === providerId);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const stored = await browser.storage.local.get([
    "provider",
    "openaiApiKey",
    "geminiApiKey",
    "groqApiKey"
  ]);

  const provider = stored.provider || "openai";
  document.getElementById(`radio-${provider}`).checked = true;
  highlightActiveBlock(provider);

  if (stored.openaiApiKey) document.getElementById("key-openai").value = stored.openaiApiKey;
  if (stored.geminiApiKey) document.getElementById("key-gemini").value = stored.geminiApiKey;
  if (stored.groqApiKey) document.getElementById("key-groq").value = stored.groqApiKey;

  for (const id of PROVIDER_IDS) {
    document.getElementById(`radio-${id}`).addEventListener("change", () => {
      highlightActiveBlock(id);
    });
  }
});

document.getElementById("save").addEventListener("click", async () => {
  const selected = document.querySelector('input[name="provider"]:checked');
  const provider = selected ? selected.value : "openai";

  const openaiApiKey = document.getElementById("key-openai").value.trim();
  const geminiApiKey = document.getElementById("key-gemini").value.trim();
  const groqApiKey = document.getElementById("key-groq").value.trim();

  const keyMap = { openai: openaiApiKey, gemini: geminiApiKey, groq: groqApiKey };
  const status = document.getElementById("status");

  if (!keyMap[provider]) {
    status.style.color = "#c0392b";
    status.textContent = "Please enter an API key for the selected provider before saving.";
    return;
  }

  await browser.storage.local.set({ provider, openaiApiKey, geminiApiKey, groqApiKey });

  status.style.color = "#10a37f";
  status.textContent = "Saved!";
  setTimeout(() => (status.textContent = ""), 2000);
});
