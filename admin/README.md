# 운영자 도구 (외부 인출)

이 폴더는 **`.gitignore`로 git·배포에서 완전히 제외**됩니다. 공개 사이트(GitHub Pages)에 절대 올라가지 않습니다.
`.env`의 `ADMIN_SECRET`(운영자 토큰)을 가진 사람만 검색 기록을 인출할 수 있습니다.

## 준비 (최초 1회)
`admin/.env` 파일이 이미 있으면 그대로 사용. 없으면 `.env.example`를 복사해 값을 채우세요.

## 사용법 (터미널)
```bash
cd ~/ClaudeCode/exchange-filter

node admin/fetch-logs.mjs          # 전체 기록 인출 → admin/exports/ 에 CSV·JSON·MD 저장
node admin/fetch-logs.mjs --stats  # 건수/검색자수 요약만
node admin/fetch-logs.mjs --clear  # 전체 삭제 (yes 확인)
```

- 결과 파일: `admin/exports/logs_YYYYMMDD_HHMM.{csv,json,md}`
- CSV는 엑셀에서 바로 열림(BOM 포함). 개인정보는 수집하지 않으며 익명 UUID·필터·결과수만 담깁니다.

## 보안 메모
- **토큰은 bcrypt 해시로 DB에 저장**되고, 공개 사이트에는 없습니다. 공개키만으로는 RLS가 직접 읽기를 막습니다.
- 토큰을 바꾸려면: `node` 로 `admin_set_pass` RPC를 호출하거나 Supabase에서 갱신 후 `.env`의 `ADMIN_SECRET` 교체.
- 최고 권한 인출(토큰조차 불필요): Supabase 대시보드 → SQL Editor `select * from search_logs;`
- 이 `.env`와 `exports/`는 절대 공유·커밋 금지.
