/* 우리 신혼여행: 아이폰 캘린더 구독용 iCalendar(RFC 5545) 만들기
   - 시간은 '현지 시계 그대로'(floating time)로 적는다. 리스본 20:30 일정은 폰이 어느 나라에 있든 20:30으로 보인다.
   - 날짜별 하루 요약(종일), 시간이 적힌 일정 줄(시간 일정), 숙소(종일, 머무는 기간)를 넣는다.
   - 예약(bookings)과 같은 날 같은 시각의 일정 줄이 있으면 하나로 합친다(장소·메모를 붙임). */

const APP = 'https://youngwesoob125.github.io/honeymoon/';

function esc(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
/* 75바이트(UTF-8)마다 접는다. 한글이 중간에 잘리지 않게 글자 단위로 센다. */
const enc = new TextEncoder();
function fold(line) {
  const out = []; let cur = '', n = 0, lim = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (n + b > lim) { out.push(cur); cur = ' '; n = 1; lim = 75; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join('\r\n');
}
const p2 = (n) => String(n).padStart(2, '0');
function dval(s) { return String(s).slice(0, 10).replace(/-/g, ''); }
function addDays(s, k) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + k));
  return t.getUTCFullYear() + '-' + p2(t.getUTCMonth() + 1) + '-' + p2(t.getUTCDate());
}
function dt(date, min) { /* date 'YYYY-MM-DD', min = 분(24시 넘으면 다음 날) */
  const k = Math.floor(min / 1440), r = min - k * 1440;
  return dval(addDays(date, k)) + 'T' + p2(Math.floor(r / 60)) + p2(r % 60) + '00';
}
function stamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

/* "12:20 FR5467 → 14:35 세비야", "08:20~09:00 픽업", "21:25 KE914 → 1/4 18:15경 인천 도착" */
export function parseItem(s, date) {
  const str = String(s).trim();
  const m = /^(\d{1,2}):(\d{2})(?:\s*[~–-]\s*(\d{1,2}):(\d{2}))?\s+(.*)$/.exec(str);
  if (!m) return null;
  const st = (+m[1]) * 60 + (+m[2]);
  let end = null;
  if (m[3]) { end = (+m[3]) * 60 + (+m[4]); if (end <= st) end += 1440; }
  else {
    const a = /→\s*(?:(\d{1,2})\/(\d{1,2})\s+)?(\d{1,2}):(\d{2})/.exec(m[5]);
    if (a) {
      end = (+a[3]) * 60 + (+a[4]);
      if (a[1]) { /* 다른 날 도착 */
        const y = +date.slice(0, 4), sm = +date.slice(5, 7), am = +a[1];
        const ay = am < sm ? y + 1 : y;
        const t0 = Date.UTC(+date.slice(0, 4), sm - 1, +date.slice(8, 10)), t1 = Date.UTC(ay, am - 1, +a[2]);
        end += Math.round((t1 - t0) / 86400000) * 1440;
      } else if (end <= st) end += 1440;
    }
  }
  return { st, end, hh: p2(m[1]) + ':' + m[2], text: m[5].trim() };
}

