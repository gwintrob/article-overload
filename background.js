chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'remove-api-key',
    title: 'Remove API Key',
    contexts: ['action'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'remove-api-key') {
    chrome.storage.local.remove('anthropic_api_key');
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  chrome.tabs.sendMessage(tab.id, { type: 'toggleSidebar' });
});

const ALLOWED_MODELS = ['claude-opus-4-6', 'claude-sonnet-4-5-20250929'];
const MAX_TOKENS_CAP = 2048;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;

  if (message.type === 'getApiKey') {
    chrome.storage.local.get(['anthropic_api_key'], (result) => {
      sendResponse({ key: result.anthropic_api_key || null });
    });
    return true;
  }

  if (message.type === 'setApiKey') {
    chrome.storage.local.set({ anthropic_api_key: message.key }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'callClaude') {
    chrome.storage.local.get(['anthropic_api_key'], async (result) => {
      const apiKey = result.anthropic_api_key;
      if (!apiKey) {
        sendResponse({ error: 'No API key configured' });
        return;
      }

      try {
        const model = ALLOWED_MODELS.includes(message.model) ? message.model : 'claude-opus-4-6';
        const maxTokens = Math.min(Number(message.maxTokens) || 1024, MAX_TOKENS_CAP);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            messages: message.messages,
          }),
        });

        const data = await response.json();

        if (response.status === 401) {
          sendResponse({ error: 'Invalid API key. Please check your key and try again.', authError: true });
        } else if (data.error) {
          sendResponse({ error: data.error.message });
        } else {
          sendResponse({ result: data.content[0].text });
        }
      } catch (err) {
        sendResponse({ error: err.message });
      }
    });
    return true;
  }
});
