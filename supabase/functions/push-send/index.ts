/* 우리 신혼여행: 알림 보내기
   notify_queue에서 보낼 때가 된 알림을 꺼내 두 사람 휴대폰(push_subs)으로 보낸다.
   - 데이터베이스가 새 알림을 넣을 때, 그리고 10분마다 이 함수를 부른다.
   - 보낼 게 없으면 아무것도 안 한다. 그래서 누가 불러도 해가 없다(JWT 확인 안 함).
   - VAPID 키는 Supabase Vault(hm_vapid)에 있다. */
import postgres from 'npm:postgres@3.4.5';
import { sendPush } from './webpush.js';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 1 });
let vapid: { publicKey: string; privateJwk: JsonWebKey; sub: string } | null = null;

async function getVapid() {
  if (vapid) return vapid;
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'hm_vapid' limit 1`;
  vapid = JSON.parse(r[0].decrypted_secret);
  return vapid!;
}
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async () => {
  try {
    const due = await sql`
      update public.notify_queue set sent_at = now()
      where id in (select id from public.notify_queue
                   where sent_at is null and send_after <= now()
                   order by id limit 25 for update skip locked)
      returning id, kind, to_email, title, body, url`;
    if (!due.length) return json({ sent: 0, items: 0 });
    const v = await getVapid();
    const subs = await sql`select endpoint, email, p256dh, auth, prefs from public.push_subs`;
    let sent = 0;
    for (const n of due) {
      const res: unknown[] = [];
      for (const s of subs) {
        if (n.to_email && String(n.to_email).toLowerCase() !== String(s.email).toLowerCase()) continue;
        if (n.kind !== 'test' && s.prefs && s.prefs[n.kind] === false) continue;
        try {
          const r = await sendPush(s, { title: n.title, body: n.body, url: n.url, tag: n.kind + '-' + n.id }, v);
          res.push({ who: s.email, status: r.status });
          if (r.status === 404 || r.status === 410) {
            await sql`delete from public.push_subs where endpoint = ${s.endpoint}`;
          } else if (r.ok) {
            sent++;
            await sql`update public.push_subs set last_ok = now(), fails = 0 where endpoint = ${s.endpoint}`;
          } else {
            res.push({ detail: (await r.text()).slice(0, 200) });
            await sql`update public.push_subs set fails = fails + 1 where endpoint = ${s.endpoint}`;
          }
        } catch (e) {
          res.push({ who: s.email, error: String(e).slice(0, 200) });
        }
      }
      await sql`update public.notify_queue set result = ${sql.json(res)} where id = ${n.id}`;
    }
    return json({ sent, items: due.length });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
