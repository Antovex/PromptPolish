// Options page logic for Prompt Optimizer

const el = (id) => document.getElementById(id);



async function load() {
  const data = await chrome.storage.sync.get([
    'po_master_prompt', 'po_provider', 'po_openai_key', 'po_gemini_key', 'po_claude_key', 'po_openrouter_key'
  ]);
  el('masterPrompt').value = data.po_master_prompt || '';
  el('provider').value = data.po_provider || 'openai';
  el('openaiKey').value = data.po_openai_key || '';
  el('geminiKey').value = data.po_gemini_key || '';
  el('claudeKey').value = data.po_claude_key || '';
  el('openrouterKey').value = data.po_openrouter_key || '';
  showApiKeyField(el('provider').value);
}



async function save() {
  const po_master_prompt = el('masterPrompt').value.trim();
  const provider = el('provider').value;
  const po_openai_key = el('openaiKey').value.trim();
  const po_gemini_key = el('geminiKey').value.trim();
  const po_claude_key = el('claudeKey').value.trim();
  const po_openrouter_key = el('openrouterKey').value.trim();

  await chrome.storage.sync.set({
    po_master_prompt,
    po_provider: provider,
    po_openai_key,
    po_gemini_key,
    po_claude_key,
    po_openrouter_key
  });
  const status = el('status');
  status.textContent = 'Saved ✓';
  setTimeout(() => (status.textContent = ''), 1200);
}


function showApiKeyField(provider) {
  const fields = [
    'apiKeyRow-openai',
    'apiKeyRow-gemini',
    'apiKeyRow-claude',
  'apiKeyRow-openrouter'
  ];
  fields.forEach(id => {
    el(id).style.display = 'none';
  });
  if (provider === 'openai') el('apiKeyRow-openai').style.display = '';
  if (provider === 'gemini') el('apiKeyRow-gemini').style.display = '';
  if (provider === 'claude') el('apiKeyRow-claude').style.display = '';
  if (provider === 'openrouter') el('apiKeyRow-openrouter').style.display = '';
  // Ollama does not require API key
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  el('save').addEventListener('click', save);
  el('provider').addEventListener('change', (e) => {
    showApiKeyField(e.target.value);
  });
});
