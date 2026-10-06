// VAELO ödeme kasası (Cloudflare Worker)
// Görevi: sitedeki sepetten gelen siparişin fiyatını kendisi hesaplar,
// PayTR'dan güvenli ödeme ekranı ister ve PayTR'ın "ödeme tamam" bildirimini doğrular.
// PayTR şifreleri burada yazmaz; Cloudflare'de "Secrets" olarak saklanır:
//   PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT
// İsteğe bağlı ayar: PAYTR_TEST_MODE = "1" iken gerçek para çekilmez.

const SITE = 'https://www.vaelo.com.tr';
const FREE_SHIPPING_FROM = 3000;
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

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
  return json({ PAYTR_MERCHANT_ID: bilgi(env.PAYTR_MERCHANT_ID), PAYTR_MERCHANT_KEY: bilgi(env.PAYTR_MERCHANT_KEY), PAYTR_MERCHANT_SALT: bilgi(env.PAYTR_MERCHANT_SALT), PAYTR_TEST_MODE: String(env.PAYTR_TEST_MODE ?? '') });
}

async function startPayment(request, env) {
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
  if (name.length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || phone.replace(/\D/g, '').length < 10 || address.length < 10) {
    return json({ ok: false, error: 'Lütfen ad soyad, e-posta, telefon ve adres bilgilerini eksiksiz yazın.' }, 400);
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
  let total = 0;
  for (const it of body.items) {
    const p = byId.get(String(it.id));
    const qty = Math.floor(Number(it.qty));
    const size = String(it.size || '');
    if (!p || !(qty >= 1 && qty <= 10) || !SIZES.includes(size)) {
      return json({ ok: false, error: 'Sepetteki bir ürün artık mevcut değil. Lütfen sepetinizi yenileyin.' }, 400);
    }
    basket.push([`${p.name.replace(/^Vaelo\s+/i, 'VAELO ')} (Beden: ${size})`, Number(p.price).toFixed(2), qty]);
    total += Number(p.price) * qty;
  }
  const shipping = total >= FREE_SHIPPING_FROM ? 0 : Number(catalog.shipping || 120);
  if (shipping > 0) basket.push(['Kargo', shipping.toFixed(2), 1]);
  total += shipping;

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
    user_name: name, user_address: address, user_phone: phone,
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
  return json({ ok: true, iframe: 'https://www.paytr.com/odeme/guvenli/' + out.token, total, shipping, order: merchant_oid });
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
  // Sipariş ayrıntıları (ürün, beden, adres, telefon) PayTR panelinde "İşlemler" bölümünde görünür.
  return new Response('OK');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method === 'POST' && url.pathname === '/odeme') return startPayment(request, env);
    if (request.method === 'POST' && url.pathname === '/paytr-bildirim') return paytrCallback(request, env);
    if (request.method === 'GET' && url.pathname === '/kontrol') return kontrol(env);
    return new Response('VAELO ödeme servisi çalışıyor.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};
