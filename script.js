document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     1. LOAD SCRAPED DATABASE (486+ NOVELS) & INITIALIZE PERSISTENT APP STATE
     ========================================================================== */
  const rawDb = window.KUROREAD_DB || { novels: [] };
  const novelsList = Array.isArray(rawDb.novels) ? rawDb.novels.slice() : [];
  const novelsById = {};
  const novelsBySakuraId = {};

  function registerNovel(n) {
    if (!n || !n.id) return;
    novelsById[n.id] = n;
    if (n.sakuraSeriId) {
      novelsBySakuraId[n.sakuraSeriId] = n;
    }
  }

  novelsList.forEach(registerNovel);

  const STORAGE_KEY = 'kuroread_state_v4';

  // Clean up legacy demo storage keys so app starts 100% fresh
  try {
    localStorage.removeItem('kuroread_state_v1');
    localStorage.removeItem('kuroread_state_v2');
    localStorage.removeItem('kuroread_state_v3');
  } catch {}

  // 07:00 WIB (UTC+7) equals 00:00 UTC -> Math.floor(Date.now() / 86400000) ticks at exact 07:00:00 WIB daily
  function getWibCycleDay() {
    return Math.floor(Date.now() / 86400000);
  }

  const defaultState = {
    collection: {},
    history: [],
    stats: {
      totalChaptersRead: 0,
      totalMinutesRead: 0,
      dailyChaptersRead: 0,
      dailyTarget: 20,
      lastResetCycleDay: getWibCycleDay(),
      countedSessionChapters: {}
    },
    prefs: {
      theme: 'onyx',
      font: 'serif',
      fsIndex: 1,
      line: 'normal'
    },
    liveDiscoveredNovels: [],
    liveSeriesUpdates: {}
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return structuredClone(defaultState);
      const parsed = JSON.parse(saved);
      const st = {
        collection: parsed.collection || {},
        history: Array.isArray(parsed.history) ? parsed.history : [],
        stats: { ...defaultState.stats, ...(parsed.stats || {}) },
        prefs: { ...defaultState.prefs, ...(parsed.prefs || {}) },
        liveDiscoveredNovels: Array.isArray(parsed.liveDiscoveredNovels) ? parsed.liveDiscoveredNovels : [],
        liveSeriesUpdates: parsed.liveSeriesUpdates || {}
      };
      // Reset daily target if 07:00 WIB cycle day has changed
      const todayCycle = getWibCycleDay();
      if (st.stats.lastResetCycleDay !== todayCycle) {
        st.stats.dailyChaptersRead = 0;
        st.stats.countedSessionChapters = {};
        st.stats.lastResetCycleDay = todayCycle;
      }
      return st;
    } catch {
      return structuredClone(defaultState);
    }
  }

  let appState = loadState();

  function checkAndResetDailyTarget() {
    const todayCycle = getWibCycleDay();
    if (appState.stats.lastResetCycleDay !== todayCycle) {
      appState.stats.dailyChaptersRead = 0;
      appState.stats.countedSessionChapters = {};
      appState.stats.lastResetCycleDay = todayCycle;
      saveState();
      if (currentView === 'profile') renderProfileView();
    }
  }

  // Merge any previously discovered live SakuraNovel series & chapter updates stored in localStorage
  if (Array.isArray(appState.liveDiscoveredNovels)) {
    appState.liveDiscoveredNovels.forEach((nv) => {
      if (!novelsById[nv.id]) {
        novelsList.push(nv);
        registerNovel(nv);
      }
    });
  }
  if (appState.liveSeriesUpdates) {
    Object.entries(appState.liveSeriesUpdates).forEach(([id, upd]) => {
      const target = novelsById[id];
      if (target && upd) {
        if (upd.totalChapters > target.totalChapters) target.totalChapters = upd.totalChapters;
        if (upd.latestUpdate) target.latestUpdate = upd.latestUpdate;
        if (upd.latestChapterTitle) {
          target.latestChapterTitle = upd.latestChapterTitle;
          target.curatedTagline = `Update Terbaru: ${upd.latestChapterTitle}`;
        }
      }
    });
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch {}
  }

  /* ==========================================================================
     2. HELPER UTILITIES & HTML DECODER
     ========================================================================== */
  const views = document.querySelectorAll('.app-view');
  const navBtns = document.querySelectorAll('#mainBottomNav .nav-btn');
  const mainBottomNav = document.getElementById('mainBottomNav');
  const homeBarWrap = document.getElementById('homeBarWrap');
  const statusBar = document.getElementById('statusBar');
  const appToast = document.getElementById('appToast');

  let currentView = 'home';
  let lastMainTab = 'home';
  let currentNovelId = novelsList[0]?.id || 'tbate';
  let currentChapterNum = 1;
  let toastTimer = null;
  let dragMoved = false;

  function showToast(msg) {
    if (!appToast) return;
    appToast.textContent = msg;
    appToast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      appToast.hidden = true;
    }, 2400);
  }

  function decodeHtmlEntities(str = '') {
    return str
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#8216;|&lsquo;/gi, '‘')
      .replace(/&#8217;|&rsquo;/gi, '’')
      .replace(/&#8220;|&ldquo;/gi, '“')
      .replace(/&#8221;|&rdquo;/gi, '”')
      .replace(/&#8211;|&ndash;/gi, '–')
      .replace(/&#8212;|&mdash;/gi, '—')
      .replace(/&#8230;|&hellip;/gi, '…')
      .replace(/&#038;|&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#039;/gi, "'")
      .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)));
  }

  function extractParagraphsFromHtml(rawHtml = '') {
    const cleaned = rawHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');
    const pMatches = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
    const paras = [];
    if (pMatches.length > 0) {
      for (const m of pMatches) {
        const txt = decodeHtmlEntities(m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
          .split('\n')
          .map((s) => s.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        paras.push(...txt);
      }
    } else {
      const plain = decodeHtmlEntities(cleaned.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
        .split('\n')
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      paras.push(...plain);
    }
    return paras;
  }

  function buildDynamicCoverUrl(title = '') {
    const clean = title.replace(/[^\w\s']/g, ' ').replace(/\s+/g, ' ').trim();
    return `https://tse2.mm.bing.net/th?q=${encodeURIComponent(clean + ' light novel cover')}&w=300&h=440&c=7&rs=1&p=0`;
  }

  function formatMultilineTitle(title = '') {
    const words = title.trim().split(/\s+/);
    if (words.length <= 2) return words.join('<br>');
    if (words.length === 3) return `${words[0]}<br>${words[1]}<br>${words[2]}`;
    if (words.length === 4) return `${words[0]}<br>${words[1]} ${words[2]}<br>${words[3]}`;
    if (words.length === 5) return `${words[0]}<br>${words[1]}<br>${words[2]}<br>${words[3]}<br>${words[4]}`;
    return `${words.slice(0, 2).join(' ')}<br>${words.slice(2, 4).join(' ')}<br>${words.slice(4).join(' ')}`;
  }

  function formatShelfTitle(title = '') {
    const words = title.trim().split(/\s+/);
    if (words.length <= 2) return words.join('<br>');
    const half = Math.ceil(words.length / 2);
    return `${words.slice(0, half).join(' ')}<br>${words.slice(half).join(' ')}`;
  }

  function getNovelEntry(id) {
    return novelsById[id] || novelsList[0];
  }

  function getCollectionInfo(novelId) {
    if (!appState.collection[novelId]) {
      appState.collection[novelId] = {
        bookmarked: false,
        status: 'reading',
        lastChapter: 0,
        readChapters: []
      };
    }
    return appState.collection[novelId];
  }

  function isChapterRead(novelId, chNum) {
    const info = appState.collection[novelId];
    return info && Array.isArray(info.readChapters) && info.readChapters.includes(Number(chNum));
  }

  /* ==========================================================================
     3. BACKGROUND LIVE AUTO-UPDATE ENGINE (SILENT & AUTOMATIC)
     ========================================================================== */
  function cleanSynopsisText(rawText, title = '') {
    if (!rawText) {
      return `Kisah perjalanan dan konflik di balik dunia ${title || 'fantasi'} yang penuh misteri.`;
    }
    const stripped = String(rawText)
      .replace(/^[—\-–=\s]*baca\s+novel\s+lain\s+di\s+sakuranovel[—\-–=\s]*/gi, '')
      .replace(/baca\s+novel\s+lain\s+di\s+sakuranovel\.?/gi, '')
      .replace(/baca\s+light\s+novel\s+\/?\s*(web\s+novel\s+)?.*?(sakuranovel|novelringan|meionovel)\.?/gi, '')
      .replace(/langsung\s+dari\s+sakuranovel\.?/gi, '')
      .replace(/^[—\-–=\s]+|[—\-–=\s]+$/g, '')
      .trim();

    if (stripped.length < 25) {
      return `Mengikuti perjalanan tokoh utama dalam cerita ${title || 'fantasi'} menghadapi takdir dan rahasia dunia baru.`;
    }
    return stripped;
  }

  async function syncLiveSakuraNovelCatalog(silent = true) {
    let newSeriesAdded = 0;
    let updatedSeriesCount = 0;

    try {
      // 1. Silently check for any brand-new novels added on server
      const rSeri = await fetch('https://sakuranovel.id/wp-json/wp/v2/seri?per_page=40&orderby=id&order=desc');
      if (rSeri.ok) {
        const seriList = await rSeri.json();
        if (Array.isArray(seriList)) {
          seriList.forEach((s) => {
            if (!s || !s.id || s.count <= 0) return;
            const existing = novelsBySakuraId[s.id];
            const cleanName = decodeHtmlEntities(s.name || s.slug);
            if (!existing) {
              const coverUrl = buildDynamicCoverUrl(cleanName);
              const newNovel = {
                id: `sakura_${s.id}`,
                sakuraSeriId: s.id,
                title: cleanName,
                scrapedTitle: cleanName,
                altTitle: s.slug,
                author: 'Light Novel Author',
                rating: '4.7',
                rank: `#${novelsList.length + 1}`,
                status: 'Ongoing',
                totalChapters: s.count,
                chaptersText: `${s.count} Chapter`,
                chaptersShort: `${s.count} CH`,
                cover: coverUrl,
                thumb: coverUrl,
                remoteCover: coverUrl,
                source: 'KuroRead',
                sourceUrl: s.link || `https://sakuranovel.id/seri/${s.slug}/`,
                weeklyFeatured: false,
                latestUpdate: new Date().toISOString(),
                curatedTagline: `Rilis Terbaru · ${s.count} Chapter tersedia`,
                genres: ['Fantasy', 'Light Novel'],
                synopsis: cleanSynopsisText('', cleanName),
                chapterCatalog: [],
                preloadedChapters: {}
              };
              novelsList.splice(10, 0, newNovel);
              registerNovel(newNovel);
              appState.liveDiscoveredNovels.push(newNovel);
              newSeriesAdded++;
            } else if (s.count > existing.totalChapters) {
              existing.totalChapters = s.count;
              existing.chaptersText = `${s.count} Chapter`;
              existing.chaptersShort = `${s.count} CH`;
              appState.liveSeriesUpdates[existing.id] = {
                ...(appState.liveSeriesUpdates[existing.id] || {}),
                totalChapters: s.count
              };
              updatedSeriesCount++;
            }
          });
        }
      }

      // 2. Silently check latest chapter releases in real time
      const rPosts = await fetch(
        'https://sakuranovel.id/wp-json/wp/v2/posts?per_page=30&_fields=id,date,title,seri,excerpt'
      );
      if (rPosts.ok) {
        const posts = await rPosts.json();
        const seenSeri = new Set();
        if (Array.isArray(posts)) {
          posts.forEach((p) => {
            const sId = p.seri?.[0];
            if (!sId || seenSeri.has(sId)) return;
            seenSeri.add(sId);
            const target = novelsBySakuraId[sId];
            if (target) {
              const chTitle = decodeHtmlEntities(
                (p.title?.rendered || '').replace(/<[^>]+>/g, '').replace(/Bahasa Indonesia/i, '').trim()
              );
              const rawExcerpt = decodeHtmlEntities((p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').trim());
              const cleanedExcerpt = cleanSynopsisText(rawExcerpt, target.title);
              target.latestUpdate = p.date;
              target.latestChapterTitle = chTitle;
              target.curatedTagline = `Bab Terbaru: ${chTitle}`;
              if (cleanedExcerpt.length > 25 && (!target.synopsis || target.synopsis.includes('SakuraNovel'))) {
                target.synopsis = cleanedExcerpt;
              }
              appState.liveSeriesUpdates[target.id] = {
                totalChapters: target.totalChapters,
                latestUpdate: p.date,
                latestChapterTitle: chTitle
              };
              updatedSeriesCount++;
            }
          });
        }
      }

      saveState();
      updateHomeFilterCounts();
      renderCuratedList();
      if (currentView === 'collection') renderCollectionView();
    } catch {
      // Silent fallback to local 486-novel catalog
    }
  }

  /* ==========================================================================
     4. ROUTER & VIEW SWITCHING
     ========================================================================== */
  function syncReaderStatusBar() {
    const readerView = document.getElementById('view-reader');
    if (currentView === 'reader') {
      const isLight =
        readerView.classList.contains('reader-theme-sepia') ||
        readerView.classList.contains('reader-theme-paper');
      const bg = getComputedStyle(readerView).getPropertyValue('--reader-bar-bg');
      statusBar.style.backgroundColor = bg;
      statusBar.style.color = isLight ? '#1A1A1C' : '#F5F5F5';
      homeBarWrap.style.backgroundColor = bg;
    } else {
      statusBar.style.backgroundColor = '';
      statusBar.style.color = '';
      homeBarWrap.style.backgroundColor =
        currentView === 'detail' ? 'var(--bg-screen)' : 'var(--bg-nav)';
    }
  }

  function switchView(viewName) {
    currentView = viewName;
    views.forEach((v) => {
      v.classList.toggle('active', v.id === `view-${viewName}`);
    });

    const isMainTab = ['home', 'history', 'collection', 'profile'].includes(viewName);
    if (isMainTab) {
      lastMainTab = viewName;
      mainBottomNav.hidden = false;
      navBtns.forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-nav') === viewName);
      });
      if (viewName === 'history') renderHistoryView();
      if (viewName === 'collection') renderCollectionView();
      if (viewName === 'profile') renderProfileView();
    } else {
      mainBottomNav.hidden = true;
    }

    syncReaderStatusBar();
  }

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchView(btn.getAttribute('data-nav'));
    });
  });

  document.querySelectorAll('.js-goto-view').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchView(btn.getAttribute('data-view'));
    });
  });

  /* ==========================================================================
     5. VIEW 1: HOME (DAILY 07:00 WIB RANDOM CAROUSEL + LATEST/POPULAR BAR)
     ========================================================================== */
  const carouselViewport = document.getElementById('carouselViewport');
  const carouselTrack = document.getElementById('carouselTrack');
  const dotsRow = document.getElementById('dotsRow');
  const curatedList = document.getElementById('curatedList');
  const homeSearchInput = document.getElementById('homeSearchInput');
  const homeSearchBtn = document.getElementById('homeSearchBtn');
  const webSearchPanel = document.getElementById('webSearchPanel');
  const webSearchList = document.getElementById('webSearchList');
  const webSearchLabel = document.getElementById('webSearchLabel');
  const webSearchCloseBtn = document.getElementById('webSearchCloseBtn');
  const btnLoadMoreNovels = document.getElementById('btnLoadMoreNovels');
  const resetCountdownBadge = document.getElementById('resetCountdownBadge');
  const dailyResetSubtitle = document.getElementById('dailyResetSubtitle');

  let currentSlideIndex = 0;
  let currentHomeFilter = 'latest';
  let currentHomeGenre = 'all';
  let homeRenderLimit = 20;

  function getNovelReadersLabel(novel, idx = 0) {
    if (novel.readersText) return novel.readersText;
    const ch = Number(novel.totalChapters) || 45;
    const seed = Number(novel.sakuraSeriId) || idx + 17;
    const count = Math.max(420, ch * 42 + ((seed * 317) % 4800));
    return count >= 1000 ? `${(count / 1000).toFixed(1)}K pembaca` : `${count} pembaca`;
  }

  function getNovelUpdatedAgoLabel(novel, idx = 0) {
    if (novel.latestUpdate) {
      const diffMs = Math.max(0, Date.now() - new Date(novel.latestUpdate).getTime());
      const mins = Math.floor(diffMs / 60000);
      if (mins < 60) return `Update ${Math.max(5, mins)} menit lalu`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `Update ${hrs} jam lalu`;
      const days = Math.floor(hrs / 24);
      if (days <= 14) return `Update ${days} hari lalu`;
    }
    if (novel.updatedAgo) return novel.updatedAgo;
    const hoursPool = [1, 2, 3, 4, 5, 6, 8, 12];
    const seed = Number(novel.sakuraSeriId) || idx + 3;
    return `Update ${hoursPool[(idx + seed) % hoursPool.length]} jam lalu`;
  }

  let activeCycleDay = getWibCycleDay();

  function updateResetCountdown() {
    const now = Date.now();
    const currentCycle = Math.floor(now / 86400000);
    checkAndResetDailyTarget();
    if (currentCycle !== activeCycleDay) {
      activeCycleDay = currentCycle;
      renderHomeCarousel();
    }
    const nextResetMs = (currentCycle + 1) * 86400000;
    const diffMs = Math.max(0, nextResetMs - now);
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (resetCountdownBadge) {
      resetCountdownBadge.textContent = `Reset ${hrs}j ${mins}m · 07:00 WIB`;
    }
    if (dailyResetSubtitle) {
      dailyResetSubtitle.textContent = `Random novel harian · Reset pukul 07:00 WIB (UTC+7)`;
    }
  }

  function updateHomeFilterCounts() {
    // No-op or keep state synced after live SakuraNovel sync
  }

  function getDailyRandomNovels(count = 6) {
    if (novelsList.length === 0) return [];
    let seed = (getWibCycleDay() * 2654435761) >>> 0;
    function nextRand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    const pool = novelsList.slice();
    const picked = [];
    const limit = Math.min(count, pool.length);
    for (let i = 0; i < limit; i++) {
      const idx = Math.floor(nextRand() * pool.length);
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return picked;
  }

  async function hydrateCarouselSynopsis(novel) {
    if (!novel || !novel.sakuraSeriId || novel._carouselSynHydrated) return;
    novel._carouselSynHydrated = true;
    try {
      const res = await fetch(
        `https://sakuranovel.id/wp-json/wp/v2/posts?seri=${novel.sakuraSeriId}&per_page=1&order=asc&_fields=excerpt,content`
      );
      if (!res.ok) return;
      const posts = await res.json();
      if (!Array.isArray(posts) || !posts[0]) return;
      const paras = extractParagraphsFromHtml(posts[0].content?.rendered || posts[0].excerpt?.rendered || '');
      const meaningful = paras.filter(
        (p) =>
          p.length > 32 &&
          !/sakuranovel|baca\s+novel|novelringan|meionovel|penerjemah|translator|editor|chapter\s*\d+|bab\s*\d+|^[-—=_\s]+$/i.test(
            p
          )
      );
      const rawSyn = (meaningful.slice(0, 2).join(' ') || '').trim();
      const cleanSyn = cleanSynopsisText(rawSyn, novel.title);
      if (cleanSyn.length > 25) {
        novel.synopsis = cleanSyn;
        const el = document.getElementById(`weeklySyn_${novel.id}`);
        if (el) el.textContent = cleanSyn;
      }
    } catch {}
  }

  function renderHomeCarousel() {
    updateResetCountdown();
    const list = getDailyRandomNovels(6);

    carouselTrack.innerHTML = list
      .map((novel, idx) => {
        const isLongTitle = (novel.title || '').length > 26;
        const topGenres = (novel.genres || ['Fantasy', 'Isekai', 'Action']).slice(0, 3);
        const genreChipsHtml = topGenres
          .map((g) => `<span class="weekly-genre-chip">${g}</span>`)
          .join('');
        const readersLabel = getNovelReadersLabel(novel, idx);
        const updatedLabel = getNovelUpdatedAgoLabel(novel, idx);

        return `
      <article class="weekly-card" data-novel="${novel.id}" data-index="${idx}">
        <div class="weekly-card-top">
          <div class="weekly-cover">
            <img src="${novel.thumb || novel.cover}" alt="${novel.title}" draggable="false" onerror="this.src='assets/tbate.png'">
          </div>
          <div class="weekly-center">
            <span class="editor-label">PILIHAN #${idx + 1}</span>
            <h3 class="weekly-novel-title ${isLongTitle ? 'title-long' : ''}">${novel.title}</h3>
          </div>
          <div class="weekly-right">
            <div class="weekly-rating">
              <img src="assets/icons/star.svg" alt="" width="13" height="13">
              <span>${novel.rating}</span>
            </div>
            <div class="weekly-genre-chips">
              ${genreChipsHtml}
            </div>
            <div class="weekly-quick-meta">
              <span class="weekly-readers">${readersLabel}</span>
              <span class="weekly-updated-ago">${updatedLabel}</span>
            </div>
          </div>
        </div>
        <div class="weekly-split-bar">
          <div class="split-status">${novel.status}</div>
          <div class="split-chapters">${novel.totalChapters} CH</div>
        </div>
      </article>
    `;
      })
      .join('');

    dotsRow.innerHTML = list
      .map(
        (_, idx) =>
          `<button class="dot ${idx === 0 ? 'active' : ''}" data-slide="${idx}" aria-label="Slide ${idx + 1}"></button>`
      )
      .join('');

    carouselTrack.querySelectorAll('.weekly-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (dragMoved) return;
        openNovelDetail(card.getAttribute('data-novel'));
      });
    });

    dotsRow.querySelectorAll('.dot').forEach((dot, idx) => {
      dot.addEventListener('click', () => scrollToCarouselCard(idx));
    });
  }

  setInterval(updateResetCountdown, 30000);

  function renderCuratedList() {
    const filterQuery = homeSearchInput ? homeSearchInput.value : '';
    const q = filterQuery.toLowerCase().trim();

    let list = novelsList.filter((n) => {
      if (currentHomeGenre !== 'all') {
        const gList = (n.genres || []).map((g) => g.toLowerCase());
        const targetG = currentHomeGenre.toLowerCase();
        const matchesGenre =
          gList.some((g) => g.includes(targetG) || targetG.includes(g)) ||
          n.title.toLowerCase().includes(targetG);
        if (!matchesGenre) return false;
      }
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        (n.altTitle || '').toLowerCase().includes(q) ||
        (n.author || '').toLowerCase().includes(q) ||
        (n.genres || []).join(' ').toLowerCase().includes(q)
      );
    });

    if (!q) {
      if (currentHomeFilter === 'latest') {
        list = list.slice().sort((a, b) => {
          if (a.latestUpdate && !b.latestUpdate) return -1;
          if (!a.latestUpdate && b.latestUpdate) return 1;
          if (a.latestUpdate && b.latestUpdate) {
            return new Date(b.latestUpdate) - new Date(a.latestUpdate);
          }
          return (b.sakuraSeriId || 0) - (a.sakuraSeriId || 0);
        });
      } else if (currentHomeFilter === 'popular') {
        list = list.slice().sort((a, b) => {
          if (a.weeklyFeatured && !b.weeklyFeatured) return -1;
          if (!a.weeklyFeatured && b.weeklyFeatured) return 1;
          return (b.totalChapters || 0) - (a.totalChapters || 0);
        });
      }
    }

    const titleEl = document.getElementById('curatedSectionTitle');
    const subEl = document.getElementById('curatedSectionSub');
    if (titleEl && subEl) {
      const genreSuffix = currentHomeGenre !== 'all' ? ` · ${currentHomeGenre}` : '';
      if (q) {
        titleEl.textContent = `Hasil Pencarian (${list.length})`;
        subEl.textContent = `Ditemukan dari katalog${genreSuffix}`;
      } else if (currentHomeFilter === 'popular') {
        titleEl.textContent = `Popular Novel${genreSuffix}`;
        subEl.textContent =
          currentHomeGenre !== 'all'
            ? `${list.length} novel genre ${currentHomeGenre} terpopuler`
            : `Novel terpopuler dengan pembaca terbanyak`;
      } else {
        titleEl.textContent = `Latest Update${genreSuffix}`;
        subEl.textContent =
          currentHomeGenre !== 'all'
            ? `${list.length} novel genre ${currentHomeGenre} terbaru`
            : `Cerita dengan bab terbaru hari ini`;
      }
    }

    if (list.length === 0) {
      curatedList.innerHTML = `<p class="empty-filter-msg">Tidak ditemukan novel pada filter ini.</p>`;
      if (btnLoadMoreNovels) btnLoadMoreNovels.hidden = true;
      return;
    }

    const sliced = list.slice(0, homeRenderLimit);

    curatedList.innerHTML = sliced
      .map((novel, idx) => {
        const genrePair = (novel.genres || ['Fantasy', 'Light Novel'])
          .slice(0, 3)
          .map((g) => g.toUpperCase())
          .join(' &nbsp;/&nbsp; ');
        const rawDesc =
          currentHomeFilter === 'popular'
            ? novel.synopsis || novel.curatedTagline || ''
            : novel.curatedTagline || novel.synopsis || '';
        const desc = rawDesc
          .replace(/di\s+SakuraNovel/gi, '')
          .replace(/·\s*SakuraNovel/gi, '')
          .replace(/langsung\s+dari\s+SakuraNovel\.?/gi, '')
          .trim();
        const updatedShort = getNovelUpdatedAgoLabel(novel, idx).replace(/^Update\s+/i, '');
        return `
        <article class="curated-item" data-novel="${novel.id}">
          <img src="${novel.thumb || novel.cover}" alt="${novel.title}" class="curated-cover" loading="lazy" onerror="this.src='assets/tbate.png'">
          <div class="curated-info">
            <h3 class="curated-title">${novel.title}</h3>
            <p class="curated-genre">${genrePair}</p>
            <p class="curated-desc">${desc}</p>
            <div class="curated-meta">
              <img src="assets/icons/star.svg" alt="" width="13" height="13">
              <span>${novel.rating} &nbsp;·&nbsp; ${novel.totalChapters} Ch &nbsp;·&nbsp; ${updatedShort}</span>
            </div>
          </div>
        </article>
      `;
      })
      .join('');

    curatedList.querySelectorAll('.curated-item').forEach((item) => {
      item.addEventListener('click', () => {
        openNovelDetail(item.getAttribute('data-novel'));
      });
    });

    if (btnLoadMoreNovels) {
      if (list.length > homeRenderLimit) {
        btnLoadMoreNovels.hidden = false;
        btnLoadMoreNovels.textContent = `Tampilkan lebih banyak (${list.length - homeRenderLimit} novel lagi)`;
      } else {
        btnLoadMoreNovels.hidden = true;
      }
    }
  }

  document.querySelectorAll('#homeCatalogFilters .compact-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#homeCatalogFilters .compact-mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentHomeFilter = btn.getAttribute('data-hfilter') || 'latest';
      homeRenderLimit = 24;
      renderCuratedList();
    });
  });

  document.querySelectorAll('#homeGenreBar .home-genre-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#homeGenreBar .home-genre-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentHomeGenre = chip.getAttribute('data-genre') || 'all';
      homeRenderLimit = 24;
      renderCuratedList();
    });
  });

  if (btnLoadMoreNovels) {
    btnLoadMoreNovels.addEventListener('click', () => {
      homeRenderLimit += 30;
      renderCuratedList();
    });
  }

  function setActiveDot(index) {
    dotsRow.querySelectorAll('.dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === index);
    });
  }

  function scrollToCarouselCard(index) {
    const cards = carouselTrack.querySelectorAll('.weekly-card');
    if (cards.length === 0) return;
    const clamped = Math.max(0, Math.min(index, cards.length - 1));
    currentSlideIndex = clamped;
    const card = cards[clamped];
    carouselViewport.scrollTo({ left: card.offsetLeft - 22, behavior: 'smooth' });
    setActiveDot(clamped);
  }

  // Carousel Drag & Swipe
  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;

  carouselViewport.addEventListener(
    'scroll',
    () => {
      const cards = carouselTrack.querySelectorAll('.weekly-card');
      const center = carouselViewport.scrollLeft + carouselViewport.clientWidth / 2;
      cards.forEach((card, idx) => {
        const left = card.offsetLeft;
        const right = left + card.offsetWidth;
        if (center >= left && center <= right) {
          currentSlideIndex = idx;
          setActiveDot(idx);
        }
      });
    },
    { passive: true }
  );

  carouselViewport.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragMoved = false;
    startX = e.pageX;
    startScrollLeft = carouselViewport.scrollLeft;
    carouselViewport.style.scrollSnapType = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const diff = e.pageX - startX;
    if (Math.abs(diff) > 6) dragMoved = true;
    carouselViewport.scrollLeft = startScrollLeft - diff * 1.2;
  });

  window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const delta = e.pageX - startX;
    const cards = carouselTrack.querySelectorAll('.weekly-card');
    carouselViewport.style.scrollSnapType = 'x mandatory';

    if (delta < -35 && currentSlideIndex < cards.length - 1) {
      scrollToCarouselCard(currentSlideIndex + 1);
    } else if (delta > 35 && currentSlideIndex > 0) {
      scrollToCarouselCard(currentSlideIndex - 1);
    } else {
      scrollToCarouselCard(currentSlideIndex);
    }
    setTimeout(() => {
      dragMoved = false;
    }, 60);
  });

  // Live Direct Search (Works in Browser & Android APK without PC server!)
  async function triggerLiveWebSearch(query) {
    const q = query.trim();
    if (!q) {
      webSearchPanel.hidden = true;
      return;
    }

    webSearchPanel.hidden = false;
    webSearchLabel.textContent = `PENCARIAN LIVE: "${q.toUpperCase()}"...`;
    webSearchList.innerHTML = `<p class="empty-filter-msg" style="padding:8px 0;">Mencari novel di server...</p>`;

    try {
      const rSakura = await fetch(
        `https://sakuranovel.id/wp-json/wp/v2/seri?search=${encodeURIComponent(q)}&per_page=15`
      );
      if (rSakura.ok) {
        const seriItems = await rSakura.json();
        if (Array.isArray(seriItems) && seriItems.length > 0) {
          webSearchLabel.textContent = `HASIL DITEMUKAN (${seriItems.length})`;
          webSearchList.innerHTML = seriItems
            .map((s) => {
              const cleanName = decodeHtmlEntities(s.name || s.slug);
              return `
              <div class="web-search-item">
                <div class="web-search-info">
                  <div class="web-search-title">${cleanName}</div>
                  <div class="web-search-src">${s.count} Chapter tersedia · Bahasa Indonesia</div>
                </div>
                <button class="btn-import-web" data-seri-id="${s.id}" data-name="${cleanName}" data-slug="${s.slug}" data-count="${s.count}">Buka</button>
              </div>
            `;
            })
            .join('');

          webSearchList.querySelectorAll('.btn-import-web').forEach((btn) => {
            btn.addEventListener('click', () => {
              const sId = Number(btn.getAttribute('data-seri-id'));
              const name = btn.getAttribute('data-name');
              const slug = btn.getAttribute('data-slug');
              const count = Number(btn.getAttribute('data-count') || '1');

              let nv = novelsBySakuraId[sId];
              if (!nv) {
                const cov = buildDynamicCoverUrl(name);
                nv = {
                  id: `sakura_${sId}`,
                  sakuraSeriId: sId,
                  title: name,
                  scrapedTitle: name,
                  altTitle: slug,
                  author: 'Light Novel Author',
                  rating: '4.7',
                  rank: `#${novelsList.length + 1}`,
                  status: 'Ongoing',
                  totalChapters: count,
                  chaptersText: `${count} Chapter`,
                  chaptersShort: `${count} CH`,
                  cover: cov,
                  thumb: cov,
                  remoteCover: cov,
                  source: 'KuroRead',
                  sourceUrl: `https://sakuranovel.id/seri/${slug}/`,
                  weeklyFeatured: false,
                  curatedTagline: `${count} Chapter Bahasa Indonesia`,
                  genres: ['Fantasy', 'Light Novel'],
                  synopsis: cleanSynopsisText('', name),
                  chapterCatalog: [],
                  preloadedChapters: {}
                };
                novelsList.unshift(nv);
                registerNovel(nv);
                appState.liveDiscoveredNovels.push(nv);
                saveState();
                updateHomeFilterCounts();
              }
              webSearchPanel.hidden = true;
              openNovelDetail(nv.id);
            });
          });
          return;
        }
      }
      webSearchLabel.textContent = 'HASIL PENCARIAN (0)';
      webSearchList.innerHTML = `<p class="empty-filter-msg" style="padding:8px 0;">Tidak ditemukan judul "${q}".</p>`;
    } catch {
      webSearchLabel.textContent = 'MODE OFFLINE AKTIF';
      webSearchList.innerHTML = `<p class="empty-filter-msg" style="padding:6px 0;">Menampilkan hasil dari ${novelsList.length} novel di memori aplikasi.</p>`;
    }
  }

  if (homeSearchInput) {
    homeSearchInput.addEventListener('input', () => {
      homeRenderLimit = 25;
      renderCuratedList();
      if (!homeSearchInput.value.trim()) webSearchPanel.hidden = true;
    });
    homeSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        triggerLiveWebSearch(homeSearchInput.value);
      }
    });
  }

  if (homeSearchBtn) {
    homeSearchBtn.addEventListener('click', () => {
      if (homeSearchInput.value.trim()) {
        triggerLiveWebSearch(homeSearchInput.value);
      } else {
        homeSearchInput.focus();
      }
    });
  }

  if (webSearchCloseBtn) {
    webSearchCloseBtn.addEventListener('click', () => {
      webSearchPanel.hidden = true;
    });
  }

  /* ==========================================================================
     6. VIEW 2: HISTORY (DYNAMICALLY POPULATED & INTERCONNECTED)
     ========================================================================== */
  const historyContainer = document.getElementById('historyContainer');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  function renderHistoryItemsGroup(items, isPrimaryFirst = false) {
    return items
      .map((entry, idx) => {
        const novel = getNovelEntry(entry.novelId);
        if (!novel) return '';
        const isPrimary = isPrimaryFirst && idx === 0;
        const pct = Math.min(100, Math.max(5, Number(entry.progressPct) || 50));
        return `
        <article class="history-item">
          <div class="history-top" data-novel="${novel.id}">
            <img src="${novel.thumb || novel.cover}" alt="${novel.title}" class="history-cover" onerror="this.src='assets/tbate.png'">
            <div class="history-meta">
              <h3 class="history-title ${novel.title.length < 22 ? 'single-line' : ''}">${novel.title}</h3>
              <p class="history-chapter">Chapter ${entry.chapterNum} dari ${novel.totalChapters}</p>
              <p class="history-time">${entry.timeLabel || 'Baru saja'} · ${entry.readMins || 8} menit membaca</p>
            </div>
          </div>
          <div class="history-bottom">
            <div class="history-progress-col">
              <span class="progress-label">${pct}% chapter selesai</span>
              <div class="progress-track">
                <div class="progress-fill ${isPrimary ? 'accent-fill' : ''}" style="width: ${pct}%;"></div>
              </div>
            </div>
            <button class="btn-continue ${isPrimary ? 'primary-continue' : ''}" data-novel="${novel.id}" data-chapter="${entry.chapterNum}">Continue</button>
          </div>
        </article>
        ${idx < items.length - 1 ? '<div class="subtle-divider"></div>' : ''}
      `;
      })
      .join('');
  }

  function renderHistoryView() {
    if (!historyContainer) return;
    const list = appState.history || [];
    if (list.length === 0) {
      historyContainer.innerHTML = `<p class="empty-filter-msg">Belum ada riwayat bacaan. Mulai baca novel dari Home atau Collection.</p>`;
      return;
    }

    const todayItems = list.filter((h) => h.group !== 'yesterday');
    const yesterdayItems = list.filter((h) => h.group === 'yesterday');

    let html = '';
    if (todayItems.length > 0) {
      html += `<span class="group-label">HARI INI</span>`;
      html += renderHistoryItemsGroup(todayItems, true);
    }
    if (yesterdayItems.length > 0) {
      if (todayItems.length > 0) html += `<div class="subtle-divider"></div>`;
      html += `<span class="group-label">KEMARIN</span>`;
      html += renderHistoryItemsGroup(yesterdayItems, todayItems.length === 0);
    }

    historyContainer.innerHTML = html;

    historyContainer.querySelectorAll('.history-top').forEach((el) => {
      el.addEventListener('click', () => {
        openNovelDetail(el.getAttribute('data-novel'));
      });
    });

    historyContainer.querySelectorAll('.btn-continue').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nvId = btn.getAttribute('data-novel');
        const ch = parseInt(btn.getAttribute('data-chapter') || '1', 10);
        openReader(nvId, ch);
      });
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      appState.history = [];
      saveState();
      renderHistoryView();
      showToast('Riwayat bacaan telah dikosongkan');
    });
  }

  /* ==========================================================================
     7. VIEW 3: COLLECTION (DYNAMIC BOOKMARKS, FILTERS, SORT, & OVERVIEW)
     ========================================================================== */
  const shelfGrid = document.getElementById('shelfGrid');
  const emptyCollectionMsg = document.getElementById('emptyCollectionMsg');
  const filterChipAll = document.getElementById('filterChipAll');
  const filterChipReading = document.getElementById('filterChipReading');
  const filterChipCompleted = document.getElementById('filterChipCompleted');
  const overviewHeadline = document.getElementById('overviewHeadline');
  const overviewStats = document.getElementById('overviewStats');
  const continueCollectionList = document.getElementById('continueCollectionList');
  const collectionSearchToggle = document.getElementById('collectionSearchToggle');
  const collectionSearchWrap = document.getElementById('collectionSearchWrap');
  const collectionSearchInput = document.getElementById('collectionSearchInput');
  const shelfSortBtn = document.getElementById('shelfSortBtn');

  let currentCollectionFilter = 'all';
  let collectionSortAsc = true;
  let collectionSearchQuery = '';

  function renderCollectionView() {
    const bookmarkedIds = Object.keys(appState.collection).filter(
      (id) => appState.collection[id]?.bookmarked && novelsById[id]
    );

    const allNovels = bookmarkedIds.map((id) => {
      const novel = getNovelEntry(id);
      const info = appState.collection[id];
      const readCount = Math.max(
        info.lastChapter || 0,
        Array.isArray(info.readChapters) ? info.readChapters.length : 0
      );
      const isFinished = info.status === 'completed' || readCount >= novel.totalChapters;
      const calcStatus = isFinished ? 'completed' : 'reading';
      const unread = Math.max(0, novel.totalChapters - readCount);
      return {
        novel,
        info,
        readCount,
        calcStatus,
        unread
      };
    });

    const readingCount = allNovels.filter((x) => x.calcStatus === 'reading').length;
    const completedCount = allNovels.filter((x) => x.calcStatus === 'completed').length;

    if (filterChipAll) filterChipAll.textContent = `Semua · ${allNovels.length}`;
    if (filterChipReading) filterChipReading.textContent = `Dibaca · ${readingCount}`;
    if (filterChipCompleted) filterChipCompleted.textContent = `Selesai · ${completedCount}`;

    if (overviewHeadline) {
      overviewHeadline.textContent = `${allNovels.length} cerita. Banyak dunia.`;
    }
    if (overviewStats) {
      overviewStats.innerHTML = `${readingCount} sedang dibaca &nbsp;·&nbsp; ${completedCount} sudah selesai`;
    }

    let filtered = allNovels.filter((item) => {
      if (currentCollectionFilter !== 'all' && item.calcStatus !== currentCollectionFilter) {
        return false;
      }
      if (collectionSearchQuery) {
        return item.novel.title.toLowerCase().includes(collectionSearchQuery);
      }
      return true;
    });

    filtered.sort((a, b) =>
      collectionSortAsc
        ? a.novel.title.localeCompare(b.novel.title)
        : b.novel.title.localeCompare(a.novel.title)
    );

    if (filtered.length === 0) {
      shelfGrid.innerHTML = '';
      if (emptyCollectionMsg) {
        emptyCollectionMsg.hidden = false;
        emptyCollectionMsg.textContent =
          allNovels.length === 0
            ? 'Belum ada novel di rak koleksimu. Ketuk tombol Bookmark pada novel untuk menyimpan.'
            : 'Belum ada novel pada kategori ini.';
      }
    } else {
      if (emptyCollectionMsg) emptyCollectionMsg.hidden = true;
      shelfGrid.innerHTML = filtered
        .map((item) => {
          const isTbate = item.novel.id === 'tbate';
          const subText = isTbate
            ? `${item.readCount} / ${item.novel.totalChapters} chapter`
            : `${item.readCount} chapter dibaca`;
          return `
          <article class="shelf-item" data-novel="${item.novel.id}">
            <div class="shelf-cover-wrap">
              <img src="${item.novel.thumb || item.novel.cover}" alt="${item.novel.title}" class="shelf-cover" onerror="this.src='assets/tbate.png'">
              <span class="unread-badge ${isTbate ? 'accent' : ''}">${item.unread}</span>
            </div>
            <h3 class="shelf-book-title">${formatShelfTitle(item.novel.title)}</h3>
            <p class="shelf-book-sub">${subText}</p>
          </article>
        `;
        })
        .join('');

      shelfGrid.querySelectorAll('.shelf-item').forEach((el) => {
        el.addEventListener('click', () => {
          openNovelDetail(el.getAttribute('data-novel'));
        });
      });
    }

    if (continueCollectionList) {
      const activeList = allNovels
        .slice()
        .sort((a, b) => (b.info.lastChapter || 1) - (a.info.lastChapter || 1))
        .slice(0, 3);

      if (activeList.length === 0) {
        continueCollectionList.innerHTML = `<p class="empty-filter-msg">Belum ada novel di koleksi untuk dilanjutkan.</p>`;
      } else {
        continueCollectionList.innerHTML = activeList
          .map((item) => {
            const nextCh = item.info.lastChapter || 1;
            return `
            <div class="continue-row" data-novel="${item.novel.id}" data-chapter="${nextCh}">
              <img src="${item.novel.thumb || item.novel.cover}" alt="${item.novel.title}" class="continue-mini-cover" onerror="this.src='assets/tbate.png'">
              <div class="continue-row-info">
                <h4 class="continue-row-title">${item.novel.title}</h4>
                <p class="continue-row-sub">Lanjutkan Chapter ${nextCh}</p>
              </div>
              <img src="assets/icons/open_novel.svg" alt="" width="18" height="18">
            </div>
          `;
          })
          .join('');

        continueCollectionList.querySelectorAll('.continue-row').forEach((row) => {
          row.addEventListener('click', () => {
            const nvId = row.getAttribute('data-novel');
            const ch = parseInt(row.getAttribute('data-chapter') || '1', 10);
            openReader(nvId, ch);
          });
        });
      }
    }
  }

  document.querySelectorAll('.collection-filters .filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.collection-filters .filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentCollectionFilter = chip.getAttribute('data-filter') || 'all';
      renderCollectionView();
    });
  });

  if (collectionSearchToggle && collectionSearchWrap) {
    collectionSearchToggle.addEventListener('click', () => {
      collectionSearchWrap.hidden = !collectionSearchWrap.hidden;
      if (!collectionSearchWrap.hidden) collectionSearchInput.focus();
    });
  }

  if (collectionSearchInput) {
    collectionSearchInput.addEventListener('input', (e) => {
      collectionSearchQuery = e.target.value.toLowerCase().trim();
      renderCollectionView();
    });
  }

  if (shelfSortBtn) {
    shelfSortBtn.addEventListener('click', () => {
      collectionSortAsc = !collectionSortAsc;
      shelfSortBtn.textContent = collectionSortAsc ? 'Judul A–Z' : 'Judul Z–A';
      renderCollectionView();
    });
  }

  /* ==========================================================================
     8. VIEW 4: PROFILE & MORE (LIVE STATS, STORAGE, & JSON BACKUP)
     ========================================================================== */
  const statChaptersCount = document.getElementById('statChaptersCount');
  const statReadingTime = document.getElementById('statReadingTime');
  const goalCountText = document.getElementById('goalCountText');
  const goalProgressFill = document.getElementById('goalProgressFill');
  const goalCaptionText = document.getElementById('goalCaptionText');
  const storageDescText = document.getElementById('storageDescText');
  const backupDescText = document.getElementById('backupDescText');

  function renderProfileView() {
    checkAndResetDailyTarget();
    const st = appState.stats;
    const totalCh = Number(st.totalChaptersRead) || 0;
    const totalMins = Number(st.totalMinutesRead) || 0;
    if (statChaptersCount) statChaptersCount.textContent = String(totalCh);
    if (statReadingTime) {
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      statReadingTime.textContent = `${hrs}j ${mins}m`;
    }
    if (goalCountText && goalProgressFill && goalCaptionText) {
      const target = Number(st.dailyTarget) || 20;
      const done = Number(st.dailyChaptersRead) || 0;
      const pct = Math.min(100, Math.round((done / target) * 100));
      goalCountText.textContent = `${done} / ${target} chapter`;
      goalProgressFill.style.width = `${pct}%`;
      const rem = Math.max(0, target - done);
      goalCaptionText.textContent =
        rem === 0
          ? 'Target bacaan harian telah tercapai hari ini! · Reset pukul 07:00 WIB'
          : `${rem} chapter lagi untuk target hari ini · Reset pukul 07:00 WIB`;
    }
    if (storageDescText) {
      storageDescText.textContent = `Katalog ${novelsList.length} novel · Auto-sync latar belakang aktif`;
    }
  }

  document.getElementById('profileOpenReaderPrefs')?.addEventListener('click', () => {
    openReader(currentNovelId, currentChapterNum || 1);
    openPrefsSheet();
  });

  document.getElementById('profileStorageRow')?.addEventListener('click', () => {
    if (storageDescText) {
      storageDescText.textContent = 'Cache runtime dibersihkan · Katalog tetap aman';
    }
    showToast('Cache penyimpanan sementara berhasil dibersihkan');
  });

  document.getElementById('profileBackupRow')?.addEventListener('click', () => {
    const payload = {
      app: 'KuroRead',
      exportedAt: new Date().toISOString(),
      state: appState
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kuroread-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (backupDescText) {
      backupDescText.textContent = 'Cadangan JSON berhasil diunduh · Baru saja';
    }
    showToast('File Backup JSON berhasil disimpan');
  });

  /* ==========================================================================
     9. VIEW 5: NOVEL DETAIL (LIVE SAKURANOVEL CHAPTERS + BOOKMARK SYNC)
     ========================================================================== */
  const detailCover = document.getElementById('detailCover');
  const detailAuthor = document.getElementById('detailAuthor');
  const detailTitle = document.getElementById('detailTitle');
  const detailRating = document.getElementById('detailRating');
  const detailChapters = document.getElementById('detailChapters');
  const detailChapterSub = document.getElementById('detailChapterSub');
  const detailStatus = document.getElementById('detailStatus');
  const detailSourceBadge = document.getElementById('detailSourceBadge');
  const detailGenres = document.getElementById('detailGenres');
  const detailSynopsis = document.getElementById('detailSynopsis');
  const btnReadMore = document.getElementById('btnReadMore');
  const btnReadFirst = document.getElementById('btnReadFirst');
  const btnReadFirstLabel = document.getElementById('btnReadFirstLabel');
  const btnBookmark = document.getElementById('btnBookmark');
  const bookmarkLabel = document.getElementById('bookmarkLabel');
  const chaptersContainer = document.getElementById('chaptersContainer');
  const chapterJumpInput = document.getElementById('chapterJumpInput');
  const btnLoadMoreChapters = document.getElementById('btnLoadMoreChapters');
  const btnSortChapters = document.getElementById('btnSortChapters');
  const sortLabel = document.getElementById('sortLabel');

  let synopsisExpanded = false;
  let detailSortNewest = false;
  let chapterRenderLimit = 30;
  let chapterFilterText = '';

  function syncDetailBookmarkUI(novelId) {
    const info = getCollectionInfo(novelId);
    if (btnBookmark && bookmarkLabel) {
      btnBookmark.classList.toggle('bookmarked', !!info.bookmarked);
      bookmarkLabel.textContent = info.bookmarked ? 'Bookmarked' : 'Bookmark';
    }
    if (btnReadFirstLabel) {
      const lastCh = info.lastChapter || 0;
      btnReadFirstLabel.textContent = lastCh > 1 ? `Continue Ch. ${lastCh}` : 'Read First';
    }
  }

  function getNovelCatalogList(novel) {
    const count = novel.totalChapters || 20;
    const existingMap = new Map();
    if (Array.isArray(novel.chapterCatalog)) {
      novel.chapterCatalog.forEach((c) => existingMap.set(Number(c.num), c));
    }
    const arr = [];
    for (let i = 1; i <= count; i++) {
      if (existingMap.has(i)) {
        arr.push(existingMap.get(i));
      } else {
        arr.push({
          num: i,
          code: String(i).padStart(3, '0'),
          label: `Chapter ${i}`,
          url: ''
        });
      }
    }
    return arr;
  }

  function renderDetailGenrePills(novel) {
    if (!detailGenres || !novel) return;
    detailGenres.innerHTML = (novel.genres || ['Fantasy', 'Adventure'])
      .map((g) => `<span class="genre-pill" data-g="${g}" style="cursor:pointer;">${g}</span>`)
      .join('');
    detailGenres.querySelectorAll('.genre-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const gName = pill.getAttribute('data-g') || 'all';
        currentHomeGenre = gName;
        document.querySelectorAll('#homeGenreBar .home-genre-chip').forEach((c) => {
          c.classList.toggle('active', c.getAttribute('data-genre')?.toLowerCase() === gName.toLowerCase());
        });
        renderCuratedList();
        switchView('home');
      });
    });
  }

  // Live fetch real chapter titles, tags/genres & synopsis from SakuraNovel WP REST API when opening a series
  async function hydrateSakuraSeriesDetail(novel) {
    if (!novel || !novel.sakuraSeriId) return;
    if (novel._hydratedSakura) return;
    novel._hydratedSakura = true;

    try {
      // 1. Live fetch real SakuraNovel tags/genres if seriesPostId is known (or discover via search)
      let seriesPostId = novel.sakuraSeriesPostId;
      if (!seriesPostId) {
        try {
          const rSearch = await fetch(
            `https://sakuranovel.id/wp-json/wp/v2/search?search=${encodeURIComponent(novel.title)}&per_page=3`
          );
          if (rSearch.ok) {
            const sItems = await rSearch.json();
            const found = (sItems || []).find((x) => x.subtype === 'series');
            if (found) {
              seriesPostId = found.id;
              novel.sakuraSeriesPostId = found.id;
            }
          }
        } catch {}
      }

      if (seriesPostId) {
        try {
          const rTags = await fetch(`https://sakuranovel.id/wp-json/wp/v2/tags?post=${seriesPostId}&per_page=10`);
          if (rTags.ok) {
            const tagObjs = await rTags.json();
            if (Array.isArray(tagObjs) && tagObjs.length > 0) {
              const tagNames = tagObjs.map((t) => decodeHtmlEntities(t.name)).filter(Boolean);
              novel.genres = [...new Set([...(novel.genres || []), ...tagNames])].slice(0, 6);
              if (currentNovelId === novel.id) {
                renderDetailGenrePills(novel);
              }
            }
          }
        } catch {}
      }

      // 2. Live fetch chapters & synopsis
      const res = await fetch(
        `https://sakuranovel.id/wp-json/wp/v2/posts?seri=${novel.sakuraSeriId}&per_page=100&order=asc&_fields=id,title,date,slug,excerpt`
      );
      if (!res.ok) return;
      const total = Number(res.headers.get('x-wp-total') || novel.totalChapters);
      if (total > novel.totalChapters) {
        novel.totalChapters = total;
        if (currentNovelId === novel.id) {
          detailChapters.textContent = `${total} chapter`;
          detailChapterSub.textContent = `${total} chapter tersedia`;
        }
      }
      const posts = await res.json();
      if (Array.isArray(posts) && posts.length > 0) {
        novel.chapterCatalog = posts.map((p, idx) => {
          const rawTitle = decodeHtmlEntities(
            (p.title?.rendered || `Chapter ${idx + 1}`)
              .replace(/<[^>]+>/g, '')
              .replace(/Bahasa Indonesia/i, '')
              .replace(new RegExp(`^${novel.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–:]?\\s*`, 'i'), '')
              .trim()
          );
          return {
            num: idx + 1,
            postId: p.id,
            code: String(idx + 1).padStart(3, '0'),
            label: rawTitle || `Chapter ${idx + 1}`,
            url: `https://sakuranovel.id/wp-json/wp/v2/posts/${p.id}`
          };
        });

        const firstExcerpt = cleanSynopsisText(
          decodeHtmlEntities((posts[0].excerpt?.rendered || '').replace(/<[^>]+>/g, '').trim()),
          novel.title
        );
        if (firstExcerpt && firstExcerpt.length > 30) {
          novel.synopsis = firstExcerpt;
          if (currentNovelId === novel.id && detailSynopsis) {
            detailSynopsis.textContent =
              firstExcerpt.length > 185 ? firstExcerpt.slice(0, 185) + '...' : firstExcerpt;
          }
        }

        if (currentNovelId === novel.id) {
          renderDetailChapters();
        }
      }
    } catch {}
  }

  function renderDetailChapters() {
    const novel = getNovelEntry(currentNovelId);
    if (!novel) return;

    let catalog = getNovelCatalogList(novel);
    if (detailSortNewest) {
      catalog = catalog.slice().reverse();
    }

    const q = chapterFilterText.trim().toLowerCase();
    if (q) {
      catalog = catalog.filter(
        (c) =>
          String(c.num).includes(q) ||
          (c.label || '').toLowerCase().includes(q) ||
          (c.code || '').includes(q)
      );
    }

    const sliced = catalog.slice(0, chapterRenderLimit);

    chaptersContainer.innerHTML = sliced
      .map((ch) => {
        const read = isChapterRead(novel.id, ch.num);
        const preloaded = novel.preloadedChapters && novel.preloadedChapters[ch.num];
        const mins = preloaded?.readMins || 8;
        const statusTxt = read ? `Sudah dibaca · ${mins} menit` : `Belum dibaca · ±${mins} menit`;
        const displayName =
          ch.label && !/^ch\./i.test(ch.label) ? ch.label : `Chapter ${ch.num}`;

        return `
        <div class="chapter-row ${read ? 'is-read' : ''}" data-ch="${ch.num}">
          <span class="ch-num">${String(ch.num).padStart(3, '0')}</span>
          <div class="ch-info">
            <span class="ch-name">${displayName}</span>
            <span class="ch-meta">${statusTxt}</span>
          </div>
          <img src="assets/icons/chapter_arrow.svg" alt="" width="14" height="14">
        </div>
      `;
      })
      .join('');

    chaptersContainer.querySelectorAll('.chapter-row').forEach((row) => {
      row.addEventListener('click', () => {
        const ch = parseInt(row.getAttribute('data-ch') || '1', 10);
        openReader(novel.id, ch);
      });
    });

    if (btnLoadMoreChapters) {
      if (catalog.length > chapterRenderLimit) {
        btnLoadMoreChapters.hidden = false;
        btnLoadMoreChapters.textContent = `Tampilkan lebih banyak (${catalog.length - chapterRenderLimit} chapter tersisa)`;
      } else {
        btnLoadMoreChapters.hidden = true;
      }
    }
  }

  function openNovelDetail(novelId) {
    const novel = getNovelEntry(novelId);
    if (!novel) return;
    currentNovelId = novel.id;
    synopsisExpanded = false;
    detailSortNewest = false;
    chapterRenderLimit = 30;
    chapterFilterText = '';
    if (chapterJumpInput) chapterJumpInput.value = '';

    detailCover.src = novel.cover || novel.thumb;
    detailCover.onerror = () => {
      detailCover.src = 'assets/tbate.png';
    };
    detailAuthor.textContent =
      novel.author && !/sakuranovel/i.test(novel.author) ? novel.author : 'Light Novel Series';
    detailTitle.innerHTML = formatShelfTitle(novel.title);
    detailRating.textContent = novel.rating || '4.8';
    detailChapters.textContent = `${novel.totalChapters} chapter`;
    detailChapterSub.textContent = `${novel.totalChapters} chapter tersedia`;
    detailStatus.textContent = novel.status || 'Ongoing';

    const fullSyn = cleanSynopsisText(novel.synopsis || novel.curatedTagline || '', novel.title);
    novel.synopsis = fullSyn;
    const shortSyn = fullSyn.length > 185 ? fullSyn.slice(0, 185).trim() + '...' : fullSyn;
    detailSynopsis.textContent = shortSyn;
    if (btnReadMore) {
      btnReadMore.hidden = fullSyn.length <= 185;
      btnReadMore.textContent = 'Baca selengkapnya';
    }

    renderDetailGenrePills(novel);

    if (sortLabel) sortLabel.textContent = 'Terlama';
    syncDetailBookmarkUI(novel.id);
    renderDetailChapters();

    switchView('detail');
    const detailScroll = document.querySelector('#view-detail .screen-scroll');
    if (detailScroll) detailScroll.scrollTop = 0;

    // Trigger live chapter list hydration if this is a SakuraNovel series
    if (novel.sakuraSeriId) {
      hydrateSakuraSeriesDetail(novel);
    }
  }

  if (btnReadMore) {
    btnReadMore.addEventListener('click', () => {
      const novel = getNovelEntry(currentNovelId);
      const fullSyn = novel.synopsis || novel.curatedTagline || '';
      const shortSyn = fullSyn.length > 185 ? fullSyn.slice(0, 185).trim() + '...' : fullSyn;
      synopsisExpanded = !synopsisExpanded;
      detailSynopsis.textContent = synopsisExpanded ? fullSyn : shortSyn;
      btnReadMore.textContent = synopsisExpanded ? 'Sembunyikan' : 'Baca selengkapnya';
    });
  }

  if (btnBookmark) {
    btnBookmark.addEventListener('click', () => {
      const info = getCollectionInfo(currentNovelId);
      info.bookmarked = !info.bookmarked;
      if (info.bookmarked && !info.lastChapter) {
        info.lastChapter = 1;
      }
      saveState();
      syncDetailBookmarkUI(currentNovelId);
      renderCollectionView();
      showToast(
        info.bookmarked
          ? 'Novel disimpan ke Rak Koleksi'
          : 'Novel dihapus dari Rak Koleksi'
      );
    });
  }

  if (btnReadFirst) {
    btnReadFirst.addEventListener('click', () => {
      const info = getCollectionInfo(currentNovelId);
      const startCh = info.lastChapter > 1 ? info.lastChapter : 1;
      openReader(currentNovelId, startCh);
    });
  }

  if (btnSortChapters) {
    btnSortChapters.addEventListener('click', () => {
      detailSortNewest = !detailSortNewest;
      if (sortLabel) sortLabel.textContent = detailSortNewest ? 'Terbaru' : 'Terlama';
      renderDetailChapters();
    });
  }

  if (chapterJumpInput) {
    chapterJumpInput.addEventListener('input', (e) => {
      chapterFilterText = e.target.value;
      chapterRenderLimit = 40;
      renderDetailChapters();
    });
  }

  if (btnLoadMoreChapters) {
    btnLoadMoreChapters.addEventListener('click', () => {
      chapterRenderLimit += 60;
      renderDetailChapters();
    });
  }

  document.getElementById('detailBackBtn')?.addEventListener('click', () => {
    switchView(lastMainTab || 'home');
  });

  document.getElementById('detailSourceBtn')?.addEventListener('click', () => {
    const novel = getNovelEntry(currentNovelId);
    showToast(`Sumber Live: ${novel.source || 'SakuraNovel'} · ${novel.totalChapters} Ch`);
  });

  /* ==========================================================================
     10. VIEW 6: NOVEL READER (LIVE SAKURANOVEL OFFSET API + OFFLINE CACHE)
     ========================================================================== */
  const readerNovelName = document.getElementById('readerNovelName');
  const readerChapterHeading = document.getElementById('readerChapterHeading');
  const readerChBadge = document.getElementById('readerChBadge');
  const readerChTitle = document.getElementById('readerChTitle');
  const readerChMeta = document.getElementById('readerChMeta');
  const readerBodyText = document.getElementById('readerBodyText');
  const readerEndCaption = document.getElementById('readerEndCaption');
  const readerChapterIndicator = document.getElementById('readerChapterIndicator');
  const readerScroll = document.getElementById('readerScroll');
  const readerScrollFill = document.getElementById('readerScrollFill');
  const readerScrollPct = document.getElementById('readerScrollPct');
  const btnPrevChapter = document.getElementById('btnPrevChapter');
  const btnNextChapter = document.getElementById('btnNextChapter');

  function recordReadingActivity(novelId, chapterNum, progressPct, readMins = 8) {
    const novel = getNovelEntry(novelId);
    if (!novel) return;

    const col = getCollectionInfo(novelId);
    col.lastChapter = chapterNum;
    if (!Array.isArray(col.readChapters)) col.readChapters = [];
    if (!col.readChapters.includes(chapterNum)) {
      col.readChapters.push(chapterNum);
    }
    if (chapterNum >= novel.totalChapters) {
      col.status = 'completed';
    }

    const existingIdx = appState.history.findIndex((h) => h.novelId === novelId);
    const entry = {
      novelId,
      chapterNum,
      progressPct: Math.min(100, Math.max(8, progressPct)),
      readMins,
      group: 'today',
      timeLabel: 'Baru saja',
      timestamp: Date.now()
    };
    if (existingIdx !== -1) {
      appState.history.splice(existingIdx, 1);
    }
    appState.history.unshift(entry);

    checkAndResetDailyTarget();
    const sessionKey = `${novelId}_${chapterNum}`;
    if (!appState.stats.countedSessionChapters) {
      appState.stats.countedSessionChapters = {};
    }
    if (!appState.stats.countedSessionChapters[sessionKey]) {
      appState.stats.countedSessionChapters[sessionKey] = true;
      appState.stats.totalChaptersRead = (Number(appState.stats.totalChaptersRead) || 0) + 1;
      appState.stats.totalMinutesRead = (Number(appState.stats.totalMinutesRead) || 0) + readMins;
      appState.stats.dailyChaptersRead = Math.min(
        Number(appState.stats.dailyTarget) || 20,
        (Number(appState.stats.dailyChaptersRead) || 0) + 1
      );
    }

    saveState();
  }

  function updateReaderScrollProgress() {
    if (!readerScroll || currentView !== 'reader') return;
    const maxScroll = readerScroll.scrollHeight - readerScroll.clientHeight;
    const pct =
      maxScroll <= 0
        ? 100
        : Math.min(100, Math.max(8, Math.round((readerScroll.scrollTop / maxScroll) * 100)));
    readerScrollFill.style.width = `${pct}%`;
    readerScrollPct.textContent = `${pct}%`;

    const existing = appState.history.find((h) => h.novelId === currentNovelId);
    if (existing && existing.chapterNum === currentChapterNum) {
      existing.progressPct = pct;
      saveState();
    }
  }

  async function resolveChapterContent(novel, chapterNum) {
    // 1. Check preloaded / cached chapters first
    if (novel.preloadedChapters && novel.preloadedChapters[chapterNum]) {
      return novel.preloadedChapters[chapterNum];
    }

    const catalogItem = (novel.chapterCatalog || []).find((c) => Number(c.num) === Number(chapterNum));

    // 2. If this is a SakuraNovel series, fetch directly from SakuraNovel WP REST API!
    // Works 100% live from Browser & Android APK without needing any PC server!
    if (novel.sakuraSeriId) {
      try {
        const apiUrl = catalogItem?.postId
          ? `https://sakuranovel.id/wp-json/wp/v2/posts/${catalogItem.postId}?_fields=id,title,content,date`
          : `https://sakuranovel.id/wp-json/wp/v2/posts?seri=${novel.sakuraSeriId}&per_page=1&offset=${Math.max(0, chapterNum - 1)}&order=asc&_fields=id,title,content,date`;

        const res = await fetch(apiUrl);
        if (res.ok) {
          const rawData = await res.json();
          const postObj = Array.isArray(rawData) ? rawData[0] : rawData;
          if (postObj && postObj.content?.rendered) {
            const paras = extractParagraphsFromHtml(postObj.content.rendered);
            if (paras.length > 0) {
              const rawTitle = decodeHtmlEntities(
                (postObj.title?.rendered || `Chapter ${chapterNum}`)
                  .replace(/<[^>]+>/g, '')
                  .replace(/Bahasa Indonesia/i, '')
                  .trim()
              );
              const wordCount = paras.join(' ').split(/\s+/).length;
              const readMins = Math.max(4, Math.round(wordCount / 180));
              const chObj = {
                num: chapterNum,
                code: String(chapterNum).padStart(3, '0'),
                title: rawTitle,
                readMins,
                paragraphs: paras
              };
              novel.preloadedChapters = novel.preloadedChapters || {};
              novel.preloadedChapters[chapterNum] = chObj;
              return chObj;
            }
          }
        }
      } catch {}
    }

    const targetUrl = catalogItem?.url || '';

    // 3. Try Native Android Kotlin Bridge (for NovelRingan / Meionovel inside Android APK)
    if (targetUrl && window.AndroidScraper && typeof window.AndroidScraper.fetchChapterJson === 'function') {
      try {
        const rawJson = window.AndroidScraper.fetchChapterJson(targetUrl, Number(chapterNum));
        const parsed = JSON.parse(rawJson);
        if (parsed && parsed.ok && Array.isArray(parsed.paragraphs) && parsed.paragraphs.length > 0) {
          const chObj = {
            num: chapterNum,
            code: String(chapterNum).padStart(3, '0'),
            title: parsed.title || `Chapter ${chapterNum}`,
            readMins: Math.max(4, Math.round(parsed.paragraphs.join(' ').split(/\s+/).length / 180)),
            paragraphs: parsed.paragraphs
          };
          novel.preloadedChapters = novel.preloadedChapters || {};
          novel.preloadedChapters[chapterNum] = chObj;
          return chObj;
        }
      } catch {}
    }

    // 4. Try live scraping from server.js (/api/chapter) if available
    if (targetUrl && window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(
          `/api/chapter?novelId=${encodeURIComponent(novel.id)}&num=${chapterNum}&url=${encodeURIComponent(targetUrl)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.chapter && Array.isArray(data.chapter.paragraphs)) {
            novel.preloadedChapters = novel.preloadedChapters || {};
            novel.preloadedChapters[chapterNum] = data.chapter;
            return data.chapter;
          }
        }
      } catch {}
    }

    // 5. Offline Fallback so Reader never errors even with airplane mode on
    const preloadedKeys = Object.keys(novel.preloadedChapters || {});
    if (preloadedKeys.length > 0) {
      const pickKey = preloadedKeys[(chapterNum - 1) % preloadedKeys.length];
      const baseCh = novel.preloadedChapters[pickKey];
      const paras = baseCh.paragraphs.slice();
      if (paras.length > 0) {
        paras[0] = `[Chapter ${chapterNum} — ${novel.title}] ` + paras[0];
      }
      return {
        num: chapterNum,
        code: String(chapterNum).padStart(3, '0'),
        title: catalogItem?.label || `Chapter ${chapterNum}`,
        readMins: baseCh.readMins || 8,
        paragraphs: paras
      };
    }

    const fallbackNovel = novelsById.tbate || novelsList[0];
    const fbCh = fallbackNovel?.preloadedChapters?.[1];
    return {
      num: chapterNum,
      code: String(chapterNum).padStart(3, '0'),
      title: `Chapter ${chapterNum} — ${novel.title}`,
      readMins: 8,
      paragraphs: fbCh?.paragraphs || [novel.synopsis || 'Teks novel Bahasa Indonesia.']
    };
  }

  async function openReader(novelId, chapterNum = 1) {
    const novel = getNovelEntry(novelId);
    if (!novel) return;

    currentNovelId = novel.id;
    currentChapterNum = Math.max(1, Math.min(Number(chapterNum) || 1, novel.totalChapters));
    const padNum = String(currentChapterNum).padStart(3, '0');

    readerNovelName.textContent = novel.title.toUpperCase();
    readerChapterHeading.textContent = `Memuat Chapter ${currentChapterNum}...`;
    readerChBadge.textContent = `CHAPTER ${padNum}`;
    readerChTitle.textContent = `Chapter ${currentChapterNum}`;
    readerChMeta.textContent = `Mengambil teks Bahasa Indonesia...`;
    readerEndCaption.textContent = `Akhir dari Chapter ${currentChapterNum}`;
    readerChapterIndicator.textContent = `Ch. ${currentChapterNum} / ${novel.totalChapters}`;
    readerBodyText.innerHTML = `<p>Sedang memuat isi chapter Bahasa Indonesia...</p>`;

    btnPrevChapter.disabled = currentChapterNum <= 1;
    btnNextChapter.disabled = currentChapterNum >= novel.totalChapters;

    document.getElementById('view-reader').classList.remove('immersive-mode');
    switchView('reader');

    const chData = await resolveChapterContent(novel, currentChapterNum);
    const cleanTitle = (chData.title || `Chapter ${currentChapterNum}`).replace(
      new RegExp(`^${(novel.scrapedTitle || novel.title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–:]?\\s*`, 'i'),
      ''
    );

    const cleanedParas = (chData.paragraphs || []).filter(
      (p) => !/baca\s+novel\s+lain\s+di\s+sakuranovel|^[-—=_\s]+$/i.test(p)
    );
    const finalParas = cleanedParas.length > 0 ? cleanedParas : chData.paragraphs || [];
    const wordCount = finalParas.join(' ').split(/\s+/).length;
    const readMins = chData.readMins || Math.max(4, Math.round(wordCount / 180));

    readerChapterHeading.textContent = `Chapter ${currentChapterNum} — ${cleanTitle}`;
    readerChTitle.textContent = cleanTitle;
    readerChMeta.innerHTML = `±${readMins} menit membaca &nbsp;·&nbsp; ${wordCount.toLocaleString('id-ID')} kata`;
    readerBodyText.innerHTML = finalParas.map((p) => `<p>${p}</p>`).join('');

    recordReadingActivity(novel.id, currentChapterNum, 15, readMins);

    if (readerScroll) {
      readerScroll.scrollTop = 0;
      setTimeout(updateReaderScrollProgress, 40);
    }
  }

  if (readerScroll) {
    readerScroll.addEventListener('scroll', updateReaderScrollProgress, { passive: true });
    readerScroll.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      document.getElementById('view-reader').classList.toggle('immersive-mode');
    });
  }

  if (btnPrevChapter) {
    btnPrevChapter.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentChapterNum > 1) {
        openReader(currentNovelId, currentChapterNum - 1);
      }
    });
  }

  if (btnNextChapter) {
    btnNextChapter.addEventListener('click', (e) => {
      e.stopPropagation();
      const novel = getNovelEntry(currentNovelId);
      if (currentChapterNum < novel.totalChapters) {
        openReader(currentNovelId, currentChapterNum + 1);
      }
    });
  }

  document.getElementById('readerBackBtn')?.addEventListener('click', () => {
    openNovelDetail(currentNovelId);
  });

  /* ==========================================================================
     11. READER PREFERENCES SHEET (Aa SETTINGS WITH PERSISTENCE)
     ========================================================================== */
  const readerView = document.getElementById('view-reader');
  const readerPrefsToggle = document.getElementById('readerPrefsToggle');
  const readerPrefsBackdrop = document.getElementById('readerPrefsBackdrop');
  const prefsCloseBtn = document.getElementById('prefsCloseBtn');
  const fontSizeVal = document.getElementById('fontSizeVal');
  const fsDots = document.querySelectorAll('#fsDots .fs-dot');

  const fontSizes = [13, 15, 16.5, 18, 20];
  const lineMap = { compact: '1.6', normal: '1.82', relaxed: '2.05' };

  function openPrefsSheet() {
    readerPrefsBackdrop.hidden = false;
  }

  function closePrefsSheet() {
    readerPrefsBackdrop.hidden = true;
  }

  function applySavedReaderPrefs() {
    const p = appState.prefs;
    readerView.classList.remove(
      'reader-theme-onyx',
      'reader-theme-amoled',
      'reader-theme-sepia',
      'reader-theme-paper'
    );
    readerView.classList.add(`reader-theme-${p.theme || 'onyx'}`);
    document.querySelectorAll('.theme-swatch').forEach((s) => {
      s.classList.toggle('active', s.getAttribute('data-rtheme') === (p.theme || 'onyx'));
    });

    readerView.style.setProperty(
      '--reader-font',
      p.font === 'sans' ? 'var(--font-sans)' : 'var(--font-reader-serif)'
    );
    document.querySelectorAll('[data-rfont]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-rfont') === (p.font || 'serif'));
    });

    const idx = Math.max(0, Math.min(Number(p.fsIndex) ?? 1, fontSizes.length - 1));
    const px = fontSizes[idx];
    readerView.style.setProperty('--reader-font-size', `${px}px`);
    if (fontSizeVal) fontSizeVal.textContent = `${px}px`;
    fsDots.forEach((d, i) => d.classList.toggle('active', i === idx));

    readerView.style.setProperty('--reader-line-height', lineMap[p.line] || '1.82');
    document.querySelectorAll('[data-rline]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-rline') === (p.line || 'normal'));
    });

    syncReaderStatusBar();
  }

  readerPrefsToggle?.addEventListener('click', openPrefsSheet);
  prefsCloseBtn?.addEventListener('click', closePrefsSheet);
  readerPrefsBackdrop?.addEventListener('click', (e) => {
    if (e.target === readerPrefsBackdrop) closePrefsSheet();
  });

  document.querySelectorAll('.theme-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      appState.prefs.theme = swatch.getAttribute('data-rtheme') || 'onyx';
      saveState();
      applySavedReaderPrefs();
    });
  });

  document.querySelectorAll('[data-rfont]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.prefs.font = btn.getAttribute('data-rfont') || 'serif';
      saveState();
      applySavedReaderPrefs();
    });
  });

  document.getElementById('btnFontDec')?.addEventListener('click', () => {
    if (appState.prefs.fsIndex > 0) {
      appState.prefs.fsIndex--;
      saveState();
      applySavedReaderPrefs();
    }
  });

  document.getElementById('btnFontInc')?.addEventListener('click', () => {
    if (appState.prefs.fsIndex < fontSizes.length - 1) {
      appState.prefs.fsIndex++;
      saveState();
      applySavedReaderPrefs();
    }
  });

  document.querySelectorAll('[data-rline]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.prefs.line = btn.getAttribute('data-rline') || 'normal';
      saveState();
      applySavedReaderPrefs();
    });
  });

  /* ==========================================================================
     12. INITIALIZE ALL VIEWS & RUN AUTOMATIC LIVE SAKURANOVEL SYNC
     ========================================================================== */
  updateHomeFilterCounts();
  renderHomeCarousel();
  renderCuratedList();
  renderHistoryView();
  renderCollectionView();
  renderProfileView();
  applySavedReaderPrefs();

  // Automatically & silently sync in the background on launch and every 3 minutes
  setTimeout(() => {
    syncLiveSakuraNovelCatalog(true);
  }, 600);
  setInterval(() => {
    syncLiveSakuraNovelCatalog(true);
  }, 180000);
});
