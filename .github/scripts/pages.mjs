// products.json'dan her ürün için vaelo.com.tr/urun/... sayfası ve sitemap.xml üretir.
// Google Alışveriş ve arama için ürünlerin kendi sitemizde sayfası olması gerekiyor.
import fs from 'node:fs';

const SITE = 'https://www.vaelo.com.tr/';
const data = JSON.parse(fs.readFileSync('products.json', 'utf8'));
const list = (data.products || []).filter((p) => p.name && p.price && p.id && !p.gizli);
const ship = data.shipping ?? 120;
// 3'lü paket notu: kasa paketi destekliyorsa sepet.js görünür yapar.
const paketNotu = (p) => { const k = (data.paketler || []).find((x) => (x.urunler || []).includes(String(p.id))); return k ? `<p class="paket" hidden>3'lü al: <b>₺${fmt(k.fiyat)}</b> · Kargo bedava<br><span>Bu seriden istediğin 3 parçayı sepete ekle, indirim otomatik uygulanır.</span></p>` : ''; };

const TR = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', Ö: 'o', Ş: 's', Ü: 'u', Ė: 'e', ė: 'e' };
const clean = (n) => String(n).replace(/^vaelo\s+/i, '').trim();
export const slug = (p) => clean(p.name).replace(/[^\x00-\x7F]/g, (c) => TR[c] ?? '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + p.id;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isHoodie = (n) => /hoodie|kap[sşü]+on/i.test(n);
const isWatch = (p) => p.category === 'Saat';
const GRUP = { gunluk: 'Günlük', signature: 'Signature', kadin: 'Kadın' };
const kind = (n) => /saat/i.test(n) ? 'Saat' : isHoodie(n) ? 'Kapşonlu Sweatshirt (Hoodie)' : /sweat/i.test(n) ? 'Sweatshirt' : /ti[sş][oö]rt/i.test(n) ? 'Tişört' : 'Giyim';
const kindLow = (n) => /saat/i.test(n) ? 'saat' : isHoodie(n) ? 'kapşonlu sweatshirt' : /sweat/i.test(n) ? 'sweatshirt' : 'tişört';
const fmt = (n) => Number(n).toLocaleString('tr-TR');
// ürünlerdeki logo ve desenler baskıdır, nakış değil
const fixText = (s) => String(s || '').replace(/Baskı ve nakış detaylarını/gi, 'Baskı detaylarını')
  .replace(/nakış/gi, 'baskı').replace(/Nakış/g, 'Baskı');
const SIZES = {
  hoodie: { note: '%100 pamuk · 3 iplik şardonlu kumaş', rows: [['S', 57, 71], ['M', 60, 73], ['L', 63, 75], ['XL', 66, 76], ['XXL', 69, 78]] },
  tee: { note: '%100 pamuk · 24/1 kumaş', rows: [['S', 55, 71], ['M', 56, 73], ['L', 59, 75], ['XL', 61, 76], ['XXL', 63, 78]] },
};
const sizeTable = (n) => {
  const t = (isHoodie(n) || /sweat/i.test(n)) ? SIZES.hoodie : /ti[sş][oö]rt/i.test(n) ? SIZES.tee : null;
  if (!t) return '';
  return `<details class="st"><summary>Beden tablosu</summary><p class="stn">${t.note}</p><table><thead><tr><th>Beden</th><th>Göğüs</th><th>Boy</th></tr></thead><tbody>${t.rows.map(([a, g, b]) => `<tr><td>${a}</td><td>${g} cm</td><td>${b} cm</td></tr>`).join('')}</tbody></table><p class="stn">Ürün düz zemine serilerek ölçülmüştür. Göğüs: koltuk altından koltuk altına, boy: omuzdan etek ucuna. Daha bol görünüm için bir beden büyük seçebilirsiniz. ±1–2 cm farklılık olabilir.</p></details>`;
};
// "Signature Hoodie – Beyaz" / "Street Division Hoodie – Lacivert / Etiket Logo" → model + renk
const parts = (n) => { const m = clean(n).match(/^(.*?)\s*[–-]\s*([^/]+?)\s*(?:\/\s*(.+))?$/); return m ? { model: m[1] + '|' + (m[3] || ''), color: m[2] } : { model: clean(n), color: '' }; };
const SW = { siyah: '#0A0A0A', lacivert: '#1F2740', beyaz: '#FFFFFF', gri: '#8A8A8A', bej: '#D8CBB5', kahverengi: '#5A3E2B', yeşil: '#2F4A36', kırmızı: '#8B1E1E' };
const swatch = (c) => SW[String(c).toLocaleLowerCase('tr-TR')] || '#CCCCCC';
// Grafik Baskı tişörtlerin siyah ve beyazı farklı desen, renk seçeneği sayılmaz
const colorsOf = (p) => { const me = parts(p.name); if (!me.color || /grafik bask/i.test(me.model)) return []; const order = ['Siyah', 'Lacivert', 'Beyaz'];
  return list.filter((o) => parts(o.name).model === me.model).sort((a, b) => (order.indexOf(parts(a.name).color) + 9) % 9 - (order.indexOf(parts(b.name).color) + 9) % 9); };
const shopier = (u) => /^https:\/\/www\.shopier\.com\//.test(u || '') ? u : 'https://www.shopier.com/VAELOaccessories';

function descHtml(d) {
  const lines = fixText(d).split('\n').map((l) => l.trim()).filter(Boolean);
  let out = '', ul = [];
  const flush = () => { if (ul.length) { out += '<ul>' + ul.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>'; ul = []; } };
  for (const l of lines) {
    if (l.length < 40 && !/[:.]/.test(l)) { flush(); out += '<h3>' + esc(l) + '</h3>'; }
    else ul.push(l);
  }
  flush();
  return out;
}

function page(p) {
  const name = clean(p.name), title = `VAELO ${name} | Lüks ${kind(p.name)}`;
  const url = SITE + 'urun/' + slug(p) + '.html';
  const imgs = (p.images || []).filter((u) => /^https:\/\//.test(u));
  const plain = fixText(p.description).replace(/\s+/g, ' ').trim();
  const meta = (`VAELO ${name}: lüks ${kindLow(p.name)}. ${plain}`).slice(0, 155);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: 'VAELO ' + name, sku: String(p.id),
    category: kind(p.name), image: imgs, description: plain.slice(0, 500), brand: { '@type': 'Brand', name: 'VAELO' },
    offers: { '@type': 'Offer', url, priceCurrency: 'TRY', price: String(p.price), availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: String(ship), currency: 'TRY' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'TR' } } },
  };
  const variants = colorsOf(p);
  const vIds = new Set(variants.map((v) => v.id));
  const others = list.filter((o) => o.id !== p.id && !vIds.has(o.id) && (o.category || '') === (p.category || '') && (!isWatch(p) || o.grup === p.grup)).slice(0, 4);
  const colorHtml = variants.length > 1 ? `<p class="label">Renk: <span class="cname">${esc(parts(p.name).color)}</span></p>
    <div class="colors">${variants.map((v) => { const c = parts(v.name).color; return v.id === p.id
      ? `<span class="sw on" title="${esc(c)}" aria-current="true"><i style="background:${swatch(c)}"></i></span>`
      : `<a class="sw" href="${slug(v)}.html" title="${esc(c)}" aria-label="${esc(c)} rengi"><i style="background:${swatch(c)}"></i></a>`; }).join('')}</div>` : '';
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(meta)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(meta)}">
<meta property="og:url" content="${url}">
${imgs[0] ? `<meta property="og:image" content="${esc(imgs[0])}">` : ''}
<meta property="product:price:amount" content="${p.price}">
<meta property="product:price:currency" content="TRY">
<meta name="theme-color" content="#0A0A0A">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Jost:wght@300;400&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>
  :root{--black:#0A0A0A;--paper:#F3F1EC;--sand:#DFDBD2;--muted:#6B6861;--serif:"Cormorant Garamond",Georgia,serif;--sans:"Jost","Helvetica Neue",Arial,sans-serif}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--paper);color:var(--black);font-family:var(--sans);font-weight:300;-webkit-font-smoothing:antialiased}
  a{color:inherit}
  header{display:flex;justify-content:space-between;align-items:center;padding:22px 16px;max-width:1200px;margin:0 auto}
  .logo{font-family:var(--serif);font-size:28px;letter-spacing:6px;text-decoration:none}
  .back{font-size:13px;letter-spacing:1px;text-decoration:none;color:var(--muted)}
  .back:hover{color:var(--black)}
  main{max-width:1200px;margin:0 auto;padding:8px 16px 64px;display:grid;gap:40px}
  @media(min-width:860px){main{grid-template-columns:1.1fr 1fr;gap:64px;padding-top:24px}}
  .gallery{display:grid;gap:12px}
  .gallery img{width:100%;display:block;background:var(--sand);aspect-ratio:4/5;object-fit:cover}
  @media(max-width:859px){.gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:10px;margin:0 -16px;padding:0 16px}.gallery img{flex:0 0 82%;scroll-snap-align:center}}
  .info{align-self:start}
  @media(min-width:860px){.info{position:sticky;top:32px}}
  .cat{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--muted)}
  h1{font-family:var(--serif);font-weight:500;font-size:clamp(2rem,4vw,2.8rem);line-height:1.1;margin:10px 0 14px}
  .price{font-size:1.4rem;margin-bottom:24px}
  .paket{margin:-12px 0 24px;padding:12px 14px;border:1px solid var(--black);font-size:.95rem;line-height:1.5}
  .paket span{font-size:.8rem;color:var(--muted)}
  .colors{display:flex;gap:10px;margin:10px 0 24px}
  .sw{display:inline-flex;width:34px;height:34px;border-radius:50%;border:1px solid transparent;padding:3px;transition:border-color .2s}
  .sw i{display:block;width:100%;height:100%;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.18)}
  .sw:hover{border-color:var(--muted)}
  .sw.on{border-color:var(--black)}
  .cname{color:var(--black)}
  .sizes{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 26px}
  .sizes span{border:1px solid var(--sand);padding:8px 14px;font-size:13px}
  .st{margin:-10px 0 24px;font-size:13px}
  .st summary{cursor:pointer;text-decoration:underline;text-underline-offset:3px;color:var(--muted)}
  .st table{width:100%;border-collapse:collapse;margin-top:10px}
  .st th,.st td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--sand)}
  .st th{font-weight:400;color:var(--muted);font-size:11px;letter-spacing:1px;text-transform:uppercase}
  .stn{color:var(--muted);font-size:12px;line-height:1.6;margin-top:8px}
  .label{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)}
  .buy{display:block;text-align:center;background:var(--black);color:var(--paper);text-decoration:none;padding:17px;font-size:14px;letter-spacing:3px;text-transform:uppercase}
  .buy:hover{opacity:.88}
  .wa{display:block;text-align:center;border:1px solid var(--black);text-decoration:none;padding:15px;margin-top:10px;font-size:13px;letter-spacing:2px;text-transform:uppercase}
  .note{font-size:13px;color:var(--muted);line-height:1.7;margin-top:18px}
  .desc{margin-top:34px;border-top:1px solid var(--sand);padding-top:26px}
  .desc h3{font-family:var(--serif);font-weight:500;font-size:1.2rem;margin:20px 0 8px}
  .desc h3:first-child{margin-top:0}
  .desc ul{list-style:none}
  .desc li{font-size:.92rem;line-height:1.65;color:var(--muted);padding-left:16px;position:relative;margin-top:6px}
  .desc li::before{content:'\\2014';position:absolute;left:0;opacity:.4}
  .more{max-width:1200px;margin:0 auto;padding:0 16px 72px}
  .more h2{font-family:var(--serif);font-weight:500;font-size:1.8rem;margin-bottom:22px}
  .more .row{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
  @media(min-width:860px){.more .row{grid-template-columns:repeat(4,1fr)}}
  .more a{text-decoration:none;font-size:14px}
  .more img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;background:var(--sand);margin-bottom:10px}
  footer{text-align:center;font-size:12px;color:var(--muted);padding:32px 16px;border-top:1px solid var(--sand)}
