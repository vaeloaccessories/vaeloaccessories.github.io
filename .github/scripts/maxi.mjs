// VAELO Kadın koleksiyonu: Maxi Modena (Sakans) bayi feed'inden seçili ürünleri products.json'a işler.
// Fiyat = bayi fiyatı × (1 + kâr), sonu 49 veya 99'a yukarı yuvarlanır. Stok ve bedenler feed'den canlı gelir.
// Bayi anahtarı GitHub'da gizli ayar olarak durur (MAXI_KEY); koda yazılmaz.
// Deneme için: MAXI_FILE=feed.json node .github/scripts/maxi.mjs
import fs from 'node:fs';

const DIR = new URL('.', import.meta.url).pathname;
const cfg = JSON.parse(fs.readFileSync(DIR + 'kadin-secki.json', 'utf8'));
const KEY = process.env.MAXI_KEY, FILE = process.env.MAXI_FILE;
if (!KEY && !FILE) { console.log('MAXI_KEY yok, Kadın koleksiyonu güncellenmedi.'); process.exit(0); }

let feed;
if (FILE) feed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
else {
  const r = await fetch('https://api.sakans.com/api/json/' + encodeURIComponent(KEY));
  if (!r.ok) throw new Error('Maxi Modena feed okunamadı: HTTP ' + r.status);
  feed = await r.json();
}
if (!Array.isArray(feed) || feed.length < 50) throw new Error('Maxi Modena feed beklenenden kısa, dokunulmadı.');
const byId = new Map(feed.map((x) => [String(x.ProductId), x]));

// 1562.69 × 1.53 = 2390.9 → 2399
const fiyat = (alis) => { const v = alis * (1 + cfg.kar), b = Math.floor(v / 100) * 100; return v <= b + 49 ? b + 49 : b + 99; };
const RENK = { kahverengi: 'Kahverengi', kahve: 'Kahverengi' };
const renkAdi = (c) => { const s = String(c || '').trim(); return RENK[s.toLocaleLowerCase('tr-TR')] || s; };
const BEDEN_SIRA = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '38', '40', '42', '44', '46', '48', '50', 'Standart'];
const beden = (v) => /^(std|standart)$/i.test(String(v).trim()) ? 'Standart' : String(v).trim().toUpperCase();

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const unent = (s) => String(s || '').replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => e[0] === '#'
  ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m);
const aciklama = (h) => unent(unent(h)
  .replace(/<\/(p|h\d|li|div)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
  .split('\n').map((l) => l.replace(/\s+/g, ' ').trim())
  .filter((l) => l && !/maxi\s*mod|sakans|toptan|bayi/i.test(l) && !/^kısa tanıtım$/i.test(l))
  .join('\n');

const yeni = [];
for (const u of cfg.urunler) {
  for (const id of u.id) {
    const x = byId.get(String(id));
    if (!x || Number(x.Status) !== 1) continue;
    const bedenler = (x.ProductCombinations || [])
      .map((c) => ({ beden: beden(c.Value), stok: Number(c.StockQuantity) || 0, barkod: String(c.Gtin || '') }))
      .filter((b) => b.stok > 0)
      .sort((a, b) => BEDEN_SIRA.indexOf(a.beden) - BEDEN_SIRA.indexOf(b.beden));
    const alis = Number(x.Price) || 0;
    const images = (x.Pictures || []).filter((s) => /^https:\/\//.test(s)).slice(0, 6);
    if (!bedenler.length || !alis || !images.length) continue;   // stokta yoksa sitede görünmez
    yeni.push({
      id: 'mm' + x.ProductId,
      name: `${u.ad} – ${renkAdi(x.Color)}`,
      price: fiyat(alis),
      images,
      description: aciklama(x.FullDescription),
      url: '',
      category: 'Kadın',
      grup: u.grup,
      bedenler,
      tedarik: 'maxi',
    });
  }
}

const data = JSON.parse(fs.readFileSync('products.json', 'utf8'));
const once = (data.products || []).filter((p) => p.category === 'Kadın');
data.products = (data.products || []).filter((p) => p.category !== 'Kadın').concat(yeni);
data.kadinGruplar = cfg.gruplar;
fs.writeFileSync('products.json', JSON.stringify(data, null, 2) + '\n');
console.log(`Kadın koleksiyonu: ${yeni.length} ürün (önce ${once.length}).`);
