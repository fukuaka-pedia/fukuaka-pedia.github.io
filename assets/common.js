const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzZ9UbYXvVxtbjC4MRLCbA7MYs77UMeI639P95FM2RL8OJF4sWtbgx9OMRe4PpTt-6IZw/exec';
const SEARCH_JSON  = 'https://fukuaka-pedia.github.io/assets/search.json';

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch();
    });
  }

  renderSidebarFavorites();

  fetchSidebarRanking();
});

function doSearch() {
  const q = (document.getElementById('globalSearch').value || '').trim();
  if (!q) return;
  window.location.href = 'https://fukuaka-pedia.github.io/search/?q=' + encodeURIComponent(q);
}

async function initSearchPage(containerId) {
  const params = new URLSearchParams(window.location.search);
  const q = (params.get('q') || '').trim();
  const container = document.getElementById(containerId);
  if (!container) return;

  const input = document.getElementById('globalSearch');
  if (input) input.value = q;

  if (!q) {
    container.innerHTML = '<p class="ranking-empty">検索ワードを入力してください。</p>';
    return;
  }

  container.innerHTML = '<p class="ranking-loading">検索中…</p>';

  try {
    const res  = await fetch(SEARCH_JSON);
    const data = await res.json();
    const lower = q.toLowerCase();

    const results = data.filter(item => {
      const haystack = [
        item.name, item.type, item.status, ...(item.keywords || [])
      ].join(' ').toLowerCase();
      return haystack.includes(lower);
    });

    if (results.length === 0) {
      container.innerHTML = `<p class="ranking-empty">「${escHtml(q)}」に一致するページは見つかりませんでした。</p>`;
      return;
    }

    container.innerHTML = results.map(item => `
      <a href="${escHtml(item.url)}" class="search-result-item">
        <img
          class="search-result-item__icon"
          src="https://fukuaka-pedia.github.io/assets/img/fukuaka/${escHtml(item.icon || 'icon.png')}"
          alt="${escHtml(item.name)}"
          onerror="this.src='https://fukuaka-pedia.github.io/assets/img/icon.png'"
        >
        <div class="search-result-item__info">
          <div class="search-result-item__title">
            ${escHtml(item.name)}
            ${item.status ? `<span class="status-badge status-badge--${statusClass(item.status)}">${escHtml(item.status)}</span>` : ''}
          </div>
          <div class="search-result-item__excerpt">${escHtml(item.type)}${item.summary ? ' — ' + item.summary : ''}</div>
        </div>
      </a>
    `).join('');

  } catch(e) {
    container.innerHTML = '<p class="ranking-empty">検索データの取得に失敗しました。</p>';
  }
}

function switchRankTab(btn, panelId) {
  document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ranking-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}

function toggleToc(btn) {
  const toc  = btn.closest('.toc');
  const list = toc.querySelector('.toc__list');
  if (list.style.display === 'none') {
    list.style.display = '';
    btn.textContent = '非表示';
  } else {
    list.style.display = 'none';
    btn.textContent = '表示';
  }
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('fp_favorites') || '{}'); } catch(e) { return {}; }
}

function saveFavorites(favs) {
  localStorage.setItem('fp_favorites', JSON.stringify(favs));
}

function toggleFavorite(id, name, url, btn) {
  const favs = getFavorites();
  if (favs[id]) {
    delete favs[id];
    btn.classList.remove('active');
    btn.querySelector('.star').textContent = '☆';
  } else {
    favs[id] = { name, url };
    btn.classList.add('active');
    btn.querySelector('.star').textContent = '★';
  }
  saveFavorites(favs);
  renderSidebarFavorites();
}

function renderSidebarFavorites() {
  const list  = document.getElementById('sidebarFavorites');
  const empty = document.getElementById('favEmptyMsg');
  if (!list) return;

  const favs = getFavorites();
  const keys = Object.keys(favs);

  Array.from(list.children).forEach(c => { if (c !== empty) c.remove(); });

  if (keys.length === 0) {
    if (empty) empty.style.display = '';
  } else {
    if (empty) empty.style.display = 'none';
    keys.forEach(id => {
      const fav = favs[id];
      const li  = document.createElement('li');
      li.innerHTML = `<a href="${escHtml(fav.url)}"><span class="sidebar__rank-num">★</span>${escHtml(fav.name)}</a>`;
      list.appendChild(li);
    });
  }

  document.querySelectorAll('.btn-favorite').forEach(btn => {
    const btnId = btn.id.replace('favBtn-', '');
    if (favs[btnId]) {
      btn.classList.add('active');
      btn.querySelector('.star').textContent = '★';
    } else {
      btn.classList.remove('active');
      btn.querySelector('.star').textContent = '☆';
    }
  });
}

