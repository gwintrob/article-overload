(function () {
  'use strict';

  const MIN_WORDS = 100;
  const WPM = 238;
  const POST_URL_RE = /https:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+/;

  const MAX_CACHE_ENTRIES = 50;
  let currentUrl = '';
  let sidebarHost = null;
  let shadowRoot = null;
  let closedForUrl = null;
  let analysisInFlight = false;

  // ─── Styles ───────────────────────────────────────────────────────────

  const STYLES = `
    :host {
      all: initial;
      font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      color: #1D1D1F;
      -webkit-font-smoothing: antialiased;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 360px;
      height: 100vh;
      background: #FFFFFF;
      border-left: 1px solid #E8EAED;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.06);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-y: auto;
      overflow-x: hidden;
    }

    .sidebar.open { transform: translateX(0); }

    .sidebar::-webkit-scrollbar { width: 4px; }
    .sidebar::-webkit-scrollbar-track { background: transparent; }
    .sidebar::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 2px; }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid #F0F0F0;
      position: sticky;
      top: 0;
      background: #FFFFFF;
      z-index: 2;
    }

    .header-title {
      font-size: 15px;
      font-weight: 600;
      color: #1D1D1F;
      letter-spacing: -0.01em;
    }

    .close-btn {
      background: none;
      border: none;
      color: #AEAEB2;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .close-btn:hover { background: #F5F5F7; color: #1D1D1F; }
    .close-btn svg { width: 14px; height: 14px; }

    /* ── Content area ── */
    .content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* ── API Key Form ── */
    .api-key-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .api-key-section label {
      font-size: 14px;
      font-weight: 600;
      color: #1D1D1F;
    }

    .api-key-section p {
      font-size: 13px;
      color: #86868B;
      line-height: 1.5;
    }

    .api-key-input {
      width: 100%;
      padding: 10px 12px;
      background: #F5F5F7;
      border: 1px solid #E8EAED;
      border-radius: 8px;
      color: #1D1D1F;
      font-size: 13px;
      font-family: "SF Mono", "Fira Code", monospace;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .api-key-input:focus {
      border-color: #007AFF;
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
    }
    .api-key-input::placeholder { color: #AEAEB2; }

    .save-key-btn {
      align-self: flex-start;
      padding: 8px 18px;
      background: #1D1D1F;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .save-key-btn:hover { opacity: 0.85; }
    .save-key-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* ── Stats ── */
    .stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .stat-card {
      background: #F8F9FA;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-label {
      font-size: 11px;
      color: #86868B;
      font-weight: 500;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1D1D1F;
      letter-spacing: -0.03em;
      margin-top: 2px;
      line-height: 1.1;
    }

    .stat-unit {
      font-size: 13px;
      color: #86868B;
      font-weight: 400;
    }

    /* ── Slop-o-Meter ── */
    .slop-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: #1D1D1F;
      letter-spacing: -0.01em;
    }

    .gauge-container {
      position: relative;
      width: 220px;
      margin: 0 auto;
    }

    .gauge-svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .gauge-track {
      fill: none;
      stroke: #F0F0F0;
      stroke-width: 10;
      stroke-linecap: round;
    }

    .gauge-fill {
      fill: none;
      stroke-width: 10;
      stroke-linecap: round;
      transition: stroke-dashoffset 1s cubic-bezier(0.34, 1.2, 0.64, 1);
    }

    .gauge-needle {
      transition: transform 1s cubic-bezier(0.34, 1.2, 0.64, 1);
    }

    .gauge-labels {
      display: flex;
      justify-content: space-between;
      width: 200px;
      margin: 0 auto;
    }
    .gauge-labels span {
      font-size: 10px;
      color: #AEAEB2;
      font-weight: 500;
    }

    .gauge-score-display {
      text-align: center;
      margin-top: 4px;
    }

    .score-number {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.04em;
      transition: color 0.5s;
    }

    .score-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      margin-top: 1px;
      transition: color 0.5s;
    }

    .score-reason {
      font-size: 11px;
      color: #86868B;
      text-align: center;
      margin-top: 4px;
      line-height: 1.4;
    }

    /* ── Takeaways ── */
    .takeaways-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .takeaway {
      display: flex;
      gap: 10px;
      padding: 12px;
      background: #F8F9FA;
      border-radius: 10px;
      line-height: 1.5;
      opacity: 0;
      transform: translateY(6px);
      animation: fadeInUp 0.35s forwards;
    }

    @keyframes fadeInUp {
      to { opacity: 1; transform: translateY(0); }
    }

    .takeaway-num {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      background: #1D1D1F;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      margin-top: 1px;
    }

    .takeaway-text {
      font-size: 13px;
      color: #1D1D1F;
      line-height: 1.55;
    }

    /* ── Loading ── */
    .loading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 0;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #E8EAED;
      border-top-color: #1D1D1F;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 13px;
      color: #86868B;
    }

    /* ── Error ── */
    .error-msg {
      padding: 10px 12px;
      background: #FFF2F2;
      border-radius: 8px;
      color: #FF3B30;
      font-size: 13px;
      line-height: 1.4;
    }

    /* ── Short Post ── */
    .short-post {
      text-align: center;
      padding: 40px 20px;
    }

    .short-post-text {
      font-size: 15px;
      font-weight: 600;
      color: #1D1D1F;
      margin-bottom: 4px;
    }

    .short-post-sub {
      font-size: 13px;
      color: #86868B;
      line-height: 1.5;
    }

    /* ── Footer ── */
    .footer {
      padding: 14px 20px;
      border-top: 1px solid #F0F0F0;
      text-align: center;
      font-size: 11px;
      color: #AEAEB2;
      margin-top: auto;
    }

    /* ── Footer ── */
    .refresh-btn {
      background: none;
      border: 1px solid #E8EAED;
      border-radius: 6px;
      color: #86868B;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 14px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .refresh-btn:hover { background: #F5F5F7; color: #1D1D1F; }
  `;

  // ─── Gauge SVG ────────────────────────────────────────────────────────

  const ARC_LENGTH = Math.PI * 75;

  function createGaugeSVG() {
    return `
      <svg class="gauge-svg" viewBox="0 0 200 115">
        <defs>
          <linearGradient id="xah-slop-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#34C759"/>
            <stop offset="40%" stop-color="#FFD60A"/>
            <stop offset="70%" stop-color="#FF9500"/>
            <stop offset="100%" stop-color="#FF3B30"/>
          </linearGradient>
        </defs>
        <path class="gauge-track" d="M 25 105 A 75 75 0 0 1 175 105"/>
        <path class="gauge-fill" d="M 25 105 A 75 75 0 0 1 175 105"
              stroke="url(#xah-slop-gradient)"
              stroke-dasharray="${ARC_LENGTH}"
              stroke-dashoffset="${ARC_LENGTH}"/>
        <g class="gauge-needle" style="transform-origin: 100px 105px; transform: rotate(-90deg)">
          <line x1="100" y1="105" x2="100" y2="40" stroke="#1D1D1F" stroke-width="2" stroke-linecap="round"/>
          <circle cx="100" cy="105" r="4" fill="#1D1D1F"/>
        </g>
      </svg>
    `;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  function wordCount(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function readingTime(words) {
    const minutes = words / WPM;
    if (minutes < 1) return '<1 min';
    return `${Math.ceil(minutes)} min`;
  }

  function scoreColor(score) {
    if (score <= 25) return '#34C759';
    if (score <= 50) return '#FFD60A';
    if (score <= 75) return '#FF9500';
    return '#FF3B30';
  }

  function scoreLabel(score) {
    if (score <= 15) return 'Authentic';
    if (score <= 30) return 'Mostly Human';
    if (score <= 50) return 'Mixed Signals';
    if (score <= 70) return 'Likely AI';
    if (score <= 85) return 'AI Generated';
    return 'Pure Slop';
  }

  function sendMessage(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, resolve);
    });
  }

  // ─── Cache ────────────────────────────────────────────────────────────

  function cacheKey(url) {
    // Normalize URL — strip query/hash, keep path
    try {
      const u = new URL(url);
      return `cache:${u.origin}${u.pathname}`;
    } catch {
      return `cache:${url}`;
    }
  }

  function loadCache(url) {
    return new Promise((resolve) => {
      const key = cacheKey(url);
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  }

  function saveCache(url, data) {
    const key = cacheKey(url);
    chrome.storage.local.set({ [key]: { ...data, ts: Date.now() } });
    evictOldCache();
  }

  function evictOldCache() {
    chrome.storage.local.get(null, (all) => {
      const cacheEntries = Object.entries(all)
        .filter(([k]) => k.startsWith('cache:'))
        .sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0));
      if (cacheEntries.length > MAX_CACHE_ENTRIES) {
        const toRemove = cacheEntries.slice(0, cacheEntries.length - MAX_CACHE_ENTRIES).map(([k]) => k);
        chrome.storage.local.remove(toRemove);
      }
    });
  }

  // ─── DOM helpers ──────────────────────────────────────────────────────

  const CONTENT_SELECTORS = [
    '[data-testid="longformRichTextComponent"]',
    '[data-testid="twitterArticleRichTextView"]',
    '[data-testid="tweetText"]',
  ];

  function waitForAnyElement(selectors, timeout = 8000) {
    return new Promise((resolve, reject) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return resolve(el);
      }
      const observer = new MutationObserver(() => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) { observer.disconnect(); resolve(el); return; }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); reject(new Error('Timeout')); }, timeout);
    });
  }

  function extractArticleText() {
    const titleEl = document.querySelector('[data-testid="twitter-article-title"]');
    const title = titleEl ? titleEl.innerText.trim() : '';
    for (const selector of CONTENT_SELECTORS) {
      const el = document.querySelector(selector);
      if (el) {
        const body = el.innerText.trim();
        return title ? `${title}\n\n${body}` : body;
      }
    }
    return null;
  }

  // ─── Sidebar ──────────────────────────────────────────────────────────

  function createSidebar() {
    if (sidebarHost) sidebarHost.remove();

    sidebarHost = document.createElement('div');
    sidebarHost.id = 'x-article-analysis-root';
    shadowRoot = sidebarHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = STYLES;
    shadowRoot.appendChild(style);

    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
      <div class="header">
        <span class="header-title">Article Overload</span>
        <button class="close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="content" id="sidebar-content"></div>
      <div class="footer">
        <button class="refresh-btn" id="refresh-btn">Refresh</button>
      </div>
    `;
    shadowRoot.appendChild(sidebar);
    document.body.appendChild(sidebarHost);

    sidebar.querySelector('.close-btn').addEventListener('click', () => {
      closedForUrl = window.location.href;
      sidebar.classList.remove('open');
      setTimeout(() => sidebarHost?.remove(), 300);
    });

    sidebar.querySelector('#refresh-btn').addEventListener('click', async () => {
      const key = cacheKey(window.location.href);
      chrome.storage.local.remove([key]);
      closedForUrl = null;
      analyzePost();
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => sidebar.classList.add('open'));
    });

    return shadowRoot.getElementById('sidebar-content');
  }

  // ─── Render helpers ───────────────────────────────────────────────────

  function renderApiKeyForm(container, onSave) {
    container.innerHTML = `
      <div class="api-key-section">
        <label>Anthropic API Key</label>
        <p>Your key is stored locally and only sent to the Anthropic API.</p>
        <input type="password" class="api-key-input" placeholder="sk-ant-..." autocomplete="off"/>
        <button class="save-key-btn" disabled>Save Key</button>
      </div>
    `;
    const input = container.querySelector('.api-key-input');
    const btn = container.querySelector('.save-key-btn');
    input.addEventListener('input', () => { btn.disabled = input.value.trim().length < 10; });
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Saving...';
      await sendMessage({ type: 'setApiKey', key: input.value.trim() });
      onSave();
    });
  }

  function renderShortPost(container) {
    container.innerHTML = `
      <div class="short-post">
        <div class="short-post-text">Post too short</div>
        <div class="short-post-sub">Fewer than ${MIN_WORDS} words. Article analysis works best with long-form content.</div>
      </div>
    `;
  }

  function renderStats(container, words) {
    container.insertAdjacentHTML('beforeend', `
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-label">Words</span>
          <span class="stat-value">${words.toLocaleString()}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Read time</span>
          <span class="stat-value">${readingTime(words)}</span>
        </div>
      </div>
    `);
  }

  function renderSlopPlaceholder(container) {
    container.insertAdjacentHTML('beforeend', `
      <div class="slop-section" id="slop-section">
        <span class="section-title">Slop-o-Meter</span>
        <div class="gauge-container">
          ${createGaugeSVG()}
          <div class="gauge-labels"><span>Human</span><span>AI Slop</span></div>
          <div class="gauge-score-display">
            <span class="score-number" style="color:#AEAEB2">--</span>
            <span class="score-label" style="color:#AEAEB2">Analyzing...</span>
          </div>
        </div>
      </div>
    `);
  }

  function updateSlopScore(score, reason) {
    const section = shadowRoot.getElementById('slop-section');
    if (!section) return;

    const fill = section.querySelector('.gauge-fill');
    const needle = section.querySelector('.gauge-needle');
    const scoreNum = section.querySelector('.score-number');
    const label = section.querySelector('.score-label');
    const fraction = score / 100;
    const color = scoreColor(score);

    fill.style.strokeDashoffset = ARC_LENGTH * (1 - fraction);
    needle.style.transform = `rotate(${-90 + fraction * 180}deg)`;
    scoreNum.textContent = score;
    scoreNum.style.color = color;
    label.textContent = scoreLabel(score);
    label.style.color = color;

    if (reason) {
      const existing = section.querySelector('.score-reason');
      if (existing) existing.remove();
      const reasonEl = document.createElement('div');
      reasonEl.className = 'score-reason';
      reasonEl.textContent = reason;
      section.querySelector('.gauge-container').appendChild(reasonEl);
    }
  }

  function renderTakeawaysPlaceholder(container) {
    container.insertAdjacentHTML('beforeend', `
      <div class="takeaways-section" id="takeaways-section">
        <span class="section-title">Key Takeaways</span>
        <div class="loading">
          <div class="spinner"></div>
          <span class="loading-text">Reading article...</span>
        </div>
      </div>
    `);
  }

  function updateTakeaways(takeaways) {
    const section = shadowRoot.getElementById('takeaways-section');
    if (!section) return;
    const loading = section.querySelector('.loading');
    if (loading) loading.remove();

    takeaways.forEach((text, i) => {
      const el = document.createElement('div');
      el.className = 'takeaway';
      el.style.animationDelay = `${i * 0.08}s`;
      const num = document.createElement('span');
      num.className = 'takeaway-num';
      num.textContent = i + 1;
      const txt = document.createElement('span');
      txt.className = 'takeaway-text';
      txt.textContent = text;
      el.appendChild(num);
      el.appendChild(txt);
      section.appendChild(el);
    });
  }

  function renderError(container, message, id) {
    const target = id ? shadowRoot.getElementById(id) : container;
    if (!target) return;
    const loading = target.querySelector('.loading');
    if (loading) loading.remove();
    const errEl = document.createElement('div');
    errEl.className = 'error-msg';
    errEl.textContent = message;
    target.appendChild(errEl);
  }

  // ─── API Calls ────────────────────────────────────────────────────────

  async function fetchSummary(text) {
    const resp = await sendMessage({
      type: 'callClaude',
      model: 'claude-opus-4-6',
      maxTokens: 1024,
      messages: [{
        role: 'user',
        content: `Extract 3-4 key takeaways from this article. The reader is deciding whether to spend time on it.

Rules:
- Be specific. Use concrete details, names, and numbers from the text. No vague summaries.
- No promotional language ("groundbreaking", "powerful", "game-changing").
- No filler ("It's worth noting", "Importantly", "Additionally").
- No forced rule-of-three lists or false ranges.
- No "not just X, it's Y" structures. State the point directly.
- Write plainly. Prefer "is" and "has" over "serves as" or "showcases".
- Each takeaway: one short sentence, max 15 words. Be terse.

Return ONLY a JSON array of strings.

Article:
${text}`,
      }],
    });
    if (resp.error) throw new Error(resp.error);
    try {
      return JSON.parse(resp.result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      throw new Error('Failed to parse summary');
    }
  }

  async function fetchSlopScore(text) {
    const resp = await sendMessage({
      type: 'callClaude',
      model: 'claude-opus-4-6',
      maxTokens: 128,
      messages: [{
        role: 'user',
        content: `Rate how AI-generated this text is from 0 to 100. 0 = clearly human, 100 = obvious AI slop. Return ONLY JSON: {"score": <int>, "reason": "<max 8 words>"}\n\nText:\n${text}`,
      }],
    });
    if (resp.error) throw new Error(resp.error);
    try {
      return JSON.parse(resp.result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      throw new Error('Failed to parse slop score');
    }
  }

  // ─── Main Flow ────────────────────────────────────────────────────────

  async function analyzePost() {
    if (!POST_URL_RE.test(window.location.href)) {
      removeSidebar();
      return;
    }

    if (closedForUrl === window.location.href) return;
    if (analysisInFlight) return;

    let text;
    try {
      await waitForAnyElement(CONTENT_SELECTORS);
      text = extractArticleText();
    } catch { return; }

    if (!text) return;

    const words = wordCount(text);

    if (words < MIN_WORDS) {
      return;
    }

    const container = createSidebar();

    const { key } = await sendMessage({ type: 'getApiKey' });
    if (!key) {
      renderApiKeyForm(container, () => { closedForUrl = null; analyzePost(); });
      return;
    }

    // Check cache
    const cached = await loadCache(window.location.href);
    if (cached && cached.summary && cached.slop) {
      renderStats(container, words);
      renderSlopPlaceholder(container);
      renderTakeawaysPlaceholder(container);
      // Small delay so the UI renders before animating
      requestAnimationFrame(() => {
        updateSlopScore(cached.slop.score, cached.slop.reason);
        const loading = shadowRoot.getElementById('takeaways-section')?.querySelector('.loading');
        if (loading) loading.remove();
        updateTakeaways(cached.summary);
      });
      return;
    }

    renderStats(container, words);
    renderSlopPlaceholder(container);
    renderTakeawaysPlaceholder(container);

    const results = { summary: null, slop: null };
    analysisInFlight = true;

    try {
      const slopPromise = fetchSlopScore(text)
        .then((data) => {
          results.slop = data;
          updateSlopScore(data.score, data.reason);
        })
        .catch((err) => renderError(container, `Slop analysis failed: ${err.message}`, 'slop-section'));

      const summaryPromise = fetchSummary(text)
        .then((takeaways) => {
          results.summary = takeaways;
          updateTakeaways(takeaways);
        })
        .catch((err) => renderError(container, `Summary failed: ${err.message}`, 'takeaways-section'));

      await Promise.allSettled([slopPromise, summaryPromise]);

      // Cache successful results
      if (results.summary && results.slop) {
        saveCache(window.location.href, results);
      }
    } finally {
      analysisInFlight = false;
    }
  }

  function removeSidebar() {
    if (sidebarHost) {
      const sidebar = shadowRoot?.querySelector('.sidebar');
      if (sidebar) sidebar.classList.remove('open');
      setTimeout(() => { sidebarHost?.remove(); sidebarHost = null; shadowRoot = null; }, 300);
    }
  }

  // ─── URL Change Detection ─────────────────────────────────────────────

  function watchNavigation() {
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...a) { origPush.apply(this, a); onUrlChange(); };
    history.replaceState = function (...a) { origReplace.apply(this, a); onUrlChange(); };
    window.addEventListener('popstate', onUrlChange);

    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) onUrlChange();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function onUrlChange() {
    const newUrl = window.location.href;
    if (newUrl === currentUrl) return;
    currentUrl = newUrl;
    setTimeout(analyzePost, 500);
  }

  // ─── Toggle via extension icon ──────────────────────────────────────

  function toggleSidebar() {
    if (sidebarHost && shadowRoot) {
      const sidebar = shadowRoot.querySelector('.sidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        closedForUrl = window.location.href;
        sidebar.classList.remove('open');
        setTimeout(() => { sidebarHost?.remove(); sidebarHost = null; shadowRoot = null; }, 300);
        return;
      }
    }
    closedForUrl = null;
    analyzePost();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'toggleSidebar') toggleSidebar();
  });

  // ─── Init ─────────────────────────────────────────────────────────────

  currentUrl = window.location.href;
  watchNavigation();
  analyzePost();
})();
