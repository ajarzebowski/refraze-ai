# Rephrase with ChatGPT

A Firefox extension that rephrases selected text using an LLM of your choice — OpenAI (ChatGPT), Google AI Studio (Gemini), or Groq. Right-click any selected text, pick a tone, and get the rephrased result in a popup you can copy with one click.

## Features

- **Right-click to rephrase** — works on text selected in `<input>`/`<textarea>` fields, contenteditable regions, custom editors, and plain page text.
- **Three tones** — Standard, Professional, and Casual, chosen from a submenu at click time.
- **Three providers** — bring your own API key for OpenAI, Google AI Studio (Gemini, free tier available), or Groq (free tier available).
- **Non-destructive** — the page is never modified. Results appear in a popup, not injected back into the page.
- **One-click copy** — copy the rephrased text straight to your clipboard.
- **Shows what was used** — the popup displays which provider and model produced the result.

## Installation

### Temporary install (for testing/development)

1. Clone or download this repository.
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**.
4. Select the `manifest.json` file inside the project folder.

The extension will stay loaded until you restart Firefox. You'll need to reload it manually (via the **Reload** button in `about:debugging`) after making code changes.

### Permanent install

Firefox requires extensions to be signed to install permanently in release builds. To distribute your own signed build:

1. Zip the contents of this folder (not the folder itself).
2. Submit the zip at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) for signing.
3. Install the signed `.xpi` that Mozilla returns.

Alternatively, use Firefox Developer Edition or Nightly with signature enforcement disabled (`xpinstall.signatures.required` set to `false` in `about:config`) for local, permanent use.

## Setup

You need an API key from at least one provider.

| Provider | Cost | Get a key |
|---|---|---|
| OpenAI (ChatGPT) | Paid | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Google AI Studio (Gemini) | Free tier available | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Groq | Free tier available | [console.groq.com/keys](https://console.groq.com/keys) |

To configure:

1. Click the extension's toolbar icon.
2. Click **Settings** at the bottom of the popup.
3. Choose a provider and paste its API key.
4. Click **Save**.

Only the key for your selected provider is required — the others can stay empty.

## Usage

1. Select text in any text field, editable region, or on the page.
2. Right-click the selection.
3. Choose **Rephrase selection** → **Standard**, **Professional**, or **Casual**.
4. A popup opens next to the toolbar showing the rephrased text once it's ready.
5. Click **Copy** to copy it, or **Close** to dismiss.

If the popup doesn't open automatically (can happen on older Firefox versions), click the toolbar icon manually — the result is saved and will be shown there.

## Project structure

```
rephrase-extension/
├── manifest.json     Extension configuration and permissions
├── background.js     Context menu, provider API calls, popup state
├── popup.html         Popup UI shown next to the toolbar icon
├── popup.js           Popup logic: render state, copy/close, open settings
├── options.html        Settings page: provider selection and API keys
├── options.js           Settings page logic
└── icons/               Extension icon(s)
```

## Permissions used

| Permission | Why |
|---|---|
| `contextMenus` | Adds the "Rephrase selection" right-click menu |
| `activeTab` / `scripting` | Reads the selected text from the current page |
| `storage` | Saves your API keys, provider choice, and the last result |
| `clipboardWrite` | Powers the Copy button in the popup |
| `host_permissions` (api.openai.com, generativelanguage.googleapis.com, api.groq.com) | Sends the rephrase request to your chosen provider |

## Known limitations

- Model IDs for Gemini and Groq change periodically as providers release new versions. If you get a "model not found" error, update the `defaultModel` value for that provider in `background.js`.
- Rephrasing sends the selected text to a third-party API. Don't use this on sensitive or private text unless you're comfortable with that provider's data handling.
- Free-tier providers (Gemini, Groq) enforce rate limits — heavy use may hit them.

## License

MIT — use, modify, and distribute freely.
