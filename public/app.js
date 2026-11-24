const $ = (s) => document.querySelector(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
const GROUPS = [['기간', ['전체', '오늘 등록', '마감 임박']], ['경품', ['상품권', '커피', '치킨음식', '생활용품']], ['종류', ['퀴즈', '설문', 'SNS', '이벤트']]];
const TAGS = { 모바일상품권: /모바일\s*상품권|기프티콘|e-?쿠폰/, 지역상품권: /지역사랑|온누리|지역화폐/, 추첨: /추첨/, 선착순: /선착순/, 정답맞히기: /정답|퀴즈/, 설문조사: /설문/, 댓글: /댓글/, 인스타그램: /instagram|인스타/i, 카카오: /카카오/, 앱설치: /앱\s*(설치|다운)/, 모바일응모: /모바일|QR/ };
const S = { filter: '전체', type: '', sort: '마감순', ended: false, fav: false, tag: '' };
const today = new Date().toISOString().slice(0, 10);
const dday = (e) => e.end ? Math.ceil((new Date(e.end) - new Date(today)) / 864e5) : null;
const store = { get() { try { return JSON.parse(localStorage.getItem('pqp-fav') || '[]'); } catch { return []; } }, set(v) { try { localStorage.setItem('pqp-fav', JSON.stringify(v)); } catch {} } };
let events = [], fav = store.get();

function enrich(e) {
  const d = dday(e), txt = e.title + ' ' + (e.summary || ''), m = txt.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*(만)?\s*원/);
  e.d = d; e.tags = Object.keys(TAGS).filter((k) => TAGS[k].test(txt)); e.amount = m ? m[1] + (m[2] ? '만원' : '원') : '';
  e.labels = [];
  if (e.status === '종료' || (d !== null && d < 0)) e.labels.push(['종료', '']);
  else if (d === 0) e.labels.push(['오늘 마감', 'hot']);
  else if (d !== null && d <= 3) e.labels.push([`D-${d}`, 'hot']);
  else if (d !== null) e.labels.push([`D-${d}`, '']);
  else e.labels.push(['기간 확인', '']);
  if (e.collectedAt && (new Date(today) - new Date(e.collectedAt)) / 864e5 <= 2) e.labels.push(['NEW', 'new']);
  if (e.quiz?.verified) e.labels.push(['정답확인', 'ok']);
  return e;
}

function match(e) {
  const q = $('#q').value.trim().toLowerCase();
  if (q && !(e.title + e.agency + (e.prizes || []).join() + e.tags.join()).toLowerCase().includes(q)) return false;
  if (S.type && e.agencyType !== S.type) return false;
  if (S.tag && !e.tags.includes(S.tag)) return false;
  if (S.fav && !fav.includes(e.id)) return false;
  if (S.filter === '오늘 등록') return e.collectedAt === today;
  if (S.filter === '마감 임박') return e.d !== null && e.d >= 0 && e.d <= 3;
  if (['퀴즈', '설문', 'SNS', '이벤트'].includes(S.filter)) return e.kind === S.filter;
  if (S.filter !== '전체') return (e.prizes || []).includes(S.filter);
  return true;
}

