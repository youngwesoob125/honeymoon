/* 우리 신혼여행: 아이폰 캘린더 구독 주소
   GET /functions/v1/cal?k=<열쇠>  →  text/calendar
   - 열쇠는 Supabase Vault(hm_cal)에 있고, 앱에서 두 사람만 cal_key()로 받아 볼 수 있다.
   - 열쇠가 맞지 않으면 아무것도 알려 주지 않는다(404). */
import postgres from 'npm:postgres@3.4.5';
import { buildIcs } from './ics.js';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 1 });

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('', { status: 405 });
  try {
    const u = new URL(req.url);
    const k = u.searchParams.get('k') || (u.pathname.match(/\/([0-9a-f]{32})(?:\.ics)?$/) || [])[1] || '';
    const s = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'hm_cal' limit 1`;
    if (!k || !s.length || !same(k, s[0].decrypted_secret)) return new Response('not found', { status: 404 });
    const rows = await sql`select collection, id, data from public.docs where collection in ('meta','days','bookings','cities')`;
    const d: Record<string, unknown[]> & { meta?: unknown } = { days: [], bookings: [], cities: [] };
    for (const r of rows) {
      if (r.collection === 'meta') { if (r.id === 'trip') d.meta = r.data; continue; }
      (d[r.collection] as unknown[]).push(Object.assign({ id: r.id }, r.data));
    }
    const body = buildIcs(d);
    return new Response(req.method === 'HEAD' ? null : body, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="honeymoon.ics"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return new Response('error: ' + String(e).slice(0, 200), { status: 500 });
  }
});
