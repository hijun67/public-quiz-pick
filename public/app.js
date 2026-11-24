const $ = (s) => document.querySelector(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
const FILTERS = ['전체', '오늘 등록', '마감 임박', '상품권', '커피', '치킨음식', '생활용품', '퀴즈', '설문', 'SNS'];
let events = [], filter = '전체';
const today = new Date().toISOString().slice(0, 10);
const dday = (e) => e.end ? Math.ceil((new Date(e.end) - new Date(today)) / 864e5) : null;

function match(e) {
  const q = $('#q').value.trim().toLowerCase();
  if (q && !(e.title + e.agency + (e.prizes || []).join()).toLowerCase().includes(q)) return false;
  if (filter === '오늘 등록') return e.collectedAt === today;
  if (filter === '마감 임박') { const d = dday(e); return d !== null && d >= 0 && d <= 3; }
  if (['퀴즈', '설문', 'SNS'].includes(filter)) return e.kind === filter;
  if (filter !== '전체') return (e.prizes || []).includes(filter);
  return true;
}

function card(e) {
  const c = el('div', 'card'), d = dday(e);
  const t = el('span', 'tag' + (d !== null && d >= 0 && d <= 3 ? ' hot' : ''), d === null ? e.status : d < 0 ? '종료' : d === 0 ? '오늘 마감' : `D-${d}`);
  c.append(t, el('span', 'mute', ' ' + e.agency), el('h3', '', e.title), el('div', 'mute', '경품: ' + ((e.prizes || []).join(', ') || '원문 확인') + (e.quiz?.verified ? ' · 정답 확인 가능' : '')));
  c.onclick = () => { location.hash = '#/e/' + e.id; };
  return c;
}

function render() {
  const m = location.hash.match(/#\/e\/(\w+)/);
  const list = $('#list'), det = $('#detail');
  list.replaceChildren(); det.replaceChildren();
  if (m) { const e = events.find((x) => x.id === m[1]); if (e) return detail(e, det); }
  const items = events.filter((e) => e.status !== '종료' && match(e));
  if (!items.length) list.append(el('p', 'mute', events.length ? '조건에 맞는 진행 중 이벤트가 없습니다.' : '아직 수집된 이벤트가 없습니다. 수집기를 실행하면 목록이 채워집니다.'));
  items.forEach((e) => list.append(card(e)));
}

function detail(e, root) {
  const q = e.quiz, b = el('div', 'box');
  b.append(el('a', '', '← 목록'), el('h2', '', e.title), el('p', 'mute', `${e.agency} · 마감 ${e.end || '확인필요'} · 수집일 ${e.collectedAt}`), el('p', '', '경품: ' + ((e.prizes || []).join(', ') || '원문 확인')));
  b.firstChild.href = '#';
  const a = el('div', 'box');
  if (q?.verified) { a.append(el('p', '', '문제: ' + q.question), el('p', '', '정답: ' + q.answer), el('p', 'mute', '근거: ' + q.evidence)); const s = el('a', '', '근거 출처'); s.href = q.sourceUrl; s.rel = 'nofollow noopener'; a.append(s); }
  else a.append(el('p', '', q ? '정답: 검증 필요 (확실하지 않아 표시하지 않습니다)' : '정답 분석 전입니다.'));
  const go = el('a', 'btn', '원본 페이지에서 응모하기 →'); go.href = e.url; go.target = '_blank'; go.rel = 'nofollow noopener';
  root.append(b, a, el('div', 'ad'), go, el('p', 'mute', '출처: ' + e.url + ' · 응모와 개인정보 입력은 원본 사이트에서 직접 진행하세요.'));
}

(async () => {
  const bar = $('#chips');
  FILTERS.forEach((f) => { const c = el('button', 'chip' + (f === filter ? ' on' : ''), f); c.onclick = () => { filter = f; [...bar.children].forEach((x) => x.classList.toggle('on', x === c)); location.hash = ''; render(); }; bar.append(c); });
  $('#q').oninput = render; window.onhashchange = render;
  try { events = await (await fetch('/data/events.json')).json(); } catch { events = []; }
  render();
  const id = window.PQP?.adsenseId;
  if (id) { const s = document.createElement('script'); s.async = true; s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + id; s.crossOrigin = 'anonymous'; document.head.append(s); }
})();
