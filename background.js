// --- Provider configuration -------------------------------------------

const PROVIDERS = {
  openai: {
    label: "OpenAI (ChatGPT)",
    defaultModel: "gpt-4o-mini",
    call: callOpenAICompatible.bind(null, "https://api.openai.com/v1/chat/completions")
  },
  groq: {
    label: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    call: callOpenAICompatible.bind(null, "https://api.groq.com/openai/v1/chat/completions")
  },
  gemini: {
    label: "Google AI Studio (Gemini)",
    defaultModel: "gemini-3.6-flash",
    call: callGemini
  }
};

const BASE_INSTRUCTION =
  "You rephrase text the user gives you, keeping the original meaning and language. Reply with ONLY the rephrased text — no quotes, labels, or extra commentary.";

const TONES = {
  standard: {
    label: "Standard",
    instruction: BASE_INSTRUCTION
  },
  professional: {
    label: "Professional",
    instruction:
      BASE_INSTRUCTION +
      " Use formal, polished, professional language suitable for business or workplace communication. Avoid slang and contractions."
  },
  casual: {
    label: "Casual",
    instruction:
      BASE_INSTRUCTION +
      " Use casual, relaxed, conversational language, as if texting a friend. Contractions and a friendly tone are welcome."
  }
};

browser.contextMenus.create({
  id: "rephrase-parent",
  title: "Rephrase selection",
  contexts: ["editable", "selection"]
});

for (const [toneId, tone] of Object.entries(TONES)) {
  browser.contextMenus.create({
    id: `rephrase-${toneId}`,
    parentId: "rephrase-parent",
    title: tone.label,
    contexts: ["editable", "selection"]
  });
}

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const menuId = String(info.menuItemId);
  if (!menuId.startsWith("rephrase-") || menuId === "rephrase-parent") return;

  const toneId = menuId.replace("rephrase-", "");
  const tone = TONES[toneId] || TONES.standard;

  // Open the popup immediately, in the "loading" state, while this is still
  // a direct result of the click. Doing this before any await keeps it tied
  // to the user gesture, and means the popup is already open and waiting by
  // the time the API call finishes (no popping up mid-request).
  browser.action.openPopup().catch(() => {
    // Older Firefox versions may reject this outside very specific gesture
    // timing. Not fatal — the result is still saved and shows up the moment
    // the user clicks the toolbar icon themselves.
  });

  await setPopupState({ status: "loading", tone: tone.label });

  const settings = await browser.storage.local.get([
    "provider",
    "openaiApiKey",
    "geminiApiKey",
    "groqApiKey"
  ]);

  const providerId = settings.provider || "openai";
  const provider = PROVIDERS[providerId];

  const keyMap = {
    openai: settings.openaiApiKey,
    gemini: settings.geminiApiKey,
    groq: settings.groqApiKey
  };
  const apiKey = keyMap[providerId];

  if (!apiKey) {
    await setPopupState({ status: "no-key", providerLabel: provider.label });
    return;
  }

  const [{ result: selectedText }] = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: captureSelection
  });

  if (!selectedText || !selectedText.trim()) {
    await setPopupState({ status: "error", message: "No text was selected." });
    return;
  }

  let rephrased;
  try {
    rephrased = await provider.call(selectedText, apiKey, provider.defaultModel, tone.instruction);
  } catch (err) {
    await setPopupState({
      status: "error",
      message: String((err && err.message) || err)
    });
    return;
  }

  await setPopupState({
    status: "success",
    text: rephrased,
    providerLabel: provider.label,
    model: provider.defaultModel,
    tone: tone.label
  });
});

function setPopupState(state) {
  return browser.storage.local.set({ popupState: state });
}

// --- Provider call functions --------------------------------------------

// Works for both OpenAI and Groq, since Groq exposes an OpenAI-compatible
// /chat/completions endpoint.
async function callOpenAICompatible(url, text, apiKey, model, instruction) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: `Rephrase the following text:\n\n${text}` }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`API error (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : null;

  if (!content) throw new Error("No response text came back from the API.");
  return content.trim();
}

async function callGemini(text, apiKey, model, instruction) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instruction }] },
      contents: [
        { role: "user", parts: [{ text: `Rephrase the following text:\n\n${text}` }] }
      ]
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`API error (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const content =
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0]
      ? data.candidates[0].content.parts[0].text
      : null;

  if (!content) throw new Error("No response text came back from Gemini.");
  return content.trim();
}

// --- Runs INSIDE the web page, not the extension -------------------------
// Read-only: just reports what's selected, never modifies the page.

function captureSelection() {
  const active = document.activeElement;

  // Plain <input>/<textarea> fields only expose their selection through
  // selectionStart/selectionEnd on the focused element.
  if (
    active &&
    (active.tagName === "TEXTAREA" ||
      (active.tagName === "INPUT" && /^(text|search|url|tel|email)$/i.test(active.type)))
  ) {
    try {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      if (start !== null && end !== null && start !== end) {
        return active.value.substring(start, end);
      }
    } catch (e) {
      // fall through to the generic selection check below
    }
  }

  // Everything else — contenteditable regions, custom editors, or plain
  // page text — via the real browser selection, regardless of which
  // element currently has focus.
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
    const text = sel.toString();
    if (text && text.trim()) return text;
  }

  return null;
}
