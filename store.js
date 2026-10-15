/* 우리 신혼여행: 데이터 저장소
   - 기기 안에 마지막 데이터를 저장해 두고(오프라인 보기)
   - 인터넷이 없을 때 고친 내용은 대기열에 쌓았다가 연결되면 보낸다.
   - config.js에 Supabase 주소가 없으면 데모 모드(seed.json, 기기 안에서만 저장). */
(function () {
  var CFG = window.HM_CONFIG || {};
  var K_CACHE = 'hm.cache.v1', K_OUT = 'hm.outbox.v1', K_MEM = 'hm.members.v1';
  var docs = {}, lastSync = null, outbox = [], listeners = [], client = null, me = null, members = {};
  var channel = null, flushing = null, pollT = null, syncing = null;
  var status = { mode: 'loading', online: navigator.onLine, pending: 0, lastSync: null, live: false, error: null, info: null };

  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load() { var c = lsGet(K_CACHE, null); if (c) { docs = c.docs || {}; lastSync = c.lastSync || null; } outbox = lsGet(K_OUT, []) || []; members = lsGet(K_MEM, {}) || {}; }
  function save() { lsSet(K_CACHE, { docs: docs, lastSync: lastSync }); }
  function saveOut() { lsSet(K_OUT, outbox); status.pending = outbox.length; }
  function emit() {
    status.pending = outbox.length; status.lastSync = lastSync; status.online = navigator.onLine;
    listeners.forEach(function (f) { try { f(status); } catch (e) { console.error(e); } });
  }
  function applyOp(target, op) {
    var c = target[op.col] || (target[op.col] = {});
    if (op.op === 'update') c[op.id] = Object.assign({}, c[op.id] || {}, op.data);
    else if (op.op === 'set') c[op.id] = Object.assign({}, op.data);
    else if (op.op === 'delete') delete c[op.id];
  }
  function rid() {
    var s = 'abcdefghijklmnopqrstuvwxyz0123456789', r = '', a = new Uint8Array(20);
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < 20; i++) r += s[a[i] % 36];
    return r;
  }
  function isNetErr(e) {
    if (!e) return true;
    var m = String(e.message || e) + ' ' + String(e.details || '');
    return e.name === 'TypeError' || /fetch|network|load failed|timed? ?out|offline/i.test(m) || e.status === 0;
  }
  function isAuthErr(e) { var m = String((e && (e.message || e.code)) || ''); return (e && e.status === 401) || /jwt|token|PGRST30/i.test(m); }

  /* ---------- 쓰기 (대기열) ---------- */
  function queue(op) {
    op.ts = Date.now(); applyOp(docs, op); save();
    if (status.mode === 'demo') { emit(); return Promise.resolve(op.id); }
    outbox.push(op); saveOut(); emit(); flush();
    return Promise.resolve(op.id);
  }
  function sendOp(op) {
    var who = me && me.email;
    var p;
    if (op.op === 'update') p = client.rpc('doc_merge', { p_collection: op.col, p_id: op.id, p_patch: op.data });
    else if (op.op === 'set') p = client.from('docs').upsert({ collection: op.col, id: op.id, data: op.data, updated_at: new Date().toISOString(), updated_by: who });
    else p = client.from('docs').delete().eq('collection', op.col).eq('id', op.id);
    return p.then(function (r) { if (r.error) throw r.error; });
  }
  function flush() {
    if (!client || !me || status.mode !== 'ready') return Promise.resolve();
    if (flushing) return flushing;
    if (!outbox.length || !navigator.onLine) return Promise.resolve();
    flushing = (function step() {
      if (!outbox.length) return Promise.resolve();
      var op = outbox[0];
      return sendOp(op).then(function () { outbox.shift(); saveOut(); return step(); }, function (e) {
        if (isNetErr(e) || isAuthErr(e)) { return; } /* 다음 연결 때 다시 */
        console.error('변경을 보내지 못함', op, e);
        outbox.shift(); saveOut();
        status.error = '보내지 못한 변경이 1건 있어요. (' + (e.message || e.code || '오류') + ')';
        return step();
      });
    })().then(function () { flushing = null; emit(); }, function () { flushing = null; emit(); });
    return flushing;
  }

  /* ---------- 읽기 ---------- */
  function fullSync() {
    if (!client || !me || status.mode !== 'ready' || !navigator.onLine) return Promise.resolve(false);
    var all = [], size = 1000;
    function page(from) {
      return client.from('docs').select('collection,id,data').range(from, from + size - 1).then(function (r) {
        if (r.error) throw r.error;
        all = all.concat(r.data || []);
        if ((r.data || []).length === size) return page(from + size);
      });
    }
    return page(0).then(function () {
      var nd = {};
      all.forEach(function (x) { (nd[x.collection] || (nd[x.collection] = {}))[x.id] = x.data; });
      outbox.forEach(function (op) { applyOp(nd, op); });
      docs = nd; lastSync = new Date().toISOString(); status.error = null; save(); emit();
      return true;
    });
  }
  function sync() {
    if (status.mode === 'demo') { emit(); return Promise.resolve(true); }
    if (syncing) return syncing;
    syncing = flush().then(fullSync).catch(function (e) {
      if (!isNetErr(e)) status.error = '동기화 오류: ' + (e.message || e.code || '알 수 없음');
      emit(); return false;
    }).then(function (ok) { syncing = null; return ok; });
    return syncing;
  }
  function subscribe() {
    if (!client) return;
    if (channel) { try { client.removeChannel(channel); } catch (e) {} channel = null; }
    channel = client.channel('docs-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, function (p) {
        if (p.eventType === 'DELETE') { var o = p.old || {}; if (o.collection && docs[o.collection]) delete docs[o.collection][o.id]; }
        else {
          var n = p.new || {}; if (!n.collection) return;
          (docs[n.collection] || (docs[n.collection] = {}))[n.id] = n.data;
          outbox.forEach(function (op) { if (op.col === n.collection && op.id === n.id) applyOp(docs, op); });
        }
        lastSync = new Date().toISOString(); save(); emit();
      })
      .subscribe(function (st) { status.live = (st === 'SUBSCRIBED'); emit(); });
    clearInterval(pollT);
    pollT = setInterval(function () { if (!document.hidden && navigator.onLine && !status.live) sync(); }, 60000);
  }

  /* ---------- 로그인 ---------- */
  function afterLogin(u) {
    me = { email: String(u.email || '').toLowerCase(), name: '' };
    var check = navigator.onLine
      ? client.from('members').select('email,name').then(function (r) {
          if (r.error) { if (!isNetErr(r.error)) status.error = r.error.message; return null; }
          var m = {}; (r.data || []).forEach(function (x) { m[String(x.email).toLowerCase()] = x.name; });
          return m;
        }, function () { return null; })
      : Promise.resolve(null);
    return check.then(function (m) {
      if (m) { members = m; lsSet(K_MEM, members); if (!(me.email in members)) { status.mode = 'denied'; emit(); return; } }
      me.name = members[me.email] || '';
      status.mode = 'ready'; emit();
      subscribe(); sync();
    });
  }
  function start() {
    load(); status.pending = outbox.length; emit();
    if (!CFG.url) {
      status.mode = 'demo'; me = { email: 'demo@local', name: '데모' }; members = { 'demo@local': '데모' };
      var has = Object.keys(docs).length > 0;
      var p = has ? Promise.resolve() : fetch('seed.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) { if (s) { docs = s; lastSync = new Date().toISOString(); save(); } }).catch(function () {});
      return p.then(emit);
    }
    if (!window.supabase || !window.supabase.createClient) {
      status.mode = Object.keys(docs).length ? 'offline-boot' : 'need-net';
      if (Object.keys(docs).length) me = { email: '', name: '' };
      emit();
      window.addEventListener('online', function () { location.reload(); }, { once: true });
      return Promise.resolve();
    }
    client = window.supabase.createClient(CFG.url, CFG.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'hm.auth', detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 5 } }
    });
    client.auth.onAuthStateChange(function (ev, s) {
      if (ev === 'SIGNED_OUT') { me = null; status.mode = 'login'; emit(); }
      if (ev === 'TOKEN_REFRESHED' && channel) { flush(); }
    });
    return client.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (!s) { status.mode = 'login'; emit(); return; }
      return afterLogin(s.user);
    }, function () { status.mode = Object.keys(docs).length ? 'offline-boot' : 'login'; emit(); });
  }
  function login(email, pw) {
    return client.auth.signInWithPassword({ email: email.trim(), password: pw }).then(function (r) {
      if (r.error) throw r.error; return afterLogin(r.data.user);
    });
  }
  function signup(email, pw) {
    var back = location.href.split('#')[0];
    return client.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: back } }).then(function (r) {
      if (r.error) throw r.error;
      if (r.data && r.data.session) { return afterLogin(r.data.user).then(function () { return 'in'; }); }
      return 'confirm';
    });
  }
  function logout() {
    if (outbox.length && !confirm('아직 보내지 못한 변경이 ' + outbox.length + '건 있어요. 그래도 로그아웃할까요?')) return Promise.resolve();
    outbox = []; saveOut(); docs = {}; lastSync = null; save();
    if (channel && client) { try { client.removeChannel(channel); } catch (e) {} }
    return client ? client.auth.signOut().then(function () { location.reload(); }) : Promise.resolve(location.reload());
  }

  window.addEventListener('online', function () { emit(); if (status.mode === 'ready') { if (!status.live) subscribe(); sync(); } });
  window.addEventListener('offline', function () { status.live = false; emit(); });
  var hidAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hidAt = Date.now(); return; }
    if (status.mode === 'ready' && navigator.onLine && Date.now() - hidAt > 60 * 1000) sync();
  });

  function list(c) { var o = docs[c] || {}; return Object.keys(o).map(function (id) { var x = Object.assign({}, o[id]); x.id = id; return x; }); }

  window.Store = {
    start: start, sync: sync, login: login, signup: signup, logout: logout,
    onChange: function (f) { listeners.push(f); },
    list: list,
    get: function (c, id) { var o = docs[c] && docs[c][id]; return o ? Object.assign({ id: id }, o) : null; },
    update: function (c, id, data) { return queue({ op: 'update', col: c, id: id, data: data }); },
    set: function (c, id, data) { return queue({ op: 'set', col: c, id: id, data: data }); },
    add: function (c, data) { return queue({ op: 'set', col: c, id: rid(), data: data }); },
    remove: function (c, id) { return queue({ op: 'delete', col: c, id: id }); },
    rpc: function (name, args) {
      if (!client || status.mode !== 'ready') return Promise.reject(new Error('로그인 상태에서만 할 수 있어요.'));
      if (!navigator.onLine) return Promise.reject(new Error('오프라인이에요.'));
      return client.rpc(name, args).then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    status: status,
    me: function () { return me; },
    members: function () { return members; },
    clearError: function () { status.error = null; }
  };
})();
