// Admin panelinde (Ürünler sekmesi) yapılan değişiklikleri Firestore'dan okuyup products.json'a işler.
// Firestore: urunler/{id} = ürünün tam hali, urun_gorsel/{gid} = panelden yüklenen fotoğraf (data URL).
// Panelde kaydı olmayan ürünler products.json'da olduğu gibi kalır.
import fs from 'node:fs';

const BASE = 'https://firestore.googleapis.com/v1/projects/vaelo-8c726/databases/(default)/documents/';

const val = (v) => {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
  if ('mapValue' in v) return obj(v.mapValue.fields || {});
  if ('timestampValue' in v) return v.timestampValue;
  return null;
};
const obj = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, val(v)]));

async function liste(kol) {
  const out = [];
  let tok = '';
  do {
    const r = await fetch(BASE + kol + '?pageSize=300' + (tok ? '&pageToken=' + tok : ''));
    if (!r.ok) throw new Error(kol + ' okunamadı: HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const j = await r.json();
    for (const d of j.documents || []) out.push({ id: d.name.split('/').pop(), ...obj(d.fields || {}) });
    tok = j.nextPageToken || '';
  } while (tok);
  return out;
}

async function belge(kol, id) {
  const r = await fetch(BASE + kol + '/' + encodeURIComponent(id));
  return r.ok ? obj((await r.json()).fields || {}) : null;
}

const data = JSON.parse(fs.readFileSync('products.json', 'utf8'));
const kayitlar = await liste('urunler');

for (const k of kayitlar) {
  const images = [];
  for (const src of k.images || []) {
    const s = String(src || '');
    if (!s.startsWith('gorsel:')) { if (/^https:\/\//.test(s)) images.push(s); continue; }
    const gid = s.slice(7).replace(/[^\w-]/g, '');
    const m = String((await belge('urun_gorsel', gid))?.veri || '').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    if (!m) { console.log('Görsel bulunamadı: ' + gid); continue; }
    const f = `assets/urun/${gid}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    fs.mkdirSync('assets/urun', { recursive: true });
    fs.writeFileSync(f, Buffer.from(m[2], 'base64'));
    images.push('https://www.vaelo.com.tr/' + f);
  }
  const i = data.products.findIndex((x) => x.id === k.id);
  const p = {
    id: k.id,
    name: String(k.name || '').trim(),
    price: Number(k.price) || 0,
    images: images.slice(0, 6),
    description: String(k.description || '').trim(),
    url: (i >= 0 && data.products[i].url) || '',
    category: String(k.category || '')
  };
  if (k.aktif === false || !p.name || !p.price || !p.images.length) {
    if (i >= 0) data.products.splice(i, 1);
    continue;
  }
  if (i >= 0) data.products[i] = { ...data.products[i], ...p };
  else data.products.push(p);
}

fs.writeFileSync('products.json', JSON.stringify(data, null, 2) + '\n');
console.log(kayitlar.length + ' panel kaydı işlendi, sitede ' + data.products.length + ' ürün var');
