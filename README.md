# 공공퀴즈픽

## 내 컴퓨터에서 실행
1. Node.js 18+ 설치
2. `node scripts/collect.mjs` (이벤트 수집, AI 정답은 키가 있을 때만)
3. `node scripts/build.mjs` (상세 페이지·sitemap 생성)
4. `npx serve public` 로 확인

## 무료 배포 (Cloudflare Pages)
- GitHub에 올린 뒤 Pages에서 저장소 연결
- 빌드 명령: `node scripts/build.mjs` / 출력 폴더: `public`
- GitHub 저장소 Settings → Secrets에 `ANTHROPIC_API_KEY`, Variables에 `SITE_URL`(배포 주소) 추가
- 이후 매일 자동 수집 → 자동 커밋 → 자동 재배포

## 수집 대상 늘리기
`sources.json`에 기관의 실제 이벤트 게시판 주소를 추가하세요.
