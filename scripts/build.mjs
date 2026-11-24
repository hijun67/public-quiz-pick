// events.json → 이벤트별 정적 페이지(SEO) + sitemap.xml + robots.txt
import fs from 'node:fs';
const SITE = (process.env.SITE_URL || 'https://example.pages.dev').replace(/\/$/, '');
const list = JSON.parse(fs.readFileSync('public/data/events.json', 'utf8'));
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
fs.mkdirSync('public/e', { recursive: true });
for (const f of fs.readdirSync('public/e')) fs.unlinkSync('public/e/' + f);

for (const e of list) {
  const q = e.quiz;
  const ans = q ? (q.verified ? `<p><b>정답:</b> ${esc(q.answer)}</p><p><b>근거:</b> ${esc(q.evidence)}</p><p><a href="${esc(q.sourceUrl)}" rel="nofollow noopener">근거 출처</a></p>` : '<p><b>정답:</b> 검증 필요 (확실하지 않아 표시하지 않습니다)</p>') : '<p>정답 분석 전입니다.</p>';
  fs.writeFileSync(`public/e/${e.id}.html`, `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(e.title)} - 공공퀴즈픽</title><meta name="description" content="${esc(e.agency)} ${esc(e.title)} 정답·마감일·응모 방법"><link rel="stylesheet" href="/style.css"></head><body><header class="top"><a href="/">🎁 공공퀴즈픽</a></header><main class="wrap"><h1>${esc(e.title)}</h1><p>${esc(e.agency)} · ${esc(e.status)} · 마감 ${esc(e.end || '확인필요')}</p><p>경품: ${esc((e.prizes || []).join(', ') || '원문 확인')}</p>${ans}<p><a class="btn" href="${esc(e.url)}" rel="nofollow noopener" target="_blank">원본 페이지에서 응모하기 →</a></p><p class="mute">출처: ${esc(e.url)} · 수집일 ${esc(e.collectedAt)}. 응모는 원본 사이트에서 직접 진행하세요.</p></main></body></html>`);
}
const urls = [`${SITE}/`, ...list.map((e) => `${SITE}/e/${e.id}.html`)];
fs.writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${u}</loc></url>`).join('')}</urlset>`);
fs.writeFileSync('public/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`페이지 ${list.length}개 생성`);
