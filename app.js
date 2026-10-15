/* 우리 신혼여행: 화면 */
(function () {
  var S = { meta: null, cities: [], days: [], tasks: [], watch: [], log: [], briefs: [], props: [], reqs: [], places: [], pins: [], tours: [], shops: [], weather: [], bookings: [], legs: [] };
  var MAP = { cities: 'cities', days: 'days', tasks: 'tasks', watch: 'watch', log: 'log', briefs: 'briefs', props: 'proposals', reqs: 'requests', places: 'places', pins: 'pins', tours: 'tours', shops: 'shops', weather: 'weather', bookings: 'bookings', legs: 'legs' };
  var loaded = false, view = 'home', editing = null, sel = null, recTab = 'tour', openDays = {}, bkEdit = null, lastMode = null, dayEdit = null, taskEdit = null, foldOpen = {}, undoArm = null;
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var KIND = { see: '🏛️', eat: '🍽️', stay: '🏨', shop: '🛍️', night: '🌙', move: '🚆' };
  var BK = [['stay', '🏨', '숙소'], ['move', '🚆', '교통'], ['ticket', '🎟️', '입장권'], ['tour', '🚌', '투어'], ['eat', '🍽️', '식당'], ['etc', '📌', '기타']];
  var IATA = { '인천': 'ICN', '리스본': 'LIS', '포르투': 'OPO', '세비야': 'SVQ', '그라나다': 'GRX', '바르셀로나': 'BCN', '마드리드': 'MAD' };
  var LEGACY = (window.HM_CONFIG && window.HM_CONFIG.legacyNames) || {};
  var VIEWS = ['home', 'days', 'map', 'tasks', 'rec'];
  function bkIcon(k) { for (var i = 0; i < BK.length; i++) if (BK[i][0] === k) return BK[i][1]; return '📌'; }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pd(s) { if (!s) return null; var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function md(s) { var d = pd(s); return d ? (d.getMonth() + 1) + '/' + d.getDate() + ' (' + DOW[d.getDay()] + ')' : ''; }
  function diff(s) { var d = pd(s); return d ? Math.round((d - today()) / 86400000) : null; }
  function hm(iso) { var d = new Date(iso); if (isNaN(d)) return ''; return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function gmap(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(function () { t.style.display = 'none'; }, 3600); }
  function canEdit() { var m = Store.status.mode; return m === 'ready' || m === 'demo'; }
  function myId() { var me = Store.me(); return me ? me.email : null; }
  function byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
  var REQ = { '처리됨': ['ok', '반영됨'], '확인 필요': ['ora', '확인 필요'], '되돌림': ['mute', '되돌림'], '대기': ['blue', '대기'] };
  function undoBtn(batch) {
    if (!canEdit() || Store.status.mode === 'demo') return '';
    var armed = undoArm === batch;
    return '<div class="acts" style="margin-top:6px"><button type="button" class="btn small-btn' + (armed ? ' del' : '') + '" data-undo="' + esc(batch) + '">' + (armed ? '한 번 더 누르면 되돌려요' : '↩︎ 이 변경 되돌리기') + '</button></div>';
  }
  function foldAttr(k) { return ' data-fold="' + k + '"' + (foldOpen[k] ? ' open' : ''); }
  function nowIso() { return new Date().toISOString(); }
  function whoName(x) {
    if (!x) return '';
    if (x === myId()) return '내가';
    var m = Store.members(); if (m[x]) return m[x];
    if (LEGACY[x]) return LEGACY[x];
    return '함께 쓰는 사람';
  }

  function pull() {
    var meta = Store.get('meta', 'trip'); S.meta = meta;
    Object.keys(MAP).forEach(function (k) { S[k] = Store.list(MAP[k]); });
    loaded = !!(meta || S.days.length);
  }
  function stayCity(date) {
    var cs = S.cities.slice().sort(byOrder);
    for (var i = 0; i < cs.length; i++) { var c = cs[i]; if (date >= c.from && date <= c.to) return c; }
    var last = cs[cs.length - 1]; if (last && S.meta && date === S.meta.ret) return last;
    return null;
  }
  function wxFor(date) {
    var c = stayCity(date); if (!c) return null;
    var w = S.weather.filter(function (x) { return x.city === c.name; })[0]; if (!w) return null;
    var f = (w.forecast || []).filter(function (x) { return x.date === date; })[0];
    return f ? { txt: (f.sky || '') + ' ' + f.hi + '°/' + f.lo + '°', fc: true } : { txt: '평년 ' + w.avgHi + '°/' + w.avgLo + '°', fc: false };
  }

  /* ---------- 홈 ---------- */
  function isStandalone() { return window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); }
  function installHint() {
    if (isStandalone()) return '';
    return '<div class="card hintcard"><b class="disp">📲 앱처럼 쓰려면</b><div class="small" style="margin-top:4px">Safari 아래쪽 공유 버튼 → <b>홈 화면에 추가</b>를 누르세요. 아이콘으로 열면 주소창 없이 열리고, 인터넷이 없어도 마지막 내용을 볼 수 있어요.</div></div>';
  }
  function hero() {
    var m = S.meta || {}, dep = m.depart || '', ret = m.ret || '', a = diff(dep), b = diff(ret), t = ymd(today());
    var dToday = S.days.filter(function (d) { return d.date === t; })[0];
    if (a > 0 || !dToday) {
      var cs = S.cities.slice().sort(byOrder), first = cs[0], last = cs[cs.length - 1];
      var out = S.bookings.filter(function (x) { return x.kind === 'move' && x.date === dep; }).sort(function (x, y) { return (x.time || '') < (y.time || '') ? -1 : 1; })[0];
      var dd = pd(dep), nights = (dep && ret) ? Math.round((pd(ret) - pd(dep)) / 86400000) : '';
      var toName = first ? first.name : '', toCode = IATA[toName] || '';
      return '<div class="ticket"><div class="main"><div class="t-route"><div><div class="t-code">ICN</div><div class="t-city">인천</div></div><div class="t-plane">✈️</div><div><div class="t-code">' + esc(toCode) + '</div><div class="t-city">' + esc(toName) + '</div></div></div>' +
        '<div class="t-meta"><b>' + (dd ? (dd.getMonth() + 1) + '월 ' + dd.getDate() + '일 (' + DOW[dd.getDay()] + ')' : '') + (out && out.time ? ' ' + esc(out.time) : '') + '</b> ' + (out ? esc(out.title.split(' ')[0]) : '') + '<br>' +
        (first && last ? esc(first.name) + '에서 ' + esc(last.name) + '까지 ' + nights + '박' : '') + '</div></div>' +
        '<div class="stub"><span class="n">' + (a > 0 ? a : (b >= 0 ? '✈' : '♥')) + '</span><span class="l">' + (a > 0 ? '일 남았어요' : (b >= 0 ? '여행 중' : '다녀왔어요')) + '</span></div></div>';
    }
    var w = wxFor(t);
    return '<div class="ticket today"><div class="main"><div class="t-route"><div><div class="t-code" style="font-size:26px">' + esc(dToday.city) + '</div><div class="t-city">' + esc(dToday.headline || '') + '</div></div></div>' +
      '<ul class="today-list">' + (dToday.items || []).slice(0, 5).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
      (w ? '<div class="t-meta">' + esc(w.txt) + '</div>' : '') + '</div>' +
      '<div class="stub"><span class="n">' + (1 - a) + '</span><span class="l">일째</span></div></div>';
  }
  function home() {
    var t = ymd(today()), h = installHint() + hero();
    var br = S.briefs.slice().sort(function (x, y) { return (x.date || '') < (y.date || '') ? 1 : -1; })[0];
    h += '<h2><span class="em">📝</span>오늘의 브리핑</h2>';
    h += br ? '<div class="memo"><div class="d">' + esc(md(br.date)) + (diff(br.date) === 0 ? ', 오늘' : '') + '</div><h3>' + esc(br.headline || '') + '</h3>' +
      ((br.points && br.points.length) ? '<ul>' + br.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' : '') + '</div>'
      : '<div class="empty">' + (loaded ? '아직 브리핑이 없어요. 자동 점검이 돌면 여기에 쌓여요.' : '불러오는 중') + '</div>';
    S.props.filter(function (p) { return p.status === '제안' || p.status === '반영 요청'; }).forEach(function (p) {
      var rq = p.status === '반영 요청';
      h += '<div class="card prop' + (rq ? ' req' : '') + '"><div class="row"><b class="disp">' + esc(p.title) + '</b><span class="chip ' + (rq ? 'ora' : 'blue') + '">' + (rq ? '반영 대기' : '변경 제안') + '</span></div>' +
        (p.why ? '<div class="small" style="margin-top:4px">' + esc(p.why) + '</div>' : '') + (p.change ? '<div style="margin-top:4px;font-size:14px;color:var(--azul)">' + esc(p.change) + '</div>' : '') +
        (rq ? '<div class="small" style="margin-top:6px">다음 점검 때 일정에 반영돼요.</div>' : '<div class="acts"><button class="btn fill pbtn" data-id="' + esc(p.id) + '" data-act="apply"' + (canEdit() ? '' : ' disabled') + '>일정에 반영</button><button class="btn pbtn" data-id="' + esc(p.id) + '" data-act="hold"' + (canEdit() ? '' : ' disabled') + '>보류</button></div>') + '</div>';
    });
    var wk = sortedTasks().filter(function (x) { var n = diff(x.due); return !x.done && n !== null && n <= 7; }).slice(0, 6);
    h += '<h2><span class="em">⏰</span>이번 주 할 일</h2>';
    h += wk.length ? '<div class="card">' + wk.map(taskRow).join('') + '</div>' : '<div class="empty">' + (loaded ? '이번 주에 급한 일은 없어요.' : '불러오는 중') + '</div>';
    h += '<h2><span class="em">🎫</span>예약 현황</h2><p class="hint">예약을 마치면 여기에 등록하세요. 일정 탭의 그날 카드에도 바로 보여요.</p><div id="bkArea"></div>';
    h += '<h2><span class="em">📮</span>도시 스탬프</h2><p class="hint">스탬프를 누르면 숙소를 입력할 수 있어요.</p><div class="stamps">';
    S.cities.slice().sort(byOrder).forEach(function (c) {
      var now = t >= c.from && t <= c.to;
      h += '<button class="stamp' + (now ? ' now' : '') + '" data-cid="' + esc(c.id) + '"><span class="c">' + esc(c.name) + '</span><span class="dt">' + esc(md(c.from).split(' ')[0]) + '–' + esc(md(c.to).split(' ')[0]) + ', ' + esc(c.nights) + '박</span><span class="h ' + (c.booked ? 'ok' : 'no') + '">' + (c.booked ? '🏨 ' + esc(c.hotel) : (c.hotel ? esc(c.hotel) + ' (미확정)' : '숙소 미정')) + '</span></button>';
    });
    h += '</div><div id="cityEdit"></div>';
    h += '<h2><span class="em">💬</span>Claude에게 남기기</h2><form class="req" id="reqf"' + (canEdit() ? '' : ' hidden') + '><textarea id="reqt" maxlength="300" placeholder="예: 샌딩투어 예약했어, 12/27 08:30 픽업" aria-label="Claude에게 남길 말"></textarea><div class="row" style="margin-top:6px"><span class="small">1시간 안에(매시 정각쯤) 읽고 반영해요.</span><button class="btn fill" type="submit">남기기</button></div></form>';
    var rq = S.reqs.slice().sort(function (x, y) { return (x.at || '') < (y.at || '') ? 1 : -1; }).slice(0, 5);
    if (rq.length) h += '<div class="card">' + rq.map(function (r) {
      var st = REQ[r.status] || REQ['대기'];
      return '<div class="rq"><span class="chip ' + st[0] + '">' + st[1] + '</span> <span class="small">' + esc(md(r.at)) + '</span><div>' + esc(r.text) + '</div>' + (r.reply ? '<div class="reply">' + esc(r.reply) + '</div>' : '') +
        (r.status === '처리됨' && r.batch ? undoBtn(r.batch) : '') + '</div>';
    }).join('') + '</div>';
    $('v-home').innerHTML = h;
    cityEdit(); bkArea();
  }
  function cityEdit() {
    var box = $('cityEdit'); if (!box) return;
    var c = editing && S.cities.filter(function (x) { return x.id === editing; })[0];
    if (!c) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="edit"><b class="disp">' + esc(c.name) + ' 숙소</b><label for="ceh">숙소 이름</label><input class="inp" id="ceh" maxlength="60" value="' + esc(c.hotel || '') + '">' +
      '<label class="chkrow"><input type="checkbox" id="ceb"' + (c.booked ? ' checked' : '') + '> 예약 완료</label><div class="acts"><button class="btn fill" type="button" id="ces">저장</button><button class="btn" type="button" id="cec">닫기</button></div></div>';
    $('cec').onclick = function () { editing = null; cityEdit(); };
    $('ces').onclick = function () {
      Store.update('cities', c.id, { hotel: $('ceh').value.trim(), booked: $('ceb').checked, editedBy: myId(), editedAt: nowIso() });
      toast(savedMsg('숙소를 저장했어요.')); editing = null; render();
    };
  }
  function savedMsg(m) { return navigator.onLine ? m : m + ' 연결되면 보낼게요.'; }

  function bkSorted() { return S.bookings.slice().sort(function (a, b) { var x = (a.date || '') + (a.time || ''), y = (b.date || '') + (b.time || ''); return x < y ? -1 : x > y ? 1 : 0; }); }
  function bkArea() {
    var box = $('bkArea'); if (!box) return; var t = ymd(today()), h = '';
    if (bkEdit) { box.innerHTML = bkForm(); return; }
    var list = bkSorted();
    h += list.length ? '<div class="card">' + list.map(function (b) {
      var d = pd(b.date), past = (b.end || b.date) < t;
      return '<button class="bk' + (past ? ' past' : '') + '" data-bk="' + esc(b.id) + '"><span class="bd">' + (d ? (d.getMonth() + 1) + '/' + d.getDate() + '<br>' + DOW[d.getDay()] : '') + '</span>' +
        '<span class="bt">' + bkIcon(b.kind) + ' ' + esc(b.title) + '</span><span class="bm">' + [b.time, b.end ? ('~ ' + md(b.end)) : '', b.place].filter(Boolean).map(esc).join(', ') + (b.memo ? (' — ' + esc(b.memo)) : '') + '</span></button>';
    }).join('') + '</div>'
      : '<div class="empty">' + (loaded ? '아직 등록한 예약이 없어요.' : '불러오는 중') + '</div>';
    if (canEdit()) h += '<div class="acts"><button class="btn fill" id="bkadd" type="button">＋ 예약 등록</button></div>';
    box.innerHTML = h;
  }
  function bkForm() {
    var b = bkEdit === 'new' ? { kind: 'ticket' } : (S.bookings.filter(function (x) { return x.id === bkEdit; })[0] || { kind: 'ticket' });
    var opts = sortedTasks().filter(function (x) { return !x.done; }).map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.title) + '</option>'; }).join('');
    return '<form class="edit" id="bkf"><b class="disp">' + (bkEdit === 'new' ? '예약 등록' : '예약 수정') + '</b>' +
      '<label for="bkk">종류</label><select id="bkk">' + BK.map(function (k) { return '<option value="' + k[0] + '"' + (b.kind === k[0] ? ' selected' : '') + '>' + k[1] + ' ' + k[2] + '</option>'; }).join('') + '</select>' +
      '<label for="bkt">이름</label><input class="inp" id="bkt" maxlength="80" required placeholder="예: 알람브라 나스르 궁전" value="' + esc(b.title || '') + '">' +
      '<div class="two"><div><label for="bkd">날짜</label><input class="inp" type="date" id="bkd" required value="' + esc(b.date || '') + '"></div><div><label for="bktm">시간 (선택)</label><input class="inp" type="time" id="bktm" value="' + esc(b.time || '') + '"></div></div>' +
      '<label for="bke">끝나는 날짜 (숙소면 체크아웃)</label><input class="inp" type="date" id="bke" value="' + esc(b.end || '') + '">' +
      '<label for="bkp">장소 (선택)</label><input class="inp" id="bkp" maxlength="80" value="' + esc(b.place || '') + '">' +
      '<label for="bkm">메모 (예약번호, 인원, 주의사항)</label><textarea id="bkm" maxlength="300">' + esc(b.memo || '') + '</textarea>' +
      '<label for="bkl">링크 (선택)</label><input class="inp" id="bkl" type="url" maxlength="400" placeholder="https://" value="' + esc(b.link || '') + '">' +
      (bkEdit === 'new' && opts ? '<label for="bkx">같이 완료할 할 일 (선택)</label><select id="bkx"><option value="">선택 안 함</option>' + opts + '</select>' : '') +
      (bkEdit !== 'new' && safeUrl(b.link) ? '<p class="small" style="margin-top:8px"><a href="' + esc(safeUrl(b.link)) + '" target="_blank" rel="noopener">저장된 링크 열기</a></p>' : '') +
      '<div class="acts"><button class="btn fill" type="submit">저장</button><button class="btn" type="button" id="bkcancel">닫기</button>' + (bkEdit !== 'new' ? '<button class="btn del" type="button" id="bkdel">삭제</button>' : '') + '</div></form>';
  }

  /* ---------- 일정 ---------- */
  function days() {
    var t = ymd(today()), h = '<h2 style="margin-top:6px"><span class="em">📅</span>날짜별 일정</h2><p class="hint">날짜를 누르면 펼쳐져요. 장소를 누르면 구글 지도가 열려요.</p>';
    if (!S.days.length) { $('v-days').innerHTML = h + '<div class="empty">' + (loaded ? '일정이 아직 없어요.' : '불러오는 중') + '</div>'; return; }
    S.days.slice().sort(byOrder).forEach(function (d) {
      var isT = d.date === t, open = openDays[d.id] !== undefined ? openDays[d.id] : isT, dd = pd(d.date), w = wxFor(d.date);
      var pl = S.places.filter(function (p) { return p.date === d.date; }).sort(byOrder);
      h += '<article class="day' + (d.kind === 'rest' ? ' rest' : '') + (isT ? ' today' : '') + '" id="day-' + esc(d.id) + '"><button class="day-h" data-day="' + esc(d.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span class="dbadge"><span class="m">' + (dd.getMonth() + 1) + '월</span><span class="dd">' + dd.getDate() + '</span><span class="w">' + DOW[dd.getDay()] + '</span></span>' +
        '<span class="dh-txt"><span class="dh-city">' + esc(d.city) + '</span><span class="dh-head">' + esc(d.headline || '') + '</span></span>' +
        (w ? '<span class="wchip">' + (w.fc ? '🌤️' : '🌡️') + '<br>' + esc(w.txt.replace('평년 ', '')) + '</span>' : '') + '</button>' +
        '<div class="day-b"' + (open ? '' : ' hidden') + '>' + (dayEdit === d.id ? dayForm(d) :
        dayBk(d.date) + '<ul>' + (d.items || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
        (pl.length ? '<div class="pchips">' + pl.map(function (p) { return '<a class="pchip" target="_blank" rel="noopener" href="' + esc(gmap(p.q || p.name)) + '">' + (KIND[p.kind] || '📍') + ' ' + esc(p.name) + '</a>'; }).join('') + '</div>' : '') +
        ((d.notes && d.notes.length) ? '<div class="dnote">' + d.notes.map(esc).join('<br>') + '</div>' : '') +
        (canEdit() ? '<div class="acts"><button type="button" class="btn small-btn" data-dedit="' + esc(d.id) + '">✏️ 이 날 일정 고치기</button></div>' : '')) + '</div></article>';
    });
    $('v-days').innerHTML = h;
  }
  function dayForm(d) {
    return '<form class="edit" id="dayf" data-id="' + esc(d.id) + '"><b class="disp">' + esc(md(d.date)) + ' 일정 고치기</b>' +
      '<label for="dfh">한 줄 요약</label><input class="inp" id="dfh" maxlength="80" value="' + esc(d.headline || '') + '">' +
      '<label for="dfi">일정 (한 줄에 하나씩)</label><textarea id="dfi" rows="7">' + esc((d.items || []).join('\n')) + '</textarea>' +
      '<label for="dfn">메모 (한 줄에 하나씩)</label><textarea id="dfn" rows="4">' + esc((d.notes || []).join('\n')) + '</textarea>' +
      '<div class="acts"><button class="btn fill" type="submit">저장</button><button class="btn" type="button" id="dfcancel">닫기</button></div></form>';
  }
  function lines(v) { return String(v || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function dayBk(date) {
    var l = bkSorted().filter(function (b) { return b.date === date || (b.kind === 'stay' && b.end === date); });
    if (!l.length) return '';
    return '<div class="bkday">' + l.map(function (b) {
      var co = b.kind === 'stay' && b.end === date && b.date !== date;
      return '<div>🎫 ' + (b.time && !co ? esc(b.time) + ' ' : '') + bkIcon(b.kind) + ' ' + esc(b.title) + (co ? ' 체크아웃' : (b.kind === 'stay' ? ' 체크인' : '')) + (b.memo ? ' <span class="small">(' + esc(b.memo) + ')</span>' : '') + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 지도 ---------- */
  var IB = [[-8.87,41.87],[-8.9,42.1],[-8.75,42.3],[-9.05,42.55],[-9.3,42.92],[-9.15,43.2],[-8.6,43.33],[-8.3,43.5],[-7.9,43.75],[-7.3,43.6],[-6.5,43.55],[-5.8,43.62],[-5,43.48],[-4.2,43.42],[-3.4,43.45],[-2.7,43.4],[-1.8,43.38],[-1.4,43.05],[-0.6,42.8],[0.3,42.7],[1.2,42.5],[1.8,42.45],[2.6,42.35],[3.17,42.43],[3.2,42],[2.8,41.7],[2.2,41.35],[1.6,41.2],[1,41.05],[0.7,40.75],[0.2,40.2],[-0.2,39.75],[-0.35,39.4],[-0.1,38.95],[0.2,38.75],[-0.3,38.45],[-0.55,38.2],[-0.75,37.85],[-0.9,37.58],[-1.4,37.55],[-1.8,37.2],[-2.1,36.75],[-2.6,36.7],[-3.4,36.72],[-4.4,36.7],[-4.9,36.48],[-5.35,36.15],[-5.6,36.02],[-6,36.3],[-6.3,36.55],[-6.45,36.9],[-7,37.2],[-7.4,37.18],[-7.9,37],[-8.6,37.1],[-8.99,37.02],[-8.8,37.4],[-8.8,37.9],[-8.9,38.45],[-9.2,38.42],[-9.1,38.65],[-9.5,38.78],[-9.4,39.1],[-9.35,39.36],[-9,39.8],[-8.85,40.2],[-8.7,40.7],[-8.75,41.2],[-8.8,41.6]];
  var PT = [[-8.87,41.87],[-8.2,42.1],[-7.5,41.9],[-6.6,41.95],[-6.2,41.6],[-6.9,41],[-6.8,40.3],[-7,39.7],[-7.5,39.6],[-7,38.9],[-7.3,38.4],[-7,38],[-7.5,37.6],[-7.4,37.18]];
  var K = 80, CS = Math.cos(40 * Math.PI / 180);
  function P(lon, lat) { return [((lon + 9.9) * CS * K).toFixed(1), ((44.2 - lat) * K).toFixed(1)]; }
  function pts(a) { return a.map(function (p) { return P(p[0], p[1]).join(','); }).join(' '); }
  function mapSvg(cs) {
    var svg = '<svg viewBox="0 0 830 672" role="img" aria-label="여행 경로 그림 지도"><polygon class="land" points="' + pts(IB) + '"/><polyline class="border" points="' + pts(PT) + '"/>' +
      '<text class="sea" x="12" y="300">대서양</text><text class="sea" x="650" y="470">지중해</text>';
    for (var i = 1; i < cs.length; i++) { var a = P(cs[i - 1].lon, cs[i - 1].lat), b = P(cs[i].lon, cs[i].lat); svg += '<line class="leg' + (cs[i].mode === 'flight' ? ' fly' : '') + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; }
    S.pins.slice().sort(byOrder).forEach(function (p) { var q = P(p.lon, p.lat); var px = p.lx != null ? p.lx : 12, py = p.ly != null ? p.ly : 5; svg += '<g class="dpin pin" data-pin="' + esc(p.id) + '" tabindex="0" role="button" aria-label="' + esc(p.name) + '"><circle cx="' + q[0] + '" cy="' + q[1] + '" r="8"/><text x="' + (+q[0] + px) + '" y="' + (+q[1] + py) + '"' + (px < 0 ? ' text-anchor="end"' : '') + '>' + esc(p.name) + '</text></g>'; });
    cs.forEach(function (c) {
      var q = P(c.lon, c.lat), s = sel === 'c:' + c.id, dx = c.lx || 14, dy = c.ly || -14;
      svg += '<g class="pin' + (s ? ' sel' : '') + '" data-city="' + esc(c.id) + '" tabindex="0" role="button" aria-label="' + esc(c.name) + '"><circle class="o" cx="' + q[0] + '" cy="' + q[1] + '" r="17"/><text class="n" x="' + q[0] + '" y="' + q[1] + '">' + esc(c.order) + '</text><text class="lb" x="' + (+q[0] + dx) + '" y="' + (+q[1] + dy) + '"' + (dx < 0 ? ' text-anchor="end"' : '') + '>' + esc(c.name) + '</text></g>';
    });
    return svg + '</svg>';
  }
  var mapKey = '';
  function mapView() {
    var cs = S.cities.slice().sort(byOrder).filter(function (c) { return c.lat != null; });
    var mid = (S.meta && S.meta.mymap) || '', online = navigator.onLine, useG = !!(mid && online);
    var key = mid + '|' + online;
    /* 구글 지도가 떠 있으면 데이터가 바뀌어도 지도는 다시 불러오지 않고 아래 목록만 고친다 */
    if (useG && key === mapKey && $('gmapFrame')) { refreshMapParts(); return; }
    mapKey = key;
    var h = '<h2 style="margin-top:6px"><span class="em">🗺️</span>여행 지도</h2>';
    if (useG) {
      var gsrc = 'https://www.google.com/maps/d/embed?mid=' + encodeURIComponent(mid);
      h += '<p class="hint">구글 지도예요. 핀을 누르면 장소가 나와요. 손가락 두 개로 확대할 수 있어요.</p>' +
        '<div class="gmap"><iframe id="gmapFrame" src="' + esc(gsrc) + '" title="여행 구글 지도" loading="lazy" allowfullscreen></iframe></div>' +
        '<div class="acts"><a class="btn fill" target="_blank" rel="noopener" href="' + esc('https://www.google.com/maps/d/viewer?mid=' + encodeURIComponent(mid)) + '">구글 지도에서 크게 보기</a></div>';
    } else if (mid) {
      h += '<p class="net">인터넷이 없어서 구글 지도 대신 그림 지도를 보여 드려요.</p>';
    } else {
      h += '<p class="hint">구글 지도는 연결 준비 중이에요. 지금은 그림 지도예요.</p>';
    }
    h += '<div class="cchips" role="group" aria-label="도시 고르기">' + cs.map(function (c) { return '<button type="button" class="cchip" data-msel="c:' + esc(c.id) + '" aria-pressed="' + (sel === 'c:' + c.id) + '">' + esc(c.order) + ' ' + esc(c.name) + '</button>'; }).join('') +
      S.pins.slice().sort(byOrder).map(function (p) { return '<button type="button" class="cchip day" data-msel="p:' + esc(p.id) + '" aria-pressed="' + (sel === 'p:' + p.id) + '">🟠 ' + esc(p.name) + '</button>'; }).join('') + '</div>';
    h += '<div id="mapSel">' + mapSel() + '</div>';
    var box = '<div class="mapbox" id="svgBox">' + mapSvg(cs) + '<div class="legend"><span><i></i>기차·버스</span><span><i class="f"></i>비행기</span><span>🟠 당일치기</span></div></div>';
    h += useG ? '<details class="fold"><summary>🧭 전체 경로 그림</summary>' + box + '</details>' : box;
    h += '<div id="legsBox">' + legsView() + '</div>';
    $('v-map').innerHTML = h;
  }
  function refreshMapParts() {
    var ms = $('mapSel'); if (ms) ms.innerHTML = mapSel();
    var lb = $('legsBox'); if (lb) lb.innerHTML = legsView();
    Array.prototype.forEach.call(document.querySelectorAll('[data-msel]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.msel === sel)); });
    Array.prototype.forEach.call(document.querySelectorAll('#svgBox g[data-city]'), function (g) { g.classList.toggle('sel', sel === 'c:' + g.dataset.city); });
  }
  function pickMap(v) {
    sel = sel === v ? null : v;
    if ($('mapSel')) { refreshMapParts(); var ms = $('mapSel'); if (sel && ms) ms.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } else mapView();
  }
  var MODE = { transit: ['🚆', '대중교통'], driving: ['🚕', '택시·차'], walking: ['🚶', '도보'], flight: ['✈️', '비행기'] };
  function legUrl(l) {
    if (l.mode === 'flight') return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(l.to);
    return 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(l.from) + '&destination=' + encodeURIComponent(l.to) + '&travelmode=' + encodeURIComponent(l.mode || 'transit');
  }
  function legsView() {
    if (!S.legs.length) return ''; var t = ymd(today());
    return '<h2><span class="em">🧭</span>구간별 길찾기</h2><p class="hint">누르면 그 구간에 맞는 이동수단으로 구글 지도가 열려요. 비행 구간은 도착 공항 위치를 보여줘요.</p><div class="card">' +
      S.legs.slice().sort(byOrder).map(function (l) {
        var d = pd(l.date), m = MODE[l.mode] || MODE.transit;
        return '<a class="lg' + (l.date < t ? ' past' : '') + '" target="_blank" rel="noopener" href="' + esc(legUrl(l)) + '"><span class="bd">' + (d ? (d.getMonth() + 1) + '/' + d.getDate() + '<br>' + DOW[d.getDay()] : '') + '</span>' +
          '<span class="bt">' + m[0] + ' ' + esc(l.title) + '</span><span class="bm">' + esc(l.note || m[1]) + ' <span class="go">길찾기 열기</span></span></a>';
      }).join('') + '</div>';
  }
  function mapSel() {
    if (!sel) return '<div class="empty" style="margin-top:12px">위에서 도시를 고르면 그 도시의 날짜별 일정과 장소가 나와요. 장소를 누르면 구글 지도가 열려요.</div>';
    var ds = [], title = '';
    if (sel.indexOf('c:') === 0) {
      var c = S.cities.filter(function (x) { return 'c:' + x.id === sel; })[0]; if (!c) return ''; title = c.name + (c.booked ? ', 🏨 ' + c.hotel : '');
      ds = S.days.filter(function (d) { var sc = stayCity(d.date); return sc && sc.id === c.id; });
    } else {
      var p = S.pins.filter(function (x) { return 'p:' + x.id === sel; })[0]; if (!p) return ''; title = p.name + ' (당일치기)'; ds = S.days.filter(function (d) { return d.date === p.date; });
    }
    var h = '<h2><span class="em">📍</span>' + esc(title) + '</h2>';
    ds.sort(byOrder).forEach(function (d) {
      var pl = S.places.filter(function (x) { return x.date === d.date; }).sort(byOrder);
      h += '<div class="card"><div class="row"><b class="disp">' + esc(md(d.date)) + ' ' + esc(d.city) + '</b></div><div class="small">' + esc(d.headline || '') + '</div>' +
        (pl.length ? '<div class="pchips">' + pl.map(function (x) { return '<a class="pchip" target="_blank" rel="noopener" href="' + esc(gmap(x.q || x.name)) + '">' + (KIND[x.kind] || '📍') + ' ' + esc(x.name) + '</a>'; }).join('') + '</div>' : '') + '</div>';
    });
    return h;
  }

  /* ---------- 할 일 ---------- */
  function sortedTasks() { return S.tasks.slice().sort(function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : (a.due || '9') > (b.due || '9') ? 1 : (a.order || 0) - (b.order || 0); }); }
  function taskRow(t) {
    if (taskEdit === t.id) return taskForm(t);
    var n = diff(t.due), cls = '', txt = t.due ? md(t.due) + '까지' : '';
    if (!t.done && n !== null) { if (n < 0) { cls = 'late'; txt += ' (지남)'; } else if (n <= 7) { cls = 'soon'; txt += n === 0 ? ' (오늘)' : ' (' + n + '일 남음)'; } }
    var who = t.done ? (t.doneBy ? whoName(t.doneBy) + ' 체크' : '완료') : '';
    return '<div class="task' + (t.done ? ' done' : '') + '"><button class="chk" role="checkbox" aria-checked="' + (t.done ? 'true' : 'false') + '" aria-label="' + esc(t.title) + '" data-tid="' + esc(t.id) + '"' + (canEdit() ? '' : ' disabled') + '></button>' +
      '<button type="button" class="tt" data-tedit="' + esc(t.id) + '"' + (canEdit() ? '' : ' disabled') + '>' + esc(t.title) + '</button><div class="tm">' + (txt ? '<span class="due ' + cls + '">' + esc(txt) + '</span>' : '') + (t.passport ? '<span class="pp">🛂 새 여권번호</span>' : '') + (t.note ? '<span>' + esc(t.note) + '</span>' : '') + (who ? '<span class="who">' + esc(who) + '</span>' : '') + '</div></div>';
  }
  function taskForm(t) {
    return '<form class="edit" id="taskf" data-id="' + esc(t.id) + '"><b class="disp">할 일 고치기</b>' +
      '<label for="tfh">할 일</label><input class="inp" id="tfh" maxlength="80" required value="' + esc(t.title || '') + '">' +
      '<label for="tfd">마감일</label><input class="inp" type="date" id="tfd" value="' + esc(t.due || '') + '">' +
      '<label for="tfn">메모</label><textarea id="tfn" rows="3">' + esc(t.note || '') + '</textarea>' +
      '<label class="chkrow"><input type="checkbox" id="tfp"' + (t.passport ? ' checked' : '') + '> 새 여권번호 필요</label>' +
      '<div class="acts"><button class="btn fill" type="submit">저장</button><button class="btn" type="button" id="tfcancel">닫기</button><button class="btn del" type="button" id="tfdel">삭제</button></div></form>';
  }
  function tasks() {
    var h = '<h2 style="margin-top:6px"><span class="em">✅</span>할 일</h2>' + (canEdit() ? '<p class="hint">제목을 누르면 고치거나 지울 수 있어요.</p>' : ''), cur = '', buf = [];
    var open = sortedTasks().filter(function (t) { return !t.done; }), done = sortedTasks().filter(function (t) { return t.done; });
    function flush() { if (buf.length) { h += '<div class="card">' + buf.join('') + '</div>'; buf = []; } }
    open.forEach(function (t) { var d = pd(t.due), k = d ? (d.getMonth() + 1) + '월' : '날짜 없음'; if (k !== cur) { flush(); h += '<div class="month">' + esc(k) + '</div>'; cur = k; } buf.push(taskRow(t)); });
    flush();
    if (!S.tasks.length && loaded) h += '<div class="empty">할 일이 없어요. 아래에서 추가해 보세요.</div>';
    h += '<form class="addf" id="addf"' + (canEdit() ? '' : ' hidden') + '><input class="inp" id="addt" maxlength="80" placeholder="할 일 추가 (예: 환전하기)" required aria-label="할 일"><input class="inp" type="date" id="addd" aria-label="마감일"><button class="btn fill" type="submit">추가</button></form>';
    if (done.length) h += '<details class="fold"' + foldAttr('done') + '><summary>끝낸 일 ' + done.length + '개</summary>' + done.map(taskRow).join('') + '</details>';
    var ord = { '변동': 0, '대기': 1, '확인됨': 2 };
    var ws = S.watch.slice().sort(function (a, b) { return (ord[a.status] || 1) - (ord[b.status] || 1); });
    h += '<details class="fold"' + foldAttr('watch') + '><summary>🔍 다시 확인할 것 ' + ws.length + '개</summary>' + ws.map(function (w) {
      var c = w.status === '확인됨' ? 'ok' : w.status === '변동' ? 'ora' : 'blue';
      return '<div class="rq"><div class="row"><b>' + esc(w.title) + '</b><span class="chip ' + c + '">' + esc(w.status || '대기') + '</span></div><div style="font-size:14px">' + esc(w.detail || '') + '</div><div class="small">' + (w.checkFrom ? esc(md(w.checkFrom)) + '부터 확인' : '') + (w.lastChecked ? ', 마지막 확인 ' + esc(md(w.lastChecked)) : '') + '</div></div>';
    }).join('') + '</details>';
    var lg = S.log.slice().sort(function (a, b) { return (a.at || '') < (b.at || '') ? 1 : -1; });
    h += '<details class="fold"' + foldAttr('log') + '><summary>📜 바뀐 내용</summary>' + lg.map(function (l) {
      return '<div class="rq"><span class="small">' + esc(md(l.at)) + (l.undone ? ' · 되돌림' : '') + '</span><div>' + esc(l.text) + '</div>' + (l.batch && !l.undone ? undoBtn(l.batch) : '') + '</div>';
    }).join('') + '</details>';
    var me = Store.me();
    h += '<div class="acct small">' + (Store.status.mode === 'demo' ? '데모 모드: 바꾼 내용은 이 기기에만 저장돼요.' : (me && me.email ? esc(me.name || me.email) + ' (' + esc(me.email) + ')로 로그인 · <button class="linkbtn" id="logout" type="button">로그아웃</button>' : '')) + '</div>';
    $('v-tasks').innerHTML = h;
  }

  /* ---------- 추천 ---------- */
  function rec() {
    var h = '<h2 style="margin-top:6px"><span class="em">🎒</span>추천</h2><div class="seg" role="tablist">' +
      [['tour', '🚌 투어'], ['shop', '🛍️ 쇼핑'], ['wx', '☀️ 날씨']].map(function (x) { return '<button role="tab" data-rt="' + x[0] + '" aria-selected="' + (recTab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (recTab === 'tour') {
      h += '<p class="hint" style="margin-top:12px">일정에 맞춰 고른 일일 투어예요. 가격과 후기 수는 확인한 날 기준이라 예약 전에 다시 보세요.</p>';
      h += S.tours.length ? S.tours.slice().sort(byOrder).map(function (r) {
        return '<div class="card rec"><div class="top2"><span class="tl">' + esc(r.title) + '</span><span class="chip ' + (r.fit === '강력 추천' ? 'ora' : 'blue') + '">' + esc(r.fit || '추천') + '</span></div>' +
          '<div class="meta">' + esc(r.city) + (r.day ? ', ' + esc(md(r.day)) : '') + (r.platform ? ', ' + esc(r.platform) : '') + (r.price ? ', ' + esc(r.price) : '') + '</div><div class="why">' + esc(r.why || '') + '</div>' +
          (safeUrl(r.url) ? '<div class="acts"><a class="btn" target="_blank" rel="noopener" href="' + esc(r.url) + '">상품 보기</a></div>' : (r.search ? '<div class="meta">앱에서 검색: ' + esc(r.search) + '</div>' : '')) + '</div>';
      }).join('') : '<div class="empty">추천 투어가 아직 없어요.</div>';
    } else if (recTab === 'shop') {
      h += '<p class="hint" style="margin-top:12px">도시별로 사 올 만한 것과 살 곳이에요.</p>';
      var cities = []; S.shops.slice().sort(byOrder).forEach(function (s) { if (cities.indexOf(s.city) < 0) cities.push(s.city); });
      cities.forEach(function (c) {
        h += '<div class="month">' + esc(c) + '</div>' + S.shops.filter(function (s) { return s.city === c; }).sort(byOrder).map(function (s) {
          return '<div class="card rec"><div class="tl">' + esc(s.item) + '</div><div class="why">' + esc(s.why || '') + '</div>' + (s.where ? '<div class="meta">📍 ' + (s.q ? '<a target="_blank" rel="noopener" href="' + esc(gmap(s.q)) + '">' + esc(s.where) + '</a>' : esc(s.where)) + '</div>' : '') + '</div>';
        }).join('');
      });
      if (!cities.length) h += '<div class="empty">쇼핑 목록이 아직 없어요.</div>';
    } else {
      h += '<p class="hint" style="margin-top:12px">출발 2주 전부터 자동 점검이 실제 예보로 바꿔 넣어요. 그 전엔 12월 평년 기온이에요.</p>';
      h += S.weather.length ? S.weather.slice().sort(byOrder).map(function (w) {
        return '<div class="card"><div class="wx"><div><b class="disp" style="font-size:18px">' + esc(w.city) + '</b><div class="small">' + esc(w.dates || '') + '</div></div><div class="tmp">' + esc(w.avgHi) + '° / ' + esc(w.avgLo) + '°</div></div>' +
          '<div style="font-size:14px;margin-top:4px">' + esc(w.tip || '') + '</div>' +
          ((w.forecast && w.forecast.length) ? '<div class="fc">' + w.forecast.map(function (f) { return '<div>' + esc(md(f.date).split(' ')[0]) + '<br>' + esc(f.sky || '') + '<br>' + esc(f.hi) + '°/' + esc(f.lo) + '°</div>'; }).join('') + '</div>' : '<div class="small" style="margin-top:4px">예보는 출발 2주 전부터</div>') + '</div>';
      }).join('') : '<div class="empty">날씨 정보가 아직 없어요.</div>';
    }
    $('v-rec').innerHTML = h;
  }

  /* ---------- 로그인 ---------- */
  function loginView(msg) {
    var mode = Store.status.mode;
    var h = '<div class="loginbox"><h1 class="disp">🍊 우리 신혼여행</h1>' + installHint();
    if (mode === 'denied') {
      h += '<p>이 계정(' + esc((Store.me() || {}).email || '') + ')은 아직 등록되지 않았어요. 영욱에게 이 이메일을 알려 주세요.</p><div class="acts"><button class="btn" type="button" id="logout">다른 계정으로 로그인</button></div>';
    } else if (mode === 'need-net') {
      h += '<p>처음 한 번은 인터넷이 연결된 상태에서 열어야 해요. 연결되면 자동으로 다시 열려요.</p>';
    } else {
      h += '<p class="small">둘만 쓰는 공간이에요. 처음이면 이메일과 비밀번호를 정해 <b>가입</b>을 누르세요.</p>' +
        '<form id="loginf" class="edit" style="border-color:var(--azul)"><label for="lem">이메일</label><input class="inp" id="lem" type="email" autocomplete="username" required>' +
        '<label for="lpw">비밀번호 (6자 이상)</label><input class="inp" id="lpw" type="password" autocomplete="current-password" minlength="6" required>' +
        '<div class="acts"><button class="btn fill" type="submit" data-act="in">로그인</button><button class="btn" type="button" id="signup">처음이에요, 가입</button></div>' +
        (msg ? '<p class="small" id="lmsg" style="margin-top:10px;color:var(--naranja)">' + esc(msg) + '</p>' : '') + '</form>';
    }
    $('v-login').innerHTML = h + '</div>';
  }

  /* ---------- 공통 ---------- */
  function header() {
    var st = Store.status, m = S.meta || {}, net = $('net'), msg = '';
    var off = !st.online && st.mode !== 'demo';
    $('upd').textContent = st.mode === 'demo' ? '데모' : off ? '📴 오프라인' : (m.updatedAt ? '업데이트 ' + md(m.updatedAt) : (loaded ? '' : '불러오는 중'));
    $('upd').classList.toggle('off', off);
    if (off) msg = '인터넷이 없어서 ' + (st.lastSync ? hm(st.lastSync) + '에 ' : '마지막으로 ') + '저장한 내용을 보여 드려요.' + (st.pending ? ' 고친 내용 ' + st.pending + '건은 연결되면 보낼게요.' : '');
    else if (st.pending) msg = '고친 내용 ' + st.pending + '건을 보내는 중이에요.';
    net.textContent = msg; net.hidden = !msg;
    if (st.error) { toast(st.error); Store.clearError(); }
  }
  function render() {
    var mode = Store.status.mode, gate = (mode === 'login' || mode === 'denied' || mode === 'need-net');
    document.body.classList.toggle('gated', gate);
    if (gate) { if (lastMode !== mode || !$('v-login').innerHTML) loginView(); lastMode = mode; return; }
    lastMode = mode;
    pull(); header();
    if (view === 'home') home(); else if (view === 'days') days(); else if (view === 'map') mapView(); else if (view === 'tasks') tasks(); else rec();
  }
  function busy() { return !!(editing || bkEdit || dayEdit || taskEdit); }
  function go(v) {
    view = v; VIEWS.forEach(function (k) { $('v-' + k).hidden = (k !== v); });
    Array.prototype.forEach.call(document.querySelectorAll('nav.tabs button'), function (b) { if (b.dataset.v === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    try { history.replaceState(null, '', '#' + v); } catch (e) {}
    render(); window.scrollTo(0, 0);
    if (v === 'days') { var td = document.querySelector('.day.today'); if (td) td.scrollIntoView({ block: 'start' }); }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target : null; if (!el) return;
    var nb = el.closest('nav.tabs button'); if (nb) { go(nb.dataset.v); return; }
    if (el.closest('#logout')) { Store.logout(); return; }
    if (el.closest('#signup')) {
      var em = $('lem').value, pw = $('lpw').value;
      if (!em || (pw || '').length < 6) { loginView('이메일과 6자 이상 비밀번호를 넣어 주세요.'); return; }
      Store.signup(em, pw).then(function (r) { if (r === 'confirm') loginView('메일함에서 확인 링크를 누른 뒤, 여기로 돌아와 로그인하세요.'); else render(); }, function (err) { loginView(err.message || '가입하지 못했어요.'); });
      return;
    }
    var de = el.closest('[data-dedit]'); if (de) { dayEdit = de.dataset.dedit; days(); var f0 = $('dayf'); if (f0) f0.scrollIntoView({ block: 'start' }); return; }
    if (el.closest('#dfcancel')) { dayEdit = null; days(); return; }
    var te = el.closest('[data-tedit]'); if (te && !te.disabled) { taskEdit = te.dataset.tedit; render(); var f1 = $('taskf'); if (f1) { f1.scrollIntoView({ block: 'center' }); } return; }
    if (el.closest('#tfcancel')) { taskEdit = null; render(); return; }
    var td = el.closest('#tfdel');
    if (td) { if (!td.dataset.sure) { td.dataset.sure = '1'; td.textContent = '한 번 더 누르면 삭제'; return; } Store.remove('tasks', taskEdit); taskEdit = null; toast(savedMsg('할 일을 지웠어요.')); render(); return; }
    var ub = el.closest('[data-undo]');
    if (ub) {
      var bt = ub.dataset.undo;
      if (!navigator.onLine) { toast('인터넷이 연결되면 되돌릴 수 있어요.'); return; }
      if (undoArm !== bt) { undoArm = bt; ub.classList.add('del'); ub.textContent = '한 번 더 누르면 되돌려요'; setTimeout(function () { if (undoArm === bt) { undoArm = null; if (!busy()) render(); } }, 5000); return; }
      undoArm = null; ub.disabled = true; ub.textContent = '되돌리는 중…';
      Store.rpc('undo_batch', { p_batch: bt }).then(function (n) { toast('되돌렸어요. (' + n + '건)'); return Store.sync(); }, function (e) { ub.disabled = false; toast('되돌리지 못했어요: ' + ((e && e.message) || '오류')); });
      return;
    }
    var ck = el.closest('.chk');
    if (ck && !ck.disabled) {
      var t = S.tasks.filter(function (x) { return x.id === ck.dataset.tid; })[0]; if (!t) return; var nx = !t.done;
      Store.update('tasks', t.id, { done: nx, doneBy: nx ? myId() : null, doneAt: nx ? nowIso() : null }); return;
    }
    var pb = el.closest('.pbtn');
    if (pb && !pb.disabled) {
      var ap = pb.dataset.act === 'apply';
      Store.update('proposals', pb.dataset.id, { status: ap ? '반영 요청' : '보류', decidedBy: myId(), decidedAt: nowIso() });
      toast(savedMsg(ap ? '반영을 요청했어요.' : '보류했어요.')); return;
    }
    var st = el.closest('.stamp');
    if (st) { if (!canEdit()) { toast('로그인하면 숙소를 입력할 수 있어요.'); return; } editing = editing === st.dataset.cid ? null : st.dataset.cid; cityEdit(); if (editing) $('ceh').focus(); return; }
    var bk = el.closest('.bk');
    if (bk) { if (!canEdit()) { toast('로그인하면 예약을 고칠 수 있어요.'); return; } bkEdit = bk.dataset.bk; bkArea(); var f = $('bkf'); if (f) f.scrollIntoView({ block: 'start' }); return; }
    if (el.closest('#bkadd')) { bkEdit = 'new'; bkArea(); $('bkt').focus(); return; }
    if (el.closest('#bkcancel')) { bkEdit = null; bkArea(); return; }
    var dl = el.closest('#bkdel');
    if (dl) {
      var did = bkEdit; if (!did || did === 'new') return;
      if (!dl.dataset.sure) { dl.dataset.sure = '1'; dl.textContent = '한 번 더 누르면 삭제'; return; }
      Store.remove('bookings', did); toast(savedMsg('예약을 지웠어요.')); bkEdit = null; render(); return;
    }
    var dh = el.closest('.day-h');
    if (dh) { var id = dh.dataset.day, body = dh.nextElementSibling, op = body.hidden; body.hidden = !op; dh.setAttribute('aria-expanded', op ? 'true' : 'false'); openDays[id] = op; return; }
    var mc = el.closest('[data-msel]'); if (mc) { pickMap(mc.dataset.msel); return; }
    var pc = el.closest('[data-city]'); if (pc && el.closest('svg')) { pickMap('c:' + pc.dataset.city); return; }
    var pp = el.closest('[data-pin]'); if (pp) { pickMap('p:' + pp.dataset.pin); return; }
    var rt = el.closest('[data-rt]'); if (rt) { recTab = rt.dataset.rt; rec(); return; }
  });
  document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.dataset && d.dataset.fold) foldOpen[d.dataset.fold] = d.open; }, true);
  document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('svg [role=button]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = e.target.id;
    if (id === 'loginf') {
      var btn = e.target.querySelector('[data-act=in]'); btn.disabled = true;
      Store.login($('lem').value, $('lpw').value).then(function () { render(); }, function (err) {
        btn.disabled = false;
        var m = String(err && err.message || '');
        loginView(/Invalid login/i.test(m) ? '이메일이나 비밀번호가 맞지 않아요.' : /confirm/i.test(m) ? '메일함에서 확인 링크를 먼저 눌러 주세요.' : (m || '로그인하지 못했어요.'));
      });
      return;
    }
    if (!canEdit()) return;
    if (id === 'dayf') {
      Store.update('days', e.target.dataset.id, { headline: $('dfh').value.trim(), items: lines($('dfi').value), notes: lines($('dfn').value), editedBy: myId(), editedAt: nowIso() });
      dayEdit = null; toast(savedMsg('일정을 고쳤어요.')); render(); return;
    }
    if (id === 'taskf') {
      var tt0 = $('tfh').value.trim(); if (!tt0) { toast('할 일을 입력해 주세요.'); return; }
      Store.update('tasks', e.target.dataset.id, { title: tt0, due: $('tfd').value || null, note: $('tfn').value.trim(), passport: $('tfp').checked, editedBy: myId(), editedAt: nowIso() });
      taskEdit = null; toast(savedMsg('할 일을 고쳤어요.')); render(); return;
    }
    if (id === 'reqf') {
      var v = $('reqt').value.trim(); if (!v) return;
      Store.add('requests', { text: v, at: nowIso(), by: myId(), status: '대기', reply: null }); $('reqt').value = ''; toast(savedMsg('남겼어요. 1시간 안에 반영돼요.'));
    } else if (id === 'bkf') {
      var data = { kind: $('bkk').value, title: $('bkt').value.trim(), date: $('bkd').value, time: $('bktm').value || '', end: $('bke').value || '', place: $('bkp').value.trim(), memo: $('bkm').value.trim(), link: $('bkl').value.trim(), by: myId(), at: nowIso() };
      if (!data.title || !data.date) { toast('이름과 날짜를 입력해 주세요.'); return; }
      var tx = $('bkx') ? $('bkx').value : '', isNew = bkEdit === 'new';
      if (isNew) Store.add('bookings', data); else Store.update('bookings', bkEdit, data);
      if (tx) Store.update('tasks', tx, { done: true, doneBy: myId(), doneAt: nowIso() });
      toast(savedMsg(isNew ? '예약을 등록했어요.' : '예약을 고쳤어요.')); bkEdit = null; render();
    } else if (id === 'addf') {
      var tt = $('addt').value.trim(), dd = $('addd').value; if (!tt) return;
      Store.add('tasks', { title: tt, due: dd || null, note: '', passport: false, done: false, doneBy: null, doneAt: null, order: 999, addedBy: myId() });
      toast(savedMsg('할 일을 추가했어요.'));
    }
  });

  /* 새로고침: 버튼, 당겨서 */
  var syncingUi = false;
  function resync(silent) {
    if (syncingUi) return; syncingUi = true; var rf = $('rf'); rf.classList.add('spin');
    var done = function (ok) {
      syncingUi = false; rf.classList.remove('spin'); ptrSet(0);
      if (!silent) toast(ok ? '최신 내용으로 맞췄어요.' : (navigator.onLine ? '지금은 맞추지 못했어요. 잠시 후 다시 해 주세요.' : '오프라인이라 저장본을 보여 드려요.'));
    };
    Store.sync().then(done, function () { done(false); });
  }
  var ptr = $('ptr'), py = null, pdy = 0;
  function ptrSet(dy, txt) { var y = Math.min(dy * 0.5, 90) - 70; ptr.style.transform = 'translate(-50%,' + y + 'px)'; if (txt) ptr.textContent = txt; }
  window.addEventListener('touchstart', function (e) { py = (window.scrollY <= 0 && e.touches.length === 1 && !document.body.classList.contains('gated')) ? e.touches[0].clientY : null; pdy = 0; }, { passive: true });
  window.addEventListener('touchmove', function (e) { if (py === null) return; pdy = e.touches[0].clientY - py; if (window.scrollY > 0 || pdy <= 0) { ptrSet(0); return; } ptrSet(pdy, pdy > 120 ? '놓으면 새로고침' : '↓ 당겨서 새로고침'); }, { passive: true });
  window.addEventListener('touchend', function () { if (py === null) return; if (pdy > 120 && window.scrollY <= 0) { ptrSet(150, '새로고침 중'); resync(); } else ptrSet(0); py = null; pdy = 0; }, { passive: true });
  $('rf').addEventListener('click', function () { resync(); });
  var lastDay = ymd(today());
  document.addEventListener('visibilitychange', function () { if (!document.hidden && ymd(today()) !== lastDay) { lastDay = ymd(today()); if (!busy()) render(); } });

  Store.onChange(function () { if (!busy()) render(); else header(); });
  window.addEventListener('online', function () { if (view === 'map') { mapKey = ''; mapView(); } });
  window.addEventListener('offline', function () { if (view === 'map') { mapKey = ''; mapView(); } });
  var h0 = (location.hash || '').replace('#', ''); if (VIEWS.indexOf(h0) >= 0) view = h0;
  go(view);
  Store.start();

  /* 서비스 워커: 오프라인 보기 */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    var hadCtrl = !!navigator.serviceWorker.controller, told = false;
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('sw', e); });
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!hadCtrl || told) return; told = true; toast('새 버전을 받았어요. 다음에 열 때 적용돼요.'); });
  }
})();
