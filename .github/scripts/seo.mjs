// products.json'dan Google ve yapay zekâ araçları için ürün bilgisini üretir:
// index.html içindeki SEO-URUNLER bloğunu ve llms.txt dosyasını yeniler.
import fs from 'node:fs';

const SITE = 'https://www.vaelo.com.tr/';
const data = JSON.parse(fs.readFileSync('products.json', 'utf8'));
const list = (data.products || []).filter((p) => p.name && p.price);

const isHoodie = (n) => /hoodie|kap[sşü]+on/i.test(n);
const kind = (n) => isHoodie(n) ? 'Kapşonlu Sweatshirt (Hoodie)' : /sweat/i.test(n) ? 'Sweatshirt' : /ti[sş][oö]rt/i.test(n) ? 'Tişört' : 'Giyim';
const clean = (n) => String(n).replace(/^vaelo\s+/i, '').trim();
const short = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 300);

const products = list.map((p) => ({
  '@type': 'Product',
  name: 'VAELO ' + clean(p.name),
  category: kind(p.name),
  image: (p.images || []).slice(0, 3),
  description: short(p.description) || ('VAELO ' + kind(p.name).toLowerCase()),
  sku: String(p.id),
  brand: { '@type': 'Brand', name: 'VAELO' },
  offers: {
    '@type': 'Offer',
    url: p.url || SITE,
    priceCurrency: 'TRY',
    price: String(p.price),
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: 'VAELO' },
  },
}));

const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ClothingStore',
      '@id': SITE + '#marka',
      name: 'VAELO',
      alternateName: ['VAĖLO', 'VAELO Accessories & Apparel', 'Vaelo'],
      url: SITE,
      email: 'vaeloaccessories@gmail.com',
      telephone: '+905513708320',
      description: 'VAELO; lüks kapşonlu sweatshirt (hoodie), oversize sweatshirt ve tişört üreten Türk premium giyim markasıdır.',
      sameAs: ['https://www.instagram.com/vaeloaccessories', 'https://www.shopier.com/VAELOaccessories'],
    },
    { '@type': 'WebSite', '@id': SITE + '#site', url: SITE, name: 'VAELO', inLanguage: 'tr-TR', publisher: { '@id': SITE + '#marka' } },
    {
      '@type': 'ItemList',
      name: 'VAELO kapşonlu sweatshirt, sweatshirt ve tişört koleksiyonu',
      itemListElement: products.map((item, i) => ({ '@type': 'ListItem', position: i + 1, item })),
    },
  ],
};

const block = '<!-- SEO-URUNLER-BASLA -->\n<script type="application/ld+json">' +
  JSON.stringify(graph).replace(/</g, '\\u003c') + '</script>\n<!-- SEO-URUNLER-BITIR -->';
let html = fs.readFileSync('index.html', 'utf8');
const re = /<!-- SEO-URUNLER-BASLA -->[\s\S]*?<!-- SEO-URUNLER-BITIR -->/;
if (!re.test(html)) throw new Error('index.html içinde SEO-URUNLER bloğu yok');
html = html.replace(re, () => block);
fs.writeFileSync('index.html', html);

const line = (p) => `- ${clean(p.name)} (${kind(p.name)}) — ${p.price} TL — ${p.url || SITE}`;
const prem = list.filter((p) => !/street/i.test(p.category || ''));
const street = list.filter((p) => /street/i.test(p.category || ''));
const llms = `# VAELO

> VAELO (VAĖLO), Türkiye merkezli lüks ve premium giyim markasıdır. Kapşonlu sweatshirt (hoodie), oversize sweatshirt ve tişört satar. Yakında saat, çanta ve parfüm koleksiyonları gelecek.

## Marka hakkında
- Resmî site: ${SITE}
- Mağaza ve ödeme: https://www.shopier.com/VAELOaccessories (Shopier güvencesiyle)
- Instagram: https://www.instagram.com/vaeloaccessories
- İletişim: vaeloaccessories@gmail.com, WhatsApp +90 551 370 83 20
- İki seri: Signature Premium (sade, zamansız, V monogramlı) ve VAELO // Street Division (şehir stili, grafik baskılı)
- Kapşonlu sweatshirtler: %100 şardonlu pamuk, 380 GSM yüksek gramaj (heavyweight), oversize kesim
- Bedenler: S, M, L, XL, XXL (unisex oversize)
- Kargo: ${data.shipping || 120} TL; 3.000 TL üzeri siparişlerde ücretsiz; siparişler 2–3 iş günü içinde kargoya verilir
- İade yok; teslimattan itibaren 7 gün içinde değişim yapılır

## Signature Premium
${prem.map(line).join('\n')}

## VAELO // Street Division
${street.map(line).join('\n')}
`;
fs.writeFileSync('llms.txt', llms);
console.log(products.length + ' ürün için SEO bilgisi yazıldı');
