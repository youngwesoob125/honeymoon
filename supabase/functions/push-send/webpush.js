/* Web Push 암호화(RFC 8291, aes128gcm)와 VAPID 서명(RFC 8292).
   브라우저 표준 WebCrypto만 쓴다 → Deno(Supabase Edge)와 Node 양쪽에서 같은 코드로 돈다. */
const te = new TextEncoder();

export function b64uToBytes(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s), a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
export function bytesToB64u(a) {
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function concat(...arrs) {
  const n = arrs.reduce((t, a) => t + a.length, 0), out = new Uint8Array(n);
  let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
/* HKDF-SHA256, 출력 32바이트 이하(한 블록)만 쓴다 */
async function hkdf(salt, ikm, info, len) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, len);
}

/* payload(Uint8Array)를 받는 쪽 키(p256dh)·auth로 암호화한 본문을 돌려준다.
   opts.asKeys / opts.salt는 시험용(고정값 주입). */
export async function encrypt(payload, p256dh, auth, opts = {}) {
  const uaPub = b64uToBytes(p256dh), authSecret = b64uToBytes(auth);
  const asKeys = opts.asKeys || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(te.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = opts.salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, key, concat(payload, new Uint8Array([2]))));
  const header = new Uint8Array(16 + 4 + 1 + asPub.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPub.length;
  header.set(asPub, 21);
  return concat(header, ct);
}

/* Authorization 헤더 값: vapid t=<JWT>, k=<공개키> */
export async function vapidAuth(endpoint, sub, publicKey, privateJwk, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const h = bytesToB64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const p = bytesToB64u(te.encode(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub })));
  const key = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(h + '.' + p)));
  return 'vapid t=' + h + '.' + p + '.' + bytesToB64u(sig) + ', k=' + publicKey;
}

export async function sendPush(sub, message, vapid) {
  const body = await encrypt(te.encode(JSON.stringify(message)), sub.p256dh, sub.auth);
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400', Urgency: 'normal',
      'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
      Authorization: await vapidAuth(sub.endpoint, vapid.sub, vapid.publicKey, vapid.privateJwk)
    },
    body
  });
}
