/* 우리 신혼여행: 화면 */
(function () {
  var S = { meta: null, cities: [], days: [], tasks: [], watch: [], log: [], briefs: [], props: [], reqs: [], places: [], pins: [], tours: [], shops: [], weather: [], bookings: [], legs: [], files: [], expenses: [], events: [], eats: [], packing: [], phrases: [], journal: [], plans: [], wdc: [] };
  var MAP = { cities: 'cities', days: 'days', tasks: 'tasks', watch: 'watch', log: 'log', briefs: 'briefs', props: 'proposals', reqs: 'requests', places: 'places', pins: 'pins', tours: 'tours', shops: 'shops', weather: 'weather', bookings: 'bookings', legs: 'legs', files: 'files', expenses: 'expenses', events: 'events', eats: 'restaurants', packing: 'packing', phrases: 'phrases', journal: 'journal', plans: 'plans', wdc: 'wd_check' };
  var loaded = false, view = 'home', editing = null, sel = null, openDays = {}, bkEdit = null, lastMode = null, dayEdit = null, taskEdit = null, foldOpen = {}, undoArm = null;
  var discTab = 'now', discCity = '', discFav = false, walletSeg = 'tix', upOpen = null, upBusy = '', expEdit = null, ov = null, pushInfo = { state: '' };
  var packWho = null, packEdit = null, talkLang = '', talkCat = '', talkSlow = false, calInfo = { key: null, busy: false, err: '' };
  var PREVIEW = (function () { try { return localStorage.getItem('hm.preview') || ''; } catch (e) { return ''; } })();
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var KIND = { see: '🏛️', eat: '🍽️', stay: '🏨', shop: '🛍️', night: '🌙', move: '🚆' };
  var BK = [['stay', '🏨', '숙소'], ['move', '🚆', '교통'], ['ticket', '🎟️', '입장권'], ['tour', '🚌', '투어'], ['eat', '🍽️', '식당'], ['etc', '📌', '기타']];
  var IATA = { '인천': 'ICN', '리스본': 'LIS', '포르투': 'OPO', '세비야': 'SVQ', '그라나다': 'GRX', '바르셀로나': 'BCN', '마드리드': 'MAD' };
  var LEGACY = (window.HM_CONFIG && window.HM_CONFIG.legacyNames) || {};
  var VIEWS = ['home', 'days', 'map', 'wallet', 'discover', 'tasks', 'settings', 'pack', 'talk', 'album', 'plan', 'wed'];
  var TABS = ['home', 'wed', 'days', 'map', 'wallet', 'discover'];
  function bkIcon(k) { for (var i = 0; i < BK.length; i++) if (BK[i][0] === k) return BK[i][1]; return '📌'; }
  /* 교통 예약 중 편명(KE921, FR5467 같은)으로 시작하면 비행기 */
  function bkIco(b) { return b.kind === 'move' && /^[A-Z0-9]{2}\s?\d{2,4}\b/.test(b.title || '') ? '✈️' : bkIcon(b.kind); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pd(s) { if (!s) return null; var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { if (PREVIEW) return pd(PREVIEW); var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
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
    var tp = todayPanel(); if (tp) return tp;
    var w = wxFor(t);
    return '<div class="ticket today"><div class="main"><div class="t-route"><div><div class="t-code" style="font-size:26px">' + esc(dToday.city) + '</div><div class="t-city">' + esc(dToday.headline || '') + '</div></div></div>' +
      '<ul class="today-list">' + (dToday.items || []).slice(0, 5).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
      (w ? '<div class="t-meta">' + esc(w.txt) + '</div>' : '') + '</div>' +
      '<div class="stub"><span class="n">' + (1 - a) + '</span><span class="l">일째</span></div></div>';
  }
  function home() {
    var t = ymd(today()), h = installHint() + hero() + toolsRow() + wedHome();
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
    h += plHome();
    var wk = sortedTasks().filter(function (x) { var n = diff(x.due); return !x.done && n !== null && n <= 7; }).slice(0, 6);
    var openN = S.tasks.filter(function (x) { return !x.done; }).length;
    h += '<div class="h2row"><h2><span class="em">⏰</span>이번 주 할 일</h2><button type="button" class="more" data-go="tasks">전체 ' + openN + '개 ›</button></div>';
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
  function toolsRow() {
    var m = S.meta || {}, t = ymd(today()), after = m.ret && t > m.ret, me = myId(), pc = me ? packCount(me) : { n: 0, total: 0 };
    var nJ = S.days.filter(function (d) { return jFor(d.date).some(jHas); }).length;
    var tiles = [
      after ? null : ['pack', '🧳', '짐', pc.total ? pc.n + '/' + pc.total : '체크리스트'],
      ['talk', '💬', '회화', '소리 내 읽기'],
      ['album', '📔', '기록', nJ ? nJ + '일' : (inTrip() ? '오늘 한 줄' : '여행 중에')],
      after ? null : ['settings', '🗓️', '캘린더', '아이폰에 넣기', 'calCard']
    ].filter(Boolean);
    if (after) tiles.unshift(tiles.splice(1, 1)[0]);
    return '<nav class="tools" aria-label="도구">' + tiles.map(function (x) { return '<button type="button" data-go="' + x[0] + '"' + (x[4] ? ' data-scroll="' + x[4] + '"' : '') + '><span class="ti">' + x[1] + '</span><b>' + x[2] + '</b><small>' + esc(x[3]) + '</small></button>'; }).join('') + '</nav>';
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

  function bkKey(b) { return (b.date || '') + (b.time || (b.kind === 'stay' ? '15:00' : '')); }
  function bkSorted() { return S.bookings.slice().sort(function (a, b) { var x = bkKey(a), y = bkKey(b); return x < y ? -1 : x > y ? 1 : 0; }); }
  function bkArea() {
    var box = $('bkArea'); if (!box) return; var t = ymd(today()), h = '';
    if (bkEdit) { box.innerHTML = bkForm(); return; }
    var list = bkSorted();
    h += list.length ? '<div class="card">' + list.map(function (b) {
      var d = pd(b.date), past = (b.end || b.date) < t;
      return '<button class="bk' + (past ? ' past' : '') + '" data-bk="' + esc(b.id) + '"><span class="bd">' + (d ? (d.getMonth() + 1) + '/' + d.getDate() + '<br>' + DOW[d.getDay()] : '') + '</span>' +
        '<span class="bt">' + bkIco(b) + ' ' + esc(b.title) + (bookingFiles(b.id).length ? ' <span class="clip">📎' + bookingFiles(b.id).length + '</span>' : '') + '</span><span class="bm">' + [b.time, b.end ? ('~ ' + md(b.end)) : '', b.place].filter(Boolean).map(esc).join(', ') + (b.memo ? (' — ' + esc(b.memo)) : '') + '</span></button>';
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
      (bkEdit !== 'new' ? '<p class="small" style="margin-top:8px">📎 티켓·바우처 파일 ' + bookingFiles(b.id).length + '개 · <button type="button" class="linkbtn" data-wadd="' + esc(b.id) + '">지갑에 파일 올리기</button></p>' : '') +
      '<div class="acts"><button class="btn fill" type="submit">저장</button><button class="btn" type="button" id="bkcancel">닫기</button>' + (bkEdit !== 'new' ? '<button class="btn del" type="button" id="bkdel">삭제</button>' : '') + '</div></form>';
  }

  /* ---------- 일정 ---------- */
  function days() {
    var t = ymd(today()), h = '<h2 style="margin-top:6px"><span class="em">📅</span>날짜별 일정</h2><p class="hint">날짜를 누르면 펼쳐져요. 장소를 누르면 구글 지도가 열려요.</p>';
    if (!S.days.length) { $('v-days').innerHTML = h + '<div class="empty">' + (loaded ? '일정이 아직 없어요.' : '불러오는 중') + '</div>'; return; }
    S.days.slice().sort(byOrder).forEach(function (d) {
      var isT = d.date === t, open = openDays[d.id] !== undefined ? openDays[d.id] : isT, dd = pd(d.date), w = wxFor(d.date);
      var tp = dayTrip(d.date);
      h += '<article class="day' + (d.kind === 'rest' ? ' rest' : '') + (isT ? ' today' : '') + '" id="day-' + esc(d.id) + '"><button class="day-h" data-day="' + esc(d.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        '<span class="dbadge"><span class="m">' + (dd.getMonth() + 1) + '월</span><span class="dd">' + dd.getDate() + '</span><span class="w">' + DOW[dd.getDay()] + '</span></span>' +
        '<span class="dh-txt"><span class="dh-city">' + esc(d.city) + (tp ? ' <span class="dtag"><i class="ddot"></i>당일치기</span>' : '') + plTag(d.date) + '</span><span class="dh-head">' + esc(d.headline || '') + '</span></span>' +
        (w ? '<span class="wchip">' + (w.fc ? '🌤️' : '🌡️') + '<br>' + esc(w.txt.replace('평년 ', '')) + '</span>' : '') + '</button>' +
        '<div class="day-b"' + (open ? '' : ' hidden') + '>' + (dayEdit === d.id ? dayForm(d) :
        dayBk(d.date) + '<ul>' + (d.items || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' +
        placeChips(d.date) + plDay(d.date) +
        ((d.notes && d.notes.length) ? '<div class="dnote">' + d.notes.map(esc).join('<br>') + '</div>' : '') + jDayBlock(d.date) +
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
      return '<div>🎫 ' + (b.time && !co ? esc(b.time) + ' ' : '') + bkIco(b) + ' ' + esc(b.title) + (co ? ' 체크아웃' : (b.kind === 'stay' ? ' 체크인' : '')) + (b.memo ? ' <span class="small">(' + esc(b.memo) + ')</span>' : '') + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 지도 ---------- */
  var IB = [[-8.87,41.87],[-8.9,42.1],[-8.75,42.3],[-9.05,42.55],[-9.3,42.92],[-9.15,43.2],[-8.6,43.33],[-8.3,43.5],[-7.9,43.75],[-7.3,43.6],[-6.5,43.55],[-5.8,43.62],[-5,43.48],[-4.2,43.42],[-3.4,43.45],[-2.7,43.4],[-1.8,43.38],[-1.4,43.05],[-0.6,42.8],[0.3,42.7],[1.2,42.5],[1.8,42.45],[2.6,42.35],[3.17,42.43],[3.2,42],[2.8,41.7],[2.2,41.35],[1.6,41.2],[1,41.05],[0.7,40.75],[0.2,40.2],[-0.2,39.75],[-0.35,39.4],[-0.1,38.95],[0.2,38.75],[-0.3,38.45],[-0.55,38.2],[-0.75,37.85],[-0.9,37.58],[-1.4,37.55],[-1.8,37.2],[-2.1,36.75],[-2.6,36.7],[-3.4,36.72],[-4.4,36.7],[-4.9,36.48],[-5.35,36.15],[-5.6,36.02],[-6,36.3],[-6.3,36.55],[-6.45,36.9],[-7,37.2],[-7.4,37.18],[-7.9,37],[-8.6,37.1],[-8.99,37.02],[-8.8,37.4],[-8.8,37.9],[-8.9,38.45],[-9.2,38.42],[-9.1,38.65],[-9.5,38.78],[-9.4,39.1],[-9.35,39.36],[-9,39.8],[-8.85,40.2],[-8.7,40.7],[-8.75,41.2],[-8.8,41.6]];
  var PT = [[-8.87,41.87],[-8.2,42.1],[-7.5,41.9],[-6.6,41.95],[-6.2,41.6],[-6.9,41],[-6.8,40.3],[-7,39.7],[-7.5,39.6],[-7,38.9],[-7.3,38.4],[-7,38],[-7.5,37.6],[-7.4,37.18]];
  var K = 80, CS = Math.cos(40 * Math.PI / 180);
  function P(lon, lat) { return [((lon + 9.9) * CS * K).toFixed(1), ((44.2 - lat) * K).toFixed(1)]; }
  function pts(a) { return a.map(function (p) { return P(p[0], p[1]).join(','); }).join(' '); }
  function smd(s) { var d = pd(s); return d ? (d.getMonth() + 1) + '/' + d.getDate() : ''; }
  function rangeTxt(c) {
    var a = pd(c.from), b = pd(c.to); if (!a || !b) return '';
    return smd(c.from) + '–' + (a.getMonth() === b.getMonth() ? b.getDate() : smd(c.to)) + (c.nights ? ' · ' + c.nights + '박' : '');
  }
  function routeCities() { return S.cities.slice().sort(byOrder).filter(function (c) { return c.lat != null; }); }
  /* 당일치기는 그날 머무는 도시에 딸린 것으로 본다 */
  function tripsOf(c) { return S.pins.filter(function (p) { return p.date >= c.from && p.date <= c.to; }).sort(byOrder); }
  function dayTrip(date) { return S.pins.filter(function (p) { return p.date === date; })[0] || null; }
  function legendHtml() { return '<div class="legend"><span><i class="ln"></i>기차·버스·차</span><span><i class="ln f"></i>비행기</span><span><i class="ddot"></i>당일치기</span></div>'; }
  /* 그림 지도 글자 위치: 기본은 오른쪽 위. 겹치는 곳만 따로 */
  /* [x, y, 정렬] 정렬 0=왼쪽 기준, 1=오른쪽 기준, 2=가운데 */
  var LBL = { '리스본': [26, 44, 0], '포르투': [0, -30, 2], '세비야': [-28, 12, 1], '그라나다': [26, -20, 0], '바르셀로나': [-28, -22, 1], '마드리드': [26, -22, 0] };
  var DLBL = { '신트라': [-26, -26, 0], '도루 계곡': [16, 9, 0], '코르도바': [16, 9, 0], '톨레도': [16, 9, 0] };
  function anc(a) { return a === 1 ? ' text-anchor="end"' : a === 2 ? ' text-anchor="middle"' : ''; }
  function mapSvg(cs) {
    var svg = '<svg viewBox="0 0 830 672" role="img" aria-label="여행 경로 그림 지도"><polygon class="land" points="' + pts(IB) + '"/><polyline class="border" points="' + pts(PT) + '"/>' +
      '<text class="sea" x="16" y="652">대서양</text><text class="sea" x="640" y="486">지중해</text>';
    for (var i = 1; i < cs.length; i++) { var a = P(cs[i - 1].lon, cs[i - 1].lat), b = P(cs[i].lon, cs[i].lat); svg += '<line class="leg' + (cs[i].mode === 'flight' ? ' fly' : '') + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; }
    var pins = S.pins.slice().sort(byOrder);
    pins.forEach(function (p) {
      var c = stayCity(p.date); if (!c || c.lat == null) return;
      var a = P(c.lon, c.lat), q = P(p.lon, p.lat);
      svg += '<line class="spur" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + q[0] + '" y2="' + q[1] + '"/>';
    });
    pins.forEach(function (p) {
      var q = P(p.lon, p.lat), L = DLBL[p.name] || [16, 9, 0], s = sel === 'p:' + p.id;
      svg += '<g class="dpin pin' + (s ? ' sel' : '') + '" data-pin="' + esc(p.id) + '" tabindex="0" role="button" aria-label="' + esc(p.name) + ' 당일치기"><circle cx="' + q[0] + '" cy="' + q[1] + '" r="10"/><text x="' + (+q[0] + L[0]) + '" y="' + (+q[1] + L[1]) + '"' + anc(L[2]) + '>' + esc(p.name) + '</text></g>';
    });
    cs.forEach(function (c) {
      var q = P(c.lon, c.lat), s = sel === 'c:' + c.id, L = LBL[c.name] || [26, -20, 0];
      svg += '<g class="pin' + (s ? ' sel' : '') + '" data-city="' + esc(c.id) + '" tabindex="0" role="button" aria-label="' + esc(c.name) + '"><circle class="o" cx="' + q[0] + '" cy="' + q[1] + '" r="20"/><text class="n" x="' + q[0] + '" y="' + q[1] + '">' + esc(c.order) + '</text><text class="lb" x="' + (+q[0] + L[0]) + '" y="' + (+q[1] + L[1]) + '"' + anc(L[2]) + '>' + esc(c.name) + '</text></g>';
    });
    return svg + '</svg>';
  }
  /* 도시 순서: 도시마다 한 줄, 그 도시에서 다녀오는 당일치기는 같은 줄 오른쪽에 붙인다 */
  function routeList(cs) {
    var t = ymd(today());
    return '<div class="card route" role="group" aria-label="도시 고르기">' + cs.map(function (c, i) {
      var nx = cs[i + 1], on = sel === 'c:' + c.id, now = t >= c.from && t <= c.to, tr = tripsOf(c);
      var cls = 'rt' + (on ? ' on' : '') + (i > 0 ? (c.mode === 'flight' ? ' in-fly' : ' in') : '') + (nx ? (nx.mode === 'flight' ? ' out-fly' : ' out') : '');
      return '<div class="' + cls + '"><button type="button" class="rt-c" data-msel="c:' + esc(c.id) + '" aria-pressed="' + on + '">' +
        '<span class="rt-n' + (on ? ' on' : '') + '">' + esc(c.order) + '</span><span class="rt-t"><b>' + esc(c.name) + (now ? ' <span class="chip ora">지금</span>' : '') + '</b><span>' + esc(rangeTxt(c)) + '</span></span>' +
        (tr.length ? '<i class="rt-line" aria-hidden="true"></i>' : '') + '</button>' +
        tr.map(function (p) { return '<button type="button" class="rt-d" data-msel="p:' + esc(p.id) + '" aria-pressed="' + (sel === 'p:' + p.id) + '" aria-label="' + esc(c.name) + '에서 당일치기 ' + esc(p.name) + '"><i class="ddot"></i>' + esc(p.name) + '<small>' + esc(smd(p.date)) + '</small></button>'; }).join('') +
        '</div>';
    }).join('') + legendHtml() + '</div>';
  }
  var mapKey = '';
  function focusPt() {
    if (!sel) return null;
    var x = sel.indexOf('c:') === 0 ? S.cities.filter(function (c) { return 'c:' + c.id === sel; })[0] : S.pins.filter(function (p) { return 'p:' + p.id === sel; })[0];
    return x && x.lat != null ? { lat: x.lat, lon: x.lon, z: x.z || 12 } : null;
  }
  /* 구글 내 지도: ll(가운데)·z(확대)를 붙이면 그 자리로 열린다 */
  function gUrl(kind, mid) { var u = 'https://www.google.com/maps/d/' + kind + '?mid=' + encodeURIComponent(mid), f = focusPt(); if (f) u += '&ll=' + f.lat + ',' + f.lon + '&z=' + f.z; return u; }
  function mapView() {
    var cs = routeCities();
    var mid = (S.meta && S.meta.mymap) || '', online = navigator.onLine, useG = !!(mid && online);
    var key = mid + '|' + online;
    /* 구글 지도가 떠 있으면 데이터가 바뀌어도 지도는 다시 불러오지 않고 아래 목록만 고친다 */
    if (useG && key === mapKey && $('gmapFrame')) { refreshMapParts(); return; }
    mapKey = key;
    var h = '<h2 style="margin-top:6px"><span class="em">🗺️</span>여행 지도</h2>';
    var svgBox = '<div class="mapbox" id="svgBox">' + mapSvg(cs) + legendHtml() + '</div>';
    if (useG) {
      h += '<p class="hint">구글 지도예요. 핀을 누르면 장소가 나와요. 손가락 두 개로 확대할 수 있어요.</p>' +
        '<div class="gmap"><iframe id="gmapFrame" src="' + esc(gUrl('embed', mid)) + '" title="여행 구글 지도" loading="lazy" allowfullscreen></iframe></div>' +
        '<div class="acts"><a class="btn fill" id="gbig" target="_blank" rel="noopener" href="' + esc(gUrl('viewer', mid)) + '">구글 지도에서 크게 보기</a></div>';
    } else {
      h += (mid ? '<p class="net">인터넷이 없어서 구글 지도 대신 그림 지도를 보여 드려요.</p>' : '<p class="hint">구글 지도는 연결 준비 중이에요. 지금은 그림 지도예요.</p>') + svgBox;
    }
    h += '<h2><span class="em">📍</span>도시별로 보기</h2><p class="hint">' + (useG ? '도시를 누르면 위 지도가 그 도시로 옮겨 가고, 아래에 날짜별 일정이 나와요.' : '도시를 누르면 아래에 날짜별 일정이 나와요.') + ' 주황색은 그 도시에서 다녀오는 당일치기예요.</p>';
    h += '<div id="routeBox">' + routeList(cs) + '</div><div id="mapSel">' + mapSel() + '</div>';
    if (useG) h += '<details class="fold"' + foldAttr('svg') + '><summary>🧭 전체 경로 그림</summary>' + svgBox + '</details>';
    h += '<div id="legsBox">' + legsView() + '</div>';
    $('v-map').innerHTML = h;
  }
  function refreshMapParts() {
    var ae = document.activeElement, keep = ae && ae.dataset && ae.dataset.msel && ae.closest('#routeBox') ? ae.dataset.msel : null;
    var rb = $('routeBox'); if (rb) rb.innerHTML = routeList(routeCities());
    var ms = $('mapSel'); if (ms) ms.innerHTML = mapSel();
    var lb = $('legsBox'); if (lb) lb.innerHTML = legsView();
    Array.prototype.forEach.call(document.querySelectorAll('#svgBox g[data-city]'), function (g) { g.classList.toggle('sel', sel === 'c:' + g.dataset.city); });
    Array.prototype.forEach.call(document.querySelectorAll('#svgBox g[data-pin]'), function (g) { g.classList.toggle('sel', sel === 'p:' + g.dataset.pin); });
    var mid = (S.meta && S.meta.mymap) || '', fr = $('gmapFrame');
    if (fr && mid) { var u = gUrl('embed', mid); if (fr.getAttribute('src') !== u) fr.setAttribute('src', u); var gb = $('gbig'); if (gb) gb.setAttribute('href', gUrl('viewer', mid)); }
    if (keep) { var kb = document.querySelector('#routeBox [data-msel="' + keep + '"]'); if (kb) kb.focus({ preventScroll: true }); }
  }
  function pickMap(v) {
    sel = sel === v ? null : v;
    if (!$('mapSel')) { mapView(); return; }
    refreshMapParts();
    var ms = $('mapSel'); if (!sel || !ms) return;
    /* 아래 일정이 화면 밖이면 살짝만 올려서, 고른 도시 줄과 일정 시작이 같이 보이게 */
    var r = ms.getBoundingClientRect();
    if (r.top > window.innerHeight - 120) window.scrollBy({ top: r.top - window.innerHeight * 0.45, behavior: 'smooth' });
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
  function placeChips(date) {
    var pl = S.places.filter(function (x) { return x.date === date; }).sort(byOrder);
    return pl.length ? '<div class="pchips">' + pl.map(function (x) { return '<a class="pchip" target="_blank" rel="noopener" href="' + esc(gmap(x.q || x.name)) + '">' + (KIND[x.kind] || '📍') + ' ' + esc(x.name) + '</a>'; }).join('') + '</div>' : '';
  }
  function selDay(d, inCity) {
    var lg = S.legs.filter(function (l) { return l.date === d.date; }).sort(byOrder), tp = inCity ? dayTrip(d.date) : null;
    return '<div class="card sday"><div class="row"><b class="disp">' + esc(md(d.date)) + ' ' + esc(d.city) + '</b>' +
      (tp ? '<button type="button" class="dtag" data-msel="p:' + esc(tp.id) + '"><i class="ddot"></i>당일치기</button>' : '') + '</div>' +
      (d.headline ? '<div class="small">' + esc(d.headline) + '</div>' : '') + placeChips(d.date) +
      (lg.length ? '<div class="mlegs">' + lg.map(function (l) { var m = MODE[l.mode] || MODE.transit; return '<a class="mleg" target="_blank" rel="noopener" href="' + esc(legUrl(l)) + '"><span>' + m[0] + ' ' + esc(l.title) + '</span><span class="go">길찾기</span></a>'; }).join('') + '</div>' : '') + '</div>';
  }
  function mapSel() {
    if (!sel) return '';
    var h = '', ds = [], inCity = sel.indexOf('c:') === 0;
    if (inCity) {
      var c = S.cities.filter(function (x) { return 'c:' + x.id === sel; })[0]; if (!c) return '';
      ds = S.days.filter(function (d) { var sc = stayCity(d.date); return sc && sc.id === c.id; });
      var hp = S.places.filter(function (x) { return x.kind === 'stay' && x.name === c.hotel; })[0];
      var hq = hp ? (hp.q || hp.name) : ((c.hotel || '') + ' ' + (c.q || c.name));
      h += '<div class="card selhead"><div class="sh"><span class="rt-n on">' + esc(c.order) + '</span><div><b class="disp">' + esc(c.name) + '</b><div class="small">' + esc(rangeTxt(c)) + '</div></div></div>' +
        '<div class="pchips">' + (c.hotel ? '<a class="pchip" target="_blank" rel="noopener" href="' + esc(gmap(hq)) + '">🏨 ' + esc(c.hotel) + (c.booked ? '' : ' (미확정)') + '</a>' : '') +
        tripsOf(c).map(function (p) { return '<button type="button" class="pchip trip" data-msel="p:' + esc(p.id) + '"><i class="ddot"></i>' + esc(p.name) + ' 당일치기 ' + esc(smd(p.date)) + '</button>'; }).join('') + '</div></div>';
    } else {
      var p = S.pins.filter(function (x) { return 'p:' + x.id === sel; })[0]; if (!p) return '';
      var b = stayCity(p.date);
      ds = S.days.filter(function (d) { return d.date === p.date; });
      h += '<div class="card selhead trip"><div class="sh"><span class="tdot" aria-hidden="true"></span><div><b class="disp">' + esc(p.name) + '</b><div class="small">' + esc(md(p.date)) + ' 당일치기' + (b ? ', ' + esc(b.name) + '에서 다녀와요' : '') + '</div></div></div>' +
        (b ? '<div class="pchips"><button type="button" class="pchip" data-msel="c:' + esc(b.id) + '">' + esc(b.order) + ' ' + esc(b.name) + ' 일정 전체 보기</button></div>' : '') + '</div>';
    }
    return h + ds.sort(byOrder).map(function (d) { return selDay(d, inCity); }).join('');
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
    var h = '<button type="button" class="back" data-go="home">‹ 홈</button><h2 style="margin-top:6px"><span class="em">✅</span>할 일</h2>' + (canEdit() ? '<p class="hint">제목을 누르면 고치거나 지울 수 있어요.</p>' : ''), cur = '', buf = [];
    var open = sortedTasks().filter(function (t) { return !t.done; }), done = sortedTasks().filter(function (t) { return t.done; });
    function flush() { if (buf.length) { h += '<div class="card">' + buf.join('') + '</div>'; buf = []; } }
    open.forEach(function (t) { var d = pd(t.due), k = d ? (d.getMonth() + 1) + '월' : '날짜 없음'; if (k !== cur) { flush(); h += '<div class="month">' + esc(k) + '</div>'; cur = k; } buf.push(taskRow(t)); });
    flush();
    if (!S.tasks.length && loaded) h += '<div class="empty">할 일이 없어요. 아래에서 추가해 보세요.</div>';
    h += '<form class="card addf" id="addf"' + (canEdit() ? '' : ' hidden') + '><b class="disp">＋ 할 일 추가</b><input class="inp" id="addt" maxlength="80" placeholder="예: 환전하기" required aria-label="할 일"><div class="addrow"><label class="small" for="addd">마감일</label><input class="inp" type="date" id="addd"><button class="btn fill" type="submit">추가</button></div></form>';
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
    h += '<p class="acct small">로그인 정보와 알림은 오른쪽 위 ⚙️ 설정에 있어요.</p>';
    $('v-tasks').innerHTML = h;
  }

  /* ---------- 여행 중 '오늘' ---------- */
  function inTrip() { var m = S.meta || {}, t = ymd(today()); return !!(m.depart && m.ret && t >= m.depart && t <= m.ret); }
  function parseItem(s) {
    var str = String(s).trim(), m = /^(\d{1,2}):(\d{2})(?:\s*[~–-]\s*\d{1,2}:\d{2})?\s+(.*)$/.exec(str);
    return m ? { t: (+m[1]) * 60 + (+m[2]), hh: m[1].padStart(2, '0') + ':' + m[2], text: m[3], label: str } : { t: null, label: str };
  }
  function nowMin() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function durTxt(m) { if (m < 1) return '곧'; var h = Math.floor(m / 60), r = m % 60; return (h ? h + '시간' + (r ? ' ' : '') : '') + (r ? r + '분' : '') + ' 뒤'; }
  function fileThumbsFor(date) {
    var ids = S.bookings.filter(function (b) { return b.date === date; }).map(function (b) { return b.id; });
    return S.files.filter(function (f) { return f.booking && ids.indexOf(f.booking) >= 0; });
  }
  function todayPanel() {
    var t = ymd(today()), d = S.days.filter(function (x) { return x.date === t; })[0];
    if (!d) return '';
    var items = (d.items || []).map(parseItem), now = nowMin();
    var timed = items.filter(function (x) { return x.t != null; });
    var next = timed.filter(function (x) { return x.t > now; })[0], cur = timed.filter(function (x) { return x.t <= now; }).slice(-1)[0];
    var w = wxFor(t), f = fx(), tix = fileThumbsFor(t), lg = S.legs.filter(function (l) { return l.date === t; }).sort(byOrder);
    var n = Math.round((today() - pd(S.meta.depart)) / 86400000) + 1;
    var h = '<section class="todayp" aria-label="오늘"><div class="tp-h"><span class="tp-day">' + n + '일째</span><span class="tp-d">' + esc(md(t)) + '</span>' + (PREVIEW ? '<button class="chip ora" data-go="settings">미리보기 중</button>' : '') + '</div>' +
      '<b class="tp-city disp">' + esc(d.city) + '</b>' + (d.headline ? '<div class="small">' + esc(d.headline) + '</div>' : '');
    if (next) h += '<div class="tp-next"><span class="tp-lab">다음</span><span><b>' + esc(next.hh) + '</b> ' + esc(next.text) + '</span><span class="tp-in">' + durTxt(next.t - now) + '</span></div>';
    else if (timed.length) h += '<div class="tp-next done"><span class="tp-lab">오늘</span><span>시간 정해진 일정은 다 지났어요.</span></div>';
    h += '<ol class="tp-list">' + items.map(function (x) {
      var cls = x === cur ? 'cur' : (x.t != null && x.t < now ? 'past' : '');
      return '<li' + (cls ? ' class="' + cls + '"' : '') + '>' + (x.hh ? '<b>' + esc(x.hh) + '</b> ' + esc(x.text) : esc(x.label)) + '</li>';
    }).join('') + '</ol>';
    if (tix.length) h += '<div class="tp-sec"><span class="tp-lab">오늘 쓸 티켓</span><div class="tp-tix">' + tix.map(function (f) { return '<button type="button" class="tix" data-wopen="' + esc(f.id) + '">' + thumb(f) + '<span>' + esc(f.label) + '</span></button>'; }).join('') + '</div></div>';
    if (lg.length) h += '<div class="tp-sec"><span class="tp-lab">이동</span><div class="mlegs">' + lg.map(function (l) { var m = MODE[l.mode] || MODE.transit; return '<a class="mleg" target="_blank" rel="noopener" href="' + esc(legUrl(l)) + '"><span>' + m[0] + ' ' + esc(l.title) + '</span><span class="go">길찾기</span></a>'; }).join('') + '</div></div>';
    h += plToday(t);
    h += '<div class="tp-meta">' + (w ? '<span>' + (w.fc ? '🌤️ ' : '🌡️ 평년 ') + esc(w.txt.replace('평년 ', '')) + '</span>' : '') + (f ? '<span>💶 1€ = ' + won(f.rate) + '원</span>' : '') + '</div>';
    var jm = jMine(t);
    h += '<div class="acts"><button type="button" class="btn fill" data-ov="driver">🚕 기사님께 보여주기</button><button type="button" class="btn" data-ov="sos">🆘 비상 연락처</button>' +
      (canEdit() ? '<button type="button" class="btn' + (jHas(jm) ? ' done-b' : '') + '" data-jot="' + esc(t) + '">' + (jHas(jm) ? '📔 오늘 기록 ✓' : '📔 오늘 한 줄') + '</button>' : '') + '</div></section>';
    return h;
  }

  /* ---------- 지갑: 티켓·서류 ---------- */
  var WCACHE = 'wallet-files', wUrl = {}, wState = { total: 0, have: 0, busy: false, err: '', persist: null, sig: '' };
  function wKey(path) { return new Request(new URL('__w/' + path, location.href.split('#')[0]).href); }
  function wGet(path) {
    if (!('caches' in window)) return Promise.resolve(null);
    return caches.open(WCACHE).then(function (c) { return c.match(wKey(path)); }).then(function (r) { return r ? r.blob() : null; }).catch(function () { return null; });
  }
  function wPut(path, blob) {
    if (!('caches' in window)) return Promise.resolve();
    return caches.open(WCACHE).then(function (c) { return c.put(wKey(path), new Response(blob, { headers: { 'Content-Type': blob.type || 'application/octet-stream' } })); });
  }
  function filePaths(f) { return (f.pages || []).slice(); }
  function walletStatusRender() { var a = $('wst'); if (a) a.innerHTML = walletStatusHtml(); var b = $('setWst'); if (b) b.innerHTML = walletStatusHtml(); }
  function askPersist() {
    if (!(navigator.storage && navigator.storage.persist)) return;
    navigator.storage.persisted().then(function (p) { return p || navigator.storage.persist(); }).then(function (p) { wState.persist = !!p; walletStatusRender(); }).catch(function () {});
  }
  function walletSync(force) {
    var need = [];
    S.files.forEach(function (f) { filePaths(f).forEach(function (p) { need.push(p); }); });
    var sig = need.join('|');
    if (!force && sig === wState.sig && wState.have >= wState.total) return;
    if (wState.busy) { wState.again = true; return; }
    wState.sig = sig; wState.total = need.length; wState.err = '';
    if (!('caches' in window)) return;
    wState.busy = true;
    caches.open(WCACHE).then(function (c) {
      return c.keys().then(function (keys) {
        var base = wKey('').url, have = {};
        keys.forEach(function (k) { var p = k.url.slice(base.length); if (need.indexOf(p) < 0) c['delete'](k); else have[p] = 1; });
        var missing = need.filter(function (p) { return !have[p]; });
        wState.have = need.length - missing.length; walletStatusRender();
        if (!missing.length || !navigator.onLine || !Store.canFiles() || Store.status.mode === 'demo') return;
        return missing.reduce(function (pr, p) {
          return pr.then(function () {
            return Store.fileGet(p).then(function (b) { return c.put(wKey(p), new Response(b, { headers: { 'Content-Type': b.type || 'image/jpeg' } })); })
              .then(function () { wState.have++; walletStatusRender(); }, function (e) { wState.err = (e && e.message) || '받지 못함'; });
          });
        }, Promise.resolve());
      });
    }).then(function () {
      wState.busy = false; walletStatusRender(); if (wState.total) askPersist();
      if (wState.again) { wState.again = false; walletSync(); }
    }, function () { wState.busy = false; });
  }
  function walletStatusHtml() {
    var off = !navigator.onLine && Store.status.mode !== 'demo';
    var ps = wState.persist === true ? ' 이 폰이 지우지 않도록 보관 요청도 받아들여졌어요.' : '';
    if (!wState.total) return '<div class="wst">📴 티켓을 올리면 이 폰에도 저장돼서 인터넷 없이 열려요.</div>';
    if (wState.have >= wState.total) return '<div class="wst ok">✓ 오프라인 준비 완료: 파일 ' + wState.total + '개가 이 폰에 저장돼 있어요.' + ps + '</div>';
    return '<div class="wst">' + (off ? '인터넷이 연결되면 나머지를 받아요. ' : '') + '파일 ' + wState.total + '개 중 ' + wState.have + '개 저장됨' + (wState.busy && !off ? ', 받는 중…' : '') + (wState.err && !off ? ' (' + esc(wState.err) + ')' : '') + '</div>';
  }
  function wImg(path) {
    if (wUrl[path]) return Promise.resolve(wUrl[path]);
    return wGet(path).then(function (b) {
      if (b) return b;
      if (navigator.onLine && Store.canFiles() && Store.status.mode !== 'demo') return Store.fileGet(path).then(function (bb) { wPut(path, bb); return bb; }, function () { return null; });
      return null;
    }).then(function (b) { if (!b) return null; wUrl[path] = URL.createObjectURL(b); return wUrl[path]; });
  }
  function hydrate(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('img[data-wpath]:not([src])'), function (img) {
      wImg(img.dataset.wpath).then(function (u) { if (u) img.src = u; else { var t = img.closest('.wthumb'); if (t) t.classList.add('miss'); else img.replaceWith(Object.assign(document.createElement('p'), { className: 'miss-txt', textContent: '이 폰에 아직 없어요. 인터넷이 연결되면 받아요.' })); } });
    });
  }
  function bookingFiles(bid) { return S.files.filter(function (f) { return f.booking === bid; }).sort(function (a, b) { return (a.at || '') < (b.at || '') ? -1 : 1; }); }
  function thumb(f) {
    var p = (f.pages || [])[0];
    return '<span class="wthumb">' + (p ? '<img data-wpath="' + esc(p) + '" alt="">' : '') + (f.kind === 'pdf' ? '<i>PDF' + (f.pageCount > 1 ? ' ' + f.pageCount + '쪽' : '') + '</i>' : '') + '</span>';
  }
  function memberList() { var m = Store.members(); return Object.keys(m).map(function (e) { return { email: e, name: m[e] || e }; }); }
  function whoShort(w) { if (!w || w === 'both') return '둘 다'; var m = Store.members(); return m[w] || w.split('@')[0]; }
  function wallet() {
    var h = '<h2 style="margin-top:6px"><span class="em">👛</span>지갑</h2><div class="seg" role="tablist">' +
      [['tix', '🎫 티켓·서류'], ['exp', '💶 경비']].map(function (x) { return '<button role="tab" data-wseg="' + x[0] + '" aria-selected="' + (walletSeg === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    h += walletSeg === 'exp' ? expensesView() : walletTix();
    $('v-wallet').innerHTML = h;
    hydrate($('v-wallet'));
  }
  function wRow(b) {
    var fs = bookingFiles(b.id), d = pd(b.date);
    return '<div class="wrow"><span class="bd">' + (d ? (d.getMonth() + 1) + '/' + d.getDate() + '<br>' + DOW[d.getDay()] : '') + '</span><div class="wr-b"><div class="bt">' + bkIco(b) + ' ' + esc(b.title) + '</div>' +
      '<div class="bm">' + [b.time, b.place].filter(Boolean).map(esc).join(', ') + '</div><div class="wfiles">' +
      fs.map(function (f) { return '<button type="button" class="wf" data-wopen="' + esc(f.id) + '" aria-label="' + esc(f.label) + ' 열기">' + thumb(f) + '<span class="wfl">' + esc(f.label) + '</span></button>'; }).join('') +
      (canEdit() ? (fs.length ? '<button type="button" class="wf add" data-wadd="' + esc(b.id) + '" aria-label="' + esc(b.title) + '에 파일 추가"><span class="wthumb">＋</span><span class="wfl">더 올리기</span></button>'
        : '<button type="button" class="wadd-s" data-wadd="' + esc(b.id) + '" aria-label="' + esc(b.title) + '에 파일 추가">＋ 티켓·바우처 올리기</button>') : '') + '</div></div></div>';
  }
  function walletTix() {
    var t = ymd(today()), h = '<div id="wst">' + walletStatusHtml() + '</div>';
    if (canEdit()) h += '<div class="acts" style="margin:10px 0 4px"><button type="button" class="btn fill" data-wadd="">＋ 티켓·서류 올리기</button></div>';
    if (upOpen) h += uploadForm();
    var bks = bkSorted(), up = bks.filter(function (b) { return (b.end || b.date) >= t; }), past = bks.filter(function (b) { return (b.end || b.date) < t; });
    h += '<h3 class="sub">다가오는 예약</h3>' + (up.length ? '<div class="card">' + up.map(wRow).join('') + '</div>' : '<div class="empty">' + (loaded ? '다가오는 예약이 없어요.' : '불러오는 중') + '</div>');
    var docs = S.files.filter(function (f) { return !f.booking; }).sort(function (a, b) { return (a.at || '') < (b.at || '') ? -1 : 1; });
    h += '<h3 class="sub">서류</h3><p class="hint">여권 사본, 보험증서, eSIM QR처럼 예약과 상관없는 것.</p>' +
      (docs.length ? '<div class="wdocs">' + docs.map(function (f) { return '<button type="button" class="wdoc" data-wopen="' + esc(f.id) + '">' + thumb(f) + '<span>' + esc(f.label) + '<small>' + esc(whoShort(f.who)) + '</small></span></button>'; }).join('') + '</div>' : '<div class="empty">아직 없어요.</div>');
    if (past.length) h += '<details class="fold"' + foldAttr('wpast') + '><summary>지난 예약 ' + past.length + '개</summary>' + past.map(wRow).join('') + '</details>';
    h += '<p class="hint" style="margin-top:14px">열린 이미지를 길게 누르면 사진첩에도 저장돼요. 항공권은 항공사 앱에서 Apple 지갑에 넣어 두면 더 든든해요.</p>';
    return h;
  }
  function radios(name, opts, cur) {
    return '<div class="chipsel">' + opts.map(function (o) { return '<label class="cs"><input type="radio" name="' + name + '" value="' + esc(o[0]) + '"' + (o[0] === cur ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>'; }).join('') + '</div>';
  }
  function uploadForm() {
    var bks = bkSorted();
    return '<form class="edit" id="wupf"><b class="disp">티켓·서류 올리기</b>' +
      '<label for="wfile">파일 (PDF, 사진, 스크린샷 · 여러 개 가능)</label><input class="inp" type="file" id="wfile" accept="image/*,application/pdf" multiple required>' +
      '<label for="wbk">어느 예약?</label><select id="wbk"><option value="">예약과 별개 (서류)</option>' + bks.map(function (b) { return '<option value="' + esc(b.id) + '"' + (upOpen.booking === b.id ? ' selected' : '') + '>' + esc(smd(b.date)) + ' ' + esc(b.title) + '</option>'; }).join('') + '</select>' +
      '<label for="wlabel">이름 (비우면 예약 이름)</label><input class="inp" id="wlabel" maxlength="60" placeholder="예: 탑승권 영욱, 여권 사본 뿡">' +
      '<label>누구 것</label>' + radios('wwho', [['both', '둘 다']].concat(memberList().map(function (m) { return [m.email, m.name]; })), 'both') +
      '<p class="small" id="wprog" aria-live="polite">' + esc(upBusy) + '</p>' +
      '<div class="acts"><button class="btn fill" type="submit"' + (upBusy ? ' disabled' : '') + '>올리기</button><button class="btn" type="button" id="wupc">닫기</button></div></form>';
  }
  var PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.2.146/build/';
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('PDF 도구를 불러오지 못했어요.')); }; document.head.appendChild(s); }); }
  function pdfLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return loadScript(PDFJS + 'pdf.min.js').then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; return window.pdfjsLib; });
  }
  function toBlob(cv, type, q) { return new Promise(function (res, rej) { cv.toBlob(function (b) { if (b) res(b); else rej(new Error('이미지로 바꾸지 못했어요.')); }, type, q); }); }
  /* PDF 쪽마다 이미지로 바꿔 둔다 (아이폰은 PDF 첫 쪽만 보이는 일이 있어서) */
  function pdfToImages(file, onPage) {
    return pdfLib().then(function (lib) { return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: buf }).promise; }); }).then(function (doc) {
      var n = Math.min(doc.numPages, 8), out = [], chain = Promise.resolve();
      for (var i = 1; i <= n; i++) (function (i) {
        chain = chain.then(function () {
          return doc.getPage(i).then(function (pg) {
            var vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: Math.min(2.5, 1400 / vp0.width) });
            var cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
            var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
            return pg.render({ canvasContext: ctx, viewport: vp }).promise.then(function () { return toBlob(cv, 'image/jpeg', 0.9); })
              .then(function (b) { out.push(b); cv.width = cv.height = 0; if (onPage) onPage(i, n); });
          });
        });
      })(i);
      return chain.then(function () { return { pages: out, total: doc.numPages }; });
    });
  }
  function shrinkImage(file) {
    if (file.size < 1500000 && /png|jpe?g|webp|gif/i.test(file.type)) return Promise.resolve(file);
    if (!window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bm) {
      var s = Math.min(1, 2000 / Math.max(bm.width, bm.height)), cv = document.createElement('canvas');
      cv.width = Math.round(bm.width * s); cv.height = Math.round(bm.height * s);
      cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height);
      return toBlob(cv, 'image/jpeg', 0.9);
    }).catch(function () { return file; });
  }
  function setProg(t) { upBusy = t; var p = $('wprog'); if (p) p.textContent = t; var b = document.querySelector('#wupf [type=submit]'); if (b) b.disabled = !!t; }
  function doUpload() {
    var files = Array.prototype.slice.call(($('wfile') || {}).files || []);
    if (!files.length) { toast('올릴 파일을 골라 주세요.'); return; }
    if (!navigator.onLine && Store.status.mode !== 'demo') { toast('파일은 인터넷이 연결됐을 때 올릴 수 있어요.'); return; }
    var bk = $('wbk').value || null, b = bk && S.bookings.filter(function (x) { return x.id === bk; })[0];
    var whoEl = document.querySelector('input[name=wwho]:checked'), who = whoEl ? whoEl.value : 'both', label0 = $('wlabel').value.trim();
    var done = 0;
    var chain = files.reduce(function (pr, f, idx) {
      return pr.then(function () {
        var id = Store.newId(), isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
        var tag = (files.length > 1 ? '(' + (idx + 1) + '/' + files.length + ') ' : '');
        setProg(tag + (isPdf ? 'PDF를 이미지로 바꾸는 중…' : '사진 준비 중…'));
        var prep = isPdf ? pdfToImages(f, function (i, n) { setProg(tag + 'PDF ' + i + '/' + n + '쪽 바꾸는 중…'); }) : shrinkImage(f).then(function (x) { return { pages: [x], total: 1 }; });
        return prep.then(function (r) {
          var paths = r.pages.map(function (pb, k) { return id + '/p' + (k + 1) + (/png/.test(pb.type) ? '.png' : /webp/.test(pb.type) ? '.webp' : /gif/.test(pb.type) ? '.gif' : '.jpg'); });
          setProg(tag + '올리는 중…');
          var ups = r.pages.reduce(function (q, pb, k) { return q.then(function () { return Store.fileUp(paths[k], pb, pb.type || 'image/jpeg').then(function () { return wPut(paths[k], pb); }); }); }, Promise.resolve());
          if (isPdf) ups = ups.then(function () { return Store.fileUp(id + '/orig.pdf', f, 'application/pdf'); });
          return ups.then(function () {
            var label = label0 || (b ? b.title : f.name.replace(/\.[^.]+$/, ''));
            if (files.length > 1 && label0) label += ' ' + (idx + 1);
            Store.set('files', id, { label: label, booking: bk, who: who, kind: isPdf ? 'pdf' : 'image', name: f.name, pages: paths, orig: isPdf ? id + '/orig.pdf' : null, pageCount: r.total || 1, size: f.size, at: nowIso(), by: myId() });
            done++;
          });
        });
      });
    }, Promise.resolve());
    chain.then(function () { setProg(''); upOpen = null; toast(done + '개 올렸어요. 이 폰에도 저장했어요.'); render(); walletSync(); },
      function (e) { setProg(''); toast('올리지 못했어요: ' + ((e && e.message) || '오류')); render(); });
  }
  function delFile(id) {
    var f = S.files.filter(function (x) { return x.id === id; })[0]; if (!f) return;
    var paths = filePaths(f).concat(f.orig ? [f.orig] : []);
    Store.remove('files', id);
    Store.fileDel(paths).catch(function () {});
    paths.forEach(function (p) { if (wUrl[p]) { URL.revokeObjectURL(wUrl[p]); delete wUrl[p]; } });
    toast(savedMsg('지웠어요.')); ov = null; renderOv(); render(); walletSync(true);
  }

  /* ---------- 지갑: 경비 ---------- */
  var CAT = [['food', '🍽️', '식비'], ['cafe', '☕', '카페·간식'], ['move', '🚆', '교통'], ['ticket', '🎟️', '입장·투어'], ['shop', '🛍️', '쇼핑'], ['stay', '🏨', '숙소'], ['etc', '📌', '기타']];
  function catOf(k) { for (var i = 0; i < CAT.length; i++) if (CAT[i][0] === k) return CAT[i]; return CAT[CAT.length - 1]; }
  function fx() { var f = S.meta && S.meta.fx; return (f && f.rate) ? f : null; }
  function won(n) { return Math.round(Number(n) || 0).toLocaleString('ko-KR'); }
  function expKrw(e) { return Number(e.krw) || (e.cur === 'KRW' ? Number(e.amount) : Math.round((Number(e.amount) || 0) * ((fx() || {}).rate || 0))); }
  function bars(rows, total) {
    return rows.filter(function (r) { return r[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; }).map(function (r) {
      return '<div class="bar"><span class="bl">' + r[0] + '</span><span class="bt"><i style="width:' + Math.max(3, Math.round(r[1] / total * 100)) + '%"></i></span><span class="bv">' + won(r[1]) + '원</span></div>';
    }).join('');
  }
  function expensesView() {
    var f = fx(), list = S.expenses.slice().sort(function (a, b) { var x = (a.date || '') + (a.at || ''), y = (b.date || '') + (b.at || ''); return x < y ? 1 : -1; });
    var tot = 0, eur = 0, byCat = {}, byWho = {}, byCity = {}, tf = 0, tfn = 0;
    list.forEach(function (e) {
      var k = expKrw(e); tot += k; if (e.cur !== 'KRW') eur += Number(e.amount) || 0;
      byCat[e.cat] = (byCat[e.cat] || 0) + k; byWho[e.payer] = (byWho[e.payer] || 0) + k;
      var c = e.city || ((stayCity(e.date) || {}).name) || '여행 전·기타'; byCity[c] = (byCity[c] || 0) + k;
      if (e.taxfree) { tf += k; tfn++; }
    });
    var h = '<div class="card exs"><div class="exs-t"><span>지금까지 쓴 돈</span><b class="disp">' + won(tot) + '원</b></div>' +
      '<div class="small">' + list.length + '건' + (eur ? ' · 유로로 쓴 돈 €' + eur.toFixed(2) : '') + (f ? ' · 1€ = ' + won(f.rate) + '원 (' + esc(smd(f.date)) + ' ' + esc(f.src || '') + ')' : '') + '</div>';
    if (tot) {
      h += '<details class="exd"' + foldAttr('excat') + '><summary>분류별</summary>' + bars(CAT.map(function (c) { return [c[1] + ' ' + c[2], byCat[c[0]] || 0]; }), tot) + '</details>';
      h += '<details class="exd"' + foldAttr('excity') + '><summary>도시별</summary>' + bars(Object.keys(byCity).map(function (k) { return [esc(k), byCity[k]]; }), tot) + '</details>';
      h += '<details class="exd"' + foldAttr('exwho') + '><summary>누가 냈나</summary>' + bars(Object.keys(byWho).map(function (k) { return [esc(whoShort(k)), byWho[k]]; }), tot) + '</details>';
      if (tfn) h += '<div class="small" style="margin-top:6px">🧾 택스리펀 받을 물건 ' + tfn + '건, ' + won(tf) + '원. 스페인은 출국 공항의 DIVA 키오스크에서 영수증·여권으로 처리해요.</div>';
    }
    h += '</div>';
    if (expEdit) h += expForm();
    else if (canEdit()) h += '<div class="acts" style="margin:10px 0"><button type="button" class="btn fill" id="exadd">＋ 쓴 돈 적기</button></div>';
    if (!f) h += '<p class="hint">환율을 아직 못 받았어요. 유로로 적은 금액은 환율이 들어오면 원화로 바뀌어요.</p>';
    var cur = '', grp = '';
    list.forEach(function (e) {
      if (e.date !== cur) {
        if (grp) h += grp + '</div>';
        cur = e.date; var dsum = list.filter(function (x) { return x.date === cur; }).reduce(function (s, x) { return s + expKrw(x); }, 0);
        h += '<div class="month exday"><span>' + esc(md(cur)) + '</span><span>' + won(dsum) + '원</span></div>'; grp = '<div class="card">';
      }
      var c = catOf(e.cat);
      grp += '<button type="button" class="exr" data-exp="' + esc(e.id) + '"><span class="exi">' + c[1] + '</span><span class="exm">' + esc(e.memo || c[2]) + '<small>' + esc(whoShort(e.payer)) + ' · ' + (e.method === 'cash' ? '현금' : '카드') + (e.taxfree ? ' · 택스리펀' : '') + '</small></span><span class="exa">' +
        (e.cur === 'KRW' ? won(e.amount) + '원' : '€' + Number(e.amount).toFixed(2) + '<small>' + won(expKrw(e)) + '원</small>') + '</span></button>';
    });
    if (grp) h += grp + '</div>';
    if (!list.length) h += '<div class="empty">아직 적은 게 없어요. 여행 전에 미리 낸 돈(원화)도 적어 둘 수 있어요.</div>';
    return h;
  }
  function expForm() {
    var e = expEdit === 'new' ? { cur: 'EUR', cat: 'food', payer: myId(), method: 'card', date: (inTrip() ? ymd(today()) : ymd(new Date())) } : (S.expenses.filter(function (x) { return x.id === expEdit; })[0] || {});
    return '<form class="edit" id="expf"><b class="disp">' + (expEdit === 'new' ? '쓴 돈 적기' : '고치기') + '</b>' +
      '<div class="exrow"><input class="inp" id="exa" inputmode="decimal" autocomplete="off" placeholder="금액" required value="' + esc(e.amount != null ? e.amount : '') + '" aria-label="금액">' +
      radios('excur', [['EUR', '€ 유로'], ['KRW', '₩ 원']], e.cur || 'EUR') + '</div><p class="small" id="exk"></p>' +
      '<label>분류</label>' + radios('excat', CAT.map(function (c) { return [c[0], c[1] + ' ' + c[2]]; }), e.cat || 'food') +
      '<label for="exm">어디에 (선택)</label><input class="inp" id="exm" maxlength="60" placeholder="예: 파스테이스 드 벨렝 에그타르트" value="' + esc(e.memo || '') + '">' +
      '<label>누가 냈나</label>' + radios('expay', memberList().map(function (m) { return [m.email, m.name]; }), e.payer || myId()) +
      '<label>결제</label>' + radios('exmeth', [['card', '카드'], ['cash', '현금']], e.method || 'card') +
      '<label for="exd">날짜</label><input class="inp" type="date" id="exd" value="' + esc(e.date || '') + '" required>' +
      '<label class="chkrow"><input type="checkbox" id="extf"' + (e.taxfree ? ' checked' : '') + '> 택스리펀 받을 물건</label>' +
      '<div class="acts"><button class="btn fill" type="submit">저장</button><button class="btn" type="button" id="excancel">닫기</button>' + (expEdit !== 'new' ? '<button class="btn del" type="button" id="exdel">삭제</button>' : '') + '</div></form>';
  }
  function exPreview() {
    var a = parseFloat(String(($('exa') || {}).value || '').replace(/,/g, '')), c = (document.querySelector('input[name=excur]:checked') || {}).value, f = fx(), el = $('exk');
    if (!el) return;
    el.textContent = !a ? '' : (c === 'KRW' ? '' : (f ? '≈ ' + won(a * f.rate) + '원' : '환율을 받으면 원화로 바꿔 드려요.'));
  }

  /* ---------- 발견 ---------- */
  var DSEG = [['now', '✨ 지금 뜨는 것'], ['eat', '🍽️ 맛집'], ['tour', '🚌 투어'], ['shop', '🛍️ 쇼핑'], ['wx', '☀️ 날씨']];
  var DHINT = {
    now: '우리 날짜·도시에 실제로 열리는 행사만 모았어요. 매일 아침 새 소식과 바뀐 점을 확인해요.',
    eat: '일정에 있는 식당과 대안이에요. 평점·후기 수는 확인한 날 기준이에요.',
    tour: '일정에 맞는 투어예요. 가격·후기 수는 확인한 날 기준이라 예약 전에 다시 보세요.',
    shop: '도시별로 사 올 만한 것과 살 곳이에요.'
  };
  var FIT = { '강력 추천': 'ora', '추천': 'blue', '선택': 'mute', '대안': 'mute', '필수': 'ora' };
  function favKey(email) { return 'fav_' + String(email || '').split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase(); }
  function favNames(x) { return memberList().filter(function (m) { return x[favKey(m.email)]; }).map(function (m) { return m.name; }); }
  function colOf(seg) { return seg === 'now' ? 'events' : seg === 'eat' ? 'restaurants' : seg === 'tour' ? 'tours' : 'shops'; }
  function arrOf(col) { return col === 'events' ? S.events : col === 'restaurants' ? S.eats : col === 'tours' ? S.tours : S.shops; }
  function sortKey(x) { var c = S.cities.filter(function (k) { return k.name === x.city; })[0]; return (x.day || x.start || (c ? c.from : '9')) + String(1000 + (x.order || 0)); }
  function dcard(x, col) {
    var mine = !!x[favKey(myId())], fl = favNames(x), title = x.title || x.name || x.item;
    var meta = [x.city, x.when || (x.day ? md(x.day) : ''), x.area, x.price].filter(Boolean).join(' · ');
    var h = '<article class="card dc' + (x.status === 'new' ? ' isnew' : '') + '"><div class="top2"><span class="tl">' + esc(title) + '</span><span class="dchips">' +
      (x.status === 'new' ? '<span class="chip ok">새로</span>' : x.status === 'changed' ? '<span class="chip ora">바뀜</span>' : '') +
      (x.fit ? '<span class="chip ' + (FIT[x.fit] || 'blue') + '">' + esc(x.fit) + '</span>' : '') + '</span></div>';
    if (meta) h += '<div class="meta">' + esc(meta) + '</div>';
    if (x.hours) h += '<div class="meta">🕒 ' + esc(x.hours) + '</div>';
    if (x.pending) h += '<div class="dl warn"><b>확인 중</b> ' + esc(x.pending) + '</div>';
    if (x.change) h += '<div class="dl warn"><b>바뀐 점</b> ' + esc(x.change) + '</div>';
    if (x.why) h += '<div class="why">' + esc(x.why) + '</div>';
    if (x.what) h += '<div class="dl"><b>뭘 먹을까</b> ' + esc(x.what) + '</div>';
    if (x.reserve) h += '<div class="dl"><b>예약</b> ' + esc(x.reserve) + '</div>';
    if (x.pros) h += '<div class="dl"><b>👍</b> ' + esc(x.pros) + '</div>';
    if (x.cons) h += '<div class="dl"><b>👎</b> ' + esc(x.cons) + '</div>';
    if (x.ratings && x.ratings.length) h += '<div class="dl"><b>평점</b> ' + x.ratings.map(function (r) { return esc(r.src) + ' ' + esc(r.score) + (r.count ? ' (' + Number(r.count).toLocaleString('ko-KR') + ')' : ''); }).join(' · ') + '</div>';
    if (x.prices && x.prices.length) h += '<div class="dl"><b>가격</b> ' + x.prices.map(function (p) { return (safeUrl(p.url) ? '<a target="_blank" rel="noopener" href="' + esc(p.url) + '">' + esc(p.src) + '</a>' : esc(p.src)) + ' ' + esc(p.price); }).join(' · ') + '</div>';
    if (x.where) h += '<div class="dl"><b>📍</b> ' + (x.q ? '<a target="_blank" rel="noopener" href="' + esc(gmap(x.q)) + '">' + esc(x.where) + '</a>' : esc(x.where)) + '</div>';
    if (x.tip) h += '<div class="dl"><b>💡</b> ' + esc(x.tip) + '</div>';
    if (x.search && !safeUrl(x.url)) h += '<div class="dl"><b>🔍</b> 앱에서 검색: ' + esc(x.search) + '</div>';
    h += '<div class="acts"><button type="button" class="btn small-btn fav' + (mine ? ' on' : '') + '" data-fav="' + col + '/' + esc(x.id) + '" aria-pressed="' + mine + '">' + (mine ? '♥' : '♡') + ' 찜' + (fl.length ? ' ' + fl.length : '') + '</button>' +
      (col === 'shops' ? '' : x.inPlan ? '<span class="chip ok">일정에 있음</span>' : x.askedAt ? '<span class="chip blue">넣어 달라고 함</span>' : (canEdit() ? '<button type="button" class="btn small-btn" data-plan="' + col + '/' + esc(x.id) + '">＋ 일정에 넣기</button>' : '')) +
      (safeUrl(x.url) ? '<a class="btn small-btn" target="_blank" rel="noopener" href="' + esc(x.url) + '">' + (col === 'tours' ? '상품 보기' : '자세히') + '</a>' : '') +
      (x.q && !x.where ? '<a class="btn small-btn" target="_blank" rel="noopener" href="' + esc(gmap(x.q)) + '">지도</a>' : '') + '</div>';
    if (fl.length) h += '<div class="small favw">♥ ' + esc(fl.join(', ')) + '</div>';
    var src = (x.links || []).filter(function (l) { return safeUrl(l.u); });
    if (src.length || x.checkedAt) h += '<div class="src">' + (src.length ? '출처 ' + src.map(function (l) { return '<a target="_blank" rel="noopener" href="' + esc(l.u) + '">' + esc(l.t || '링크') + '</a>'; }).join(' · ') : '') + (x.checkedAt ? (src.length ? ' · ' : '') + esc(smd(x.checkedAt)) + ' 확인' : '') + '</div>';
    return h + '</article>';
  }
  function discover() {
    var h = '<h2 style="margin-top:6px"><span class="em">🔎</span>발견</h2><div class="segs" role="tablist">' +
      DSEG.map(function (s) { return '<button type="button" role="tab" class="sg" data-dseg="' + s[0] + '" aria-selected="' + (discTab === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>';
    if (discTab === 'wx') { $('v-discover').innerHTML = h + weatherView(); return; }
    var col = colOf(discTab), all = arrOf(col).filter(function (x) { return x.status !== 'gone'; });
    var names = routeCities().map(function (c) { return c.name; });
    h += '<div class="fchips" role="group" aria-label="도시">' + [''].concat(names).map(function (n) { return '<button type="button" class="fchip" data-dcity="' + esc(n) + '" aria-pressed="' + (discCity === n) + '">' + (n || '전체') + '</button>'; }).join('') +
      '<button type="button" class="fchip favf" data-dfav aria-pressed="' + discFav + '">♥ 찜한 것</button></div>';
    h += '<p class="hint">' + DHINT[discTab] + (S.meta && S.meta.discoverAt ? ' 마지막 전체 갱신 ' + esc(md(S.meta.discoverAt)) + '.' : '') + '</p>';
    var list = all.filter(function (x) { return !discCity || x.city === discCity; }).filter(function (x) { return !discFav || favNames(x).length; })
      .sort(function (a, b) { var x = sortKey(a), y = sortKey(b); return x < y ? -1 : x > y ? 1 : 0; });
    if (discTab === 'shop' && !discCity && !discFav) {
      var groups = []; list.forEach(function (s) { if (groups.indexOf(s.city) < 0) groups.push(s.city); });
      h += groups.map(function (g) { return '<div class="month">' + esc(g) + '</div>' + list.filter(function (s) { return s.city === g; }).map(function (x) { return dcard(x, col); }).join(''); }).join('');
    } else h += list.map(function (x) { return dcard(x, col); }).join('');
    if (!list.length) h += '<div class="empty">' + (discFav ? '찜한 게 아직 없어요.' : discCity ? discCity + '에는 아직 없어요.' : '아직 없어요. 다음 갱신 때 채워져요.') + '</div>';
    h += '<form class="card linkf" id="linkf"' + (canEdit() ? '' : ' hidden') + '><b class="disp">🔗 링크 남기기</b><div class="small">인스타·유튜브·블로그에서 본 곳의 링크를 남기면 Claude가 영업일·위치·우리 동선을 확인해서 여기에 넣어 드려요.</div>' +
      '<input class="inp" id="linku" type="url" inputmode="url" placeholder="https://" required aria-label="링크"><input class="inp" id="linkm" maxlength="100" placeholder="메모 (선택): 예) 12/30 저녁에 가 보고 싶어" aria-label="메모">' +
      '<div class="acts"><button class="btn fill" type="submit">남기기</button></div></form>';
    $('v-discover').innerHTML = h;
  }
  function weatherView() {
    var h = '<p class="hint" style="margin-top:12px">출발 2주 전부터 자동 점검이 실제 예보로 바꿔 넣어요. 그 전엔 12월 평년 기온이에요.</p>';
    return h + (S.weather.length ? S.weather.slice().sort(byOrder).map(function (w) {
      return '<div class="card"><div class="wx"><div><b class="disp" style="font-size:18px">' + esc(w.city) + '</b><div class="small">' + esc(w.dates || '') + '</div></div><div class="tmp">' + esc(w.avgHi) + '° / ' + esc(w.avgLo) + '°</div></div>' +
        '<div style="font-size:14px;margin-top:4px">' + esc(w.tip || '') + '</div>' +
        ((w.forecast && w.forecast.length) ? '<div class="fc">' + w.forecast.map(function (f) { return '<div>' + esc(md(f.date).split(' ')[0]) + '<br>' + esc(f.sky || '') + '<br>' + esc(f.hi) + '°/' + esc(f.lo) + '°</div>'; }).join('') + '</div>' : '<div class="small" style="margin-top:4px">예보는 출발 2주 전부터</div>') + '</div>';
    }).join('') : '<div class="empty">날씨 정보가 아직 없어요.</div>');
  }
  function toggleFav(ref) {
    if (!canEdit()) { toast('로그인하면 찜할 수 있어요.'); return; }
    var p = ref.split('/'), x = arrOf(p[0]).filter(function (i) { return i.id === p[1]; })[0]; if (!x) return;
    var k = favKey(myId()), o = {}; o[k] = !x[k]; Store.update(p[0], p[1], o);
  }
  function askPlan(ref) {
    var p = ref.split('/'), x = arrOf(p[0]).filter(function (i) { return i.id === p[1]; })[0]; if (!x) return;
    var title = x.title || x.name, when = x.day ? md(x.day) : (x.when || '알맞은 날');
    Store.add('requests', { text: "[발견] '" + title + "'을(를) " + when + ' 일정에 넣어 줘. (' + [x.city, x.hours, x.where].filter(Boolean).join(', ') + ')', at: nowIso(), by: myId(), status: '대기', reply: null, ref: ref });
    Store.update(p[0], p[1], { askedAt: nowIso() });
    toast(savedMsg('Claude에게 남겼어요. 1시간 안에 일정에 넣어요.'));
  }

  /* ---------- 겹쳐 뜨는 화면: 티켓 보기, 기사님 카드, 비상 연락처 ---------- */
  var PHR = { es: 'Por favor, lléveme a esta dirección.', pt: 'Por favor, leve-me a esta morada.' };
  function telHref(n) { return 'tel:' + String(n).replace(/[^\d+]/g, ''); }
  function ovHtml() {
    if (!ov) return '';
    var bar = function (t, sub) { return '<div class="ovbar"><div><b>' + t + '</b>' + (sub ? '<div class="small">' + sub + '</div>' : '') + '</div><button type="button" class="ovx" data-ovclose aria-label="닫기">✕</button></div>'; };
    if (ov.t === 'jedit') return jEditHtml();
    if (ov.t === 'photo') return photoHtml();
    if (ov.t === 'phrase') {
      var ph = phraseById(ov.id), lg = ov.lang || curLang(); if (!ph) return '';
      return '<div class="ov driver" role="dialog" aria-modal="true" aria-label="크게 보여 주기">' + bar('크게 보여 주기', esc(ph.ko)) +
        '<div class="dv"><p class="dv-name ph-big" lang="' + (lg === 'pt' ? 'pt-PT' : 'es-ES') + '">' + esc(ph[lg]) + '</p>' + (ph[lg + 'K'] ? '<p class="dv-ko">' + esc(ph[lg + 'K']) + '</p>' : '') + '<p class="dv-ko">' + esc(ph.ko) + '</p></div>' +
        '<div class="acts" style="justify-content:center"><button type="button" class="btn fill" data-say="' + esc(ph.id) + '">🔊 다시 듣기</button></div></div>';
    }
    if (ov.t === 'viewer') {
      var f = S.files.filter(function (x) { return x.id === ov.id; })[0]; if (!f) return '';
      var b = f.booking && S.bookings.filter(function (x) { return x.id === f.booking; })[0];
      return '<div class="ov viewer" role="dialog" aria-modal="true" aria-label="' + esc(f.label) + '">' + bar(esc(f.label), b ? esc(md(b.date)) + ' ' + esc(b.title) : esc(whoShort(f.who))) +
        '<div class="ovbody">' + filePaths(f).map(function (p) { return '<img data-wpath="' + esc(p) + '" alt="' + esc(f.label) + '">'; }).join('') + '</div>' +
        '<div class="ovfoot">' + (f.orig && Store.status.mode !== 'demo' ? '<button type="button" class="btn small-btn" data-worig="' + esc(f.id) + '">원본 PDF</button>' : '') +
        (canEdit() ? '<button type="button" class="btn small-btn del" data-wdel="' + esc(f.id) + '">삭제</button>' : '') + '</div></div>';
    }
    if (ov.t === 'driver') {
      var cs = S.cities.slice().sort(byOrder), t = ymd(today());
      var c0 = (ov.cid && cs.filter(function (c) { return c.id === ov.cid; })[0]) || stayCity(t) || cs.filter(function (c) { return c.from >= t; })[0] || cs[0];
      if (!c0) return '';
      var lang = c0.lang || (['리스본', '포르투'].indexOf(c0.name) >= 0 ? 'pt' : 'es');
      return '<div class="ov driver" role="dialog" aria-modal="true" aria-label="기사님께 보여주기">' + bar('기사님께 보여주기', '화면을 기사님께 그대로 보여 주세요') +
        '<div class="dv"><p class="dv-say">' + PHR[lang] + '</p><p class="dv-name">' + esc(c0.hotelLocal || c0.hotel || '') + '</p><p class="dv-addr">' + esc(c0.addr || '주소가 아직 없어요') + '</p>' +
        (c0.tel ? '<p class="dv-tel"><a href="' + esc(telHref(c0.tel)) + '">☎ ' + esc(c0.tel) + '</a></p>' : '') + '<p class="dv-ko">' + esc(c0.name) + ' 숙소 · ' + esc(c0.hotel || '') + '</p></div>' +
        '<div class="fchips dv-pick">' + cs.map(function (c) { return '<button type="button" class="fchip" data-driver="' + esc(c.id) + '" aria-pressed="' + (c.id === c0.id) + '">' + esc(c.name) + '</button>'; }).join('') + '</div>' +
        (c0.addr ? '<div class="acts" style="justify-content:center"><a class="btn" target="_blank" rel="noopener" href="' + esc(gmap((c0.hotelLocal || c0.hotel) + ', ' + c0.addr)) + '">지도에서 보기</a></div>' : '') + '</div>';
    }
    var e = Store.get('meta', 'emergency') || {}, mine = e.mine || {};
    if (ov.t === 'sos') {
      var pp = S.files.filter(function (x) { return /여권/.test(x.label || ''); });
      return '<div class="ov sos" role="dialog" aria-modal="true" aria-label="비상 연락처">' + bar('🆘 비상 연락처', e.checkedAt ? esc(smd(e.checkedAt)) + ' 확인 · 누르면 바로 전화' : '누르면 바로 전화') + '<div class="sosb">' +
        (e.fixed || []).map(function (x) { return '<a class="sosr" href="' + esc(telHref(x.n)) + '"><span><b>' + esc(x.t) + '</b>' + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</span><span class="sosn">' + esc(x.n) + '</span></a>'; }).join('') +
        (e.note ? '<p class="small" style="margin:6px 2px 0">' + esc(e.note) + '</p>' : '') +
        ((e.steps && e.steps.length) ? '<h4>여권을 잃어버리면</h4><ol class="sos-steps">' + e.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' : '') +
        '<h4>우리 정보</h4>' + [['cards', '💳 카드 분실 신고'], ['insurance', '🛟 여행자 보험'], ['family', '👪 한국 가족 연락처'], ['memo', '📝 메모']].map(function (k) {
          return '<div class="sosm"><b>' + k[1] + '</b><div>' + (mine[k[0]] ? esc(mine[k[0]]).replace(/\n/g, '<br>') : '<span class="small">아직 비어 있어요</span>') + '</div></div>';
        }).join('') +
        (pp.length ? '<div class="acts">' + pp.map(function (f) { return '<button type="button" class="btn small-btn" data-wopen="' + esc(f.id) + '">🛂 ' + esc(f.label) + '</button>'; }).join('') + '</div>' : '<p class="small">여권 사본을 지갑 &gt; 서류에 올려 두면 여기서 바로 열려요.</p>') +
        (canEdit() ? '<div class="acts"><button type="button" class="btn" data-ov="sosEdit">우리 정보 고치기</button></div>' : '') + '</div></div>';
    }
    if (ov.t === 'sosEdit') {
      return '<div class="ov sos" role="dialog" aria-modal="true" aria-label="우리 정보 고치기">' + bar('우리 정보 고치기', '두 사람 모두에게 보여요') + '<form class="sosb" id="sosf">' +
        [['cards', '💳 카드 분실 신고 번호', '예: 영욱 ○○카드 해외 +82-2-…'], ['insurance', '🛟 여행자 보험', '보험사, 증권번호, 해외 긴급지원 번호'], ['family', '👪 한국 가족 연락처', ''], ['memo', '📝 메모', '']].map(function (k) {
          return '<label for="sos-' + k[0] + '">' + k[1] + '</label><textarea class="inp" id="sos-' + k[0] + '" rows="3" maxlength="400" placeholder="' + esc(k[2]) + '">' + esc(mine[k[0]] || '') + '</textarea>';
        }).join('') + '<div class="acts"><button class="btn fill" type="submit">저장</button><button class="btn" type="button" data-ov="sos">취소</button></div></form></div>';
    }
    return '';
  }
  function renderOv() {
    var el = $('ov'); if (!el) return;
    el.innerHTML = ovHtml(); el.hidden = !ov || !el.innerHTML;
    document.body.classList.toggle('ovopen', !el.hidden);
    if (!el.hidden) { hydrate(el); jHydrate(el); var x = el.querySelector('.ovx'); if (x) x.focus({ preventScroll: true }); }
  }

  /* ---------- 짐 체크리스트 ----------
     who: 'both'(둘 다 각자 챙김, 체크도 각자 chk_<아이디>), 'shared'(같이 쓰는 것, 한 명만 챙기면 됨), 이메일(그 사람만) */
  var PCAT = [['doc', '🛂', '서류·돈'], ['tech', '🔌', '전자기기'], ['wear', '🧥', '옷·신발'], ['wash', '🪥', '세면·화장'], ['med', '💊', '약'], ['bag', '🎒', '가방·기타']];
  function lid(email) { return String(email || '').split('@')[0]; }
  function chkKey(email) { return 'chk_' + lid(email); }
  function packFor() { var ms = memberList(); if (packWho && ms.some(function (m) { return m.email === packWho; })) return packWho; return myId() && ms.some(function (m) { return m.email === myId(); }) ? myId() : (ms[0] ? ms[0].email : myId()); }
  function packMine(x, em) { return x.who === 'both' || (x.who && x.who !== 'shared' && x.who === em); }
  function packDone(x, em) { return x.who === 'both' ? !!x[chkKey(em)] : !!x.done; }
  function packCount(em) {
    var l = S.packing.filter(function (x) { return packMine(x, em) || x.who === 'shared'; });
    return { n: l.filter(function (x) { return packDone(x, em); }).length, total: l.length };
  }
  function packRow(x, em) {
    if (packEdit === x.id) return packForm(x);
    var d = packDone(x, em), by = x.who === 'shared' && x.done && x.doneBy ? '챙긴 사람: ' + whoShort(x.doneBy) : '';
    return '<div class="task pk' + (d ? ' done' : '') + '"><button class="chk" role="checkbox" aria-checked="' + d + '" aria-label="' + esc(x.title) + '" data-pchk="' + esc(x.id) + '"' + (canEdit() ? '' : ' disabled') + '></button>' +
      '<button type="button" class="tt" data-pedit="' + esc(x.id) + '"' + (canEdit() ? '' : ' disabled') + '>' + esc(x.title) + '</button><div class="tm">' +
      (x.who !== 'both' && x.who !== 'shared' ? '<span class="who">' + esc(whoShort(x.who)) + ' 것</span>' : '') + (x.note ? '<span>' + esc(x.note) + '</span>' : '') + (by ? '<span class="who">' + esc(by) + '</span>' : '') + '</div></div>';
  }
  function packForm(x) {
    var isNew = !x || x === 'new'; x = isNew ? { cat: 'bag', who: 'both' } : x;
    var whoOpts = [['both', '둘 다 각자'], ['shared', '같이 쓰는 것 (한 명만)']].concat(memberList().map(function (m) { return [m.email, m.name + '만']; }));
    return '<form class="edit" id="packf" data-id="' + (isNew ? '' : esc(x.id)) + '"><b class="disp">' + (isNew ? '＋ 짐 추가' : '짐 고치기') + '</b>' +
      '<label for="pkt">무엇</label><input class="inp" id="pkt" maxlength="60" required value="' + esc(x.title || '') + '" placeholder="예: 고데기">' +
      '<label>분류</label>' + radios('pkc', PCAT.map(function (c) { return [c[0], c[1] + ' ' + c[2]]; }), x.cat || 'bag') +
      '<label>누가 챙기나</label>' + radios('pkw', whoOpts, x.who || 'both') +
      '<label for="pkn">메모</label><input class="inp" id="pkn" maxlength="80" value="' + esc(x.note || '') + '">' +
      '<div class="acts"><button class="btn fill" type="submit">' + (isNew ? '추가' : '저장') + '</button><button class="btn" type="button" id="pkcancel">닫기</button>' + (isNew ? '' : '<button class="btn del" type="button" id="pkdel">삭제</button>') + '</div></form>';
  }
  function packView() {
    var em = packFor(), ms = memberList();
    var h = '<button type="button" class="back" data-go="home">‹ 홈</button><h2 style="margin-top:6px"><span class="em">🧳</span>짐 챙기기</h2>';
    h += '<div class="seg pkseg" role="tablist">' + ms.map(function (m) { var c = packCount(m.email); return '<button role="tab" data-pwho="' + esc(m.email) + '" aria-selected="' + (m.email === em) + '">' + esc(m.name) + (m.email === myId() ? ' (나)' : '') + ' <small>' + c.n + '/' + c.total + '</small></button>'; }).join('') + '</div>';
    var c0 = packCount(em), pct = c0.total ? Math.round(c0.n / c0.total * 100) : 0;
    h += '<div class="pkbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>';
    h += '<p class="hint">체크는 사람마다 따로 돼요. \'같이 쓰는 것\'은 둘 중 한 명만 챙기면 돼요. 이름을 누르면 고치거나 지울 수 있어요.</p>';
    if (!S.packing.length) h += '<div class="empty">' + (loaded ? '아직 짐 목록이 없어요. 아래에서 추가해 보세요.' : '불러오는 중') + '</div>';
    var mine = S.packing.filter(function (x) { return packMine(x, em); }), sh = S.packing.filter(function (x) { return x.who === 'shared'; });
    PCAT.forEach(function (c) {
      var l = mine.filter(function (x) { return (x.cat || 'bag') === c[0]; }).sort(byOrder); if (!l.length) return;
      var n = l.filter(function (x) { return packDone(x, em); }).length;
      h += '<div class="month">' + c[1] + ' ' + esc(c[2]) + ' <span class="small">' + n + '/' + l.length + '</span></div><div class="card">' + l.map(function (x) { return packRow(x, em); }).join('') + '</div>';
    });
    if (sh.length) {
      var ns = sh.filter(function (x) { return x.done; }).length;
      h += '<div class="month">🤝 같이 쓰는 것 <span class="small">' + ns + '/' + sh.length + ' · 한 명만</span></div><div class="card">' + sh.sort(byOrder).map(function (x) { return packRow(x, em); }).join('') + '</div>';
    }
    if (canEdit()) h += packEdit === 'new' ? packForm('new') : '<div class="acts" style="margin-top:10px"><button type="button" class="btn fill" id="pkadd">＋ 짐 추가</button></div>';
    h += '<p class="hint" style="margin-top:12px">출발 이틀 전·전날 저녁 8시, 출발일 아침 7시에 아직 안 챙긴 게 있으면 각자 폰으로 알려 드려요.</p>';
    $('v-pack').innerHTML = h;
  }
  function packToggle(id) {
    var x = S.packing.filter(function (p) { return p.id === id; })[0]; if (!x) return;
    var em = packFor(), o = {};
    if (x.who === 'both') { o[chkKey(em)] = !x[chkKey(em)]; }
    else { o.done = !x.done; o.doneBy = o.done ? myId() : null; o.doneAt = o.done ? nowIso() : null; }
    Store.update('packing', id, o);
  }

  /* ---------- 회화 카드 (휴대폰 내장 목소리로 소리 내 읽기, 인터넷 없어도 됨) ----------
     [분류, 한국어, 스페인어, 스페인어 발음, 포르투갈어(포르투갈식), 발음, 메모] */
  var TCAT = [['basic', '👋', '기본'], ['eat', '🍽️', '식당·카페'], ['shop', '🛍️', '쇼핑'], ['move', '🚕', '교통'], ['stay', '🏨', '숙소'], ['love', '💍', '신혼여행'], ['sos', '🆘', '위급'], ['mine', '📌', '부탁한 문장']];
  var PHRASES = [
    ['basic', '안녕하세요 (아침·낮)', '¡Hola, buenos días!', '올라, 부에노스 디아스', 'Olá, bom dia!', '올라, 봉 디아', ''],
    ['basic', '안녕하세요 (오후·저녁)', '¡Buenas tardes!', '부에나스 따르데스', 'Boa tarde!', '보아 따르드', '해가 지면 스페인어 Buenas noches, 포르투갈어 Boa noite'],
    ['basic', '정말 고맙습니다', '¡Muchas gracias!', '무차스 그라시아스', 'Muito obrigado!', '무이뚜 오브리가두', '포르투갈어는 말하는 사람이 여자면 obrigada(오브리가다)'],
    ['basic', '저기요 (부를 때)', 'Disculpe.', '디스꿀뻬', 'Desculpe.', '디슈꿀프', ''],
    ['basic', '지나갈게요', 'Perdón, ¿puedo pasar?', '뻬르돈, 뿌에도 빠사르?', 'Com licença.', '꽁 리센사', ''],
    ['basic', '영어 하세요?', '¿Habla inglés?', '아블라 잉글레스?', 'Fala inglês?', '팔라 잉글레시?', ''],
    ['basic', '천천히 말씀해 주세요', 'Más despacio, por favor.', '마스 데스빠시오, 뽀르 파보르', 'Mais devagar, por favor.', '마이시 드바가르, 뿌르 파보르', ''],
    ['basic', '죄송해요, 못 알아들었어요', 'Perdone, no le he entendido.', '뻬르도네, 노 레 에 엔뗀디도', 'Desculpe, não percebi.', '디슈꿀프, 나웅 뻬르스비', ''],
    ['basic', '화장실이 어디예요?', '¿Dónde está el baño, por favor?', '돈데 에스따 엘 바뇨, 뽀르 파보르?', 'Onde é a casa de banho?', '옹드 에 아 까자 드 바뉴?', ''],
    ['eat', '두 명 자리 있어요?', 'Una mesa para dos, por favor.', '우나 메사 빠라 도스, 뽀르 파보르', 'Uma mesa para dois, por favor.', '우마 메자 빠라 도이시, 뿌르 파보르', ''],
    ['eat', '서(Suh) 이름으로 예약했어요', 'Tenemos una reserva a nombre de Suh.', '떼네모스 우나 레세르바 아 놈브레 데 서', 'Temos uma reserva em nome de Suh.', '떼무즈 우마 흐제르바 앵 노므 드 서', ''],
    ['eat', '메뉴판 주세요', 'La carta, por favor.', '라 까르따, 뽀르 파보르', 'A ementa, por favor.', '아 이멩따, 뿌르 파보르', ''],
    ['eat', '뭘 추천하세요?', '¿Qué nos recomienda?', '께 노스 레꼬미엔다?', 'O que é que recomenda?', '우 끼 에 끄 흐꾸멩다?', ''],
    ['eat', '이거 주세요 (가리키며)', 'Esto, por favor.', '에스또, 뽀르 파보르', 'Isto, por favor.', '이슈뚜, 뿌르 파보르', ''],
    ['eat', '나눠 먹을 거예요', 'Es para compartir.', '에스 빠라 꼼빠르띠르', 'É para partilhar.', '에 빠라 빠르띨랴르', '타파스·해산물은 나눠 먹는 게 보통이에요'],
    ['eat', '탄산 없는 물 주세요', 'Agua sin gas, por favor.', '아구아 신 가스, 뽀르 파보르', 'Água sem gás, por favor.', '아구아 상 가시, 뿌르 파보르', ''],
    ['eat', '라테 두 잔 주세요', 'Dos cafés con leche, por favor.', '도스 까페스 꼰 레체, 뽀르 파보르', 'Dois galões, por favor.', '도이시 갈로잉시, 뿌르 파보르', '포르투갈 갈랑(galão)은 우유 듬뿍 커피. 에스프레소는 리스본 bica, 포르투 cimbalino'],
    ['eat', '정말 맛있었어요!', '¡Estaba buenísimo!', '에스따바 부에니시모!', 'Estava delicioso!', '이슈따바 들리시오주!', ''],
    ['eat', '계산서 주세요', 'La cuenta, por favor.', '라 꾸엔따, 뽀르 파보르', 'A conta, por favor.', '아 꽁따, 뿌르 파보르', '직원이 먼저 안 가져와요. 눈 마주치고 손으로 쓰는 시늉을 해도 돼요'],
    ['eat', '카드로 낼 수 있어요?', '¿Puedo pagar con tarjeta?', '뿌에도 빠가르 꼰 따르헤따?', 'Posso pagar com cartão?', '뽀수 빠가르 꽁 까르따웅?', ''],
    ['eat', '포장해 주세요', '¿Me lo pone para llevar?', '메 로 뽀네 빠라 예바르?', 'É para levar, por favor.', '에 빠라 르바르, 뿌르 파보르', ''],
    ['shop', '얼마예요?', '¿Cuánto cuesta?', '꾸안또 꾸에스따?', 'Quanto custa?', '꽌뚜 꾸슈따?', ''],
    ['shop', '그냥 구경하는 중이에요', 'Solo estoy mirando, gracias.', '솔로 에스또이 미란도, 그라시아스', 'Estou só a ver, obrigado.', '이슈또 쏘 아 베르, 오브리가두', ''],
    ['shop', '입어 봐도 돼요?', '¿Me lo puedo probar?', '메 로 뿌에도 쁘로바르?', 'Posso experimentar?', '뽀수 이슈뻬리멩따르?', ''],
    ['shop', '다른 사이즈 있어요?', '¿Lo tiene en otra talla?', '로 띠에네 엔 오뜨라 따야?', 'Tem noutro tamanho?', '땡 노우뜨루 따마뉴?', ''],
    ['shop', '택스프리 해 주세요', '¿Me hace el tax free, por favor?', '메 아세 엘 택스프리, 뽀르 파보르?', 'Pode fazer o tax free, por favor?', '뽀드 파제르 우 택스프리, 뿌르 파보르?', '여권이 있어야 해요. 서류는 출국하는 공항(마드리드)에서 처리'],
    ['shop', '선물 포장해 주세요', '¿Me lo envuelve para regalo?', '메 로 엔부엘베 빠라 레갈로?', 'Pode embrulhar para oferta?', '뽀드 잉브룰랴르 빠라 오페르따?', ''],
    ['move', '공항으로 가 주세요', 'Al aeropuerto, por favor.', '알 아에로뿌에르또, 뽀르 파보르', 'Para o aeroporto, por favor.', '빠라 우 아에루뽀르뚜, 뿌르 파보르', '숙소 주소는 🚕 기사님 카드에 있어요'],
    ['move', '기차역으로 가 주세요', 'A la estación de tren, por favor.', '아 라 에스따시온 데 뜨렌, 뽀르 파보르', 'Para a estação de comboios, por favor.', '빠라 아 이슈따사웅 드 꽁보이우시, 뿌르 파보르', ''],
    ['move', '얼마나 걸려요?', '¿Cuánto se tarda?', '꾸안또 세 따르다?', 'Quanto tempo demora?', '꽌뚜 뗑뿌 드모라?', ''],
    ['move', '여기서 세워 주세요', 'Pare aquí, por favor.', '빠레 아끼, 뽀르 파보르', 'Pode parar aqui, por favor.', '뽀드 빠라르 아끼, 뿌르 파보르', ''],
    ['move', '영수증 주세요', '¿Me da un recibo, por favor?', '메 다 운 레시보, 뽀르 파보르?', 'Pode dar-me um recibo?', '뽀드 다르므 웅 흐시부?', ''],
    ['move', '이 기차 몇 번 승강장이에요?', '¿De qué vía sale el tren?', '데 께 비아 살레 엘 뜨렌?', 'De que linha parte o comboio?', '드 끄 린냐 빠르뜨 우 꽁보이우?', ''],
    ['move', '표 두 장 주세요', 'Dos billetes, por favor.', '도스 비예떼스, 뽀르 파보르', 'Dois bilhetes, por favor.', '도이시 빌례뜨시, 뿌르 파보르', ''],
    ['stay', '체크인할게요, 서(Suh) 이름으로 예약했어요', 'Venimos a hacer el check-in. La reserva está a nombre de Suh.', '베니모스 아 아세르 엘 체킨. 라 레세르바 에스따 아 놈브레 데 서', 'Viemos fazer o check-in. A reserva está em nome de Suh.', '비에무시 파제르 우 체킨. 아 흐제르바 이슈따 앵 노므 드 서', ''],
    ['stay', '짐 맡길 수 있어요?', '¿Podemos dejar las maletas aquí?', '뽀데모스 데하르 라스 말레따스 아끼?', 'Podemos deixar as malas aqui?', '뿌데무시 데이샤르 아시 말라시 아끼?', ''],
    ['stay', '와이파이 비밀번호가 뭐예요?', '¿Cuál es la contraseña del wifi?', '꾸알 에스 라 꼰뜨라세냐 델 위피?', 'Qual é a palavra-passe do wi-fi?', '꽐 에 아 빨라브라 빠스 두 와이파이?', ''],
    ['stay', '택시 좀 불러 주세요', '¿Nos puede pedir un taxi?', '노스 뿌에데 뻬디르 운 딱시?', 'Pode chamar-nos um táxi?', '뽀드 샤마르누즈 웅 딱시?', ''],
    ['stay', '체크아웃은 몇 시예요?', '¿A qué hora es el check-out?', '아 께 오라 에스 엘 체카웃?', 'A que horas é o check-out?', '아 끄 오라즈 에 우 체카웃?', ''],
    ['love', '우리 신혼여행 중이에요!', '¡Estamos de luna de miel!', '에스따모스 데 루나 데 미엘!', 'Estamos em lua de mel!', '이슈따무즈 앵 루아 드 멜!', '호텔·식당에서 말하면 축하해 주는 곳이 많아요'],
    ['love', '사진 좀 찍어 주실래요?', '¿Nos podría hacer una foto, por favor?', '노스 뽀드리아 아세르 우나 포또, 뽀르 파보르?', 'Pode tirar-nos uma fotografia, por favor?', '뽀드 띠라르누즈 우마 푸뚜그라피아, 뿌르 파보르?', ''],
    ['love', '건배!', '¡Salud!', '살룻!', 'Saúde!', '사우드!', ''],
    ['love', '정말 아름다워요', '¡Qué bonito!', '께 보니또!', 'Que bonito!', '끄 부니뚜!', ''],
    ['sos', '도와주세요!', '¡Ayuda, por favor!', '아유다, 뽀르 파보르!', 'Ajuda, por favor!', '아주다, 뿌르 파보르!', '긴급 전화는 어디서나 112'],
    ['sos', '경찰 불러 주세요', 'Llame a la policía, por favor.', '야메 아 라 뽈리시아, 뽀르 파보르', 'Chame a polícia, por favor.', '샤므 아 뿔리시아, 뿌르 파보르', ''],
    ['sos', '여권을 잃어버렸어요', 'He perdido el pasaporte.', '에 뻬르디도 엘 빠사뽀르떼', 'Perdi o passaporte.', '뻬르디 우 빠사뽀르뜨', '🆘 비상 연락처에 할 일 순서가 있어요'],
    ['sos', '지갑을 도둑맞았어요', 'Me han robado la cartera.', '메 안 로바도 라 까르떼라', 'Roubaram-me a carteira.', '호바라웅므 아 까르떼이라', ''],
    ['sos', '의사가 필요해요', 'Necesito un médico.', '네세시또 운 메디꼬', 'Preciso de um médico.', '쁘르시주 드 웅 메디꾸', ''],
    ['sos', '약국이 어디 있어요?', '¿Dónde hay una farmacia?', '돈데 아이 우나 파르마시아?', 'Onde há uma farmácia?', '옹드 아 우마 파르마시아?', '초록 십자가 간판']
  ].map(function (a, i) { return { id: 'b' + i, cat: a[0], ko: a[1], es: a[2], esK: a[3], pt: a[4], ptK: a[5], note: a[6] }; });
  function phraseList() {
    return PHRASES.concat(S.phrases.filter(function (x) { return x.ko && (x.es || x.pt); }).map(function (x) { return Object.assign({ cat: 'mine' }, x); }));
  }
  function autoLang() {
    var c = stayCity(ymd(today())) || (inTrip() ? null : null);
    if (c) return (c.lang || (['리스본', '포르투'].indexOf(c.name) >= 0 ? 'pt' : 'es'));
    return 'es';
  }
  function curLang() { return talkLang || autoLang(); }
  function ttsOk() { return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'; }
  function pickVoice(lang) {
    if (!ttsOk()) return null;
    var vs = window.speechSynthesis.getVoices() || [], tag = lang === 'pt' ? 'pt-PT' : 'es-ES';
    var norm = function (v) { return String(v.lang || '').replace('_', '-'); };
    return vs.filter(function (v) { return norm(v) === tag; })[0] || vs.filter(function (v) { return norm(v).indexOf(lang) === 0; })[0] || null;
  }
  function speak(text, lang, btn) {
    if (!ttsOk()) { toast('이 폰에서는 소리 내 읽기를 쓸 수 없어요.'); return; }
    var ss = window.speechSynthesis; ss.cancel();
    var u = new window.SpeechSynthesisUtterance(text), v = pickVoice(lang);
    u.lang = lang === 'pt' ? 'pt-PT' : 'es-ES'; if (v) u.voice = v; u.rate = talkSlow ? 0.65 : 0.92;
    if (btn) { btn.classList.add('on'); u.onend = u.onerror = function () { btn.classList.remove('on'); }; }
    ss.speak(u);
  }
  function voiceNote(lang) {
    if (!ttsOk()) return '이 폰은 소리 내 읽기를 지원하지 않아요. 발음 표기를 보고 읽거나 화면을 보여 주세요.';
    var vs = window.speechSynthesis.getVoices() || []; if (!vs.length) return '';
    var v = pickVoice(lang); if (!v) return (lang === 'pt' ? '포르투갈어' : '스페인어') + ' 목소리가 이 폰에 없어요. 설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성에서 받을 수 있어요.';
    if (lang === 'pt' && String(v.lang).replace('_', '-') !== 'pt-PT') return '포르투갈식 목소리가 없어 브라질식으로 읽어요. 설정 → 손쉬운 사용 → 읽기 및 말하기 → 음성 → 포르투갈어(포르투갈)를 받으면 더 정확해요.';
    return '';
  }
  function talkView() {
    var lg = curLang(), list = phraseList(), cats = TCAT.filter(function (c) { return list.some(function (p) { return p.cat === c[0]; }); });
    var h = '<button type="button" class="back" data-go="home">‹ 홈</button><h2 style="margin-top:6px"><span class="em">💬</span>회화 카드</h2>';
    h += '<div class="seg" role="tablist">' + [['es', '🇪🇸 스페인어'], ['pt', '🇵🇹 포르투갈어']].map(function (x) { return '<button role="tab" data-tlang="' + x[0] + '" aria-selected="' + (lg === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="trow"><label class="chkrow"><input type="checkbox" id="tslow"' + (talkSlow ? ' checked' : '') + '> 🐢 천천히 읽기</label><span class="small">' + (talkLang ? '' : '오늘 있는 곳 기준') + '</span></div>';
    var vn = voiceNote(lg); h += '<p class="hint" id="tvn">' + esc(vn || '🔊를 누르면 폰이 읽어 줘요. 인터넷이 없어도 돼요. 소리가 안 나면 무음 모드를 꺼 보세요.') + '</p>';
    h += '<div class="fchips" role="group" aria-label="상황">' + [['', '전체']].concat(cats.map(function (c) { return [c[0], c[1] + ' ' + c[2]]; })).map(function (c) { return '<button type="button" class="fchip" data-tcat="' + c[0] + '" aria-pressed="' + (talkCat === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>';
    cats.filter(function (c) { return !talkCat || c[0] === talkCat; }).forEach(function (c) {
      var l = list.filter(function (p) { return p.cat === c[0] && p[lg]; }); if (!l.length) return;
      h += '<div class="month">' + c[1] + ' ' + esc(c[2]) + '</div>' + l.map(function (p) {
        return '<div class="phr"><div class="ph-ko">' + esc(p.ko) + '</div><div class="ph-row"><div><div class="ph-t" lang="' + (lg === 'pt' ? 'pt-PT' : 'es-ES') + '">' + esc(p[lg]) + '</div>' + (p[lg + 'K'] ? '<div class="ph-k">' + esc(p[lg + 'K']) + '</div>' : '') + '</div>' +
          '<div class="ph-b"><button type="button" class="ico" data-say="' + esc(p.id) + '" aria-label="소리 내 읽기">🔊</button><button type="button" class="ico" data-show="' + esc(p.id) + '" aria-label="크게 보여 주기">⤢</button></div></div>' +
          (p.note ? '<div class="ph-n">' + esc(p.note) + '</div>' : '') + '</div>';
      }).join('');
    });
    h += '<form class="card linkf" id="talkf"' + (canEdit() ? '' : ' hidden') + '><b class="disp">＋ 이런 말도 넣어 줘</b><div class="small">한국어로 적어 주시면 1시간 안에 스페인어·포르투갈어로 바꿔 \'부탁한 문장\'에 넣어 드려요.</div>' +
      '<input class="inp" id="talkt" maxlength="120" placeholder="예: 견과류 알레르기가 있어요" aria-label="넣고 싶은 말" required><div class="acts"><button class="btn fill" type="submit">부탁하기</button></div></form>';
    h += '<p class="hint" style="margin-top:12px">바르셀로나는 카탈루냐어도 쓰지만 스페인어로 충분해요. 인사만 바꿔 보려면: 안녕하세요 Bon dia(본 디아), 고마워요 Gràcies(그라시에스).</p>';
    $('v-talk').innerHTML = h;
  }
  function phraseById(id) { return phraseList().filter(function (p) { return p.id === id; })[0]; }
  if (ttsOk() && window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener('voiceschanged', function () { var n = $('tvn'); if (n && view === 'talk') { var v = voiceNote(curLang()); n.textContent = v || '🔊를 누르면 폰이 읽어 줘요. 인터넷이 없어도 돼요. 소리가 안 나면 무음 모드를 꺼 보세요.'; } });

  /* ---------- 아이폰 캘린더 구독 ---------- */
  var K_CAL = 'hm.calkey';
  function calUrl(k) { var u = ((window.HM_CONFIG || {}).url || '').replace(/\/$/, ''); return u && k ? u + '/functions/v1/cal?k=' + k : ''; }
  function calLoad(rotate) {
    if (Store.status.mode !== 'ready') return;
    if (!calInfo.key) { try { calInfo.key = localStorage.getItem(K_CAL) || null; } catch (e) {} }
    if (!navigator.onLine || calInfo.busy) { calRender(); return; }
    calInfo.busy = true;
    Store.rpc('cal_key', { p_rotate: !!rotate }).then(function (k) {
      calInfo.key = k; calInfo.err = ''; try { localStorage.setItem(K_CAL, k); } catch (e) {}
      if (rotate) toast('주소를 바꿨어요. 아이폰 캘린더에서 옛 구독을 지우고 새로 구독해 주세요.');
    }, function (e) { calInfo.err = (e && e.message) || '받지 못함'; }).then(function () { calInfo.busy = false; calRender(); });
  }
  function calBoxHtml() {
    if (Store.status.mode === 'demo') return '<p class="small">데모 모드에서는 쓸 수 없어요.</p>';
    var u = calUrl(calInfo.key);
    if (!u) return '<p class="small">' + (calInfo.busy ? '주소를 받는 중…' : (navigator.onLine ? (calInfo.err ? '주소를 받지 못했어요: ' + esc(calInfo.err) : '주소를 받는 중…') : '인터넷이 연결되면 구독 주소를 받아 와요.')) + '</p>';
    return '<p class="small">일정이 아이폰 캘린더에 \'우리 신혼여행\'으로 들어가요. 앱에서 일정이나 예약을 고치면 캘린더도 몇 시간 안에 따라 바뀌어요. 두 사람 각자 한 번씩 구독하면 돼요.</p>' +
      '<div class="acts"><a class="btn fill" id="calSub" href="' + esc(u.replace(/^https:/, 'webcal:')) + '">🗓️ 캘린더에 구독하기</a><button type="button" class="btn" id="calCopy">주소 복사</button></div>' +
      '<details class="calhelp"><summary>버튼이 안 되면</summary><ol class="small cal-steps"><li>위 \'주소 복사\'를 눌러요.</li><li>아이폰 설정 → 캘린더 → 캘린더 계정 → 계정 추가 → 기타</li><li>\'구독 캘린더 추가\' → 서버에 붙여 넣기 → 다음 → 저장</li></ol></details>' +
      '<p class="small" style="margin-top:6px">시간은 현지 시계 그대로 보여요(리스본 20:30 → 20:30). 이 주소를 아는 사람은 일정을 볼 수 있으니 다른 사람에게 보내지 마세요.' + (canEdit() ? ' <button type="button" class="linkbtn" id="calRot">주소 바꾸기</button>' : '') + '</p>';
  }
  function calRender() { var b = $('calBox'); if (b) b.innerHTML = calBoxHtml(); }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res, rej) { var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } a.remove(); });
  }

  /* ---------- 하루 한 줄 + 사진 (귀국 후 앨범) ----------
     journal/<날짜>_<아이디> = { date, by, text, photos:[{p, t}] }. 사진은 비공개 보관함 'wallet'의 j/ 아래.
     인터넷이 없을 때 고른 사진은 이 폰에 먼저 저장해 두고, 연결되면 올린다. */
  var JCACHE = 'journal-files', K_JPEND = 'hm.jpend.v1', jUrl = {}, jBusy = false, MAXPH = 4;
  function jKey(path) { return new Request(new URL('__j/' + path, location.href.split('#')[0]).href); }
  function jGet(path) { if (!('caches' in window)) return Promise.resolve(null); return caches.open(JCACHE).then(function (c) { return c.match(jKey(path)); }).then(function (r) { return r ? r.blob() : null; }).catch(function () { return null; }); }
  function jPut(path, blob) { if (!('caches' in window)) return Promise.resolve(); return caches.open(JCACHE).then(function (c) { return c.put(jKey(path), new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } })); }).catch(function () {}); }
  function jPend() { try { return JSON.parse(localStorage.getItem(K_JPEND) || '[]'); } catch (e) { return []; } }
  function jPendSet(l) { try { localStorage.setItem(K_JPEND, JSON.stringify(l)); } catch (e) {} }
  function jFlush() {
    if (jBusy || !navigator.onLine || Store.status.mode !== 'ready') return;
    var l = jPend(); if (!l.length) return; jBusy = true;
    l.reduce(function (pr, p) {
      return pr.then(function () { return jGet(p).then(function (b) { if (!b) { jPendSet(jPend().filter(function (x) { return x !== p; })); return; } return Store.fileUp(p, b, 'image/jpeg').then(function () { jPendSet(jPend().filter(function (x) { return x !== p; })); }); }); });
    }, Promise.resolve()).then(function () { jBusy = false; }, function () { jBusy = false; });
  }
  function jImg(path) {
    if (jUrl[path]) return Promise.resolve(jUrl[path]);
    return jGet(path).then(function (b) {
      if (b) return b;
      if (navigator.onLine && Store.canFiles() && Store.status.mode !== 'demo') return Store.fileGet(path).then(function (bb) { jPut(path, bb); return bb; }, function () { return null; });
      return null;
    }).then(function (b) { if (!b) return null; jUrl[path] = URL.createObjectURL(b); return jUrl[path]; });
  }
  function jHydrate(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('img[data-jpath]:not([src])'), function (img) {
      var p = img.dataset.jpath, alt = img.dataset.jalt;
      jImg(p).then(function (u) { if (u) return u; return alt ? jImg(alt) : null; }).then(function (u) { if (u) img.src = u; else img.classList.add('miss'); });
    });
  }
  function jId(date, em) { return date + '_' + lid(em); }
  function jFor(date) { return S.journal.filter(function (j) { return j.date === date; }); }
  function jMine(date) { return S.journal.filter(function (j) { return j.id === jId(date, myId()); })[0] || null; }
  function jHas(j) { return !!(j && ((j.text || '').trim() || (j.photos && j.photos.length))); }
  function tripDayN(date) { var m = S.meta || {}; return m.depart ? Math.round((pd(date) - pd(m.depart)) / 86400000) + 1 : null; }
  function jCanWrite(date) { var m = S.meta || {}, t = ymd(today()); return !!(m.depart && m.ret && date >= m.depart && date <= m.ret && date <= t); }
  function jEntryHtml(j, date) {
    var ph = (j && j.photos) || [];
    return '<div class="jent"><div class="jwho">' + esc(whoShort(j.by)) + '</div>' + (j.text ? '<div class="jtxt">' + esc(j.text) + '</div>' : '') +
      (ph.length ? '<div class="jph">' + ph.map(function (p, i) { return '<button type="button" class="jth" data-jview="' + esc(date) + '|' + esc(j.id) + '|' + i + '" aria-label="사진 크게 보기"><img data-jpath="' + esc(p.t || p.p) + '" data-jalt="' + esc(p.p) + '" alt=""></button>'; }).join('') + '</div>' : '') + '</div>';
  }
  function jDayBlock(date) {
    if (!jCanWrite(date)) return '';
    var l = jFor(date).filter(jHas), mine = jMine(date);
    return '<div class="jday"><div class="jhd">📔 우리 기록</div>' + l.map(function (j) { return jEntryHtml(j, date); }).join('') +
      (canEdit() ? '<div class="acts"><button type="button" class="btn small-btn" data-jot="' + esc(date) + '">' + (jHas(mine) ? '✏️ 내 기록 고치기' : '＋ 이 날 한 줄 남기기') + '</button></div>' : '') + '</div>';
  }
  function jEditHtml() {
    var date = ov.date, j = jMine(date) || {}, n = tripDayN(date), d = S.days.filter(function (x) { return x.date === date; })[0];
    var other = jFor(date).filter(function (x) { return x.id !== jId(date, myId()) && jHas(x); });
    var cur = ov.ph || [];
    return '<div class="ov sos jed" role="dialog" aria-modal="true" aria-label="하루 기록">' +
      '<div class="ovbar"><div><b>📔 ' + esc(md(date)) + ' 기록</b><div class="small">' + (n ? n + '일째 · ' : '') + esc(d ? d.city : '') + '</div></div><button type="button" class="ovx" data-ovclose aria-label="닫기">✕</button></div>' +
      '<form class="sosb" id="jf">' + other.map(function (x) { return jEntryHtml(x, date); }).join('') +
      '<label for="jt">오늘 한 줄</label><textarea class="inp" id="jt" rows="3" maxlength="200" placeholder="오늘 가장 좋았던 순간, 웃겼던 일, 맛있던 것">' + esc(ov.text != null ? ov.text : (j.text || '')) + '</textarea>' +
      '<label>사진 (최대 ' + MAXPH + '장)</label><div class="jph jedit">' + cur.map(function (p, i) {
        return '<span class="jth"><img ' + (p.url ? 'src="' + esc(p.url) + '"' : 'data-jpath="' + esc(p.t || p.p) + '" data-jalt="' + esc(p.p) + '"') + ' alt=""><button type="button" class="jx" data-jrm="' + i + '" aria-label="이 사진 빼기">✕</button></span>';
      }).join('') + (cur.length < MAXPH ? '<label class="jth jadd" for="jph">＋<input type="file" id="jph" accept="image/*" multiple hidden></label>' : '') + '</div>' +
      '<p class="small" id="jprog" aria-live="polite">' + (navigator.onLine ? '' : '인터넷이 없어도 저장돼요. 사진은 연결되면 올라가요.') + '</p>' +
      '<div class="acts"><button class="btn fill" type="submit">저장</button><button class="btn" type="button" data-ovclose>닫기</button></div></form></div>';
  }
  function openJot(date) {
    if (!canEdit()) { toast('로그인하면 기록을 남길 수 있어요.'); return; }
    var j = jMine(date);
    ov = { t: 'jedit', date: date, ph: ((j && j.photos) || []).map(function (p) { return { p: p.p, t: p.t }; }), text: null, removed: [] };
    renderOv();
  }
  function scaleJpeg(src, max, q) {
    var s = Math.min(1, max / Math.max(src.width, src.height)), cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(src.width * s)); cv.height = Math.max(1, Math.round(src.height * s));
    cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
    return toBlob(cv, 'image/jpeg', q).then(function (b) { cv.width = cv.height = 0; return b; });
  }
  function decodeImg(file) {
    if (window.createImageBitmap) return createImageBitmap(file).catch(function () { return viaImg(file); });
    return viaImg(file);
  }
  function viaImg(file) { return new Promise(function (res, rej) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('사진을 읽지 못했어요.')); }; im.src = u; }); }
  function jAddFiles(files) {
    var room = MAXPH - ov.ph.length, list = Array.prototype.slice.call(files || []).slice(0, Math.max(0, room));
    if (!list.length) { toast('사진은 하루 ' + MAXPH + '장까지예요.'); return; }
    var pr = $('jprog'); if (pr) pr.textContent = '사진 준비 중…';
    var t = $('jt'); if (t) ov.text = t.value;
    list.reduce(function (p, f) {
      return p.then(function () { return decodeImg(f).then(function (bm) { return Promise.all([scaleJpeg(bm, 1600, 0.82), scaleJpeg(bm, 480, 0.72)]); }).then(function (r) { ov.ph.push({ blob: r[0], tblob: r[1], url: URL.createObjectURL(r[1]) }); }); });
    }, Promise.resolve()).then(function () { renderOv(); }, function (e) { toast((e && e.message) || '사진을 읽지 못했어요.'); renderOv(); });
  }
  function jSave() {
    var date = ov.date, id = jId(date, myId()), text = ($('jt').value || '').trim(), ph = ov.ph, removed = ov.removed || [];
    var btn = document.querySelector('#jf [type=submit]'); if (btn) btn.disabled = true;
    var out = [], pend = jPend();
    var chain = ph.reduce(function (pr, x) {
      return pr.then(function () {
        if (!x.blob) { out.push({ p: x.p, t: x.t }); return; }
        var base = 'j/' + date + '/' + lid(myId()) + '-' + Store.newId(), p = base + '.jpg', tp = base + '_t.jpg';
        out.push({ p: p, t: tp });
        return Promise.all([jPut(p, x.blob), jPut(tp, x.tblob)]).then(function () {
          if (navigator.onLine && Store.status.mode === 'ready') return Store.fileUp(tp, x.tblob, 'image/jpeg').then(function () { return Store.fileUp(p, x.blob, 'image/jpeg'); }).catch(function () { pend.push(tp, p); });
          if (Store.status.mode !== 'demo') pend.push(tp, p);
        });
      });
    }, Promise.resolve());
    chain.then(function () {
      jPendSet(pend);
      var prev = jMine(date), data = { date: date, by: myId(), text: text, photos: out, at: (prev && prev.at) || nowIso() };
      if (prev) data.editedAt = nowIso();
      Store.set('journal', id, data);
      if (removed.length && navigator.onLine && Store.status.mode === 'ready') Store.fileDel(removed).catch(function () {});
      ph.forEach(function (x) { if (x.url) URL.revokeObjectURL(x.url); });
      ov = null; renderOv(); toast(savedMsg('기록했어요.')); render(); jFlush();
    }, function (e) { if (btn) btn.disabled = false; toast('저장하지 못했어요: ' + ((e && e.message) || '오류')); });
  }
  function albumView() {
    var m = S.meta || {}, t = ymd(today()), h = '<button type="button" class="back" data-go="home">‹ 홈</button><h2 style="margin-top:6px"><span class="em">📔</span>우리 기록</h2>';
    var ds = S.days.slice().sort(byOrder).filter(function (d) { return d.date <= t && (!m.ret || d.date <= m.ret); });
    var all = S.journal.filter(jHas), nPh = all.reduce(function (s, j) { return s + ((j.photos || []).length); }, 0), nDays = ds.filter(function (d) { return jFor(d.date).some(jHas); }).length;
    if (!m.depart || t < m.depart) {
      h += '<div class="empty">여행이 시작되면 하루에 한 줄과 사진 몇 장을 각자 남겨요. 여행 중엔 밤 10시에 아직 안 남겼으면 알려 드리고, 다녀와서는 여기가 둘만의 앨범이 돼요.</div>';
      $('v-album').innerHTML = h; return;
    }
    h += '<p class="hint">' + ds.length + '일 중 ' + nDays + '일 기록 · 사진 ' + nPh + '장' + (window.print ? ' · <button type="button" class="linkbtn" id="aprint">인쇄·PDF로 저장</button>' : '') + '</p>';
    h += '<div class="album">' + ds.map(function (d) {
      var l = jFor(d.date).filter(jHas), n = tripDayN(d.date), dd = pd(d.date);
      return '<article class="aday"><div class="ahd"><span class="dbadge"><span class="m">' + (dd.getMonth() + 1) + '월</span><span class="dd">' + dd.getDate() + '</span><span class="w">' + DOW[dd.getDay()] + '</span></span><div><b class="disp">' + esc(d.city) + '</b><div class="small">' + (n ? n + '일째 · ' : '') + esc(d.headline || '') + '</div></div>' +
        (l.some(function (j) { return (j.photos || []).length; }) && navigator.share ? '<button type="button" class="ico" data-jshare="' + esc(d.date) + '" aria-label="이 날 사진 저장·공유">⤴︎</button>' : '') + '</div>' +
        (l.length ? l.map(function (j) { return jEntryHtml(j, d.date); }).join('') : '<p class="small">아직 기록이 없어요.</p>') +
        (canEdit() ? '<div class="acts noprint"><button type="button" class="btn small-btn" data-jot="' + esc(d.date) + '">' + (jHas(jMine(d.date)) ? '✏️ 내 기록 고치기' : '＋ 한 줄 남기기') + '</button></div>' : '') + '</article>';
    }).reverse().join('') + '</div>';
    $('v-album').innerHTML = h;
  }
  function jPhotos(date) {
    var out = [];
    jFor(date).filter(jHas).forEach(function (j) { (j.photos || []).forEach(function (p) { out.push({ p: p.p, t: p.t, by: j.by, date: date, jid: j.id }); }); });
    return out;
  }
  function photoHtml() {
    var l = jPhotos(ov.date), i = Math.max(0, Math.min(ov.i || 0, l.length - 1)), x = l[i]; if (!x) return '';
    return '<div class="ov viewer pv" role="dialog" aria-modal="true" aria-label="사진">' +
      '<div class="ovbar"><div><b>' + esc(md(x.date)) + ' · ' + esc(whoShort(x.by)) + '</b><div class="small">' + (i + 1) + ' / ' + l.length + '</div></div><button type="button" class="ovx" data-ovclose aria-label="닫기">✕</button></div>' +
      '<div class="ovbody pvb"><img data-jpath="' + esc(x.p) + '" data-jalt="' + esc(x.t) + '" alt="사진"></div>' +
      '<div class="ovfoot">' + (l.length > 1 ? '<button type="button" class="btn small-btn" data-pnav="-1"' + (i === 0 ? ' disabled' : '') + '>‹ 이전</button>' : '') +
      (navigator.share ? '<button type="button" class="btn small-btn" data-pshare>저장·공유</button>' : '<span class="small">사진을 길게 누르면 저장돼요</span>') +
      (l.length > 1 ? '<button type="button" class="btn small-btn" data-pnav="1"' + (i === l.length - 1 ? ' disabled' : '') + '>다음 ›</button>' : '') + '</div></div>';
  }
  function shareFiles(items, title) {
    return Promise.all(items.map(function (x, k) { return jImg(x.p).then(function (u) { return u ? fetch(u).then(function (r) { return r.blob(); }) : null; }).then(function (b) { return b ? new File([b], (x.date || 'photo') + '-' + (k + 1) + '.jpg', { type: 'image/jpeg' }) : null; }); }))
      .then(function (fs) {
        fs = fs.filter(Boolean); if (!fs.length) { toast('사진을 아직 받지 못했어요.'); return; }
        if (navigator.canShare && !navigator.canShare({ files: fs })) { toast('이 폰에서는 사진 공유를 할 수 없어요. 길게 눌러 저장해 주세요.'); return; }
        return navigator.share({ files: fs, title: title || '우리 신혼여행' });
      }).catch(function (e) { if (e && e.name !== 'AbortError') toast('공유하지 못했어요.'); });
  }
  /* ---------- 결혼식 탭 (11/21까지, 지나면 자동 정리) ---------- */
  var WSEC = [['sum', '한눈에'], ['todo', '할 일'], ['day', '당일'], ['order', '식순'], ['words', '서약·선언'], ['venue', '엘블레스'], ['src', '출처']];
  var wSec = 'sum', wArea = '', wMc = 'friend', wCleaned = false;
  function realYmd() { var d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate())); }
  function wInfo(id) { return Store.get('wd_info', id); }
  function wMeta() { return wInfo('meta'); }
  function wOn() { var m = wMeta(); return !!(m && realYmd() <= (m.until || m.date)); }
  function wLeft(s) { return Math.round((pd(s) - pd(realYmd())) / 86400000); }
  function wD(s) { var n = wLeft(s); return n > 0 ? 'D-' + n : n === 0 ? 'D-DAY' : '지남'; }
  function wList(kind) { return S.wdc.filter(function (x) { return x.kind === kind; }).sort(byOrder); }
  function wNote(id, cls) { var n = wInfo('notes'), t = n && n.map ? n.map[id] : ''; return t ? '<p class="wnote' + (cls ? ' ' + cls : '') + '">' + esc(t) + '</p>' : ''; }
  function wNoteTxt(id) { var n = wInfo('notes'); return (n && n.map && n.map[id]) || ''; }
  function wRows(id) { var x = wInfo(id); return (x && x.rows) || []; }
  function wTab() {
    var on = wOn(), b = document.querySelector('nav.tabs [data-v=wed]');
    if (b) b.hidden = !on;
    if (!on && view === 'wed') { view = 'home'; VIEWS.forEach(function (k) { $('v-' + k).hidden = (k !== 'home'); }); }
    wCleanup();
  }
  function wCleanup() {
    if (wCleaned || !loaded || !canEdit() || !navigator.onLine) return;
    var m = wMeta(); if (!m || realYmd() <= (m.until || m.date)) return;
    wCleaned = true;
    S.wdc.forEach(function (x) { Store.remove('wd_check', x.id); });
    Store.list('wd_info').filter(function (x) { return x.id !== 'meta'; }).forEach(function (x) { Store.remove('wd_info', x.id); });
    Store.remove('wd_info', 'meta');
  }
  function wNext() {
    var t = realYmd(), l = wList('due').filter(function (x) { return !x.done && x.due >= t; });
    if (!l.length) return null;
    var same = l.filter(function (x) { return x.due === l[0].due; });
    return { due: l[0].due, when: l[0].when, txt: same.length > 1 ? l[0].short + ' 외 ' + (same.length - 1) + '건' : l[0].short };
  }
  function wedHome() {
    if (!wOn()) return '';
    var m = wMeta(), nx = wNext(), pl = wList('plan'), dn = pl.filter(function (x) { return x.done; }).length;
    return '<button type="button" class="card wed-home" data-go="wed"><span class="wh-ring">💍</span><span class="wh-t"><b class="disp">결혼식 ' + esc(wD(m.date)) + '</b><span class="small">' +
      (nx ? '다음 마감 ' + esc(nx.when) + ' ' + esc(nx.txt) + ' · ' : '') + '할 일 ' + dn + '/' + pl.length + '</span></span><span class="go">›</span></button>';
  }
  function wChk(x, text, meta) {
    var who = x.done ? (x.doneBy ? whoName(x.doneBy) + ' 체크' : '완료') : '';
    return '<div class="task wtask' + (x.done ? ' done' : '') + '"><button class="chk" role="checkbox" aria-checked="' + (x.done ? 'true' : 'false') + '" aria-label="' + esc(text) + '" data-wchk="' + esc(x.id) + '"' + (canEdit() ? '' : ' disabled') + '></button>' +
      '<div class="wt">' + esc(text) + '</div>' + ((meta || who) ? '<div class="tm">' + (meta || '') + (who ? '<span class="who">' + esc(who) + '</span>' : '') + '</div>' : '') + '</div>';
  }
  function wToggle(id) {
    var x = S.wdc.filter(function (y) { return y.id === id; })[0]; if (!x) return;
    var on = !x.done;
    Store.update('wd_check', id, on ? { done: true, doneBy: myId(), doneAt: nowIso() } : { done: false, doneBy: null, doneAt: null });
  }
  function wSegs() {
    return '<div class="wsegs" role="tablist" aria-label="결혼식 영역">' + WSEC.map(function (s) { return '<button type="button" role="tab" data-wsec="' + s[0] + '" aria-selected="' + (wSec === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>';
  }
  function wDue(x) {
    var n = wLeft(x.due), cls = n < 0 ? 'late' : n <= 7 ? 'soon' : '';
    return wChk(x, x.text, '<span class="due ' + cls + '">' + esc(x.when) + ' · ' + esc(wD(x.due)) + '</span><span class="chip ' + (x.req === '필수' ? 'ora' : 'mute') + '">' + esc(x.req) + '</span>' + (x.tip ? '<span class="wtip">' + esc(x.tip) + '</span>' : '') + '<span class="wrule">' + esc(x.rule) + '</span>');
  }
  function wPlanItem(x, showWhen) {
    var late = !x.done && x.end < realYmd();
    return wChk(x, x.text, (showWhen ? '<span class="due' + (late ? ' late' : '') + '">' + esc(x.when) + (late ? ' (지남)' : '') + '</span>' : (late ? '<span class="due late">지남</span>' : '')) + '<span>' + esc(x.area) + '</span>');
  }
  function wSum() {
    var m = wMeta(), nx = wNext(), pl = wList('plan'), dn = pl.filter(function (x) { return x.done; }).length, t = realYmd();
    var end = ymd(new Date(pd(t).getTime() + 6 * 86400000));
    var wk = pl.filter(function (x) { return !x.done && x.start <= end; });
    var h = '<div class="wtiles"><div class="card wtile"><span class="small">결혼식까지</span><b class="big">' + esc(wD(m.date)) + '</b><span class="small">' + esc(md(m.date)) + ' ' + esc(m.time || '') + ' · ' + esc(m.venue || '') + '</span></div>' +
      '<div class="card wtile"><span class="small">다음 마감</span><b class="big">' + (nx ? esc(wD(nx.due)) : '—') + '</b><span class="small">' + (nx ? esc(nx.when) + ' ' + esc(nx.txt) : '남은 마감 없음') + '</span></div>' +
      '<div class="card wtile"><span class="small">끝낸 일</span><b class="big">' + dn + '<small> / ' + pl.length + '</small></b><span class="small">날짜별 할 일 전체</span></div></div>';
    h += '<h3 class="wh3">이번 주 할 일</h3>' + (wk.length ? '<div class="card">' + wk.map(function (x) { return wPlanItem(x, true); }).join('') + '</div>' : '<div class="empty">이번 주에 걸린 일이 없어요.</div>');
    h += '<h3 class="wh3">꼭 지킬 마감</h3>' + wNote('n_due') + '<div class="card">' + wList('due').map(wDue).join('') + '</div>';
    return h;
  }
  function wTodo() {
    var pl = wList('plan'), areas = [];
    pl.forEach(function (x) { if (areas.indexOf(x.area) < 0) areas.push(x.area); });
    var h = wNote('n_plan') + '<div class="wchips">' + [''].concat(areas).map(function (a) {
      var rs = a ? pl.filter(function (x) { return x.area === a; }) : pl, dn = rs.filter(function (x) { return x.done; }).length;
      return '<button type="button" class="wdchip" data-warea="' + esc(a) + '" aria-pressed="' + (wArea === a) + '">' + esc(a || '전체') + ' <span>' + dn + '/' + rs.length + '</span></button>';
    }).join('') + '</div>';
    var t = realYmd(), cur = '', buf = [];
    function flush(f) { if (buf.length) { h += '<div class="card wphase' + (f && f.start <= t && f.end >= t ? ' now' : '') + '"><div class="wph"><b>' + esc(f.when) + '</b><span class="small">' + esc(f.dday) + '</span><span>' + esc(f.title) + '</span></div>' + buf.join('') + '</div>'; buf = []; } }
    var last = null;
    pl.filter(function (x) { return !wArea || x.area === wArea; }).forEach(function (x) { if (x.phase !== cur) { flush(last); cur = x.phase; } last = x; buf.push(wPlanItem(x, false)); });
    flush(last);
    return h;
  }
  function wTable(rows, cols, cls) {
    return '<div class="wtbl' + (cls ? ' ' + cls : '') + '">' + rows.map(function (r) { return '<div class="wtr' + (r._c ? ' ' + r._c : '') + '">' + cols.map(function (c) { return '<span class="' + c[1] + '">' + esc(r[c[0]] == null ? '' : r[c[0]]) + '</span>'; }).join('') + '</div>'; }).join('') + '</div>';
  }
  function wDay() {
    var h = '<h3 class="wh3">당일 시각표</h3>' + wNote('n_day') + '<div class="card">' + wTable(wRows('day').map(function (r) { return Object.assign({ _c: r.main ? 'hi' : '' }, r); }), [['time', 'c-t'], ['who', 'c-w'], ['what', 'c-x']], 'wtime') + '</div>' + wNote('n_day2');
    h += '<h3 class="wh3">역할표</h3><div class="card">' + wRows('roles').map(function (r) { return '<div class="wrole"><b>' + esc(r.role) + '</b><span>' + esc(r.who) + '</span><div class="small">' + esc(r.when) + (r.note ? ' · ' + esc(r.note) : '') + '</div></div>'; }).join('') + '</div>';
    h += '<h3 class="wh3">당일 준비물</h3><div class="card">' + wList('pack').map(function (x) { return wChk(x, x.text, ''); }).join('') + '</div>';
    return h;
  }
  function wOrder() {
    var od = wRows('order'), core = od.filter(function (r) { return r.kind === 'main' || r.kind === 'optional' || r.kind === 'slack'; });
    var sum = function (k) { return od.filter(function (r) { return r.kind === k; }).reduce(function (a, r) { return a + (r.sec || 0); }, 0); };
    var lab = function (sec) { var m = Math.floor(sec / 60), s2 = sec % 60; return (m ? m + '분' : '') + (m && s2 ? ' ' : '') + (s2 ? s2 + '초' : ''); };
    var main = sum('main'), opt = sum('optional'), slack = sum('slack'), tot = main + opt + slack;
    var GC = { '사회자': 'g1', '부모님': 'g2', '신랑·신부': 'g3', '축가': 'g4', '여유': 'g5' };
    var h = '<p class="wnote strong">핵심 ' + lab(main) + ' + 편지 ' + lab(opt) + ' + 여유 ' + lab(slack) + ' = ' + lab(tot) + '. 예물 교환은 뺐어요.</p>' + wNote('n_order');
    h += '<div class="card"><div class="wbar" role="img" aria-label="식순 시간 막대">' + core.map(function (r) { return '<span class="' + (GC[r.group] || 'g5') + (r.kind === 'optional' ? ' opt' : '') + '" style="flex:' + r.sec + '" title="' + esc(r.item + ' · ' + r.dur) + '">' + (r.sec >= 240 ? esc(r.short) : '') + '</span>'; }).join('') + '</div>' +
      '<div class="wbar-ax"><span>11:00</span><span>11:10</span><span>11:20</span><span>11:30</span></div>' +
      '<div class="wleg">' + Object.keys(GC).map(function (g) { return '<span><i class="' + GC[g] + '"></i>' + esc(g) + '</span>'; }).join('') + '</div>' +
      wTable(od.filter(function (r) { return r.kind !== 'option'; }).map(function (r) { return Object.assign({ _c: (r.kind === 'pre' || r.kind === 'slack') ? 'soft' : '' }, r); }), [['start', 'c-t'], ['item', 'c-x'], ['dur', 'c-d']], 'worder') + '</div>';
    h += wNote('n_slack') + wNote('n_roles');
    h += '<h3 class="wh3">더 넣고 싶을 때</h3>' + wNote('n_extra') + '<div class="card">' + wTable(od.filter(function (r) { return r.kind === 'option'; }), [['item', 'c-x'], ['dur', 'c-d']], '') + '</div>';
    h += '<h3 class="wh3">자료별 비교</h3>' + wNote('n_real_order') + wNote('n_compare') + '<div class="card">' + wRows('compare').filter(function (r) { return r.set === 'order'; }).map(function (r) {
      return '<div class="wcmp"><b>' + esc(r.label) + '</b><div>제안: <b>' + esc(r.d) + '</b></div><div class="small">엘블레스 일반: ' + esc(r.a) + ' · 주례 없음: ' + esc(r.b) + '</div><div class="small">인터넷 사례: ' + esc(r.c) + '</div></div>';
    }).join('') + '</div>';
    var mc = wRows('texts').filter(function (r) { return r.set === 'mc'; }), hasF = mc.some(function (r) { return r.friend; }), mode = hasF ? wMc : 'text';
    var mcx = wRows('texts').filter(function (r) { return r.set === 'mcx'; });
    h += '<h3 class="wh3">사회자 멘트</h3>' + wNote('n_mc') + (hasF ? wNote('n_mcf') + '<div class="wsegs wmc" role="tablist" aria-label="멘트 종류"><button type="button" role="tab" data-wmc="friend" aria-selected="' + (mode === 'friend') + '">친구 사회자용</button><button type="button" role="tab" data-wmc="text" aria-selected="' + (mode === 'text') + '">기존 멘트</button></div>' : '') +
      '<div class="card">' + mc.map(function (r) {
        var t = mode === 'friend' ? (r.friend || r.text) : r.text;
        return '<div class="wline"><b>' + esc(r.cue) + '</b><div>' + esc(t) + '</div>' + (mode === 'friend' && r.note ? '<div class="wmemo">📝 ' + esc(r.note) + '</div>' : '') + '</div>';
      }).join('') + '</div>' + (hasF ? wNote('n_mcf_prep', 'strong') : '');
    if (mcx.length) h += '<h3 class="wh3">돌발 상황 멘트</h3>' + wNote('n_mcx') + '<div class="card">' + mcx.map(function (r) { return '<div class="wline"><b>' + esc(r.cue) + '</b><div>' + esc(r.friend || r.text) + '</div>' + (r.note ? '<div class="wmemo">📝 ' + esc(r.note) + '</div>' : '') + '</div>'; }).join('') + '</div>';
    return h;
  }
  function wScript(set, key) {
    return '<div class="card">' + wRows('texts').filter(function (r) { return r.set === set; }).map(function (r) {
      var k = r[key] || ''; return '<div class="wline' + (r.speaker === '함께' ? ' both' : '') + '">' + (k ? '<b>' + esc(k) + '</b>' : '') + '<div>' + esc(r.text) + '</div></div>';
    }).join('') + '</div>';
  }
  function wWords() {
    var cm = wRows('compare');
    var h = '<h3 class="wh3">혼인서약</h3>' + wNote('n_vow_intro');
    h += '<div class="card">' + cm.filter(function (r) { return r.set === 'vow'; }).map(function (r) {
      return '<div class="wcmp' + (r.pick ? ' pick' : '') + '"><b>' + esc(r.label) + '. ' + esc(r.a) + '</b>' + (r.pick ? ' <span class="chip ok">추천</span>' : '') + '<div class="small">' + esc(r.b) + ' · ' + esc(r.c) + '</div><div class="small">좋은 점: ' + esc(r.d) + ' / 아쉬운 점: ' + esc(r.e) + '</div></div>';
    }).join('') + '</div>' + wNote('n_vow_web') + wNote('n_vow_pick', 'strong');
    h += '<h3 class="wh3">낭독용 추천 문안</h3>' + wScript('vow', 'speaker') + wNote('n_vow_read');
    h += '<h3 class="wh3">성혼선언문</h3>' + wNote('n_decl_intro') + wNote('n_real_decl') + '<div class="card">' + cm.filter(function (r) { return r.set === 'decl'; }).map(function (r) {
      return '<div class="wcmp' + (r.pick ? ' pick' : '') + '"><b>' + esc(r.label) + '</b>' + (r.pick ? ' <span class="chip ok">추천</span>' : '') + '<div class="small">' + esc(r.a) + ' · ' + esc(r.b) + '</div><div class="small">' + esc(r.c) + '</div></div>';
    }).join('') + '</div>' + wNote('n_decl_rule') + wNote('n_dad');
    h += '<h3 class="wh3">' + esc(wNoteTxt('t_declA')) + '</h3>' + wScript('declA', 'cue');
    h += '<h3 class="wh3">' + esc(wNoteTxt('t_declB')) + '</h3>' + wNote('n_declB') + wScript('declB', 'speaker');
    h += '<h3 class="wh3">' + esc(wNoteTxt('t_declC')) + '</h3>' + wNote('n_declC') + wScript('declC', 'speaker') + wNote('n_decl_after');
    return h;
  }
  function wVenue() {
    var h = '<h3 class="wh3">엘블레스에 물어볼 것</h3>' + wNote('n_ask') + '<div class="card">' + wList('ask').map(function (x) { return wChk(x, x.text, ''); }).join('') + '</div>';
    h += '<h3 class="wh3">엘블레스 규칙 요약</h3>' + wNote('n_parking') + '<div class="card">' + wRows('rules').map(function (r) { return '<div class="wrole"><b>' + esc(r.topic) + '</b><div>' + esc(r.rule) + '</div></div>'; }).join('') + '</div>';
    return h;
  }
  function wSrc() {
    var h = wNote('n_reviews', 'strong') + wNote('n_search') + '<div class="card">' + wRows('sources').map(function (r) {
      var u = safeUrl(r.url);
      return '<div class="wrole"><span class="small">' + esc(r.kind) + (r.date ? ' · ' + esc(r.date) : '') + '</span><div>' + (u ? '<a target="_blank" rel="noopener" href="' + esc(u) + '">' + esc(r.title) + ' ↗</a>' : esc(r.title)) + '</div><div class="small">' + esc(r.site || '') + (r.used ? ' · ' + esc(r.used) : '') + '</div></div>';
    }).join('') + '</div>';
    var m = wMeta(), du = m && safeUrl(m.dash);
    if (du) h += '<p class="small">PC에서 크게 보려면 <a target="_blank" rel="noopener" href="' + esc(du) + '">claude.ai 대시보드 ↗</a></p>';
    return h;
  }
  function wedView() {
    var h = '<h2 style="margin-top:6px"><span class="em">💍</span>결혼식 준비</h2>';
    if (!wMeta()) { $('v-wed').innerHTML = h + '<div class="empty">' + (loaded ? '결혼식 자료가 없어요.' : '불러오는 중') + '</div>'; return; }
    h += '<p class="hint">11/21이 지나면 이 탭과 자료는 자동으로 정리돼요.</p>' + wSegs();
    h += '<div class="wbody">' + ({ sum: wSum, todo: wTodo, day: wDay, order: wOrder, words: wWords, venue: wVenue, src: wSrc }[wSec] || wSum)() + '</div>';
    $('v-wed').innerHTML = h;
  }

  /* ---------- 대비책 (파업·시위) ---------- */
  var PST = { '예고 없음': 'mute', '지켜보는 중': 'blue', '예고됨': 'ora', '발생': 'ora', '해소': 'ok' };
  function plActive(p) { return p.status === '예고됨' || p.status === '발생'; }
  function plList() { return S.plans.slice().sort(byOrder); }
  function plFor(date) { return plList().filter(function (p) { return p.from && date >= p.from && date <= (p.to || p.from); }); }
  function plRange(p) { if (!p.from) return '여행 전체'; var a = smd(p.from), b = smd(p.to || p.from); return a === b ? md(p.from) : a + '~' + b; }
  function plChip(p) { var st = p.status || '예고 없음'; return '<span class="chip ' + (PST[st] || 'mute') + '">' + esc(st) + '</span>'; }
  function plLast() { return plList().map(function (p) { return p.checkedAt || ''; }).sort().pop() || ''; }
  function safeUrl(u) { return /^https:\/\//.test(String(u || '')) ? String(u) : ''; }
  function plTag(date) {
    var l = plFor(date); if (!l.length) return '';
    var act = l.some(plActive);
    return ' <span class="ptag' + (act ? ' act' : '') + '" title="대비책">🛟' + (act ? ' 주의' : '') + '</span>';
  }
  function plRow(p) {
    return '<button type="button" class="pl-row' + (plActive(p) ? ' act' : '') + '" data-go="plan" data-scroll="pl-' + esc(p.id) + '">' + plChip(p) + '<span>' + esc(p.title) + '</span><span class="go">대비책 ›</span></button>';
  }
  function plDay(date) {
    var l = plFor(date); if (!l.length) return '';
    return '<div class="pl-day"><span class="tp-lab">🛟 대비책</span>' + l.map(plRow).join('') + '</div>';
  }
  function plToday(t) {
    var l = plFor(t); if (!l.length) return '';
    return '<div class="tp-sec"><span class="tp-lab">🛟 오늘의 대비책</span>' + l.map(function (p) {
      return '<div class="pl-item">' + plRow(p) + (plActive(p) && p.plan && p.plan[0] ? '<div class="pl-first">' + esc(p.plan[0]) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function plHome() {
    var ps = plList(); if (!ps.length) return '';
    var m = S.meta || {}, t = ymd(today()); if (m.ret && t > m.ret) return '';
    var act = ps.filter(plActive), watching = ps.filter(function (p) { return p.status === '지켜보는 중'; }).length, last = plLast();
    var h = '<div class="h2row"><h2><span class="em">🛟</span>대비책</h2><button type="button" class="more" data-go="plan">전체 ' + ps.length + '개 ›</button></div>';
    if (act.length) return h + '<div class="card pl-home act">' + act.map(plRow).join('') + '</div>';
    return h + '<button type="button" class="card pl-home" data-go="plan"><b class="disp">우리 날짜에 예고된 파업은 아직 없어요</b><span class="small">' +
      (watching ? '시위 ' + watching + '곳 지켜보는 중 · ' : '') + '구간별로 그때 할 일과 대체 수단을 정리해 뒀어요' + (last ? ' · ' + esc(smd(last)) + ' 확인' : '') + '</span></button>';
  }
  function plCard(p) {
    var act = plActive(p), k = 'pl-' + p.id, open = foldOpen[k] !== undefined ? foldOpen[k] : act;
    var h = '<article class="card plan' + (act ? ' act' : '') + '" id="pl-' + esc(p.id) + '"><div class="row"><span class="small">' + esc(plRange(p)) + (p.city ? ' · ' + esc(p.city) : '') + (p.kind ? ' · ' + esc(p.kind) : '') + '</span>' + plChip(p) + '</div>' +
      '<b class="disp pl-t">' + esc(p.title) + '</b>' + (p.risk ? '<p class="pl-risk">' + esc(p.risk) + '</p>' : '') +
      (p.note ? '<div class="pl-note">' + esc(p.note) + (p.checkedAt ? ' <span class="small">' + esc(smd(p.checkedAt)) + ' 확인</span>' : '') + '</div>' : '') +
      (p.know ? '<div class="small pl-know">🔎 언제 알 수 있나: ' + esc(p.know) + '</div>' : '');
    var steps = (p.plan || []), alt = (p.alt || []);
    if (steps.length || alt.length) h += '<details class="pl-d" data-fold="' + esc(k) + '"' + (open ? ' open' : '') + '><summary>그때 할 일</summary>' +
      (steps.length ? '<ol class="pl-steps">' + steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
      (alt.length ? '<div class="pl-sub">대체 수단</div><ul class="pl-alt">' + alt.map(function (a) { return '<li><b>' + esc(a.t) + '</b>' + (a.d ? ' · ' + esc(a.d) : '') + '</li>'; }).join('') + '</ul>' : '') + '</details>';
    if (p.prep && p.prep.length) h += '<div class="pl-sub">지금 해 둘 것</div><ul class="pl-prep">' + p.prep.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    var ln = (p.links || []).filter(function (l) { return safeUrl(l.u); });
    if (ln.length) h += '<div class="pl-links">' + ln.map(function (l) { return '<a target="_blank" rel="noopener" href="' + esc(safeUrl(l.u)) + '">' + esc(l.t || l.u) + ' ↗</a>'; }).join('') + '</div>';
    return h + '</article>';
  }
  function planView() {
    var ps = plList(), act = ps.filter(plActive), watching = ps.filter(function (p) { return p.status === '지켜보는 중'; }).length, last = plLast();
    var h = '<button type="button" class="back" data-go="home">‹ 홈</button><h2 style="margin-top:6px"><span class="em">🛟</span>대비책</h2>' +
      '<p class="hint">파업·시위가 생기면 구간마다 할 일과 대체 수단을 정리했어요. 매일 아침 점검 때 상태를 고쳐요.</p>';
    if (!ps.length) { $('v-plan').innerHTML = h + '<div class="empty">' + (loaded ? '아직 정리된 대비책이 없어요.' : '불러오는 중') + '</div>'; return; }
    h += '<div class="card pl-sum' + (act.length ? ' act' : '') + '"><b class="disp">' + (act.length ? '예고된 파업·시위 ' + act.length + '건' : '우리 날짜에 예고된 파업은 아직 없어요') + '</b>' +
      '<div class="small">' + ps.length + '개 구간을 확인해요' + (watching ? ' · 시위 ' + watching + '곳 지켜보는 중' : '') + (last ? ' · 마지막 확인 ' + esc(smd(last)) : '') + '</div>' +
      (act.length ? act.map(plRow).join('') : '') + '</div>';
    h += ps.map(plCard).join('');
    h += '<details class="fold"' + foldAttr('plbasic') + '><summary>🧭 어디서든 통하는 기본</summary><div class="pl-basic">' +
      '<div class="pl-sub">시위 현장을 마주치면</div><ul><li>사진 찍지 말고 바로 다른 길로 벗어나요</li><li>경찰 저지선 쪽으로 가지 않아요</li><li>지하철역이 닫히면 한 정거장 걸어서 다음 역으로</li></ul>' +
      '<div class="pl-sub">비행기가 결항·지연되면 (EU 규정)</div><ul><li>결항: 다른 항공편이나 환불 중 고를 수 있어요</li><li>2시간 넘게 늦으면 식사, 하룻밤 넘기면 숙소를 받아요</li><li>항공사 직원 파업이 원인이면 보상금도 청구할 수 있어요 (1,500km 이하 1인 €250). 관제 파업은 보상 대상이 아니에요</li></ul>' +
      '<div class="pl-sub">기차가 파업하면</div><ul><li>Renfe·CP는 파업으로 취소된 표를 환불하거나 다른 열차로 바꿔 줘요</li><li>최소 운행 열차 목록은 보통 하루이틀 전에 나와요. 내 열차가 남는지 확인해요</li></ul>' +
      '<div class="acts"><button type="button" class="btn" data-ov="sos">🆘 비상 연락처</button></div></div></details>';
    $('v-plan').innerHTML = h;
  }

  function route(h) {
    if (h === 'jot') {
      var t = ymd(today());
      if (jCanWrite(t)) { go('home'); openJot(t); } else go('album');
      return true;
    }
    if (VIEWS.indexOf(h) >= 0) { if (h !== view) go(h); return true; }
    return false;
  }

  /* ---------- 설정 ---------- */
  var DEFPREFS = { brief: true, tasks: true, claude: true, trip: true, journal: true, plan: true };
  function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function u8(b64) { var s = b64.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var r = atob(s), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
  function pushRefresh() {
    if (Store.status.mode === 'demo') { pushInfo = { state: 'demo' }; settingsPush(); return; }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { pushInfo = { state: isIOS() && !isStandalone() ? 'need-install' : 'unsupported' }; settingsPush(); return; }
    if (Notification.permission === 'denied') { pushInfo = { state: 'denied' }; settingsPush(); return; }
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
      if (!sub) { pushInfo = { state: 'off' }; settingsPush(); return; }
      return Store.pushGet(sub.endpoint).then(function (row) { pushInfo = row ? { state: 'on', prefs: row.prefs || DEFPREFS, endpoint: sub.endpoint } : { state: 'off', endpoint: sub.endpoint }; settingsPush(); });
    }).catch(function () { pushInfo = { state: 'off' }; settingsPush(); });
  }
  function pushBoxHtml() {
    var s = pushInfo.state;
    if (!s) return '<p class="small">확인하는 중…</p>';
    if (s === 'demo') return '<p class="small">데모 모드에서는 알림을 쓸 수 없어요.</p>';
    if (s === 'need-install') return '<p class="small">아이폰은 <b>홈 화면에 추가한 아이콘</b>으로 열어야 알림을 켤 수 있어요. Safari 공유 버튼 → 홈 화면에 추가 → 그 아이콘으로 열고 여기서 켜 주세요.</p>';
    if (s === 'unsupported') return '<p class="small">이 기기·브라우저는 알림을 지원하지 않아요.</p>';
    if (s === 'denied') return '<p class="small">알림이 꺼져 있어요. 아이폰 설정 → 알림 → 신혼여행에서 허용한 뒤 다시 열어 주세요.</p>';
    if (s === 'off') return '<p class="small">브리핑, 할 일 마감, Claude 반영 소식, 여행 중 출발 알림을 이 폰으로 받아요. 두 사람 각자 켜야 해요.</p><div class="acts"><button type="button" class="btn fill" id="pushOn">🔔 이 폰에서 알림 켜기</button></div>';
    var p = pushInfo.prefs || DEFPREFS;
    return '<p class="small" style="color:var(--oliva)">✓ 이 폰에서 알림을 받고 있어요.</p>' +
      [['brief', '아침 브리핑 (매일 7시 50분쯤)'], ['tasks', '할 일 마감 하루 전·당일 아침 9시, 출발 전 짐 체크'], ['claude', 'Claude가 요청을 반영했을 때, 새 변경 제안'], ['trip', '여행 중: 전날 밤 9시 내일 일정, 비행·기차 3시간 전'], ['journal', '여행 중 밤 10시: 그날 기록을 아직 안 남겼을 때'], ['plan', '대비책: 우리 날짜에 파업·시위가 새로 예고됐을 때']].map(function (k) {
        return '<label class="chkrow"><input type="checkbox" data-pp="' + k[0] + '"' + (p[k[0]] !== false ? ' checked' : '') + '> ' + k[1] + '</label>';
      }).join('') + '<div class="acts"><button type="button" class="btn small-btn" id="pushTest">테스트 알림 보내기</button><button type="button" class="btn small-btn del" id="pushOff">이 폰 알림 끄기</button></div>';
  }
  function settingsPush() { var b = $('pushBox'); if (b) b.innerHTML = pushBoxHtml(); }
  function pushEnable(btn) {
    var key = (window.HM_CONFIG || {}).vapid; if (!key) { toast('알림 키가 설정되지 않았어요.'); return; }
    btn.disabled = true;
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { pushInfo = { state: perm === 'denied' ? 'denied' : 'off' }; settingsPush(); return; }
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(key) }); });
      }).then(function (sub) {
        var j = sub.toJSON(), prefs = pushInfo.prefs || DEFPREFS;
        return Store.pushSave({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, prefs).then(function () {
          pushInfo = { state: 'on', prefs: prefs, endpoint: j.endpoint }; settingsPush(); toast('알림을 켰어요. 테스트 알림으로 확인해 보세요.');
        });
      });
    }).catch(function (e) { btn.disabled = false; toast('알림을 켜지 못했어요: ' + ((e && e.message) || '오류')); });
  }
  function pushOff() {
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
      if (!sub) return; var ep = sub.endpoint; return sub.unsubscribe().then(function () { return Store.pushDel(ep); });
    }).then(function () { pushInfo = { state: 'off' }; settingsPush(); toast('이 폰의 알림을 껐어요.'); }, function (e) { toast('끄지 못했어요: ' + ((e && e.message) || '오류')); });
  }
  function settings() {
    var me = Store.me(), m = S.meta || {}, h = '<button type="button" class="back" data-go="home">‹ 홈</button><h2><span class="em">⚙️</span>설정</h2>';
    h += '<div class="card"><b class="disp">🔔 알림</b><div id="pushBox">' + pushBoxHtml() + '</div></div>';
    h += '<div class="card" id="calCard"><b class="disp">🗓️ 아이폰 캘린더</b><div id="calBox">' + calBoxHtml() + '</div></div>';
    h += '<div class="card"><b class="disp">📴 인터넷 없이 보기</b><div class="small">일정·할 일·지도 목록은 마지막으로 받은 내용이 이 폰에 저장돼요. 지갑 파일은 아래 상태를 확인하세요.</div><div id="setWst">' + walletStatusHtml() + '</div>' +
      '<div class="acts"><button type="button" class="btn small-btn" id="wresync">지갑 파일 다시 받기</button></div></div>';
    var opts = '', d = pd(m.depart), r = pd(m.ret);
    if (d && r) for (var x = new Date(d); x <= r; x.setDate(x.getDate() + 1)) { var v = ymd(x); opts += '<option value="' + v + '"' + (PREVIEW === v ? ' selected' : '') + '>' + md(v) + '</option>'; }
    h += '<div class="card"><b class="disp">🗓️ 여행 중 화면 미리 보기</b><div class="small">날짜를 고르면 그날이 된 것처럼 홈의 \'오늘\' 화면과 지갑이 보여요. 이 폰에만 적용돼요.</div>' +
      '<select class="inp" id="pvd" style="margin-top:8px" aria-label="미리 볼 날짜"><option value="">끄기 (진짜 오늘)</option>' + opts + '</select></div>';
    h += '<div class="card"><b class="disp">👤 계정</b><div class="small" style="margin-top:4px">' + (Store.status.mode === 'demo' ? '데모 모드: 바꾼 내용은 이 기기에만 저장돼요.' : (me && me.email ? esc(me.name || me.email) + ' (' + esc(me.email) + ') · <button class="linkbtn" id="logout" type="button">로그아웃</button>' : '')) + '</div></div>';
    $('v-settings').innerHTML = h;
    pushRefresh(); calLoad();
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
    pull(); header(); wTab();
    if (view === 'home') home(); else if (view === 'days') days(); else if (view === 'map') mapView(); else if (view === 'wallet') wallet(); else if (view === 'discover') discover(); else if (view === 'tasks') tasks(); else if (view === 'pack') packView(); else if (view === 'talk') talkView(); else if (view === 'album') albumView(); else if (view === 'plan') planView(); else if (view === 'wed') wedView(); else settings();
    jHydrate(document.getElementById('v-' + view));
    var sig = S.files.map(function (f) { return (f.pages || []).join(','); }).join('|'); if (sig !== wState.sig) walletSync();
  }
  function busy() { return !!(editing || bkEdit || dayEdit || taskEdit || upOpen || expEdit || packEdit || (ov && (ov.t === 'sosEdit' || ov.t === 'jedit'))); }
  function go(v) {
    view = v; VIEWS.forEach(function (k) { $('v-' + k).hidden = (k !== v); });
    var hl = TABS.indexOf(v) >= 0 ? v : (['tasks', 'pack', 'talk', 'album', 'plan'].indexOf(v) >= 0 ? 'home' : '');
    Array.prototype.forEach.call(document.querySelectorAll('nav.tabs button'), function (b) { if (b.dataset.v === hl) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
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
    var ck = el.closest('.chk[data-tid]');
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
    /* 이동 */
    var gg = el.closest('[data-go]'); if (gg) { go(gg.dataset.go); var sc = gg.dataset.scroll && $(gg.dataset.scroll); if (sc) { var dt = sc.querySelector('details.pl-d'); if (dt) { dt.open = true; foldOpen[dt.dataset.fold] = true; } sc.scrollIntoView({ block: 'start' }); } return; }
    if (el.closest('#gear')) { go('settings'); return; }
    /* 겹쳐 뜨는 화면 */
    if (el.closest('[data-ovclose]')) { ov = null; renderOv(); return; }
    var oo = el.closest('[data-ov]'); if (oo) { ov = { t: oo.dataset.ov }; renderOv(); return; }
    var dv = el.closest('[data-driver]'); if (dv) { ov = { t: 'driver', cid: dv.dataset.driver }; renderOv(); return; }
    /* 지갑 */
    var ws = el.closest('[data-wseg]'); if (ws) { walletSeg = ws.dataset.wseg; expEdit = null; wallet(); return; }
    var wa = el.closest('[data-wadd]');
    if (wa) {
      if (!canEdit()) { toast('로그인하면 파일을 올릴 수 있어요.'); return; }
      upOpen = { booking: wa.dataset.wadd || '' }; walletSeg = 'tix'; bkEdit = null; ov = null; renderOv();
      if (view !== 'wallet') go('wallet'); else wallet();
      var uf = $('wupf'); if (uf) uf.scrollIntoView({ block: 'start', behavior: 'smooth' }); return;
    }
    if (el.closest('#wupc')) { upOpen = null; wallet(); return; }
    var wo = el.closest('[data-wopen]'); if (wo) { ov = { t: 'viewer', id: wo.dataset.wopen }; renderOv(); return; }
    var wd = el.closest('[data-wdel]');
    if (wd) { if (!wd.dataset.sure) { wd.dataset.sure = '1'; wd.textContent = '한 번 더 누르면 삭제'; return; } delFile(wd.dataset.wdel); return; }
    var wg = el.closest('[data-worig]');
    if (wg) {
      if (!navigator.onLine) { toast('원본은 인터넷이 연결됐을 때 열 수 있어요.'); return; }
      var f0 = S.files.filter(function (x) { return x.id === wg.dataset.worig; })[0]; if (!f0 || !f0.orig) return;
      var win = window.open('', '_blank');
      Store.fileLink(f0.orig, 600).then(function (u) { if (win) win.location = u; else location.href = u; }, function () { if (win) win.close(); toast('원본을 열지 못했어요.'); });
      return;
    }
    if (el.closest('#wresync')) { wState.sig = ''; walletSync(true); toast('지갑 파일을 다시 확인해요.'); return; }
    /* 경비 */
    if (el.closest('#exadd')) { expEdit = 'new'; wallet(); var ef = $('expf'); if (ef) { ef.scrollIntoView({ block: 'start' }); $('exa').focus(); } return; }
    if (el.closest('#excancel')) { expEdit = null; wallet(); return; }
    var xd = el.closest('#exdel');
    if (xd) { if (!xd.dataset.sure) { xd.dataset.sure = '1'; xd.textContent = '한 번 더 누르면 삭제'; return; } Store.remove('expenses', expEdit); expEdit = null; toast(savedMsg('지웠어요.')); render(); return; }
    var xr = el.closest('[data-exp]'); if (xr) { if (!canEdit()) return; expEdit = xr.dataset.exp; wallet(); var ef2 = $('expf'); if (ef2) ef2.scrollIntoView({ block: 'start' }); return; }
    /* 발견 */
    var dsg = el.closest('[data-dseg]'); if (dsg) { discTab = dsg.dataset.dseg; discover(); return; }
    var dct = el.closest('[data-dcity]'); if (dct) { discCity = dct.dataset.dcity; discover(); return; }
    if (el.closest('[data-dfav]')) { discFav = !discFav; discover(); return; }
    var fv = el.closest('[data-fav]'); if (fv) { toggleFav(fv.dataset.fav); return; }
    var pl = el.closest('[data-plan]'); if (pl) { askPlan(pl.dataset.plan); return; }
    /* 짐 */
    var pw = el.closest('[data-pwho]'); if (pw) { packWho = pw.dataset.pwho; packEdit = null; packView(); return; }
    var wc = el.closest('[data-wchk]'); if (wc && !wc.disabled) { wToggle(wc.dataset.wchk); return; }
    var ws = el.closest('[data-wsec]'); if (ws) { wSec = ws.dataset.wsec; wedView(); window.scrollTo(0, 0); return; }
    var wa = el.closest('[data-warea]'); if (wa) { wArea = wa.dataset.warea; wedView(); return; }
    var wm = el.closest('[data-wmc]'); if (wm) { wMc = wm.dataset.wmc; wedView(); return; }
    var pk = el.closest('[data-pchk]'); if (pk && !pk.disabled) { packToggle(pk.dataset.pchk); return; }
    var pe = el.closest('[data-pedit]'); if (pe && !pe.disabled) { packEdit = pe.dataset.pedit; packView(); var pf = $('packf'); if (pf) pf.scrollIntoView({ block: 'center' }); return; }
    if (el.closest('#pkadd')) { packEdit = 'new'; packView(); var pf2 = $('packf'); if (pf2) { pf2.scrollIntoView({ block: 'center' }); $('pkt').focus(); } return; }
    if (el.closest('#pkcancel')) { packEdit = null; packView(); return; }
    var pkd = el.closest('#pkdel');
    if (pkd) { if (!pkd.dataset.sure) { pkd.dataset.sure = '1'; pkd.textContent = '한 번 더 누르면 삭제'; return; } Store.remove('packing', packEdit); packEdit = null; toast(savedMsg('지웠어요.')); render(); return; }
    /* 회화 */
    var tl = el.closest('[data-tlang]'); if (tl) { talkLang = tl.dataset.tlang; talkView(); return; }
    var tc = el.closest('[data-tcat]'); if (tc) { talkCat = tc.dataset.tcat; talkView(); return; }
    var sy = el.closest('[data-say]'); if (sy) { var ph0 = phraseById(sy.dataset.say), lg0 = (ov && ov.t === 'phrase' && ov.lang) || curLang(); if (ph0) speak(ph0[lg0], lg0, sy); return; }
    var sw0 = el.closest('[data-show]'); if (sw0) { ov = { t: 'phrase', id: sw0.dataset.show, lang: curLang() }; renderOv(); return; }
    /* 캘린더 */
    if (el.closest('#calCopy')) { var cu = calUrl(calInfo.key); if (!cu) return; copyText(cu).then(function () { toast('구독 주소를 복사했어요.'); }, function () { toast('복사하지 못했어요.'); }); return; }
    var cr = el.closest('#calRot');
    if (cr) { if (!navigator.onLine) { toast('인터넷이 연결됐을 때 바꿀 수 있어요.'); return; } if (!cr.dataset.sure) { cr.dataset.sure = '1'; cr.textContent = '한 번 더 누르면 바꿔요 (옛 구독은 멈춰요)'; return; } calLoad(true); return; }
    /* 기록 */
    var jo = el.closest('[data-jot]'); if (jo) { openJot(jo.dataset.jot); return; }
    var jr = el.closest('[data-jrm]');
    if (jr && ov && ov.t === 'jedit') { var t0 = $('jt'); if (t0) ov.text = t0.value; var x0 = ov.ph.splice(+jr.dataset.jrm, 1)[0]; if (x0) { if (x0.url) URL.revokeObjectURL(x0.url); if (x0.p) ov.removed.push(x0.p, x0.t); } renderOv(); return; }
    var jv = el.closest('[data-jview]');
    if (jv) { var a0 = jv.dataset.jview.split('|'), all0 = jPhotos(a0[0]), k0 = 0; for (var q = 0; q < all0.length; q++) { if (all0[q].jid === a0[1]) { k0 = q + (+a0[2]); break; } } ov = { t: 'photo', date: a0[0], i: k0 }; renderOv(); return; }
    var pn = el.closest('[data-pnav]'); if (pn && ov && ov.t === 'photo') { ov.i = (ov.i || 0) + (+pn.dataset.pnav); renderOv(); return; }
    if (el.closest('[data-pshare]') && ov && ov.t === 'photo') { var cur0 = jPhotos(ov.date)[ov.i || 0]; if (cur0) shareFiles([cur0], md(cur0.date)); return; }
    var js = el.closest('[data-jshare]'); if (js) { shareFiles(jPhotos(js.dataset.jshare), md(js.dataset.jshare) + ' 우리 신혼여행'); return; }
    if (el.closest('#aprint')) { window.print(); return; }
    /* 알림 */
    var po = el.closest('#pushOn'); if (po) { pushEnable(po); return; }
    if (el.closest('#pushOff')) { pushOff(); return; }
    var pt = el.closest('#pushTest');
    if (pt) { pt.disabled = true; Store.rpc('push_test', {}).then(function () { toast('보냈어요. 몇 초 안에 와요.'); }, function (e2) { toast('보내지 못했어요: ' + ((e2 && e2.message) || '오류')); }).then(function () { pt.disabled = false; }); return; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t) return;
    if (t.id === 'pvd') {
      PREVIEW = t.value; try { if (PREVIEW) localStorage.setItem('hm.preview', PREVIEW); else localStorage.removeItem('hm.preview'); } catch (x) {}
      toast(PREVIEW ? md(PREVIEW) + '인 것처럼 보여 드려요. 홈에서 확인하세요.' : '미리보기를 껐어요.'); render(); return;
    }
    if (t.dataset && t.dataset.pp && pushInfo.state === 'on') {
      var pr = Object.assign({}, pushInfo.prefs || DEFPREFS); pr[t.dataset.pp] = t.checked; pushInfo.prefs = pr;
      navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
        if (!sub) return; var j = sub.toJSON(); return Store.pushSave({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, pr);
      }).then(function () { toast('알림 설정을 바꿨어요.'); }, function () { toast('바꾸지 못했어요.'); });
      return;
    }
    if (t.name === 'excur') exPreview();
    if (t.id === 'tslow') { talkSlow = t.checked; return; }
    if (t.id === 'jph' && ov && ov.t === 'jedit') { jAddFiles(t.files); return; }
  });
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'exa') exPreview(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov) { ov = null; renderOv(); } });
  window.addEventListener('hashchange', function () { var v = (location.hash || '').replace('#', ''); if (v) route(v); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function (e) { var g = e.data && e.data.go; if (g) route(g); });
  window.addEventListener('online', function () { walletSync(true); jFlush(); });
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
    if (id === 'wupf') { doUpload(); return; }
    if (id === 'jf') { jSave(); return; }
    if (id === 'packf') {
      var pt0 = $('pkt').value.trim(); if (!pt0) { toast('무엇을 챙길지 적어 주세요.'); return; }
      var pd0 = { title: pt0, cat: (document.querySelector('input[name=pkc]:checked') || {}).value || 'bag', who: (document.querySelector('input[name=pkw]:checked') || {}).value || 'both', note: $('pkn').value.trim() };
      var pid = e.target.dataset.id;
      if (pid) { pd0.editedBy = myId(); pd0.editedAt = nowIso(); Store.update('packing', pid, pd0); }
      else { pd0.order = 900 + S.packing.length; pd0.addedBy = myId(); Store.add('packing', pd0); }
      packEdit = null; toast(savedMsg(pid ? '고쳤어요.' : '추가했어요.')); render(); return;
    }
    if (id === 'talkf') {
      var tk = $('talkt').value.trim(); if (!tk) return;
      Store.add('requests', { text: '[회화] ' + tk, at: nowIso(), by: myId(), status: '대기', reply: null });
      $('talkt').value = ''; toast(savedMsg('부탁했어요. 1시간 안에 \'부탁한 문장\'에 들어가요.')); return;
    }
    if (id === 'expf') {
      var amt = parseFloat(String($('exa').value).replace(/,/g, '')); if (!(amt > 0)) { toast('금액을 넣어 주세요.'); return; }
      var curv = (document.querySelector('input[name=excur]:checked') || {}).value || 'EUR', fxr = fx();
      var dt = $('exd').value || ymd(today()), sc = stayCity(dt);
      var ex = { amount: amt, cur: curv, krw: curv === 'KRW' ? Math.round(amt) : (fxr ? Math.round(amt * fxr.rate) : null), rate: curv === 'KRW' ? null : (fxr ? fxr.rate : null),
        cat: (document.querySelector('input[name=excat]:checked') || {}).value || 'etc', memo: $('exm').value.trim(),
        payer: (document.querySelector('input[name=expay]:checked') || {}).value || myId(), method: (document.querySelector('input[name=exmeth]:checked') || {}).value || 'card',
        date: dt, city: sc ? sc.name : '', taxfree: $('extf').checked, by: myId(), at: nowIso() };
      if (expEdit === 'new') Store.add('expenses', ex); else { delete ex.at; ex.editedAt = nowIso(); Store.update('expenses', expEdit, ex); }
      expEdit = null; toast(savedMsg('적었어요.')); render(); return;
    }
    if (id === 'linkf') {
      var lu = $('linku').value.trim(); if (!safeUrl(lu)) { toast('https:// 로 시작하는 링크를 넣어 주세요.'); return; }
      var lm = $('linkm').value.trim();
      Store.add('requests', { text: '[발견 링크] ' + lu + (lm ? ' — ' + lm : ''), at: nowIso(), by: myId(), status: '대기', reply: null });
      $('linku').value = ''; $('linkm').value = ''; toast(savedMsg('남겼어요. 1시간 안에 확인해서 발견에 넣어요.')); return;
    }
    if (id === 'sosf') {
      var mine = {}; ['cards', 'insurance', 'family', 'memo'].forEach(function (k) { mine[k] = $('sos-' + k).value.trim(); });
      Store.update('meta', 'emergency', { mine: mine, mineBy: myId(), mineAt: nowIso() });
      ov = { t: 'sos' }; renderOv(); toast(savedMsg('저장했어요.')); return;
    }
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
  if (h0 === 'jot') { var jotOnce = function () { if (Store.status.mode === 'ready' || Store.status.mode === 'demo') { if (loaded) { route('jot'); return true; } } return false; }; if (!jotOnce()) { var jt0 = setInterval(function () { if (jotOnce()) clearInterval(jt0); }, 300); setTimeout(function () { clearInterval(jt0); }, 8000); } }
  setTimeout(jFlush, 2000);

  /* 서비스 워커: 오프라인 보기 */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    var hadCtrl = !!navigator.serviceWorker.controller, told = false;
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('sw', e); });
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!hadCtrl || told) return; told = true; toast('새 버전을 받았어요. 다음에 열 때 적용돼요.'); });
  }
})();
