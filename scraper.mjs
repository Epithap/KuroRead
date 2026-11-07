import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function cleanParagraphs(rawHtml = '') {
  // Remove scripts, styles, ads
  const noScripts = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<div class="nrln"[\s\S]*?<\/div>/gi, '')
    .replace(/<center>[\s\S]*?<\/center>/gi, '');

  const pMatches = [...noScripts.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  let paras = [];
  if (pMatches.length > 2) {
    for (const m of pMatches) {
      const inner = m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
      const lines = decodeHtmlEntities(inner)
        .split('\n')
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(s => s.length > 0 && !/^(baca novel|novelringan|meionovel|iklan)/i.test(s));
      paras.push(...lines);
    }
  } else {
    const plain = decodeHtmlEntities(
      noScripts.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')
    );
    paras = plain
      .split('\n')
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(s => s.length > 0);
  }
  return paras;
}

export async function scrapeNovelRinganSeries(seriesUrl) {
  const res = await fetch(seriesUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${seriesUrl}`);
  const html = await res.text();

  const titleMatch = html.match(/<h1 class="entry-title"[^>]*>([\s\S]*?)<\/h1>/i);
  const rawTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').replace(/Bahasa Indonesia/i, '').trim()) : '';

  const coverMatch =
    html.match(/<meta itemprop="url" content="([^"]+)"/i) ||
    html.match(/property="og:image" content="([^"]+)"/i) ||
    html.match(/data-sxrx="([^"]+)"/i);
  let coverUrl = coverMatch ? coverMatch[1] : '';
  if (coverUrl && !coverUrl.startsWith('http')) {
    coverUrl = `https://novelringan.com/wp-content/uploads/${coverUrl.replace(/^\/+/, '')}`;
  }

  // Author encoded in base64 data-t
  const authorB64 = html.match(/<b>Penulis:<\/b>[\s\S]*?data-t=['"]([^'"]+)['"]/i);
  let author = 'Anonim';
  if (authorB64) {
    try {
      author = Buffer.from(authorB64[1], 'base64').toString('utf8').trim();
    } catch {}
  }

  const statusMatch = html.match(/<b>Status:<\/b>\s*([^<]+)/i);
  const status = statusMatch ? statusMatch[1].trim() : 'Ongoing';

  // Genres
  const genreBlock = html.match(/<b>Genre:<\/b>([\s\S]*?)<\/li>/i);
  const genres = genreBlock
    ? [...genreBlock[1].matchAll(/rel="tag">([^<]+)<\/a>/gi)].map(m => decodeHtmlEntities(m[1].trim()))
    : ['Fantasy', 'Adventure'];

  // Synopsis
  const bacotanMatch = html.match(/<div[^>]*id=['"]bacotan['"][^>]*>([\s\S]*?)<\/div>/i);
  let synopsis = '';
  if (bacotanMatch) {
    synopsis = cleanParagraphs(bacotanMatch[1]).join(' ');
  } else {
    const mainInfoMatch = html.match(/<div class="maininfo">[\s\S]*?<span>([\s\S]*?)<ul>/i);
    if (mainInfoMatch) {
      synopsis = cleanParagraphs(mainInfoMatch[1]).join(' ');
    }
  }

  // Chapter list inside <div class="bxcl">
  const bxclIdx = html.indexOf('<div class="bxcl"');
  const bxclHtml = bxclIdx !== -1 ? html.slice(bxclIdx) : html;
  const rawChs = [...bxclHtml.matchAll(/<li>\s*<a href="(https:\/\/novelringan\.com\/[^"]+)">\s*([^<]+)<\/a>\s*<\/li>/gi)];
  // Reverse so Chapter 1 is first
  const chaptersReversed = rawChs.reverse().map((m, idx) => ({
    num: idx + 1,
    label: decodeHtmlEntities(m[2].trim()),
    url: m[1].trim()
  }));

  return {
    source: 'NovelRingan',
    sourceUrl: seriesUrl,
    scrapedTitle: rawTitle,
    author,
    status,
    genres,
    coverUrl,
    synopsis,
    totalChapters: chaptersReversed.length,
    chapters: chaptersReversed
  };
}

export async function scrapeNovelRinganChapter(chapterUrl) {
  const res = await fetch(chapterUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${chapterUrl}`);
  const html = await res.text();

  const titleMatch = html.match(/<h1 class="entry-title"[^>]*>([\s\S]*?)<\/h1>/i);
  const chTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').replace(/Bahasa Indonesia/i, '').trim()) : '';

  const contentIdx = html.indexOf('<div id="nr-nv-content">');
  let rawContent = '';
  if (contentIdx !== -1) {
    const sub = html.slice(contentIdx);
    const endIdx = sub.indexOf('<div class="navimedia"');
    rawContent = endIdx !== -1 ? sub.slice(0, endIdx) : sub.slice(0, 35000);
  } else {
    const entryMatch = html.match(/<div class="entry-content"[^>]*>([\s\S]*?)<\/div>\s*<footer/i);
    rawContent = entryMatch ? entryMatch[1] : '';
  }

  const paragraphs = cleanParagraphs(rawContent);
  return {
    url: chapterUrl,
    title: chTitle,
    paragraphs
  };
}

export async function scrapeMeioNovelSeries(novelUrl) {
  const cleanUrl = novelUrl.endsWith('/') ? novelUrl : `${novelUrl}/`;
  const res = await fetch(cleanUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${cleanUrl}`);
  const html = await res.text();

  const titleMatch = html.match(/<div class="post-title">\s*<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const scrapedTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim()) : '';

  const coverMatch =
    html.match(/<div class="summary_image">[\s\S]*?(?:data-src|src)="([^"]+)"/i) ||
    html.match(/property="og:image" content="([^"]+)"/i);
  const coverUrl = coverMatch ? coverMatch[1] : '';

  const authorMatch = html.match(/<div class="author-content">([\s\S]*?)<\/div>/i);
  const author = authorMatch ? decodeHtmlEntities(authorMatch[1].replace(/<[^>]+>/g, '').trim()) : 'Anonim';

  const genreMatch = html.match(/<div class="genres-content">([\s\S]*?)<\/div>/i);
  const genres = genreMatch
    ? genreMatch[1].replace(/<[^>]+>/g, '').split(',').map(s => decodeHtmlEntities(s.trim())).filter(Boolean)
    : ['Fantasy', 'Light Novel'];

  const synMatch = html.match(/<div class="summary__content[^"]*">([\s\S]*?)<\/div>/i);
  const synopsis = synMatch ? cleanParagraphs(synMatch[1]).join(' ') : '';

  // Fetch chapters via AJAX POST
  const rAjax = await fetch(`${cleanUrl}ajax/chapters/`, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest' }
  });
  const ajaxHtml = rAjax.ok ? await rAjax.text() : '';
  const rawChs = [...ajaxHtml.matchAll(/<li class="wp-manga-chapter[^"]*">\s*<a href="([^"]+)">([\s\S]*?)<\/a>/gi)];
  const chaptersReversed = rawChs.reverse().map((m, idx) => ({
    num: idx + 1,
    label: decodeHtmlEntities(m[2].replace(/<[^>]+>/g, '').trim()),
    url: m[1].trim()
  }));

  return {
    source: 'Meionovel',
    sourceUrl: cleanUrl,
    scrapedTitle,
    author,
    status: 'Ongoing',
    genres,
    coverUrl,
    synopsis,
    totalChapters: chaptersReversed.length,
    chapters: chaptersReversed
  };
}