function card(e) {
  const c = el('div', 'card'), top = el('div', 'row');
  e.labels.forEach(([t, k]) => top.append(el('span', 'tag ' + k, t)));
  const star = el('button', 'star' + (fav.includes(e.id) ? ' on' : ''), fav.includes(e.id) ? '★' : '☆');
  star.title = '찜하기'; star.onclick = (ev) => { ev.stopPropagation(); fav = fav.includes(e.id) ? fav.filter((x) => x !== e.id) : [...fav, e.id]; store.set(fav); render(); };
  top.append(star);
  if (e.image) { const im = el('img', 'thumb'); im.src = e.image; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer'; im.onerror = () => im.remove(); c.append(im); }
  const tg = el('div', 'row');
  [e.kind, e.agencyType, ...(e.prizes || []), ...e.tags].filter(Boolean).forEach((t) => { const b = el('button', 'tagbtn' + (S.tag === t ? ' on' : ''), '#' + t); b.onclick = (ev) => { ev.stopPropagation(); if (e.tags.includes(t)) S.tag = S.tag === t ? '' : t; else S.filter = t; render(); }; tg.append(b); });
  c.append(top, el('div', 'mute', e.agency), el('h3', '', e.title), el('div', 'mute', '경품: ' + ((e.prizes || []).join(', ') || '원문 확인') + (e.amount ? ' · ' + e.amount : '')), tg);
  c.onclick = () => { location.hash = '#/e/' + e.id; };
  return c;
}

function chips() {
  const bar = $('#chips'), act = events.filter((e) => e.status !== '종료');
  bar.replaceChildren();
  GROUPS.forEach(([g, items]) => {
    const row = el('div', 'grp'); row.append(el('span', 'mute glabel', g));
    items.forEach((f) => {
      const n = f === '전체' ? act.length : act.filter((e) => ({ '오늘 등록': e.collectedAt === today, '마감 임박': e.d !== null && e.d >= 0 && e.d <= 3 }[f] ?? (e.kind === f || (e.prizes || []).includes(f)))).length;
      const c = el('button', 'chip' + (f === S.filter ? ' on' : ''), `${f === '치킨음식' ? '치킨·음식' : f} ${n}`);
      c.onclick = () => { S.filter = f; location.hash = ''; render(); }; row.append(c);
    });
    bar.append(row);
  });
}

function render() {
  chips();
  const m = location.hash.match(/#\/e\/(\w+)/), list = $('#list'), det = $('#detail'), tb = $('#tagbar');
  list.replaceChildren(); det.replaceChildren(); tb.replaceChildren();
  $('#tools').hidden = $('#chips').hidden = !!m;
  if (m) { const e = events.find((x) => x.id === m[1]); if (e) return detail(e, det); }
  if (S.tag) { const b = el('button', 'chip on', '#' + S.tag + ' ✕'); b.onclick = () => { S.tag = ''; render(); }; tb.append(b); }
  $('#fav').classList.toggle('on', S.fav);
  const items = events.filter((e) => (S.ended || e.status !== '종료') && match(e));
  items.sort((a, b) => S.sort === '최신순' ? (b.collectedAt + b.id).localeCompare(a.collectedAt + a.id) : (a.d ?? 9999) - (b.d ?? 9999));
  $('#count').textContent = `${items.length}건`;
  if (!items.length) list.append(el('p', 'mute', events.length ? '조건에 맞는 이벤트가 없습니다.' : '아직 수집된 이벤트가 없습니다. 수집기를 실행하면 목록이 채워집니다. (화면 확인용: 주소 끝에 ?demo=1)'));
  items.forEach((e) => list.append(card(e)));
}

function detail(e, root) {
  const q = e.quiz, b = el('div', 'box'), back = el('a', '', '← 목록'), row = el('div', 'row');
  back.href = '#';
  e.labels.forEach(([t, k]) => row.append(el('span', 'tag ' + k, t)));
  [e.kind, e.agencyType, ...(e.prizes || []), ...e.tags].filter(Boolean).forEach((t) => row.append(el('span', 'tagbtn', '#' + t)));
  b.append(back, el('h2', '', e.title), row, el('p', 'mute', `${e.agency} · 기간 ${e.start || '?'} ~ ${e.end || '확인필요'} · 수집일 ${e.collectedAt}`), el('p', '', '경품: ' + ((e.prizes || []).join(', ') || '원문 확인') + (e.amount ? ' · ' + e.amount : '')));
  if (e.summary) b.append(el('p', 'mute', e.summary.slice(0, 200) + '…'));
  const a = el('div', 'box');
  if (q?.verified) { a.append(el('p', '', '문제: ' + q.question), el('p', '', '정답: ' + q.answer), el('p', 'mute', '근거: ' + q.evidence)); const s = el('a', '', '근거 출처'); s.href = q.sourceUrl; s.rel = 'nofollow noopener'; a.append(s); }
  else a.append(el('p', '', q ? '정답: 검증 필요 (확실하지 않아 표시하지 않습니다)' : '정답 분석 전입니다.'));
  const go = el('a', 'btn', '원본 페이지에서 응모하기 →'); go.href = e.url; go.target = '_blank'; go.rel = 'nofollow noopener';
  root.append(b, a, el('div', 'ad'), go, el('p', 'mute', '출처: ' + e.url + ' · 응모와 개인정보 입력은 원본 사이트에서 직접 진행하세요.'));
}

const demo = () => { const D = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10); return [
  { id: 'd1', title: '[예시] 예산 상식 퀴즈 이벤트 - 모바일 상품권 5,000원 추첨', agency: '예시기관A', agencyType: '중앙정부', kind: '퀴즈', prizes: ['상품권'], end: D(1), collectedAt: D(0), status: '진행중', url: 'https://example.com/1', summary: '정답을 맞히신 분 중 추첨하여 모바일 상품권 5,000원을 드립니다.', quiz: { verified: true, question: '예시 문제', answer: '예시 정답', evidence: '예시 근거', sourceUrl: 'https://example.com' } },
  { id: 'd2', title: '[예시] 시민 설문조사 참여 - 커피 기프티콘 선착순', agency: '예시시청', agencyType: '지자체', kind: '설문', prizes: ['커피'], end: D(10), collectedAt: D(-5), status: '진행중', url: 'https://example.com/2', summary: '설문 참여자 선착순 1,000명에게 커피 기프티콘 제공' },
  { id: 'd3', title: '[예시] 인스타그램 댓글 이벤트 - 치킨 쿠폰', agency: '예시공단', agencyType: '공공기관', kind: 'SNS', prizes: ['치킨음식'], end: null, collectedAt: D(0), status: '확인필요', url: 'https://example.com/3', summary: '인스타그램 댓글 남기고 치킨 쿠폰 받기' },
  { id: 'd4', title: '[예시] 종료된 텀블러 이벤트', agency: '예시재단', agencyType: '공공기관', kind: '이벤트', prizes: ['생활용품'], end: D(-3), collectedAt: D(-9), status: '종료', url: 'https://example.com/4', summary: '' }]; };

(async () => {
  $('#q').oninput = render; window.onhashchange = render;
  $('#type').onchange = (e) => { S.type = e.target.value; render(); };
  $('#sort').onchange = (e) => { S.sort = e.target.value; render(); };
  $('#ended').onchange = (e) => { S.ended = e.target.checked; render(); };
  $('#fav').onclick = () => { S.fav = !S.fav; render(); };
  try { events = location.search.includes('demo=1') ? demo() : await (await fetch('/data/events.json')).json(); } catch { events = []; }
  events.forEach(enrich); render();
  const id = window.PQP?.adsenseId;
  if (id) { const s = document.createElement('script'); s.async = true; s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + id; s.crossOrigin = 'anonymous'; document.head.append(s); }
})();
