// Content Script for Prompt Optimizer (MV3)
// - Detects supported sites (ChatGPT, Gemini)
// - Injects "Optimize" button near the main prompt textarea
// - Opens a modal UI to collect user's prompt and display optimized result
// - Sends message to background for optimization via LLM provider

(function () {
  const ID = {
    button: 'po-optimize-button',
    modal: 'po-modal',
    overlay: 'po-overlay',
    form: 'po-form',
    input: 'po-input',
    output: 'po-output',
    close: 'po-close',
    provider: 'po-provider',
  };

  const PROVIDERS = {
    OPENAI: 'openai',
    GEMINI: 'gemini',
  };

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function needsApiKeyHint(text) {
    return /api key|key not set|add it in options|not set|missing key/i.test(text || '');
  }

  function openOptionsPage() {
    try {
      if (chrome?.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
        return;
      }
    } catch (_) { /* ignore */ }
    try {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    } catch (_) { /* ignore */ }
  }

  function isChatGPT() {
    return location.hostname === 'chat.openai.com' || location.hostname === 'chatgpt.com';
  }

  function isGemini() {
    return location.hostname === 'gemini.google.com';
  }

  function findPromptInput() {
    // ChatGPT textarea selector
    if (isChatGPT()) {
      const selectorCandidates = [
        'textarea[placeholder*="Send a message" i]',
        'form textarea',
      ];
      for (const sel of selectorCandidates) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
    }

    // Gemini textarea selector
    if (isGemini()) {
      const geminiSelectors = [
        'textarea',
        'div[contenteditable="true"]',
      ];
      for (const sel of geminiSelectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
    }

    return null;
  }

  function injectButton(target) {
    if (!target) return;

    // If already placed and still in DOM, skip
    const existing = document.getElementById(ID.button);
    if (existing && existing.isConnected) return;

    // Create button
    const btn = document.createElement('button');
    btn.id = ID.button;
    btn.type = 'button';
    btn.textContent = 'Optimize';
    btn.className = 'po-inline-trigger';
    btn.addEventListener('click', openModal);

    // ChatGPT placement strategy
    if (isChatGPT()) {
      try {
        // Composer form
        const form = target.closest('form');
        // Try inner flex container that holds the + icon and textarea
        const plusIcon = form ? form.querySelector('button, div svg') : null;
        // Right action cluster (microphone / mode) - attempt to insert before it
        const rightCluster = form ? form.querySelector('[data-testid*="send"]') || form.querySelector('button[aria-label*="Send" i]') : null;

        if (rightCluster && rightCluster.parentElement) {
          rightCluster.parentElement.insertBefore(btn, rightCluster);
          return;
        }
        if (plusIcon && plusIcon.parentElement) {
          plusIcon.parentElement.insertBefore(btn, plusIcon.nextSibling);
          return;
        }
      } catch (e) { /* swallow and fallback */ }
    }

    // Gemini placement strategy
    if (isGemini()) {
      try {
        // Prefer the provided leading actions wrapper (stable anchor)
        const leadingWrapper = document.querySelector('.leading-actions-wrapper');
        if (leadingWrapper) {
          // Avoid duplicate
          if (!document.getElementById(ID.button)) {
            leadingWrapper.appendChild(btn);
          }
          return;
        }
        // Fallback: Card container that holds the textarea (contenteditable) and actions
        const card = target.closest('div');
        if (card && card.querySelector('textarea, div[contenteditable="true"]')) {
          card.appendChild(btn);
          return;
        }
      } catch (e) { /* swallow */ }
    }

    // Fallback: append after target input
    target.parentElement ? target.parentElement.appendChild(btn) : document.body.appendChild(btn);
  }

  function openModal() {
    if (document.getElementById(ID.modal)) return; // one modal at a time

    const overlay = document.createElement('div');
    overlay.id = ID.overlay;

    const modal = document.createElement('div');
    modal.id = ID.modal;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('tabindex', '-1');

    // Header
    const header = document.createElement('div');
    header.className = 'po-header';
    const title = document.createElement('h2');
    title.className = 'po-title';
    title.innerHTML = 'Prompt Optimizer <span class="po-badge">BETA</span>';

  const headerRight = document.createElement('div');
  headerRight.className = 'po-header-right';

  const openOptsBtn = document.createElement('button');
  openOptsBtn.type = 'button';
  openOptsBtn.className = 'po-head-btn';
  openOptsBtn.textContent = 'Open Options';
  openOptsBtn.addEventListener('click', (e) => { e.stopPropagation(); openOptionsPage(); });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'po-close-btn';
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close dialog');

  headerRight.appendChild(openOptsBtn);
  headerRight.appendChild(closeBtn);

  header.appendChild(title);
  header.appendChild(headerRight);

    const form = document.createElement('form');
    form.id = ID.form;

    // Provider + Input column
    const grid = document.createElement('div');
    grid.className = 'po-grid';

    const colLeft = document.createElement('div');
    colLeft.className = 'po-col';

    const providerRow = document.createElement('div');
    const providerLabel = document.createElement('label');
    providerLabel.textContent = 'Provider';
    providerLabel.setAttribute('for', ID.provider);
    const providerSelect = document.createElement('select');
    providerSelect.id = ID.provider;
    providerSelect.innerHTML = `
      <option value="openai">OpenAI (gpt-4o-mini)</option>
      <option value="gemini">Gemini (2.5-flash)</option>
      <option value="claude">Anthropic Claude (sonnet-3)</option>
      <option value="openrouter">Openrouter (deepseek-chat-v3.1:free)</option>
    `;
    providerRow.appendChild(providerLabel);
    providerRow.appendChild(providerSelect);

    const input = document.createElement('textarea');
    input.id = ID.input;
    input.placeholder = 'Enter your initial prompt...';
    input.rows = 10;
    input.setAttribute('aria-label', 'Initial prompt');

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Optimize Prompt';
    submit.className = 'po-primary';

    colLeft.appendChild(providerRow);
    colLeft.appendChild(input);
    colLeft.appendChild(submit);

    // Output column
    const colRight = document.createElement('div');
    colRight.className = 'po-col';
    const outputWrap = document.createElement('div');
    outputWrap.className = 'po-output-wrap';

    const output = document.createElement('textarea');
    output.id = ID.output;
    output.placeholder = 'Optimized prompt will appear here...';
    output.rows = 14;
    output.readOnly = true;
    output.className = 'po-output';
    output.setAttribute('aria-label', 'Optimized prompt output');

    const toolbar = document.createElement('div');
    toolbar.className = 'po-toolbar';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'po-tool-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.disabled = true;
    copyBtn.addEventListener('click', () => {
      const optimized = output.value.trim();
      if (!optimized) return;
      navigator.clipboard.writeText(optimized);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
    });

    toolbar.appendChild(copyBtn);
    outputWrap.appendChild(output);
    outputWrap.appendChild(toolbar);
    colRight.appendChild(outputWrap);

    grid.appendChild(colLeft);
    grid.appendChild(colRight);

    const errorMsg = document.createElement('div');
    errorMsg.id = 'po-error';
    errorMsg.setAttribute('role', 'alert');

    form.appendChild(grid);
    form.appendChild(errorMsg);

    modal.appendChild(header);
    modal.appendChild(form);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    setTimeout(() => modal.focus(), 60);

    chrome.storage.sync.get(['po_provider'], (res) => { if (res.po_provider) providerSelect.value = res.po_provider; });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submit.disabled = true;
      submit.textContent = 'Optimizing…';
      output.value = '';
      errorMsg.textContent = '';
      copyBtn.disabled = true;
      try {
        const provider = providerSelect.value;
        const userPrompt = input.value.trim();
        if (!userPrompt) {
          errorMsg.textContent = 'Please enter a prompt.';
          submit.disabled = false;
          submit.textContent = 'Optimize Prompt';
          return;
        }
        const response = await chrome.runtime.sendMessage({
          type: 'OPTIMIZE_PROMPT', payload: { provider, userPrompt }
        });
        if (response && response.success) {
          output.value = response.optimized || '(No content)';
          copyBtn.disabled = !response.optimized;
        } else {
          const msg = response?.error || 'Optimization failed.';
          if (needsApiKeyHint(msg)) {
            errorMsg.innerHTML = `${escapeHTML(msg)}<br><span class="po-hint">Add your API key to continue. Click the extension icon to open the Options page, or <button type="button" class="po-mini-btn" id="po-open-options-btn">Open Options</button>.</span>`;
            const btn = document.getElementById('po-open-options-btn');
            if (btn) btn.addEventListener('click', openOptionsPage);
          } else {
            errorMsg.textContent = msg;
          }
          copyBtn.disabled = true;
        }
      } catch (err) {
        const emsg = 'Error: ' + (err?.message || String(err));
        if (needsApiKeyHint(emsg)) {
          errorMsg.innerHTML = `${escapeHTML(emsg)}<br><span class="po-hint">Add your API key to continue. Click the extension icon to open the Options page, or <button type="button" class="po-mini-btn" id="po-open-options-btn">Open Options</button>.</span>`;
          const btn = document.getElementById('po-open-options-btn');
          if (btn) btn.addEventListener('click', openOptionsPage);
        } else {
          errorMsg.textContent = emsg;
        }
        copyBtn.disabled = true;
      } finally {
        submit.disabled = false;
        submit.textContent = 'Optimize Prompt';
      }
    });
  }

  function ensureUI() {
    const input = findPromptInput();
    if (input) injectButton(input);
  }

  // Observe dynamic page updates (both ChatGPT and Gemini are SPA-like)
  const observer = new MutationObserver(() => ensureUI());
  observer.observe(document.documentElement, { subtree: true, childList: true });

  // Initial attempt
  ensureUI();
})();
