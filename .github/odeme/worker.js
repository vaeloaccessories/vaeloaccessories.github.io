// VAELO ödeme kasası (Cloudflare Worker)
// Görevi: sitedeki sepetten gelen siparişin fiyatını kendisi hesaplar,
// PayTR'dan güvenli ödeme ekranı ister ve PayTR'ın "ödeme tamam" bildirimini doğrular.
// PayTR şifreleri burada yazmaz; Cloudflare'de "Secrets" olarak saklanır:
//   PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT
// İsteğe bağlı ayar: PAYTR_TEST_MODE = "1" iken gerçek para çekilmez.

const SITE = 'https://www.vaelo.com.tr';
const FREE_SHIPPING_FROM = 0; // 0 = tüm siparişlerde kargo ücretsiz
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const HEDIYE_PAKETI = 100;
// İndirim kodları. oran = yüzde indirim (yalnızca ürünlere), kargo = kargo ücretsiz.
const KUPONLAR = {
  HOSGELDIN5: { oran: 5 },
  HOSGELDIN7: { oran: 7 },
  HOSGELDIN10: { oran: 10 },
  KARGOBEDAVA: { kargo: true },
  VAELOHERE: { oran: 10 },
  FOTO10: { oran: 10 },   // fotoğraf paylaşan müşteriye verilen teşekkür kodu
};

const cors = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Vary': 'Origin',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors } });
}

async function hmacBase64(key, text) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function b64utf8(text) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

function ayarlar(env) {
  const t = (v) => String(v ?? '').trim();
  return { id: t(env.PAYTR_MERCHANT_ID), key: t(env.PAYTR_MERCHANT_KEY), salt: t(env.PAYTR_MERCHANT_SALT), test: t(env.PAYTR_TEST_MODE) };
}

// Şifreleri göstermeden kontrol eder: uzunluk ve boşluk var mı.
function kontrol(env) {
  const bilgi = (v) => ({ uzunluk: String(v ?? '').length, bosluk: /\s/.test(String(v ?? '')), dolu: !!v });
  return json({ PAYTR_MERCHANT_ID: bilgi(env.PAYTR_MERCHANT_ID), PAYTR_MERCHANT_KEY: bilgi(env.PAYTR_MERCHANT_KEY), PAYTR_MERCHANT_SALT: bilgi(env.PAYTR_MERCHANT_SALT), PAYTR_TEST_MODE: String(env.PAYTR_TEST_MODE ?? ''), PRINTITURK_TOKEN: bilgi(env.PRINTITURK_TOKEN), RESEND_API_KEY: bilgi(env.RESEND_API_KEY), FIREBASE_SA: bilgi(env.FIREBASE_SA), SIPARISLER: !!env.SIPARISLER });
}

// Aynı IP'den kısa sürede çok istek gelirse durdurur (spam ve kötüye kullanım engeli).
async function cokIstek(env, request, tur, max, saniye) {
  if (!env.SIPARISLER) return false;
  const ip = request.headers.get('CF-Connecting-IP') || 'bilinmiyor';
  const anahtar = 'hiz:' + tur + ':' + ip;
  const n = Number(await env.SIPARISLER.get(anahtar)) || 0;
  if (n >= max) return true;
  await env.SIPARISLER.put(anahtar, String(n + 1), { expirationTtl: Math.max(60, saniye) });
  return false;
}