export function buildIcs(d, now = new Date()) {
  const meta = d.meta || {}, days = (d.days || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const cities = (d.cities || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const bookings = d.bookings || [];
  const ds = stamp(now), L = [];
  const push = (...xs) => xs.forEach((x) => L.push(fold(x)));
  push('BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//honeymoon//ko', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + esc('우리 신혼여행'), 'X-WR-CALDESC:' + esc('스페인·포르투갈 일정 (앱에서 고치면 자동으로 바뀌어요)'),
    'X-APPLE-CALENDAR-COLOR:#E8692A', 'REFRESH-INTERVAL;VALUE=DURATION:PT2H', 'X-PUBLISHED-TTL:PT2H');
  const ev = (uid, props) => { push('BEGIN:VEVENT', 'UID:' + uid + '@honeymoon', 'DTSTAMP:' + ds, ...props, 'END:VEVENT'); };
  const stayOn = (date) => cities.find((c) => c.from && c.to && date >= c.from && date <= c.to);
  const used = new Set();
  const dep = meta.depart;

  for (const day of days) {
    if (!day.date) continue;
    const n = dep ? Math.round((Date.parse(day.date) - Date.parse(dep)) / 86400000) + 1 : null;
    const items = (day.items || []).map(String);
    const c = stayOn(day.date);
    const desc = [(n ? '여행 ' + n + '일째' : '')].concat(items.length ? ['', ...items.map((x) => '· ' + x)] : [])
      .concat((day.notes && day.notes.length) ? ['', '메모', ...day.notes.map((x) => '· ' + x)] : [])
      .concat(c && c.hotel ? ['', '숙소: ' + c.hotel + (c.addr ? ' (' + c.addr + ')' : '')] : [])
      .concat(['', '앱에서 보기: ' + APP + '#days']).join('\n').trim();
    ev('day-' + day.id, ['DTSTART;VALUE=DATE:' + dval(day.date), 'DTEND;VALUE=DATE:' + dval(addDays(day.date, 1)),
      'SUMMARY:' + esc((day.city || '') + (day.headline ? ' · ' + day.headline : '')), 'DESCRIPTION:' + esc(desc),
      'TRANSP:TRANSPARENT', 'URL:' + APP + '#days']);
    const timed = items.map((s, i) => ({ i, p: parseItem(s, day.date) })).filter((x) => x.p);
    timed.forEach((x, k) => {
      const p = x.p;
      let end = p.end;
      if (end == null) {
        const nx = timed[k + 1] && timed[k + 1].p.st;
        end = (nx && nx > p.st) ? Math.min(nx, p.st + 120) : p.st + 60;
        if (end - p.st < 30) end = p.st + 30;
      }
      const bk = bookings.find((b) => b.kind !== 'stay' && b.date === day.date && b.time && b.time.padStart(5, '0') === p.hh);
      if (bk) used.add(bk.id);
      const props = ['DTSTART:' + dt(day.date, p.st), 'DTEND:' + dt(day.date, end), 'SUMMARY:' + esc(p.text)];
      const loc = bk && bk.place;
      if (loc) props.push('LOCATION:' + esc(loc));
      const dd = [bk && bk.memo, (day.city || '') + (day.headline ? ' · ' + day.headline : ''), APP + '#days'].filter(Boolean).join('\n');
      props.push('DESCRIPTION:' + esc(dd), 'URL:' + APP + '#days');
      ev('it-' + day.id + '-' + p.hh.replace(':', '') + '-' + x.i, props);
    });
  }
  for (const b of bookings) {
    if (!b.date || used.has(b.id)) continue;
    if (b.kind === 'stay') {
      const end = b.end && b.end > b.date ? b.end : addDays(b.date, 1);
      ev('stay-' + b.id, ['DTSTART;VALUE=DATE:' + dval(b.date), 'DTEND;VALUE=DATE:' + dval(end), 'SUMMARY:' + esc('🏨 ' + (b.title || '숙소')),
        ...(b.place ? ['LOCATION:' + esc(b.place)] : []), 'DESCRIPTION:' + esc([b.memo, APP + '#wallet'].filter(Boolean).join('\n')), 'TRANSP:TRANSPARENT']);
      continue;
    }
    const tm = /^(\d{1,2}):(\d{2})$/.exec(b.time || '');
    if (tm) {
      const st = (+tm[1]) * 60 + (+tm[2]);
      ev('bk-' + b.id, ['DTSTART:' + dt(b.date, st), 'DTEND:' + dt(b.date, st + 60), 'SUMMARY:' + esc(b.title || '예약'),
        ...(b.place ? ['LOCATION:' + esc(b.place)] : []), 'DESCRIPTION:' + esc([b.memo, APP + '#wallet'].filter(Boolean).join('\n'))]);
    } else {
      ev('bk-' + b.id, ['DTSTART;VALUE=DATE:' + dval(b.date), 'DTEND;VALUE=DATE:' + dval(addDays(b.date, 1)), 'SUMMARY:' + esc('🎫 ' + (b.title || '예약')),
        ...(b.place ? ['LOCATION:' + esc(b.place)] : []), 'DESCRIPTION:' + esc([b.memo, APP + '#wallet'].filter(Boolean).join('\n')), 'TRANSP:TRANSPARENT']);
    }
  }
  push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}