</style>
${isWatch(p) ? '<style>.gallery img,.more img{object-fit:contain;mix-blend-mode:multiply;aspect-ratio:1/1;background:transparent}</style>' : ''}
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
var y=function(){s.parentNode.insertBefore(t,s)},c=null;try{c=localStorage.getItem('vaelo-cerez')}catch(x){}
if(c==='kabul')y();else b.addEventListener('vaelo:cerez',y,{once:true})}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
try{if(localStorage.getItem('vaelo-cerez')!=='kabul')fbq('consent','revoke');}catch(e){fbq('consent','revoke');}
fbq('init', '1784645619627330');
fbq('track', 'PageView');
fbq('track', 'ViewContent', { content_ids: ['${esc(p.id)}'], content_type: 'product_group', value: ${Number(p.price)}, currency: 'TRY' });
</script>
<!-- End Meta Pixel Code -->
<!-- Google Analytics -->
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}var vcz=null;try{vcz=localStorage.getItem('vaelo-cerez')}catch(e){}var vcg=vcz==='kabul'?'granted':'denied';gtag('consent','default',{ad_storage:vcg,analytics_storage:vcg,ad_user_data:vcg,ad_personalization:vcg});</script>
<script>(function(){function y(){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=G-KW2TETDD7C';document.head.appendChild(s)}var c=null;try{c=localStorage.getItem('vaelo-cerez')}catch(e){}if(c==='kabul')y();else document.addEventListener('vaelo:cerez',y,{once:true})})();</script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-KW2TETDD7C');</script>
</head>
<body>
<header>
  <a class="logo" href="/">VAĖLO</a>
  <a class="back" href="/#${isWatch(p) ? 'saat' : /street/i.test(p.category || '') ? 'street' : 'signature'}">← Koleksiyona dön</a>
</header>
<main>
  <div class="gallery">
    ${imgs.map((u, i) => `<img src="${esc(u)}" alt="VAELO ${esc(name)} – lüks ${kindLow(p.name)}${i ? ' (' + (i + 1) + ')' : ''}" ${i ? 'loading="lazy" ' : ''}referrerpolicy="no-referrer">`).join('\n    ')}
  </div>
  <div class="info" data-id="${esc(p.id)}" data-name="VAELO ${esc(name)}" data-price="${Number(p.price)}" data-img="${esc(imgs[0] || '')}">
    <p class="cat" lang="en">${isWatch(p) ? esc('VAELO Saat · ' + (GRUP[p.grup] || 'Koleksiyon')) : esc(/street/i.test(p.category || '') ? 'VAELO // Street Division' : 'Signature Premium') + ' · ' + kind(p.name)}</p>
    <h1>VAELO ${esc(name)}</h1>
    <p class="price">₺${fmt(p.price)}</p>
    ${paketNotu(p)}
    ${colorHtml}
    ${isWatch(p) ? '<div class="sizes" style="display:none"><span data-std>Standart</span></div>' : '<p class="label">Bedenler</p>\n    <div class="sizes"><span>S</span><span>M</span><span>L</span><span>XL</span><span>XXL</span></div>'}
    ${sizeTable(p.name)}
    <a class="buy" href="${esc(p.url ? shopier(p.url) : '/#' + (isWatch(p) ? 'saat' : /street/i.test(p.category || '') ? 'street' : 'signature'))}" rel="noopener">Satın Al</a>
    <a class="wa" href="https://wa.me/905513708320?text=${encodeURIComponent('Merhaba, VAELO ' + name + ' hakkında bilgi almak istiyorum.')}" target="_blank" rel="noopener">WhatsApp'tan Sor</a>
    ${isWatch(p) ? `<p class="note">Ödeme PayTR güvencesiyle yapılır. Tüm siparişlerde kargo ücretsiz. Saatler özel üretimdir; teslimat süresi 7-15 iş günüdür. Teslimattan itibaren 7 gün içinde iade talebi oluşturabilirsiniz, iade kargosu ücretsizdir; ürün bize ulaştıktan sonra incelenir, kullanılmamış ve orijinal durumundaysa iade onaylanır. <a href="/iade-degisim.html">İade Politikası</a> · <a href="/mesafeli-satis-sozlesmesi.html">Mesafeli Satış Sözleşmesi</a></p>` : `<p class="note">Ödeme PayTR güvencesiyle yapılır. Tüm siparişlerde kargo ücretsiz. Siparişler 2-3 iş günü içinde kargoya verilir. Ürünler siparişe özel üretilir. Teslimattan itibaren 7 gün içinde iade talebi oluşturabilirsiniz, iade kargosu ücretsizdir; ürün bize ulaştıktan sonra incelenir, kullanılmamış, yıkanmamış ve etiketi sökülmemişse iade onaylanır. 7 gün içinde beden değişimi de yapılabilir. <a href="/iade-degisim.html">İade Politikası</a> · <a href="/mesafeli-satis-sozlesmesi.html">Mesafeli Satış Sözleşmesi</a></p>`}
    <div class="desc">${descHtml(p.description)}</div>
    ${isWatch(p) ? '<div class="desc"><h3>Bakım ve Kullanım</h3><ul><li>Kullanımdan sonra yumuşak ve kuru bir bezle silin.</li><li>Parfüm, kimyasal ürünler ve güçlü manyetik alanlardan uzak tutun.</li><li>Sert darbelere ve aşırı sıcağa maruz bırakmayın.</li></ul></div>' : '<div class="desc"><h3>Yıkama Talimatı</h3><ul><li>Ters çevirerek yıkayın.</li><li>En düşük sıcaklıkta (en fazla 30°C) ve en hassas programda yıkayın.</li><li>Ağartıcı kullanmayın, kurutma makinesine atmayın, baskının üzerine ütü yapmayın.</li><li>Bu şartlarda yıkandığında baskı solma, çatlama veya atma yapmaz.</li></ul></div>'}
  </div>
</main>
${others.length ? `<section class="more"><h2>Bunları da beğenebilirsin</h2><div class="row">
${others.map((o) => `  <a href="${slug(o)}.html">${o.images && o.images[0] ? `<img src="${esc(o.images[0])}" alt="VAELO ${esc(clean(o.name))} – lüks ${kindLow(o.name)}" loading="lazy" referrerpolicy="no-referrer">` : ''}${esc(clean(o.name))}<br>₺${fmt(o.price)}</a>`).join('\n')}
</div></section>` : ''}
<footer>© ${new Date().getFullYear()} VAĖLO · Ecevit Yıldırım (VAELO) · <a href="/">vaelo.com.tr</a> · <a href="mailto:info@vaelo.com.tr">info@vaelo.com.tr</a> · <a href="/mesafeli-satis-sozlesmesi.html">Mesafeli Satış Sözleşmesi</a> · <a href="/gizlilik-politikasi.html">Gizlilik</a> · <a href="/kvkk-aydinlatma-metni.html">KVKK</a></footer>
<script src="/assets/sepet.js?v=4" defer></script>
<script src="/assets/cerez.js" defer></script>
<script>/* üyelik sistemi sayfa açıldıktan sonra yüklenir (site hızlı açılsın) */(function(){function y(){var s=document.createElement('script');s.type='module';s.src='/assets/uye.js?v=3';document.body.appendChild(s)}function g(){'requestIdleCallback' in window?requestIdleCallback(y,{timeout:2500}):setTimeout(y,1200)}document.readyState==='complete'?g():addEventListener('load',g)})();</script>
</body>
</html>
`;
}

fs.mkdirSync('urun', { recursive: true });
const keep = new Set();
for (const p of list) { const f = slug(p) + '.html'; keep.add(f); fs.writeFileSync('urun/' + f, page(p)); }
for (const f of fs.readdirSync('urun')) if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync('urun/' + f);   // satıştan kalkan ürünler

const urls = [SITE, SITE + 'iade-degisim.html', SITE + 'bayi.html', SITE + 'mesafeli-satis-sozlesmesi.html', SITE + 'on-bilgilendirme-formu.html', SITE + 'kvkk-aydinlatma-metni.html', SITE + 'gizlilik-politikasi.html', SITE + 'rehber/kaliteli-kapsonlu-sweatshirt-nasil-secilir.html', ...list.map((p) => SITE + 'urun/' + slug(p) + '.html')];
fs.writeFileSync('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n');
console.log(list.length + ' ürün sayfası yazıldı');

// Google Merchant Center ürün listesi (Google Alışveriş). Her beden ayrı satır.
const COLORS = ['Beyaz', 'Siyah', 'Lacivert', 'Gri', 'Bej', 'Kahverengi', 'Yeşil', 'Kırmızı', 'Mavi', 'Pembe'];
const colorOf = (n) => COLORS.find((c) => new RegExp(c, 'i').test(n)) || '';
const x = (s) => esc(String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''));
const items = [];
for (const p of list) {
  const name = clean(p.name), imgs = (p.images || []).filter((u) => /^https:\/\//.test(u));
  if (!imgs.length) continue;
  const desc = fixText(p.description).replace(/\s+/g, ' ').trim().slice(0, 4900) || `VAELO lüks ${kindLow(p.name)}`;
  const title = (isWatch(p) ? `VAELO ${name} | Lüks Kol Saati` : `VAELO ${name.replace(/\bHoodie\b/i, 'Kapşonlu Sweatshirt Hoodie')} | Oversize Unisex`).slice(0, 150);
  for (const size of (isWatch(p) ? ['Standart'] : ['S', 'M', 'L', 'XL', 'XXL'])) {
    items.push(`<item>
<g:id>${p.id}-${size}</g:id>
<g:item_group_id>${p.id}</g:item_group_id>
<g:title>${x(title)}</g:title>
<g:description>${x(desc)}</g:description>
<g:link>${SITE}urun/${slug(p)}.html</g:link>
<g:image_link>${x(imgs[0])}</g:image_link>
${imgs.slice(1, 10).map((u) => `<g:additional_image_link>${x(u)}</g:additional_image_link>`).join('\n')}
<g:availability>in_stock</g:availability>
<g:price>${Number(p.price).toFixed(2)} TRY</g:price>
<g:brand>VAELO</g:brand>
<g:condition>new</g:condition>
<g:identifier_exists>no</g:identifier_exists>
<g:google_product_category>${isWatch(p) ? 201 : 1604}</g:google_product_category>
<g:product_type>${x(kind(p.name))}</g:product_type>
<g:gender>${p.grup === 'kadin' ? 'female' : p.grup ? 'male' : 'unisex'}</g:gender>
<g:age_group>adult</g:age_group>
${isWatch(p) ? '' : `<g:size>${size}</g:size>`}
${colorOf(name) ? `<g:color>${colorOf(name)}</g:color>` : ''}
<g:shipping><g:country>TR</g:country><g:price>${Number(ship).toFixed(2)} TRY</g:price></g:shipping>
</item>`);
  }
}
fs.writeFileSync('google-urunler.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>VAELO</title>
<link>${SITE}</link>
<description>VAELO lüks kapşonlu sweatshirt, sweatshirt ve tişört</description>
${items.join('\n')}
</channel>
</rss>
`);
console.log(items.length + ' satırlık Google ürün listesi yazıldı');
