// Background Service Worker for Prompt Optimizer (MV3)
// - Listens for OPTIMIZE_PROMPT messages
// - Reads API key + provider from storage
// - Calls appropriate provider API (OpenAI or Gemini)
// - Returns optimized prompt string

// Default meta-prompt if user hasn't set one
const DEFAULT_META_PROMPT = `You are a professional prompt engineer. Your sole task is to improve the clarity, specificity, and effectiveness of user prompts for large language models.\n\nDo not generate code, images, or perform any actions other than rewriting the prompt for better LLM understanding.\n\nOutput only the improved prompt, without commentary or instructions.\n\nUser Prompt: `;

const PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  CLAUDE: 'claude',
  OPENROUTER: 'openrouter',
};

chrome.runtime.onInstalled.addListener(() => {
  // Initialize defaults if not set
  chrome.storage.sync.get(['po_provider'], (res) => {
    if (!res.po_provider) {
      chrome.storage.sync.set({ po_provider: PROVIDERS.OPENAI });
    }
  });
});

// When the toolbar icon is clicked, open the Options page in a full tab
chrome.action.onClicked.addListener(() => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    // Fallback for very old Chrome versions
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'OPEN_OPTIONS') {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    }
    sendResponse({ ok: true });
    return; // sync
  }
  if (message?.type === 'OPTIMIZE_PROMPT') {
    handleOptimize(message.payload)
      .then((optimized) => sendResponse({ success: true, optimized }))
      .catch((error) => sendResponse({ success: false, error: error?.message || String(error) }));
    return true; // keep message channel open for async
  }
});

async function handleOptimize(payload) {
  const { provider, userPrompt } = payload || {};
  if (!userPrompt) throw new Error('Missing user prompt');

  const storage = await chrome.storage.sync.get([
    'po_master_prompt', 'po_provider', 'po_openai_key', 'po_gemini_key', 'po_claude_key', 'po_openrouter_key'
  ]);
  const effectiveProvider = provider || storage.po_provider || PROVIDERS.OPENAI;
  const metaPrompt = (storage.po_master_prompt && storage.po_master_prompt.trim()) ? storage.po_master_prompt.trim() : DEFAULT_META_PROMPT;
  const prompt = `${metaPrompt}${userPrompt}`;

  if (effectiveProvider === PROVIDERS.OPENAI) {
    const key = storage.po_openai_key;
    if (!key) throw new Error('OpenAI API key not set. Add it in Options.');
    return callOpenAI(key, prompt);
  }

  if (effectiveProvider === PROVIDERS.GEMINI) {
    const key = storage.po_gemini_key;
    if (!key) throw new Error('Gemini API key not set. Add it in Options.');
    return callGemini(key, prompt);
  }

  if (effectiveProvider === PROVIDERS.CLAUDE) {
    const key = storage.po_claude_key;
    if (!key) throw new Error('Claude API key not set. Add it in Options.');
    return callClaude(key, prompt);
  }

  if (effectiveProvider === PROVIDERS.OPENROUTER) {
    const key = storage.po_openrouter_key;
    if (!key) throw new Error('Openrouter API key not set. Add it in Options.');
    return callOpenrouter(key, prompt);
  }


  throw new Error('Unsupported provider');


async function callOpenrouter(apiKey, prompt) {
  // Openrouter API (2025)
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const body = {
    model: 'openai/gpt-oss-120b:free',
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'chrome-extension://prompt-optimizer',
      'X-Title': 'Prompt Optimizer',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await safeText(res);
    if (res.status === 404 && /No endpoints found matching your data policy/i.test(text)) {
      throw new Error('OpenRouter: Your privacy settings block free models. Either enable "Free model publication" in OpenRouter Settings → Privacy, or choose a non-free model. See https://openrouter.ai/settings/privacy');
    }
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Openrouter');
  return content.trim();
}

}

async function callClaude(apiKey, prompt) {
  // Anthropic Claude v1 API (2025)
  const url = 'https://api.anthropic.com/v1/messages';
  const body = {
    model: 'claude-3-sonnet-20240229',
    max_tokens: 512,
    temperature: 0.4,
    messages: [
      { role: 'user', content: prompt }
    ]
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`Claude error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const content = data?.content || data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Claude');
  return typeof content === 'string' ? content.trim() : JSON.stringify(content);
}


async function callOpenAI(apiKey, prompt) {
  // Uses OpenAI Responses API (2024-xx). Keep minimal for portability.
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You improve prompts. Output only the improved prompt.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.4,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  return content.trim();
}

async function callGemini(apiKey, prompt) {
  // Using Gemini 1.5/Pro via REST generateContent
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: { temperature: 0.4 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text.trim();
}

async function safeText(res) {
  try { return await res.text(); } catch { return '<no body>'; }
}
