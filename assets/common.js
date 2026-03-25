const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxN_rzuyWyD3VfH3_nHK3QaDq8znD25Ei45fYXKeHbc-t01gKQXx9j0kQxhe8h0ts_9hw/exec';

function doSearch() {
  const q = document.getElementById('globalSearch').value.trim();
  if (!q) return;
  alert('検索: ' + q + '\n（実装時はGASまたは静的JSONを使用してください）');
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch();
    });
  }

  renderSidebarFavorites();
});

function switchRankTab(btn, panelId) {
  document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ranking-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}
function toggleToc(btn) {
  const toc = btn.closest('.toc');
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
  const list = document.getElementById('sidebarFavorites');
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
      const li = document.createElement('li');
      li.innerHTML = `<a href="${fav.url}"><span class="sidebar__rank-num">★</span>${escHtml(fav.name)}</a>`;
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
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
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
  data.type = 'info_contact';
  data.timestamp = new Date().toISOString();

  if (!data.contact_twitter && !data.contact_email) {
    alert('Twitterユーザーネームまたはメールアドレスのいずれかを入力してください。');
    return;
  }

  const btn = document.querySelector(`#${formId} button[type="button"]`);
  btn.disabled = true;
  btn.textContent = '送信中…';

  await submitToGAS(data);

  btn.disabled = false;
  btn.textContent = '送信する';

  const el = document.getElementById(successId);
  if (el) el.style.display = 'block';
}

async function submitSiteContact(formId, successId) {
  const data = getFormData(formId);
  data.type = 'site_contact';
  data.timestamp = new Date().toISOString();

  if (!data.inquiry_type) { alert('問い合わせ種別を選択してください。'); return; }
  if (!data.contact_twitter && !data.contact_email) {
    alert('Twitterユーザーネームまたはメールアドレスのいずれかを入力してください。');
    return;
  }

  const btn = document.querySelector(`#${formId} button[type="button"]`);
  btn.disabled = true;
  btn.textContent = '送信中…';

  await submitToGAS(data);

  btn.disabled = false;
  btn.textContent = '送信する';

  const el = document.getElementById(successId);
  if (el) el.style.display = 'block';
}

async function submitComment(formId, listId, successId) {
  const data = getFormData(formId);
  data.type = 'comment';
  data.timestamp = new Date().toISOString();

  if (!data.comment || !data.comment.trim()) { alert('コメントを入力してください。'); return; }

  const btn = document.querySelector(`#${formId} button[type="button"]`);
  btn.disabled = true;
  btn.textContent = '送信中…';

  await submitToGAS(data);

  btn.disabled = false;
  btn.textContent = 'コメントを投稿';

  const list = document.getElementById(listId);
  if (list) {
    const name = data.display_name || '匿名';
    const now = new Date().toLocaleDateString('ja-JP');
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
  try {
    await fetch(GAS_ENDPOINT + '?action=pageview&page=' + encodeURIComponent(pageSlug), {
      mode: 'no-cors'
    });
  } catch(e) {}
}

async function fetchPageStats(pageSlug, prefix) {
  try {
    const res = await fetch(GAS_ENDPOINT + '?action=stats&page=' + encodeURIComponent(pageSlug));
    const data = await res.json();
    ['total', 'year', 'month', 'week', 'day'].forEach(k => {
      const el = document.getElementById(`stat-${prefix}-${k}`);
      if (el && data[k] !== undefined) el.textContent = Number(data[k]).toLocaleString() + ' PV';
    });
  } catch(e) {}
}

async function fetchRankingData() {
  const periods = ['total', 'year', 'month', 'week', 'day'];
  for (const period of periods) {
    try {
      const res = await fetch(`${GAS_ENDPOINT}?action=ranking&period=${period}&limit=20`);
      const data = await res.json();
      const listEl = document.getElementById(`rankList-${period}`);
      if (!listEl || !data.ranking) continue;

      listEl.innerHTML = data.ranking.map(item => `
        <a href="${item.url}" class="ranking-item">
          <span class="ranking-item__rank ${item.rank <= 3 ? 'rank-' + item.rank : ''}">${item.rank}</span>
          <img class="ranking-item__icon" src="https://fukuaka-pedia.github.io/assets/img/fukuaka/${item.icon || 'default.png'}" alt="${escHtml(item.name)}" onerror="this.src='https://fukuaka-pedia.github.io/assets/img/icon.png'">
          <div class="ranking-item__info">
            <div class="ranking-item__name">${escHtml(item.name)}</div>
            <div class="ranking-item__type">${escHtml(item.type)}</div>
          </div>
          <span class="ranking-item__count">${Number(item.count).toLocaleString()} PV</span>
        </a>
      `).join('');
    } catch(e) {}
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
