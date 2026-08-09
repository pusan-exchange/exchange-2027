# 부산대 교환학생 필터 · 2027-1학기

부산대학교 국제처 교환/교비 프로그램 지원자를 위한 **정적 웹 필터 앱**입니다.
파견대학을 대륙·나라·언어·QS/THE·어학점수·전공 계열로 필터링하고, 과거 선발 이력으로 인기/비인기를 표시하며, 1차 합격 결과와 2차 남은 TO(정원)까지 한 곳에서 봅니다.

> ⚙️ 서버 없이 도는 순수 HTML(파일 하나에 데이터·CSS·JS 내장). 로그 수집만 Supabase를 씁니다.

## 🔗 라이브 데모
- **2차 남은 TO (기본):** https://pusan-exchange.github.io/exchange-2027/
- **모집요강:** https://pusan-exchange.github.io/exchange-2027/apply.html
- **1차 합격 결과:** https://pusan-exchange.github.io/exchange-2027/results.html

## ✨ 기능
- **다중 필터**: 대륙 / 나라 / 언어 / QS 상한 / 내 TOEFL iBT / 부산대 전공 계열
- **전공 계열 필터**: 자격기준을 파싱해 상경·사회과학·인문사회·정치 등 특정계열 한정 대학을 자동 제외
- **인기/비인기(★)**: 과거 4개 학기(2025-1 ~ 2026-2) 선발차수 이력으로 분류 (미달 2회+ 또는 3차경험 = 비인기)
- **전형별 TO 분리**: 단과대학별 TO가 쪼개진 대학(예: 사이타마·뮌헨응용과학)은 전형별로 분리 표시
- **1차 합격 결과**: 파견대학별 합격 인원(개인정보 없는 집계)
- **2차 남은 TO**: 정원 − 1차 합격 = 남은 TO, "지원가능만" 토글·마감 표시
- **익명 로그 수집**(선택): 필터 사용 패턴을 익명 UUID로 기록 → 운영자만 CLI로 인출

## 📄 페이지 구성
| 파일 | 내용 |
|---|---|
| `index.html` | 2차 선발 · 남은 TO (랜딩) |
| `apply.html` | 모집요강 (전체 파견대학) |
| `results.html` | 1차 합격 결과 (익명 집계) |

## 🧱 기술 스택
- 프론트엔드: 바닐라 HTML/CSS/JS (빌드 도구·프레임워크 없음)
- 백엔드(선택): [Supabase](https://supabase.com) (Postgres + RLS + RPC) — 익명 로그 수집·운영자 인출
- 호스팅: GitHub Pages (정적)
- 운영자 CLI: Node.js (의존성 0)

## 🚀 직접 배포하기
1. 이 저장소를 **Fork**.
2. **Supabase 프로젝트 생성** 후 `db/schema.sql`을 SQL Editor에서 실행. (운영자 토큰 `CHANGE_ME...`를 강력한 값으로 교체)
3. 세 HTML 파일 상단 `<script>`의 설정을 **본인 것으로 교체**:
   ```js
   const SB_URL = 'https://<your-project>.supabase.co';
   const SB_KEY = 'sb_publishable_...';   // Supabase publishable(anon) key — 공개해도 안전
   ```
   > 로그 수집을 원치 않으면 `SB_URL`을 빈 문자열로 두면 됩니다(조회·필터는 그대로 동작).
4. **GitHub Pages** 활성화 (Settings → Pages → Branch: main / root).

## 🔐 운영자 로그 인출 (선택)
콘솔·페이지 없이 터미널에서 인출합니다. 토큰은 `admin/.env`(git 제외)에만 보관.
```bash
cp admin/.env.example admin/.env   # 값 채우기 (ADMIN_SECRET = schema.sql에서 정한 토큰)
node admin/fetch-logs.mjs          # CSV·JSON·MD로 저장 (admin/exports/)
node admin/fetch-logs.mjs --stats  # 요약만
```
- 공개키만으로는 로그를 **읽을 수 없습니다**(RLS가 SELECT 차단). 인출은 bcrypt 해시로 검증되는 토큰이 있어야 가능.
- 자세한 내용: [`admin/README.md`](admin/README.md)

## 🔒 개인정보 · 데이터
- **개인정보 미수집**: 검색 로그의 식별자는 브라우저별 **랜덤 UUID**이며 이름·학번을 받지 않습니다.
- **1차 합격 결과**는 파견대학별 **인원 집계만** 담습니다(학번·성명·성별·소속학과 미포함).
- 교환프로그램 데이터(대학·정원·결과)는 **부산대학교 국제처 공개 공지**에서 파생 — 데이터 저작권은 원 출처에 있으며 MIT 라이선스 대상이 아닙니다([`LICENSE`](LICENSE) 참고).

## 📁 구조
```
.
├── index.html          # 2차 남은 TO (랜딩)
├── apply.html          # 모집요강
├── results.html        # 1차 합격 결과
├── db/schema.sql       # Supabase 스키마 (테이블·RLS·RPC)
├── admin/              # 운영자 CLI (토큰 .env 은 git 제외)
│   ├── fetch-logs.mjs
│   ├── .env.example
│   └── README.md
├── LICENSE             # MIT (코드) + 데이터 고지
└── README.md
```

## ⚠️ 면책
비공식 도구입니다. 지원 전 반드시 **부산대학교 국제처 공식 공지**로 최신 정보를 확인하세요.

## 📝 라이선스
코드: [MIT](LICENSE) · 데이터: 부산대학교 국제처(원 출처)