async function startPayment(request, env) {
  if (await cokIstek(env, request, 'odeme', 15, 600)) return json({ ok: false, error: 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.' }, 429);
  const A = ayarlar(env);
  if (!A.id || !A.key || !A.salt) {
    return json({ ok: false, error: 'Ödeme sistemi henüz ayarlanmadı.' }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Geçersiz istek.' }, 400); }

  const name = clean(body.name, 60);
  const email = clean(body.email, 100);
  const phone = clean(body.phone, 20).replace(/[^\d+]/g, '');
  const address = clean(body.address, 400);
  const city = clean(body.city, 40);
  const district = clean(body.district, 40);
  if (name.length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || phone.replace(/\D/g, '').length < 10 || address.length < 10 || city.length < 2 || district.length < 2) {
    return json({ ok: false, error: 'Lütfen ad soyad, e-posta, telefon, il, ilçe ve adres bilgilerini eksiksiz yazın.' }, 400);
  }
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
    return json({ ok: false, error: 'Sepetiniz boş.' }, 400);
  }

  // Fiyatlar müşteriden değil, sitedeki güncel ürün listesinden alınır.
  const res = await fetch(SITE + '/products.json', { cf: { cacheTtl: 300 } });
  if (!res.ok) return json({ ok: false, error: 'Ürün listesi okunamadı, lütfen tekrar deneyin.' }, 502);
  const catalog = await res.json();
  const byId = new Map(catalog.products.map((p) => [String(p.id), p]));

  const basket = [];
  const urunler = [];
  const satirlar = [];
  for (const it of body.items) {
    const p = byId.get(String(it.id));
    const qty = Math.floor(Number(it.qty));
    const size = String(it.size || '');
    if (!p || !(qty >= 1 && qty <= 10) || !SIZES.includes(size)) {
      return json({ ok: false, error: 'Sepetteki bir ürün artık mevcut değil. Lütfen sepetinizi yenileyin.' }, 400);
    }
    satirlar.push({ p, size, qty });
    urunler.push({ id: String(p.id), name: p.name, size, qty, color: renk(p.name) });
  }
  const kod = clean(body.kupon, 30).toUpperCase().replace(/\s+/g, '');
  const kupon = kod ? KUPONLAR[kod] : null;
  if (kod && !kupon) return json({ ok: false, error: 'İndirim kodu geçersiz.' }, 400);

  // 3'lü paket: aynı paketteki ürünlerden her 3 tanesi paket fiyatından (en pahalılar pakete girer).
  // Sitedeki sepet (assets/sepet.js) aynı hesabı yapar.
  const birim = [];
  satirlar.forEach((x, i) => { for (let j = 0; j < x.qty; j++) birim.push({ i, id: String(x.p.id), price: Number(x.p.price), ok: false }); });
  const kullan = satirlar.map(() => 0);
  const paketSatir = [];
  let paketIndirim = 0;
  for (const pk of catalog.paketler || []) {
    const uy = birim.filter((u) => !u.ok && (pk.urunler || []).map(String).includes(u.id)).sort((a, b) => b.price - a.price);
    const n = Math.floor(uy.length / 3);
    if (!n) continue;
    let normal = 0;
    uy.slice(0, n * 3).forEach((u) => { u.ok = true; kullan[u.i]++; normal += u.price; });
    paketSatir.push([String(pk.ad), Number(pk.fiyat).toFixed(2), n]);
    paketIndirim += normal - Number(pk.fiyat) * n;
  }

  let araToplam = 0;
  let total = 0;
  satirlar.forEach((x, i) => {
    araToplam += Number(x.p.price) * x.qty;
    const kalan = x.qty - kullan[i];
    if (!kalan) return;
    let fiyat = Number(x.p.price);
    let ad = `${x.p.name.replace(/^Vaelo\s+/i, 'VAELO ')} (Beden: ${x.size})`;
    // Yüzde indirim paket dışındaki ürünlerin birim fiyatına yansıtılır; PayTR sepeti ile tutar birebir tutar.
    if (kupon && kupon.oran) { fiyat = Math.round(fiyat * (100 - kupon.oran)) / 100; ad += ` · ${kod} %${kupon.oran}`; }
    basket.push([ad, fiyat.toFixed(2), kalan]);
    total += fiyat * kalan;
  });
  for (const b of paketSatir) { basket.push(b); total += Number(b[1]) * b[2]; }
  total = Math.round(total * 100) / 100;
  paketIndirim = Math.round(paketIndirim * 100) / 100;
  const indirim = Math.round((araToplam - paketIndirim - total) * 100) / 100;
  const paket = paketSatir.map((b) => b[0] + (b[2] > 1 ? ' ×' + b[2] : ''));
  const shipping = (kupon && kupon.kargo) || paketSatir.length || araToplam >= FREE_SHIPPING_FROM ? 0 : Number(catalog.shipping || 120);
  if (shipping > 0) basket.push(['Kargo', shipping.toFixed(2), 1]);
  total += shipping;
  const gift = body.gift === true;
  if (gift) { basket.push(['Hediye Paketi', HEDIYE_PAKETI.toFixed(2), 1]); total += HEDIYE_PAKETI; }

  const merchant_id = A.id;
  const user_ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
  const merchant_oid = 'VAELO' + Date.now() + Math.floor(Math.random() * 1000);
  const payment_amount = String(Math.round(total * 100));
  const user_basket = b64utf8(JSON.stringify(basket));
  const no_installment = '0';
  const max_installment = '0';
  const currency = 'TL';
  const test_mode = A.test === '1' ? '1' : '0';

  const hashStr = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;
  const paytr_token = await hmacBase64(A.key, hashStr + A.salt);

  const form = new URLSearchParams({
    merchant_id, user_ip, merchant_oid, email, payment_amount, paytr_token, user_basket,
    debug_on: test_mode, no_installment, max_installment,
    user_name: name, user_address: `${address}, ${district} / ${city}`, user_phone: phone,
    merchant_ok_url: SITE + '/odeme-basarili.html',
    merchant_fail_url: SITE + '/odeme-hata.html',
    timeout_limit: '30', currency, test_mode, lang: 'tr',
  });
  const r = await fetch('https://www.paytr.com/odeme/api/get-token', { method: 'POST', body: form });
  const out = await r.json().catch(() => ({}));
  if (out.status !== 'success') {
    console.log('PayTR hata:', JSON.stringify(out));
    return json({ ok: false, error: 'Ödeme ekranı açılamadı. Lütfen birazdan tekrar deneyin veya WhatsApp\'tan bize yazın.' }, 502);
  }
  // Sipariş bilgisi, ödeme onaylanınca Printitürk'e gönderilmek üzere saklanır (30 gün).
  if (env.SIPARISLER) {
    await env.SIPARISLER.put(merchant_oid, JSON.stringify({ name, email, phone, address, city, district, urunler, total, gift, kupon: kupon ? kod : '', indirim, paket, paketIndirim, created: new Date().toISOString() }), { expirationTtl: 60 * 60 * 24 * 30 });
  }
  return json({ ok: true, iframe: 'https://www.paytr.com/odeme/guvenli/' + out.token, total, shipping, indirim, paketIndirim, order: merchant_oid });
}

// Ürün adından Printitürk renk adını çıkarır (ör. "Signature Hoodie – Siyah" → "Siyah").
function renk(n) {
  if (/lacivert/i.test(n)) return 'Lacivert';
  if (/beyaz/i.test(n)) return 'Beyaz';
  return 'Siyah';
}

// Ödemesi onaylanan siparişi Printitürk'e üretim için gönderir. Aynı sipariş iki kez gönderilmez.
async function printiturkeGonder(env, oid) {
  if (!env.SIPARISLER || !env.PRINTITURK_TOKEN) { console.log('Printitürk ayarı eksik, sipariş elle girilmeli:', oid); return; }
  const raw = await env.SIPARISLER.get(oid);
  if (!raw) { console.log('Sipariş kaydı bulunamadı:', oid); return; }
  const o = JSON.parse(raw);
  if (o.printiturk) return;
  const parts = o.name.split(' ');
  const last = parts.length > 1 ? parts.pop() : '-';
  const payload = {
    external_order_id: oid,
    customer: { first_name: parts.join(' '), last_name: last, email: o.email, phone: o.phone.replace(/\D/g, '').replace(/^90/, '').replace(/^0/, ''),
      address: o.address, city: o.city, district: o.district },
    items: o.urunler.map((u) => ({ product_sku: 'VAELO-' + u.id, quantity: u.qty, size: u.size, color: u.color })),
    gift_package: !!o.gift,
    order_note: 'vaelo.com.tr sipariş no: ' + oid + (o.gift ? ' · HEDİYE PAKETİ' : ''),
  };
  const r = await fetch('https://printiturk.com/api/v1/orders.php', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + String(env.PRINTITURK_TOKEN).trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  console.log('Printitürk cevap:', oid, r.status, text.slice(0, 300));
  let d = {}; try { d = JSON.parse(text); } catch {}
  o.printiturk = d.success ? (d.order_numbers || true) : null;
  o.printiturkHata = d.success ? null : text.slice(0, 300);
  o.odendi = new Date().toISOString();
  await env.SIPARISLER.put(oid, JSON.stringify(o), { expirationTtl: 60 * 60 * 24 * 90 });
}

// ---- Sipariş mailleri (Resend) ----
// Ayarlar: RESEND_API_KEY (gizli), isteğe bağlı MAIL_FROM (varsayılan: VAELO <siparis@vaelo.com.tr>), MAIL_SAHIBI (varsayılan: vaeloaccessories@gmail.com)
const e = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tl = (n) => '₺' + Number(n).toLocaleString('tr-TR');

function mailSablon(baslik, icerik) {
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#F3F1EC;font-family:Helvetica,Arial,sans-serif;color:#0A0A0A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F1EC;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td style="background:#0A0A0A;padding:28px;text-align:center;font-family:Georgia,serif;font-size:28px;letter-spacing:8px;color:#F3F1EC">VAĖLO</td></tr>
<tr><td style="padding:32px 28px 8px;font-family:Georgia,serif;font-size:24px">${baslik}</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:14px;line-height:1.7;color:#3a3833">${icerik}</td></tr>
<tr><td style="border-top:1px solid #DFDBD2;padding:20px 28px;font-size:12px;color:#6B6861;text-align:center">VAELO · <a href="https://www.vaelo.com.tr" style="color:#6B6861">vaelo.com.tr</a> · WhatsApp +90 551 370 83 20</td></tr>
</table></td></tr></table></body></html>`;
}

function urunTablosu(o) {
  const satir = (a, b) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${a}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${b}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px">` +
    o.urunler.map((u) => satir(`${e(u.name.replace(/^Vaelo\s+/i, 'VAELO '))}<br><span style="color:#6B6861;font-size:12px">Beden: ${e(u.size)} · ${u.qty} adet</span>`, '')).join('') +
    (o.gift ? satir('Hediye paketi', tl(HEDIYE_PAKETI)) : '') +
    (o.paket && o.paket.length ? satir(e(o.paket.join(', ')), '−' + tl(o.paketIndirim || 0)) : '') +
    (o.kupon ? satir(`İndirim kodu (${e(o.kupon)})`, o.indirim ? '−' + tl(o.indirim) : 'Kargo ücretsiz') : '') +
    satir('<strong>Toplam</strong>', `<strong>${tl(o.total)}</strong>`) + `</table>`;
}

async function mailAt(env, to, subject, html, replyTo, from) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + String(env.RESEND_API_KEY).trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: from || env.MAIL_FROM || 'VAELO <siparis@vaelo.com.tr>', to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!r.ok) throw new Error('Resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

async function siparisMailleri(env, oid, deneme) {
  if (!env.SIPARISLER || !env.RESEND_API_KEY) return;
  const raw = await env.SIPARISLER.get(oid);
  if (!raw) return;
  const o = JSON.parse(raw);
  if (o.mail) return;
  const sahip = env.MAIL_SAHIBI || 'vaeloaccessories@gmail.com';
  const sonuc = [];
  if (!deneme) {
    try {
      await mailAt(env, o.email, 'Siparişiniz alındı · VAELO', mailSablon('Teşekkürler, siparişiniz alındı.',
        `Merhaba ${e(o.name.split(' ')[0])},<br><br>Siparişiniz bize ulaştı. Ürününüz sizin için özel olarak üretilecek ve <strong>2–3 iş günü</strong> içinde kargoya verilecek. Kargoya verildiğinde takip bilgisi ayrıca iletilecektir.` +
        urunTablosu(o) +
        `<strong>Teslimat adresi</strong><br>${e(o.address)}<br>${e(o.district)} / ${e(o.city)}<br><br><span style="color:#6B6861;font-size:12px">Sipariş no: ${e(oid)}</span><br><br>Sorunuz olursa bu maile yanıt verebilir ya da WhatsApp'tan bize yazabilirsiniz.`), sahip);
      sonuc.push('musteri');
    } catch (err) { console.log('Müşteri maili gitmedi:', oid, err.message); }
  }
  try {
    await mailAt(env, sahip, `${deneme ? '[DENEME] ' : ''}Yeni sipariş · ${tl(o.total)} · ${o.name}`, mailSablon('Yeni sipariş geldi',
      `<strong>${e(o.name)}</strong><br>${e(o.phone)} · ${e(o.email)}<br>${e(o.address)}<br>${e(o.district)} / ${e(o.city)}` +
      urunTablosu(o) +
      `Printitürk: ${o.printiturk ? 'gönderildi (' + e([].concat(o.printiturk).join(', ')) + ') — Ödeme Bekliyor sekmesinden ödemeyi unutma.' : '<strong style="color:#9b2c2c">gönderilemedi, elle gir.</strong> ' + e(o.printiturkHata || '')}` +
      `<br><span style="color:#6B6861;font-size:12px">Sipariş no: ${e(oid)}</span>`), o.email);
    sonuc.push('sahip');
  } catch (err) { console.log('Sahip maili gitmedi:', oid, err.message); }
  o.mail = sonuc;
  o.odeme = new Date().toISOString();
  await env.SIPARISLER.put(oid, JSON.stringify(o), { expirationTtl: 60 * 60 * 24 * 90 });
}

// ---- Üyelik mailleri: şifre yenileme, e-posta doğrulama, hoş geldin (Firebase + Resend) ----
// Ayar: FIREBASE_SA (gizli) = Firebase "Hizmet hesabı" anahtar dosyasının (JSON) tamamı.
// Bu ayar yoksa site, Firebase'in kendi (tasarımsız) maillerine geri döner.
const FB_KEY = 'AIzaSyAX_6qzkUytZDPAvvAbPmWQJ2utij_E25k';
const FB_PROJE = 'vaelo-8c726';
let gToken = null;
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlStr = (t) => b64url(new TextEncoder().encode(t));

async function googleToken(env) {
  if (gToken && gToken.exp > Date.now() + 60000) return gToken.v;
  const sa = JSON.parse(env.FIREBASE_SA);
  const now = Math.floor(Date.now() / 1000);
  const govde = b64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64urlStr(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const imza = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(govde)));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + govde + '.' + b64url(imza),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Google anahtarı alınamadı: ' + JSON.stringify(d).slice(0, 200));
  gToken = { v: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
  return gToken.v;
}

// Firebase'den tek kullanımlık kod alır (mail Firebase tarafından GÖNDERİLMEZ, biz göndeririz).
async function oobKod(env, requestType, email) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${FB_PROJE}/accounts:sendOobCode`, {
    method: 'POST', headers: { 'Authorization': 'Bearer ' + await googleToken(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType, email, returnOobLink: true }),
  });
  const d = await r.json();
  if (!r.ok || !d.oobLink) throw new Error((d.error && d.error.message) || 'kod alınamadı');
  return new URL(d.oobLink).searchParams.get('oobCode');
}

async function kimlik(idToken) {
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FB_KEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: String(idToken || '') }),
  });
  const d = await r.json().catch(() => ({}));
  return d.users && d.users[0];
}

function dugme(link, yazi) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 22px"><tr><td style="background:#0A0A0A"><a href="${link}" style="display:inline-block;padding:16px 34px;color:#F3F1EC;text-decoration:none;font-size:13px;letter-spacing:3px;text-transform:uppercase">${yazi}</a></td></tr></table>`;
}
const altNot = (link) => `<span style="color:#6B6861;font-size:12px">Düğme çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br><a href="${link}" style="color:#6B6861;word-break:break-all">${link}</a></span>`;
const UYE_FROM = (env) => env.MAIL_FROM_UYE || 'VAELO <uyelik@vaelo.com.tr>';

async function bekle(env, anahtar, saniye) {
  if (!env.SIPARISLER) return false;
  if (await env.SIPARISLER.get(anahtar)) return true;
  await env.SIPARISLER.put(anahtar, '1', { expirationTtl: Math.max(60, saniye) });
  return false;
}

async function uyeMail(request, env) {
  if (!env.FIREBASE_SA || !env.RESEND_API_KEY) return json({ ok: false, yedek: true });
  let b = {};
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Geçersiz istek.' }, 400); }
  const tur = String(b.tur || '');
  try {
    if (tur === 'sifre') {
      const email = String(b.email || '').trim().toLowerCase().slice(0, 160);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'E-posta adresi geçerli görünmüyor.' }, 400);
      if (await bekle(env, 'mail:sifre:' + email, 60)) return json({ ok: true });
      let kod;
      try { kod = await oobKod(env, 'PASSWORD_RESET', email); }
      catch (err) { if (/EMAIL_NOT_FOUND|USER_NOT_FOUND/.test(err.message)) return json({ ok: true }); throw err; }
      const link = `${SITE}/hesap-islem.html?mode=resetPassword&oobCode=${encodeURIComponent(kod)}`;
      await mailAt(env, email, 'Şifrenizi yenileyin · VAELO', mailSablon('Şifrenizi yenileyin',
        `Merhaba,<br><br>VAELO hesabınız için bir şifre yenileme talebi aldık. Yeni şifrenizi belirlemek için aşağıdaki düğmeye dokunun.` +
        dugme(link, 'Şifremi Yenile') +
        `Bu bağlantı güvenliğiniz için <strong>1 saat</strong> geçerlidir. Talep size ait değilse bu maili görmezden gelebilirsiniz; şifreniz değişmez.<br><br>` + altNot(link)), 'info@vaelo.com.tr', UYE_FROM(env));
      return json({ ok: true });
    }
    const u = await kimlik(b.idToken);
    if (!u || !u.email) return json({ ok: false, error: 'Oturum doğrulanamadı.' }, 401);
    const ad = e(String(u.displayName || '').split(' ')[0]);
    if (tur === 'dogrula') {
      if (u.emailVerified) return json({ ok: true, zaten: true });
      if (await bekle(env, 'mail:dogrula:' + u.localId, 60)) return json({ ok: true });
      const kod = await oobKod(env, 'VERIFY_EMAIL', u.email);
      const link = `${SITE}/hesap-islem.html?mode=verifyEmail&oobCode=${encodeURIComponent(kod)}`;
      await mailAt(env, u.email, 'E-posta adresinizi doğrulayın · VAELO', mailSablon('E-posta adresinizi doğrulayın',
        `Merhaba${ad ? ' ' + ad : ''},<br><br>Hesabınızı güvence altına almak için bu e-posta adresinin size ait olduğunu doğrulamamız gerekiyor.` +
        dugme(link, 'E-postamı Doğrula') +
        `Bu işlemi siz başlatmadıysanız bu maili görmezden gelebilirsiniz.<br><br>` + altNot(link)), 'info@vaelo.com.tr', UYE_FROM(env));
      return json({ ok: true });
    }
    if (tur === 'hosgeldin') {
      if (Date.now() - Number(u.createdAt || 0) > 30 * 60 * 1000) return json({ ok: true });
      if (await bekle(env, 'mail:hosgeldin:' + u.localId, 60 * 60 * 24 * 30)) return json({ ok: true });
      await mailAt(env, u.email, 'VAELO ailesine hoş geldiniz', mailSablon(`Hoş geldiniz${ad ? ', ' + ad : ''}.`,
        `VAELO ailesinin bir parçası olduğunuz için teşekkür ederiz.<br><br>Her parçamız sizin için özel olarak, yüksek gramajlı premium kumaşla üretilir. Üyeliğinizle siparişlerinizi <strong>Hesabım</strong> bölümünden takip edebilir, ödeme bilgilerinizin otomatik dolmasıyla daha hızlı alışveriş yapabilirsiniz.` +
        dugme(SITE + '/#signature', 'Koleksiyonu Keşfet') +
        `Bir sorunuz olursa bu maile yanıt vermeniz yeterli; WhatsApp'tan da bize her zaman ulaşabilirsiniz.`), 'info@vaelo.com.tr', UYE_FROM(env));
      return json({ ok: true });
    }
    return json({ ok: false, error: 'Bilinmeyen istek.' }, 400);
  } catch (err) {
    console.log('Üyelik maili hata:', tur, err.message);
    return json({ ok: false, yedek: true });
  }
}

// PayTR, ödeme sonucunu buraya bildirir (PayTR panelinde "Bildirim URL" olarak bu adresin sonuna /paytr-bildirim eklenir).
async function paytrCallback(request, env) {
  const A = ayarlar(env);
  const f = await request.formData();
  const merchant_oid = f.get('merchant_oid') || '';
  const status = f.get('status') || '';
  const total_amount = f.get('total_amount') || '';
  const expected = await hmacBase64(A.key, merchant_oid + A.salt + status + total_amount);
  if (expected !== f.get('hash')) return new Response('PAYTR notification failed: bad hash', { status: 400 });
  console.log('Sipariş', merchant_oid, status, total_amount);
  if (status === 'success' && A.test === '1') console.log('Deneme modu: sipariş Printitürk\'e gönderilmedi', merchant_oid);
  if (status === 'success' && A.test !== '1') {
    try { await printiturkeGonder(env, merchant_oid); } catch (e) { console.log('Printitürk hata:', merchant_oid, e.message); }
  }
  if (status === 'success') {
    try { await siparisMailleri(env, merchant_oid, A.test === '1'); } catch (e2) { console.log('Mail hata:', merchant_oid, e2.message); }
  }
  // PayTR her durumda OK bekler; aksi halde bildirimi tekrar tekrar gönderir.
  return new Response('OK');
}

// ---- Teslimattan sonra "fotoğrafını paylaş, %10 kazan" maili ----
// Cloudflare'de günde bir kez çalışır (Settings > Triggers > Cron Triggers).
// Ödemeden 10 gün sonra (ürün eline geçmiş olsun diye) her müşteriye bir kez gider.
const YORUM_GUN = 10;
async function yorumMailleri(env) {
  if (!env.SIPARISLER || !env.RESEND_API_KEY) return { gonderilen: 0 };
  const simdi = Date.now(), gun = 86400000;
  let cursor, gonderilen = 0;
  do {
    const liste = await env.SIPARISLER.list({ prefix: 'VAELO', cursor });
    for (const k of liste.keys) {
      const raw = await env.SIPARISLER.get(k.name);
      if (!raw) continue;
      let o; try { o = JSON.parse(raw); } catch { continue; }
      if (o.yorumMail || !Array.isArray(o.mail) || !o.mail.includes('musteri')) continue;   // ödenmemiş, denemeler ve zaten gidenler atlanır
      const t = Date.parse(o.odeme || o.odendi || o.created);
      if (!t || simdi - t < YORUM_GUN * gun || simdi - t > (YORUM_GUN + 14) * gun) continue;
      const ad = e(String(o.name || '').split(' ')[0]);
      const urun = o.urunler && o.urunler[0] ? e(String(o.urunler[0].name).replace(/^Vaelo\s+/i, 'VAELO ')) : 'VAELO parçan';
      const wa = 'https://wa.me/905513708320?text=' + encodeURIComponent(`Merhaba, VAELO siparişimin (${k.name}) fotoğrafını gönderiyorum.`);
      try {
        await mailAt(env, o.email, 'Seni VAELO ile görmek isteriz · %10 hediye', mailSablon(`${ad ? ad + ', ' : ''}nasıl yakıştı?`,
          `${urun} birkaç gündür seninle. Umarız ilk günkü kadar seviyorsun.<br><br>` +
          `Üzerindeyken bir fotoğrafını bizimle paylaş, <strong>bir sonraki alışverişinde geçerli %10 indirim kodunu</strong> hemen gönderelim.<br><br>` +
          `<strong>Nasıl paylaşırım?</strong><br>• Bu maile fotoğrafınla yanıt ver, ya da<br>• WhatsApp'tan gönder, ya da<br>• Instagram'da <strong>@vaeloaccessories</strong> hesabını etiketle.<br><br>` +
          `<a href="${wa}" style="display:inline-block;background:#0A0A0A;color:#F3F1EC;text-decoration:none;padding:14px 26px;font-size:13px;letter-spacing:2px">FOTOĞRAFIMI GÖNDER</a><br><br>` +
          `<span style="color:#6B6861;font-size:12px">İstersen birkaç cümlelik yorumunu da ekle; izninle sitemizde paylaşırız. Sipariş no: ${e(k.name)}</span>`), 'info@vaelo.com.tr');
        o.yorumMail = new Date().toISOString();
        await env.SIPARISLER.put(k.name, JSON.stringify(o), { expirationTtl: 60 * 60 * 24 * 60 });
        gonderilen++;
      } catch (err) { console.log('Yorum maili gitmedi:', k.name, err.message); }
    }
    cursor = liste.list_complete ? null : liste.cursor;
  } while (cursor);
  console.log('Yorum maili gönderilen:', gonderilen);
  return { gonderilen };
}

// ---- Bayilik başvurusu (bayi.html formu) → sahibine mail (Resend) ----
async function bayiBasvuru(request, env) {
  if (await cokIstek(env, request, 'bayi', 3, 3600)) return json({ ok: false, error: 'Kısa sürede çok fazla başvuru gönderildi. Lütfen daha sonra tekrar deneyin.' }, 429);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'Şu an gönderilemedi. Lütfen WhatsApp\'tan bize yazın.' }, 503);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Geçersiz istek.' }, 400); }
  if (b.web) return json({ ok: true }); // bot tuzağı
  const d = { ad: clean(b.ad, 40), soyad: clean(b.soyad, 40), firma: clean(b.firma, 80), il: clean(b.il, 40), ilce: clean(b.ilce, 40), tel: clean(b.tel, 20), email: clean(b.email, 100), mesaj: clean(b.mesaj, 1000) };
  if (d.ad.length < 2 || d.soyad.length < 2 || d.il.length < 2 || d.ilce.length < 2 || d.tel.replace(/\D/g, '').length < 10 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) {
    return json({ ok: false, error: 'Lütfen tüm zorunlu alanları doğru doldurun.' }, 400);
  }
  const sahip = env.MAIL_SAHIBI || 'vaeloaccessories@gmail.com';
  const tel = d.tel.replace(/[^\d+]/g, '');
  const wa = '90' + tel.replace(/\D/g, '').replace(/^(90)?0?/, '');
  const satir = (k, v) => v ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6B6861;width:120px">${k}</td><td style="padding:8px 0;border-bottom:1px solid #eee">${v}</td></tr>` : '';
  try {
    await mailAt(env, sahip, `Yeni bayilik başvurusu · ${d.ad} ${d.soyad} · ${d.il}`, mailSablon('Yeni bayilik başvurusu',
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">` +
      satir('Ad Soyad', e(d.ad + ' ' + d.soyad)) + satir('Firma', e(d.firma)) + satir('İl / İlçe', e(d.il + ' / ' + d.ilce)) +
      satir('Telefon', `<a href="tel:${e(tel)}">${e(d.tel)}</a> · <a href="https://wa.me/${e(wa)}">WhatsApp</a>`) +
      satir('E-posta', `<a href="mailto:${e(d.email)}">${e(d.email)}</a>`) + satir('Mesaj', e(d.mesaj)) +
      `</table><br>Bu maile "Yanıtla" dersen cevabın doğrudan başvuran kişiye gider.`), d.email, 'VAELO Bayilik <info@vaelo.com.tr>');
  } catch (err) {
    console.log('Bayi maili gitmedi:', err.message);
    return json({ ok: false, error: 'Şu an gönderilemedi. Lütfen WhatsApp\'tan bize yazın.' }, 502);
  }
  try {
    await mailAt(env, d.email, 'Bayilik başvurunuz alındı · VAELO', mailSablon('Başvurunuz alındı.',
      `Merhaba ${e(d.ad)},<br><br>VAELO bayilik başvurunuz bize ulaştı. Bilgilerinizi inceleyip en kısa sürede sizinle iletişime geçeceğiz.<br><br>Sorunuz olursa bu maile yanıt verebilirsiniz.`), sahip, 'VAELO <info@vaelo.com.tr>');
  } catch (err) { console.log('Başvurana onay maili gitmedi:', err.message); }
  return json({ ok: true });
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(yorumMailleri(env)); },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method === 'POST' && url.pathname === '/odeme') return startPayment(request, env);
    if (request.method === 'POST' && url.pathname === '/paytr-bildirim') return paytrCallback(request, env);
    if (request.method === 'POST' && url.pathname === '/uye-mail') return uyeMail(request, env);
    if (request.method === 'POST' && url.pathname === '/bayi') return bayiBasvuru(request, env);
    if (request.method === 'GET' && url.pathname === '/surum') return json({ surum: 4, hediye: HEDIYE_PAKETI, kuponlar: KUPONLAR, paket: true });
    return new Response('VAELO ödeme servisi çalışıyor.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};
