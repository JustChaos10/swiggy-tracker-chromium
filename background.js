// Background service worker to proxy Groq API requests
(function() {
  'use strict';

  const API_BASE = 'https://api.groq.com/openai/v1';
  // TODO: Replace with secure API key management
  // For now, using a placeholder - users should replace this with their own key
  // Get your free API key from: https://console.groq.com/
  const API_KEY = '';

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;

    if (message.type === 'SWG_GROQ_CHART') {
      const { prompt } = message.payload || {};
      if (!prompt) {
        sendResponse({ ok: false, error: 'Missing prompt' });
        return true;
      }

      // Check if API key is configured
      if (!API_KEY || API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
        sendResponse({ ok: false, error: 'Groq API key not configured. Please update the API key in background.js' });
        return true;
      }

      fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a data visualization expert. Generate clean, accurate chart data strictly as JSON: {"labels":[],"datasets":[{"label":"...","data":[]}]} with no extra text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        })
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Groq API error ${res.status}`);
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || '';
        sendResponse({ ok: true, content });
      }).catch(err => {
        console.error('Groq proxy error:', err);
        sendResponse({ ok: false, error: String(err) });
      });

      return true; // keep channel open for async sendResponse
    }

    if (message.type === 'SWG_GROQ_CHAT') {
      const { messages, model = 'llama-3.1-8b-instant', temperature = 0.2, max_tokens = 800 } = message.payload || {};
      if (!Array.isArray(messages) || !messages.length) {
        sendResponse({ ok: false, error: 'Missing messages' });
        return true;
      }

      if (!API_KEY || API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
        sendResponse({ ok: false, error: 'Groq API key not configured. Please update the API key in background.js' });
        return true;
      }

      fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens })
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Groq API error ${res.status}`);
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || '';
        sendResponse({ ok: true, content });
      }).catch(err => {
        console.error('Groq chat proxy error:', err);
        sendResponse({ ok: false, error: String(err) });
      });

      return true;
    }
  });
})();
