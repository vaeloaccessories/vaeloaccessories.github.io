# Ödeme ve Printitürk notları

- Kasa: Cloudflare Worker `vaelo-odeme` (kod: worker.js). Ayarlar: PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY (gizli), PAYTR_MERCHANT_SALT (gizli), PAYTR_TEST_MODE, PRINTITURK_TOKEN (gizli), KV bağlantısı SIPARISLER.
- Ödeme onaylanınca sipariş Printitürk Özel API'ye `product_sku = VAELO-<Shopier ürün id>` ile gider; Printitürk'te "Ödeme Bekliyor"a düşer. Deneme modunda gönderilmez.
- Printitürk Özel API eşleştirmeleri (VAELO-<id>) ve tasarımları (6 Ekim 2026, siteye göre düzenlendi):
  - Signature: hoodie 5308 siyah, 5320 lacivert, 5321 beyaz · sweat 5317 siyah, 5318 lacivert, 5319 beyaz · tişört 5315 siyah, 5316 beyaz (beyaza siyah V, koyulara beyaz V, sol göğüs)
  - Street: 5309 hoodie siyah oval, 5310 lacivert oval, 5313 siyah etiket, 5312 lacivert etiket, 5314 tişört siyah grafik, 5311 tişört beyaz grafik
  - 5377 hoodie siyah altın grafik, 5378 lacivert altın grafik, 5379 tişört siyah V logo (7 Ekim 2026)
  - 17 ürünün hepsi eşleştirildi.
