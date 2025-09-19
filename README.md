<div align="center">

# Prompt Optimizer

Optimize and refine your prompts for LLMs directly on ChatGPT and Gemini. This Chrome MV3 extension injects a small "Optimize" button near site prompt inputs and replaces your text inline — using your own API keys.

</div>

## Overview

Prompt Optimizer streamlines prompt engineering while you work. It supports multiple providers (OpenAI, Gemini, Anthropic Claude, OpenRouter), stores keys locally via `chrome.storage.sync`, and routes network calls through a background service worker for security. A hardened default meta‑prompt is applied if you don’t provide a custom one.

## Features

- Inline trigger: Adds an "Optimize" button next to ChatGPT/Gemini input areas.
- Inline replace: One‑click refines and replaces your prompt in place.
- Artifact cleanup: Strips common model tokens from output.
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
2. Type your prompt, then click the injected "Optimize" button.
3. The input is replaced with the improved version inline (no modal).
4. If no API key is set, the Options page will open to configure it.

### Tips

- OpenRouter privacy: Free routes may require enabling “Free model publication” (OpenRouter → Settings → Privacy). Otherwise, choose a non‑free model.
- Inline button missing? SPA UIs can shift; wait a moment or refresh the page.

## Troubleshooting

- Missing API key: A warning appears and the Options page may open.
- OpenRouter 404 privacy error: Enable free model publication or switch to a non‑free model.
- Network/CORS issues: Ensure the extension is reloaded and host permissions include provider APIs (configured in `manifest.json`).

## Development

- MV3 surfaces:
  - content script: injects UI, observes DOM, and sends messages
  - background service worker: owns network requests and provider logic
  - options page: stores provider choice, keys, and optional master prompt
- Key files:
  - `manifest.json` — MV3 wiring
- `scripts/content.js` — injection + inline optimization (legacy modal remains unused)
  - `scripts/background.js` — provider calls + meta‑prompt handling
  - `options/options.html` / `options/options.js` — settings UI
  - `styles/content.css` — shared styles (modal + options)

## Contributing

Contributions are welcome! Please open an issue or a pull request. Consider discussing significant changes in an issue first to align on scope and direction.
