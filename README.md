<div align="center">

# Prompt Optimizer

Optimize and refine your prompts for LLMs directly on ChatGPT and Gemini. This Chrome MV3 extension injects a small "Optimize" button near site prompt inputs and opens a slick modal to rewrite your text for clarity and effectiveness — using your own API keys.

</div>

## Overview
Prompt Optimizer streamlines prompt engineering while you work. It supports multiple providers (OpenAI, Gemini, Anthropic Claude, OpenRouter), stores keys locally via `chrome.storage.sync`, and routes network calls through a background service worker for security. A hardened default meta‑prompt is applied if you don’t provide a custom one.

## Features
- Inline trigger: Adds an "Optimize" button next to ChatGPT/Gemini input areas.
- Polished modal: Two‑pane UI for input and optimized output with a one‑click Copy.
- Multi‑provider support: OpenAI, Gemini, Anthropic Claude, OpenRouter.
- Secure key handling: Keys live only in `chrome.storage.sync` (never exposed to page scripts).
- Options page: Choose provider, set API keys, and an optional master prompt.
- Resilient placement: Works across SPA page updates with MutationObserver.
- Clear errors: Friendly messages for missing keys and OpenRouter privacy policy issues.

## Installation (Unpacked)
1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Toggle “Developer mode” (top right).
4. Click “Load unpacked” and select the project root folder.
5. Click the toolbar icon to open the Options page and configure provider + API key(s).

## Configuration
- Providers supported:
	- OpenAI (`gpt-4o-mini` by default in code)
	- Gemini (`gemini-2.5-flash` configured)
	- Anthropic Claude (`claude-3-sonnet-20240229` configured)
	- OpenRouter (defaults can be changed; current route set to `deepseek/deepseek-chat-v3.1:free`)
- Keys are stored via `chrome.storage.sync` and used only by the background service worker.
- Optional master prompt can be set in Options; a secure default is used otherwise.

## Usage
1. Visit ChatGPT (`https://chat.openai.com/` or `https://chatgpt.com/`) or Gemini (`https://gemini.google.com/`).
2. Click the injected "Optimize" button near the site’s input bar.
3. In the modal, pick a provider (or use your default), paste your initial prompt, and click “Optimize Prompt”.
4. Copy the improved prompt using the Copy button and paste it back into the site.
5. If you haven’t set an API key, use the "Open Options" button in the modal header to configure it.

### Tips
- OpenRouter privacy: Free routes may require enabling “Free model publication” (OpenRouter → Settings → Privacy). Otherwise, choose a non‑free model.
- Inline button missing? SPA UIs can shift; wait a moment or refresh the page.

## Troubleshooting
- Missing API key: The modal shows a warning with an “Open Options” shortcut.
- OpenRouter 404 privacy error: Enable free model publication or switch to a non‑free model.
- Network/CORS issues: Ensure the extension is reloaded and host permissions include provider APIs (configured in `manifest.json`).

## Development
- MV3 surfaces:
	- content script: injects UI, observes DOM, and sends messages
	- background service worker: owns network requests and provider logic
	- options page: stores provider choice, keys, and optional master prompt
- Key files:
	- `manifest.json` — MV3 wiring
	- `scripts/content.js` — injection + modal UI
	- `scripts/background.js` — provider calls + meta‑prompt handling
	- `options/options.html` / `options/options.js` — settings UI
	- `styles/content.css` — shared styles (modal + options)

## Contributing
Contributions are welcome! Please open an issue or a pull request. Consider discussing significant changes in an issue first to align on scope and direction.