export async function scrapeMeioNovelChapter(chapterUrl) {
  const res = await fetch(chapterUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${chapterUrl}`);
  const html = await res.text();

  const titleMatch = html.match(/<ol class="breadcrumb">[\s\S]*?<li class="active">([\s\S]*?)<\/li>/i) ||
    html.match(/<title>([\s\S]*?)<\/title>/i);
  const chTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim()) : '';

  const textLeftIdx = html.indexOf('<div class="text-left">');
  let rawContent = '';
  if (textLeftIdx !== -1) {
    const sub = html.slice(textLeftIdx);
    const endIdx = sub.indexOf('</div>');
    rawContent = endIdx !== -1 ? sub.slice(0, endIdx + 6) : sub.slice(0, 35000);
  }

  const paragraphs = cleanParagraphs(rawContent);
  return {
    url: chapterUrl,
    title: chTitle,
    paragraphs
  };
}

// Catalog of 10 Indonesian Light Novels / Web Novels to scrape
const TARGET_NOVELS = [
  {
    id: 'tbate',
    displayTitle: 'The Beginning After The End',
    altTitle: 'Ousama di Usia 3 Tahun',
    type: 'novelringan',
    url: 'https://novelringan.com/series/ousama-di-usia-3-tahun/',
    fallbackAuthor: 'TurtleMe',
    rating: '4.8',
    rank: '#1',
    statusOverride: 'Completed',
    localCoverOverride: 'assets/tbate_hi.jpg',
    thumbOverride: 'assets/tbate.png',
    weeklyFeatured: true,
    curatedTagline: 'Reinkarnasi Raja Grey ke dunia sihir penuh misteri dan peperangan benua.',
    extraChaptersToScrape: [141, 142]
  },
  {
    id: 'lotm',
    displayTitle: 'Lord of The Mystery',
    altTitle: 'Raja Sinbiui (Guimi Zhi Zhu)',
    type: 'novelringan',
    url: 'https://novelringan.com/series/raja-sinbiui/',
    fallbackAuthor: 'Cuttlefish That Loves Diving',
    rating: '4.9',
    rank: '#2',
    statusOverride: 'Completed',
    localCoverOverride: 'assets/lotm.png',
    thumbOverride: 'assets/lotm.png',
    weeklyFeatured: true,
    curatedTagline: 'Rahasia kuno dan dunia okultisme dalam satu kisah yang memikat.',
    extraChaptersToScrape: [87, 88]
  },
  {
    id: 'ri',
    displayTitle: 'Reverend Insanity',
    altTitle: 'Gu Daoist Master',
    type: 'novelringan',
    url: 'https://novelringan.com/series/reverend-insanity/',
    fallbackAuthor: 'Gu Zhen Ren',
    rating: '4.7',
    rank: '#3',
    statusOverride: 'Ongoing',
    localCoverOverride: 'assets/ri.png',
    thumbOverride: 'assets/ri.png',
    weeklyFeatured: true,
    curatedTagline: 'Ambisi tanpa batas di dunia yang tak mengenal belas kasihan.',
    extraChaptersToScrape: [139]
  },
  {
    id: 'orv',
    displayTitle: "Omniscient Reader's Viewpoint",
    altTitle: 'Perspektif Zenchi Duzhe',
    type: 'novelringan',
    url: 'https://novelringan.com/series/perspektif-zenchi-duzhe/',
    fallbackAuthor: 'Sing Shong',
    rating: '4.9',
    rank: '#4',
    statusOverride: 'Completed',
    localCoverOverride: 'assets/orv.png',
    thumbOverride: 'assets/orv.png',
    weeklyFeatured: true,
    curatedTagline: 'Satu-satunya pembaca yang mengetahui akhir dari dunia yang runtuh.',
    extraChaptersToScrape: []
  },
  {
    id: 'sl',
    displayTitle: 'Solo Leveling',
    altTitle: 'Naik Strata Sendiri',
    type: 'novelringan',
    url: 'https://novelringan.com/series/naik-strata-sendiri/',
    fallbackAuthor: 'Chugong',
    rating: '4.8',
    rank: '#5',
    statusOverride: 'Completed',
    localCoverOverride: 'assets/sl.jpg',
    thumbOverride: 'assets/sl.jpg',
    weeklyFeatured: false,
    curatedTagline: 'Hunter terlemah umat manusia yang bangkit sebagai Raja Bayangan.',
    extraChaptersToScrape: []
  },
  {
    id: 'ss',
    displayTitle: 'Shadow Slave',
    altTitle: 'Budak Noye',
    type: 'novelringan',
    url: 'https://novelringan.com/series/budak-noye/',
    fallbackAuthor: 'Guiltythree',
    rating: '4.9',
    rank: '#6',
    statusOverride: 'Ongoing',
    weeklyFeatured: false,
    curatedTagline: 'Terjebak di Nightmare Spell, Sunny bertahan hidup dengan kekuatan bayangan.',
    extraChaptersToScrape: []
  },
  {
    id: 'mt',
    displayTitle: 'Mushoku Tensei (LN)',
    altTitle: 'Jobless Reincarnation',
    type: 'novelringan',
    url: 'https://novelringan.com/series/mushoku-tensei-ln/',
    fallbackAuthor: 'Rifujin na Magonote',
    rating: '4.8',
    rank: '#7',
    statusOverride: 'Completed',
    weeklyFeatured: false,
    curatedTagline: 'Kesempatan kedua untuk menjalani hidup sepenuhnya di dunia pedang dan sihir.',
    extraChaptersToScrape: []
  },
  {
    id: 'nm',
    displayTitle: 'Nano Machine',
    altTitle: 'Keturunan Dewa Iblis',
    type: 'novelringan',
    url: 'https://novelringan.com/series/keturunan-dewa-iblis/',
    fallbackAuthor: 'Han-Joong-Wueol-Ya',
    rating: '4.7',
    rank: '#8',
    statusOverride: 'Completed',
    weeklyFeatured: false,
    curatedTagline: 'Teknologi nanomachine masa depan membangkitkan penguasa Sekte Iblis.',
    extraChaptersToScrape: []
  },
  {
    id: 'toma',
    displayTitle: 'Throne of Magical Arcana',
    altTitle: 'Tahta Arcana Sihir',
    type: 'novelringan',
    url: 'https://novelringan.com/series/throne-of-magical-arcana/',
    fallbackAuthor: 'Cuttlefish That Loves Diving',
    rating: '4.7',
    rank: '#9',
    statusOverride: 'Completed',
    weeklyFeatured: false,
    curatedTagline: 'Ketika sains modern dan musik klasik mengguncang fondasi sihir dunia lain.',
    extraChaptersToScrape: []
  },
  {
    id: 'agv',
    displayTitle: 'Si Jenius Akademi Itu Adalah Penjahat',
    altTitle: "The Academy's Genius is a Villain",
    type: 'meionovel',
    url: 'https://meionovels.com/novel/si-jenius-akademi-itu-adalah-penjahat/',
    fallbackAuthor: 'Yoo Seong',
    rating: '4.6',
    rank: '#10',
    statusOverride: 'Ongoing',
    weeklyFeatured: false,
    curatedTagline: 'Masuk ke dunia game sebagai karakter misterius dengan kekuatan suksesi.',
    extraChaptersToScrape: []
  }
];

async function downloadCover(url, destPath) {
  if (!url) return false;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

async function runFullScrape() {
  const coversDir = path.join(__dirname, 'assets', 'covers');
  const dataDir = path.join(__dirname, 'data');
  await fs.mkdir(coversDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });

  const novelsOutput = [];

  for (const item of TARGET_NOVELS) {
    console.log(`\n[SCRAPING] ${item.displayTitle} (${item.url})...`);
    try {
      const meta =
        item.type === 'meionovel'
          ? await scrapeMeioNovelSeries(item.url)
          : await scrapeNovelRinganSeries(item.url);

      // Download cover
      let localCoverPath = item.localCoverOverride || '';
      if (meta.coverUrl) {
        const ext = meta.coverUrl.split('?')[0].endsWith('.png') ? 'png' : 'jpg';
        const dlRel = `assets/covers/${item.id}.${ext}`;
        const ok = await downloadCover(meta.coverUrl, path.join(__dirname, dlRel));
        if (ok && !localCoverPath) {
          localCoverPath = dlRel;
        }
      }
      if (!localCoverPath) localCoverPath = 'assets/tbate.png';

      // Select first 4 chapters + any extra chapters needed for History/Continue
      const indicesToScrape = new Set([0, 1, 2, 3]);
      for (const chNum of item.extraChaptersToScrape || []) {
        if (chNum - 1 >= 0 && chNum - 1 < meta.chapters.length) {
          indicesToScrape.add(chNum - 1);
        }
      }

      const preloadedChapters = {};
      for (const idx of indicesToScrape) {
        const chEntry = meta.chapters[idx];
        if (!chEntry) continue;
        try {
          const chData =
            item.type === 'meionovel'
              ? await scrapeMeioNovelChapter(chEntry.url)
              : await scrapeNovelRinganChapter(chEntry.url);
          if (chData.paragraphs && chData.paragraphs.length > 0) {
            // Estimate reading minutes
            const wordCount = chData.paragraphs.join(' ').split(/\s+/).length;
            const readMins = Math.max(4, Math.round(wordCount / 180));
            preloadedChapters[chEntry.num] = {
              num: chEntry.num,
              code: String(chEntry.num).padStart(3, '0'),
              title: chData.title || chEntry.label || `Chapter ${chEntry.num}`,
              label: chEntry.label,
              url: chEntry.url,
              meta: `Sudah diikuti · ${readMins} menit`,
              readMins,
              paragraphs: chData.paragraphs
            };
            console.log(`  ✓ Ch.${chEntry.num} (${chEntry.label}): ${chData.paragraphs.length} paragraf (${wordCount} kata)`);
          }
        } catch (err) {
          console.warn(`  ! Failed chapter ${chEntry.url}:`, err.message);
        }
      }

      // Keep lightweight catalog of up to 600 chapters with their real scraped URLs
      const chapterCatalog = meta.chapters.map(c => ({
        num: c.num,
        code: String(c.num).padStart(3, '0'),
        label: c.label,
        url: c.url
      }));

      novelsOutput.push({
        id: item.id,
        title: item.displayTitle,
        scrapedTitle: meta.scrapedTitle || item.altTitle,
        altTitle: item.altTitle,
        author: meta.author && meta.author !== 'Anonim' ? meta.author : item.fallbackAuthor,
        rating: item.rating,
        rank: item.rank,
        status: item.statusOverride || meta.status || 'Ongoing',
        totalChapters: meta.totalChapters || chapterCatalog.length,
        chaptersText: `${meta.totalChapters || chapterCatalog.length} Chapter`,
        chaptersShort: `${meta.totalChapters || chapterCatalog.length} CH`,
        cover: localCoverPath,
        thumb: item.thumbOverride || localCoverPath,
        remoteCover: meta.coverUrl,
        source: meta.source,
        sourceUrl: meta.sourceUrl,
        weeklyFeatured: !!item.weeklyFeatured,
        curatedTagline: item.curatedTagline,
        genres: meta.genres.length > 0 ? meta.genres.slice(0, 4) : ['Fantasy', 'Action', 'Adventure'],
        synopsis: meta.synopsis || item.curatedTagline,
        chapterCatalog,
        preloadedChapters
      });
    } catch (err) {
      console.error(`[ERROR] Failed scraping ${item.displayTitle}:`, err.message);
    }
  }

  const dbPayload = {
    scrapedAt: new Date().toISOString(),
    sources: ['https://novelringan.com', 'https://meionovels.com'],
    totalNovels: novelsOutput.length,
    novels: novelsOutput
  };

  await fs.writeFile(path.join(dataDir, 'novels_db.json'), JSON.stringify(dbPayload, null, 2), 'utf8');
  await fs.writeFile(
    path.join(dataDir, 'novels_db.js'),
    `// Auto-generated by KuroRead Web Scraper (NovelRingan & Meionovel)\nwindow.KUROREAD_DB = ${JSON.stringify(dbPayload, null, 2)};\n`,
    'utf8'
  );
  console.log(`\nDone! Scraped ${novelsOutput.length} novels into data/novels_db.json & data/novels_db.js`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runFullScrape();
}