async function submitToGAS(data) {
  try {
    await fetch(GAS_ENDPOINT, {
      method: 'POST',
      mode:   'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify(data)
    });
    return true;
  } catch(e) {
    console.error('GAS submission error:', e);
    return false;
  }
}

function getFormData(formId) {
  const form = document.getElementById(formId);
  const data = {};
  Array.from(form.elements).forEach(el => {
    if (el.name) data[el.name] = el.value;
  });
  return data;
}

async function submitInfoContact(formId, successId) {
  const data = getFormData(formId);
  data.type      = 'info_contact';
  data.timestamp = new Date().toISOString();

  if (!data.contact_twitter && !data.contact_email) {
    alert('Twitterユーザーネームまたはメールアドレスのいずれかを入力してください。');
    return;
  }

  const btn = document.querySelector(`#${formId} button[type="button"]`);
  btn.disabled    = true;
  btn.textContent = '送信中…';

  await submitToGAS(data);

  btn.disabled    = false;
  btn.textContent = '送信する';

  const el = document.getElementById(successId);
  if (el) el.style.display = 'block';
}

async function submitSiteContact(formId, successId) {
  const data = getFormData(formId);
  data.type      = 'site_contact';
  data.timestamp = new Date().toISOString();

  if (!data.inquiry_type) {
    alert('問い合わせ種別を選択してください。');
    return;
  }
  if (!data.contact_twitter && !data.contact_email) {
    alert('Twitterユーザーネームまたはメールアドレスのいずれかを入力してください。');
    return;
  }

  const btn = document.querySelector(`#${formId} button[type="button"]`);
  btn.disabled    = true;
  btn.textContent = '送信中…';

  await submitToGAS(data);

  btn.disabled    = false;
  btn.textContent = '送信する';

  const el = document.getElementById(successId);
  if (el) el.style.display = 'block';
}

async function submitComment(formId, listId, successId) {
  const data = getFormData(formId);
  data.type      = 'comment';
  data.timestamp = new Date().toISOString();

  if (!data.comment || !data.comment.trim()) {
    alert('コメントを入力してください。');
    return;
  }

  const btn = document.querySelector(`#${formId} button[type="button"]`);
  btn.disabled    = true;
  btn.textContent = '送信中…';

  await submitToGAS(data);

  btn.disabled    = false;
  btn.textContent = 'コメントを投稿';

  const list = document.getElementById(listId);
  if (list) {
    const name = data.display_name || '匿名';
    const now  = new Date().toLocaleDateString('ja-JP');
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.innerHTML = `
      <div class="comment-item__meta">
        <span class="comment-item__author">${escHtml(name)}</span>
        <span>${now}</span>
      </div>
      <div class="comment-item__body">${escHtml(data.comment)}</div>
    `;
    list.appendChild(item);
  }

  const el = document.getElementById(successId);
  if (el) el.style.display = 'block';

  document.getElementById(formId).reset();
}

async function recordPageView(pageSlug) {
  const key = 'fp_pv_' + pageSlug;

  if (sessionStorage.getItem(key)) return;

  try {
    await fetch(
      GAS_ENDPOINT + '?action=pageview&page=' + encodeURIComponent(pageSlug),
      { mode: 'no-cors' }
    );
    sessionStorage.setItem(key, '1');
  } catch(e) {}
}

async function fetchPageStats(pageSlug, prefix) {
  try {
    const res  = await fetch(GAS_ENDPOINT + '?action=stats&page=' + encodeURIComponent(pageSlug));
    const data = await res.json();
    ['total', 'year', 'month', 'week', 'day'].forEach(k => {
      const el = document.getElementById(`stat-${prefix}-${k}`);
      if (el && data[k] !== undefined) {
        el.textContent = Number(data[k]).toLocaleString() + ' PV';
      }
    });
  } catch(e) {}
}

