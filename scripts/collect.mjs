// 공공기관 이벤트 수집기: 공개 페이지만 읽습니다. 로그인/CAPTCHA 우회 없음.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DATA = 'public/data/events.json';
const KEY_RE = /퀴즈|이벤트|경품|설문|상품권|기프티콘/;
const PRIZES = { 상품권: /상품권/, 커피: /커피|스타벅스|아메리카노/, 치킨음식: /치킨|피자|햄버거|음식|쿠폰/, 생활용품: /생활용품|텀블러|보조배터리|선물/ };
const UA = { 'User-Agent': 'PublicQuizPickBot/1.0 (+public-info-collector)' };
const today = new Date().toISOString().slice(0, 10);

const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const meta = (h, p) => (h.match(new RegExp(`<meta[^>]+property=["']${p}["'][^>]+content=["']([^"']*)`, 'i')) || [])[1] || '';
const id = (u) => crypto.createHash('sha1').update(u).digest('hex').slice(0, 10);

async function get(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  try {
    const r = await fetch(url, { headers: UA, signal: c.signal });
    if (!r.ok) return '';
    return await r.text();
  } catch { return ''; } finally { clearTimeout(t); }
}

function dates(text) {
  const out = [];
  for (const m of text.matchAll(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/g))
    out.push(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`);
  return out.sort();
}

function parse(html, url, src) {
  const text = strip(html);
  const title = (meta(html, 'og:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
  if (!KEY_RE.test(title + text.slice(0, 500))) return null;
  const ds = dates(text);
  const end = ds.length ? ds[ds.length - 1] : null;
  const prize = Object.keys(PRIZES).filter((k) => PRIZES[k].test(text)).concat(/경품|상품/.test(text) ? [] : []);
  const kind = /퀴즈|정답/.test(title + text.slice(0, 800)) ? '퀴즈' : /설문/.test(title) ? '설문' : /instagram|facebook|sns/i.test(url + title) ? 'SNS' : '이벤트';
  return {
    id: id(url), title, agency: src.agency, agencyType: src.type, url,
    image: meta(html, 'og:image'), start: ds[0] || null, end,
    prizes: prize, kind, summary: text.slice(0, 400),
    status: end ? (end < today ? '종료' : '진행중') : '확인필요',
    collectedAt: today, quiz: null,
  };
}

async function discover(src) {
  const html = await get(src.url);
  const links = new Map();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = strip(m[2]);
    if (!KEY_RE.test(label)) continue;
    try { links.set(new URL(m[1], src.url).href, label); } catch {}
  }
  return [...links.keys()].slice(0, 15);
}

async function askAI(ev) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const body = {
    model: process.env.AI_MODEL || 'claude-sonnet-4-6', max_tokens: 1200,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    messages: [{ role: 'user', content: `다음 공공기관 이벤트 페이지 내용에서 퀴즈 문제를 찾고, 공식 자료를 검색해 정답을 확인하세요. 확실하지 않으면 confident를 false로 하세요. 추측 금지.\n제목: ${ev.title}\n본문: ${ev.summary}\nURL: ${ev.url}\n\nJSON만 출력: {"question":"","answer":"","evidence":"","sourceUrl":"","confident":true}` }],
  };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body) });
    const j = await r.json();
    const txt = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const o = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    return { question: o.question, answer: o.answer, evidence: o.evidence, sourceUrl: o.sourceUrl, verified: !!(o.confident && o.sourceUrl) };
  } catch { return null; }
}

const db = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : [];
const byUrl = new Map(db.map((e) => [e.url, e]));
const { sources } = JSON.parse(fs.readFileSync('sources.json', 'utf8'));

let added = 0;
for (const src of sources) {
  for (const url of await discover(src)) {
    if (byUrl.has(url)) continue; // 중복 방지
    const ev = parse(await get(url), url, src);
    if (ev) { byUrl.set(url, ev); added++; }
  }
}

let ai = 0;
for (const ev of byUrl.values()) {
  if (ev.end && ev.end < today) ev.status = '종료'; // 종료 자동 변경
  if (ev.kind === '퀴즈' && ev.status !== '종료' && !ev.quiz && ai < 10) { ev.quiz = await askAI(ev); ai++; }
}

const list = [...byUrl.values()].sort((a, b) => (b.collectedAt + b.id).localeCompare(a.collectedAt + a.id));
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync(DATA, JSON.stringify(list, null, 1));
console.log(`신규 ${added}건 / 전체 ${list.length}건 / AI 분석 ${ai}건`);
