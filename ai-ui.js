// Minimal AI chat UI that uses Groq via background proxy
(function() {
  'use strict';

  class SwiggyAIAssist {
    constructor() {
      this.container = null;
      this.enabled = false;
      this.sending = false;
    }

    mount(actionsEl) {
      if (!actionsEl || document.getElementById('swg-ai')) return;
      const btn = document.createElement('button');
      btn.className = 'swg-btn alt';
      btn.id = 'swg-ai';
      btn.type = 'button';
      btn.textContent = 'Ask AI';
      btn.disabled = !this.enabled;
      btn.addEventListener('click', () => this.open());
      actionsEl.appendChild(btn);
    }

    setEnabled(on) {
      this.enabled = !!on;
      const btn = document.getElementById('swg-ai');
      if (btn) btn.disabled = !this.enabled;
    }

    open() {
      if (!this.enabled) return;
      if (this.container) { this.container.style.display = 'block'; return; }

      const el = document.createElement('div');
      el.className = 'swg-ai-panel';
      el.innerHTML = `
        <div class="swg-ai-header">
          <div class="swg-ai-title">AI Insights</div>
          <button class="swg-ai-close" aria-label="Close">×</button>
        </div>
        <div class="swg-ai-body" id="swg-ai-body"></div>
        <div class="swg-ai-input">
          <textarea id="swg-ai-q" rows="2" placeholder="Ask how to reduce spending, healthier choices, best times…"></textarea>
          <button id="swg-ai-send" class="swg-btn primary">Ask</button>
        </div>`;

      const drawer = document.getElementById('swg-drawer');
      drawer.appendChild(el);
      this.container = el;

      el.querySelector('.swg-ai-close').addEventListener('click', () => {
        el.style.display = 'none';
      });

      el.querySelector('#swg-ai-send').addEventListener('click', () => this.handleSend());
      el.querySelector('#swg-ai-q').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) this.handleSend();
      });
    }

    async handleSend() {
      if (this.sending) return;
      const body = document.getElementById('swg-ai-body');
      const ta = document.getElementById('swg-ai-q');
      const q = (ta.value || '').trim();
      if (!q) return;
      this.appendMsg('user', q);
      ta.value = '';
      this.sending = true;
      try {
        const reply = await this.ask(q);
        this.appendMsg('assistant', reply);
      } catch (e) {
        this.appendMsg('assistant', `Error: ${e?.message || e}`);
      } finally {
        this.sending = false;
      }
      body.scrollTop = body.scrollHeight;
    }

    appendMsg(role, text) {
      const body = document.getElementById('swg-ai-body');
      const div = document.createElement('div');
      div.className = `swg-ai-msg ${role}`;
      div.textContent = text;
      body.appendChild(div);
    }

    async ask(question) {
      const orders = await window.swiggyTracker.getAllOrders();
      if (!orders.length) return 'No orders available yet. Run Full Sync or scroll your orders first.';
      const ctx = window.buildAIContext(orders);

      const system = {
        role: 'system',
        content: 'You are a personal ordering coach. Use ONLY the provided JSON of the user\'s Swiggy history. Provide concise, actionable analytics: where spending concentrates, what times to avoid, monthly budget suggestions, and healthier swaps inferred from item names. No medical advice. Output 4-7 short bullet points. Use rupee symbol (₹).'
      };

      const user = { role: 'user', content: `Question: ${question}\n\nData JSON:\n${JSON.stringify(ctx)}` };

      const resp = await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({ type: 'SWG_GROQ_CHAT', payload: { messages: [system, user] } }, (r) => {
            if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
            if (!r || !r.ok) { reject(new Error(r?.error || 'Unknown Groq error')); return; }
            resolve(r.content);
          });
        } catch (e) { reject(e); }
      });

      return resp || 'No reply';
    }
  }

  window.SwiggyAIAssist = SwiggyAIAssist;
})();

