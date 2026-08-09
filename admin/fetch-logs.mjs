#!/usr/bin/env node
// 운영자 전용 검색기록 인출 CLI (페이지·콘솔 없이 터미널에서 실행)
// 사용법:  node admin/fetch-logs.mjs           → 조회 후 CSV/JSON/MD 저장
//          node admin/fetch-logs.mjs --clear   → 전체 삭제 (확인 프롬프트)
//          node admin/fetch-logs.mjs --stats   → 요약만 출력
// 토큰(ADMIN_SECRET)은 admin/.env 에서만 읽으며, 이 폴더는 git/배포에서 제외됩니다.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __dir = dirname(fileURLToPath(import.meta.url));

// --- .env 로드 (의존성 없음) ---
function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(__dir, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch { console.error('❌ admin/.env 파일이 없습니다. .env.example 참고해서 만드세요.'); process.exit(1); }
  for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'ADMIN_SECRET']) {
    if (!env[k]) { console.error(`❌ .env 에 ${k} 가 없습니다.`); process.exit(1); }
  }
  return env;
}
const env = loadEnv();
const HEAD = { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };

async function rpc(fn, args) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: HEAD, body: JSON.stringify(args) });
  if (!r.ok) {
    if (r.status === 403 || r.status === 400) { console.error('❌ 토큰이 올바르지 않습니다 (권한 없음).'); process.exit(2); }
    console.error(`❌ 요청 실패: HTTP ${r.status}`, await r.text().catch(() => '')); process.exit(2);
  }
  return r.json();
}

function ask(q) { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); return new Promise(res => rl.question(q, a => { rl.close(); res(a); })); }
const ymd = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`; };
const fmtTime = t => { try { return new Date(t).toLocaleString('ko-KR', { hour12: false }); } catch { return t; } };
function fmtFilters(f) {
  if (!f) return '';
  const p = [];
  if (f.페이지) p.push('['+f.페이지+']');
  for (const [k, label] of [['대륙','대륙'],['나라','나라'],['언어','언어']]) if (f[k]) p.push(`${label}:${f[k]}`);
  if (f.QS상한) p.push('QS≤'+f.QS상한); if (f.iBT) p.push('iBT:'+f.iBT); if (f.최소TO) p.push('TO≥'+f.최소TO);
  if (f.비인기만) p.push('비인기교만'); if (f.전공계열) p.push('전공:'+f.전공계열); if (f.정렬) p.push('정렬:'+f.정렬);
  return p.join(', ');
}
const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--clear')) {
    const ans = await ask('⚠️  전체 검색 기록을 삭제합니다. 되돌릴 수 없습니다. "yes" 입력: ');
    if (ans.trim() !== 'yes') { console.log('취소했습니다.'); return; }
    const n = await rpc('admin_clear_logs', { pass: env.ADMIN_SECRET });
    console.log(`🗑️  ${n}건 삭제 완료.`); return;
  }

  const rows = await rpc('admin_get_logs', { pass: env.ADMIN_SECRET });
  const bySearcher = {};
  for (const r of rows) (bySearcher[r.searcher_id] ??= []).push(r);
  const sids = Object.keys(bySearcher);
  console.log(`✅ 총 ${rows.length}건 · 검색자 ${sids.length}명`);

  // 출처(사이트/페이지)별 분류
  const bySource = {};
  for (const r of rows) {
    const src = (r.filters && r.filters['출처']) || '(태그없음)';
    bySource[src] = (bySource[src] || 0) + 1;
  }
  console.log('── 출처별 ──');
  for (const [src, n] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(5)}건  ${src}`);
  }

  if (args.includes('--stats')) return;
  if (!rows.length) { console.log('저장할 데이터가 없습니다.'); return; }

  const outDir = join(__dir, 'exports');
  mkdirSync(outDir, { recursive: true });
  const stamp = ymd();

  // JSON
  writeFileSync(join(outDir, `logs_${stamp}.json`), JSON.stringify(rows, null, 2));

  // CSV (엑셀에서 열림, BOM 포함)
  const cols = ['created_at','출처','searcher_id','페이지','대륙','나라','언어','QS상한','iBT','전공계열','비인기만','정렬','result_count','result_names','user_agent'];
  const csv = [cols.join(',')].concat(rows.map(r => {
    const f = r.filters || {};
    return [fmtTime(r.created_at), f.출처||'', r.searcher_id, f.페이지||'', f.대륙||'', f.나라||'', f.언어||'', f.QS상한||'', f.iBT||'', f.전공계열||'', f.비인기만?'Y':'', f.정렬||'', r.result_count, (r.result_names||[]).join(' | '), r.user_agent||''].map(csvCell).join(',');
  })).join('\n');
  writeFileSync(join(outDir, `logs_${stamp}.csv`), '﻿' + csv);

  // MD (검색자별 그룹)
  let md = `# 검색 기록\n\n- 생성: ${new Date().toLocaleString('ko-KR',{hour12:false})}\n- 총 ${rows.length}건 · 검색자 ${sids.length}명\n\n`;
  for (const sid of sids.sort((a,b)=>bySearcher[b].length-bySearcher[a].length)) {
    const rs = bySearcher[sid].slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    md += `## \`${sid}\` (${rs.length}건)\n\n| 시각 | 필터 | 결과수 |\n|---|---|---|\n`;
    for (const r of rs) md += `| ${fmtTime(r.created_at)} | ${fmtFilters(r.filters)} | ${r.result_count} |\n`;
    md += '\n';
  }
  writeFileSync(join(outDir, `logs_${stamp}.md`), md);

  console.log(`💾 저장 완료 → admin/exports/logs_${stamp}.{csv,json,md}`);
}
main().catch(e => { console.error(e); process.exit(1); });