async function fetchRankingData() {
  const periods = ['total', 'year', 'month', 'week', 'day'];

  periods.forEach(period => {
    const el = document.getElementById(`rankList-${period}`);
    if (el) el.innerHTML = '<p class="ranking-loading">読み込み中…</p>';
  });

  try {
    const results = await Promise.all(
      periods.map(period =>
        fetch(`${GAS_ENDPOINT}?action=ranking&period=${period}&limit=20`)
          .then(r => r.json())
          .catch(() => ({ ranking: [] }))
      )
    );

    periods.forEach((period, i) => {
      const listEl  = document.getElementById(`rankList-${period}`);
      if (!listEl) return;

      const ranking = results[i].ranking || [];
      if (ranking.length === 0) {
        listEl.innerHTML = '<p class="ranking-empty">データがありません</p>';
        return;
      }

      listEl.innerHTML = ranking.map(item => `
        <a href="${escHtml(item.url)}" class="ranking-item">
          <span class="ranking-item__rank${item.rank <= 3 ? ' rank-' + item.rank : ''}">${item.rank}</span>
          <img
            class="ranking-item__icon"
            src="https://fukuaka-pedia.github.io/assets/img/fukuaka/${escHtml(item.icon)}"
            alt="${escHtml(item.name)}"
            onerror="this.src='https://fukuaka-pedia.github.io/assets/img/icon.png'"
          >
          <div class="ranking-item__info">
            <div class="ranking-item__name">${escHtml(item.name)}</div>
            <div class="ranking-item__type">${escHtml(item.type)}</div>
          </div>
          <span class="ranking-item__count">${Number(item.count).toLocaleString()} PV</span>
        </a>
      `).join('');
    });

  } catch(e) {
    periods.forEach(period => {
      const el = document.getElementById(`rankList-${period}`);
      if (el) el.innerHTML = '<p class="ranking-empty">取得に失敗しました</p>';
    });
  }
}

async function fetchSidebarRanking() {
  try {
    const res  = await fetch(`${GAS_ENDPOINT}?action=ranking&period=month&limit=5`);
    const data = await res.json();
    const list = document.getElementById('sidebarRanking');
    if (!list || !data.ranking || data.ranking.length === 0) return;

    const rankClass = ['gold', 'silver', 'bronze', '', ''];
    list.innerHTML = data.ranking.map((item, i) => `
      <li>
        <a href="${escHtml(item.url)}">
          <span class="sidebar__rank-num ${rankClass[i] || ''}">${item.rank}</span>
          <img
            class="sidebar__icon-sm"
            src="https://fukuaka-pedia.github.io/assets/img/fukuaka/${escHtml(item.icon)}"
            alt="${escHtml(item.name)}"
            onerror="this.style.display='none'"
          >
          ${escHtml(item.name)}
        </a>
      </li>
    `).join('');
  } catch(e) {}
}

async function initHistoryPage(containerId, typeSelectId, keywordInputId) {
  const container    = document.getElementById(containerId);
  const typeSelect   = document.getElementById(typeSelectId);
  const keywordInput = document.getElementById(keywordInputId);
  if (!container) return;

  container.innerHTML = '<p class="ranking-loading">読み込み中…</p>';

  let allItems = [];

  try {
    const res  = await fetch(`${GAS_ENDPOINT}?action=history&limit=200`);
    const data = await res.json();
    allItems   = data.history || [];
  } catch(e) {
    container.innerHTML = '<p class="ranking-empty">履歴の取得に失敗しました。</p>';
    return;
  }

  function render() {
    const typeVal    = typeSelect    ? typeSelect.value.trim()    : '';
    const keywordVal = keywordInput  ? keywordInput.value.trim().toLowerCase() : '';

    const filtered = allItems.filter(item => {
      if (typeVal && item.type !== typeVal) return false;
      if (keywordVal) {
        const haystack = [item.name, item.page, item.note].join(' ').toLowerCase();
        if (!haystack.includes(keywordVal)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<p class="ranking-empty">該当する履歴はありません。</p>';
      return;
    }

    container.innerHTML = filtered.map(item => `
      <div class="history-full-item">
        <div class="history-full-item__header">
          <span class="history-full-item__date">${escHtml(String(item.date))}</span>
          <span class="history-full-item__page">
            <a href="${escHtml(item.url)}">${escHtml(item.name)}</a>
          </span>
          <span class="history-full-item__type">${escHtml(item.type)}</span>
        </div>
        ${item.note ? `<div class="history-full-item__body">${escHtml(item.note)}</div>` : ''}
      </div>
    `).join('');
  }

  render();

  if (typeSelect)   typeSelect.addEventListener('change', render);
  if (keywordInput) keywordInput.addEventListener('input',  render);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusClass(status) {
  const map = {
    '活動中':   'active',
    '休止中':   'hiatus',
    '活動終了': 'ended',
    '不明':     'unknown'
  };
  return map[status] || 'unknown';
}
function updateFileName(input, nameSpanId) {
  const span = document.getElementById(nameSpanId);
  if (!span) return;
  span.textContent = input.files.length > 0 ? input.files[0].name : '未選択';
}
