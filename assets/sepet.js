/* VAELO sepet ve PayTR ödeme
 * Şimdilik yalnızca deneme için açık: siteye ?odeme=test ile girildiğinde görünür.
 * PayTR onayı gelince CANLI = true yapılır ve herkese açılır.
 */
(function () {
  'use strict';
  var CANLI = true;
  var KASA = 'https://vaelo-odeme.vaeloaccessories.workers.dev/odeme';
  var UCRETSIZ_KARGO = 0, KARGO = 0;
  var BEDENLER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '38', '40', '42', '44', '46', '48', '50', 'Standart'];

  // ---- açık mı? ----
  var q = new URLSearchParams(location.search);
  try {
    if (q.get('odeme') === 'test') sessionStorage.setItem('vaelo-odeme', '1');
    if (q.get('odeme') === 'kapat') sessionStorage.removeItem('vaelo-odeme');
    if (q.get('kupon')) localStorage.setItem('vaelo-kupon', q.get('kupon').toUpperCase());
  } catch (e) {}
  var acik = CANLI;
  try { acik = acik || sessionStorage.getItem('vaelo-odeme') === '1'; } catch (e) {}
  if (!acik) return;

  // ---- sepet verisi ----
  var KEY = 'vaelo-sepet', mem = [];
  function oku() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return mem; } }
  function haber(ad, d) { try { document.dispatchEvent(new CustomEvent(ad, { detail: d })); } catch (e) {} }
  function yaz(s) { mem = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} ciz(); haber('vaelo:sepet', s); }
  function ekle(u) {
    var s = oku(), v = s.filter(function (x) { return x.id === u.id && x.size === u.size; })[0];
    if (v) v.qty = Math.min(10, v.qty + 1); else s.push({ id: u.id, name: u.name, price: u.price, img: u.img, size: u.size, qty: 1 });
    yaz(s);
  }
  // ---- indirim kodu (geçerli kodlar ve indirim kasada hesaplanır) ----
  var KUPONLAR = null, KKEY = 'vaelo-kupon';
  function kuponKod() { try { return (localStorage.getItem(KKEY) || '').toUpperCase(); } catch (e) { return ''; } }
  function kuponYaz(k) { try { if (k) localStorage.setItem(KKEY, k); else localStorage.removeItem(KKEY); } catch (e) {} }
  function aktifKupon() { var k = kuponKod(); return KUPONLAR && KUPONLAR[k] ? { kod: k, oran: KUPONLAR[k].oran || 0, kargo: !!KUPONLAR[k].kargo } : null; }
  // ---- 3'lü paket (yalnızca kasa destekliyorsa açılır; tutar kasada aynı şekilde hesaplanır) ----
  var PAKETLER = null;
  function paketle(s) {
    var birim = [], kullan = s.map(function () { return 0; }), gruplar = [];
    s.forEach(function (x, i) { for (var j = 0; j < x.qty; j++) birim.push({ i: i, id: String(x.id), price: x.price, ok: false }); });
    (PAKETLER || []).forEach(function (pk) {
      var uy = birim.filter(function (b) { return !b.ok && (pk.urunler || []).indexOf(b.id) >= 0; }).sort(function (a, b) { return b.price - a.price; });
      var n = Math.floor(uy.length / 3); if (!n) return;
      var normal = 0;
      uy.slice(0, n * 3).forEach(function (b) { b.ok = true; kullan[b.i]++; normal += b.price; });
      gruplar.push({ kod: pk.kod, ad: pk.ad, fiyat: pk.fiyat, adet: n, normal: normal });
    });
    return { gruplar: gruplar, kalan: s.map(function (x, i) { return x.qty - kullan[i]; }) };
  }
  function toplamlar(s) {
    var ara = s.reduce(function (t, x) { return t + x.price * x.qty; }, 0);
    var pk = paketle(s), paket = pk.gruplar.reduce(function (t, g) { return t + g.normal - g.fiyat * g.adet; }, 0);
    var k = aktifKupon(), indirim = 0;
    // yüzde indirim paket dışındaki ürünlere uygulanır
    if (k && k.oran) indirim = s.reduce(function (t, x, i) { return t + (x.price - Math.round(x.price * (100 - k.oran)) / 100) * pk.kalan[i]; }, 0);
    indirim = Math.round(indirim * 100) / 100;
    var kargo = ara === 0 || ara >= UCRETSIZ_KARGO || pk.gruplar.length || (k && k.kargo) ? 0 : KARGO;
    return { ara: ara, paket: paket, gruplar: pk.gruplar, indirim: indirim, kupon: k, kargo: kargo, toplam: ara - paket - indirim + kargo, adet: s.reduce(function (t, x) { return t + x.qty; }, 0) };
  }
  var GUVEN = '<p class="vs-safe"><img src="/assets/paytr-logo.svg" alt="PayTR">ile 256-bit SSL güvenli ödeme</p>';
  var tl = function (n) { return '₺' + Number(n).toLocaleString('tr-TR'); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---- görünüm ----
  var css = '' +
    '.vs-btn{position:fixed;left:22px;bottom:22px;z-index:99990;height:52px;padding:0 20px;border-radius:26px;border:1px solid #F3F1EC;background:#0A0A0A;color:#F3F1EC;font:400 13px/1 Jost,Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;gap:10px;box-shadow:0 10px 30px rgba(0,0,0,.25)}' +
    '.vs-btn b{background:#F3F1EC;color:#0A0A0A;border-radius:10px;min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;letter-spacing:0}' +
    '.vs-bg{position:fixed;inset:0;z-index:99995;background:rgba(10,10,10,.45);opacity:0;pointer-events:none;transition:opacity .35s}' +
    '.vs-open .vs-bg{opacity:1;pointer-events:auto}' +
    '.vs-panel{position:fixed;top:0;right:0;bottom:0;z-index:99996;width:min(440px,100%);background:#F3F1EC;color:#0A0A0A;font-family:Jost,Helvetica,Arial,sans-serif;font-weight:300;transform:translateX(100%);transition:transform .45s cubic-bezier(.16,.84,.24,1);display:flex;flex-direction:column}' +
    '.vs-open .vs-panel{transform:none}' +
    '.vs-head{display:flex;justify-content:space-between;align-items:center;padding:22px 22px 18px;border-bottom:1px solid #DFDBD2}' +
    '.vs-head h2{font:500 1.6rem/1 "Cormorant Garamond",Georgia,serif;margin:0}' +
    '.vs-x{background:none;border:0;font-size:26px;line-height:1;cursor:pointer;color:inherit;padding:4px 8px}' +
    '.vs-body{flex:1;overflow:auto;padding:8px 22px 22px}' +
    '.vs-item{display:grid;grid-template-columns:72px 1fr auto;gap:14px;padding:16px 0;border-bottom:1px solid #DFDBD2;align-items:start}' +
    '.vs-item img{width:72px;height:90px;object-fit:cover;background:#DFDBD2}' +
    '.vs-item h3{font-size:.92rem;font-weight:400;margin:0 0 4px}' +
    '.vs-item p{font-size:.8rem;color:#6B6861;margin:0 0 10px}' +
    '.vs-qty{display:inline-flex;border:1px solid #0A0A0A}.vs-qty button{width:28px;height:28px;background:none;border:0;cursor:pointer;font-size:15px;color:inherit}.vs-qty span{width:28px;text-align:center;line-height:28px;font-size:.85rem}' +
    '.vs-del{background:none;border:0;color:#6B6861;font-size:.75rem;text-decoration:underline;cursor:pointer;padding:0}' +
    '.vs-sum{padding:18px 22px calc(18px + env(safe-area-inset-bottom,0px));border-top:1px solid #DFDBD2;font-size:.9rem}' +
    '.vs-row{display:flex;justify-content:space-between;margin:4px 0}.vs-row.t{font-size:1.05rem;font-weight:400;margin-top:10px}' +
    '.vs-go{display:block;width:100%;margin-top:14px;padding:16px;background:#0A0A0A;color:#F3F1EC;border:0;font:400 13px Jost,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}' +
    '.vs-go[disabled]{opacity:.5;cursor:default}' +
    '.vs-safe{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;font-size:.75rem;color:#6B6861}.vs-safe img{height:13px;width:auto}' +
    '.vs-empty{text-align:center;color:#6B6861;padding:60px 0;font-size:.95rem}' +
    '.vs-f label{display:block;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:#6B6861;margin:16px 0 6px}' +
    '.vs-f input,.vs-f textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid #DFDBD2;background:#fff;font:300 16px Jost,Helvetica,Arial,sans-serif;color:#0A0A0A;border-radius:0}' +
    '.vs-f textarea{min-height:88px;resize:vertical}' +
    '.vs-ok{display:flex;gap:10px;align-items:flex-start;font-size:.82rem;line-height:1.55;margin-top:18px;color:#3a3833}.vs-ok input{width:18px;height:18px;margin-top:2px;flex:none}' +
    '.vs-err{color:#9b2c2c;font-size:.85rem;margin-top:12px;min-height:1em}' +
    '.vs-back{background:none;border:0;color:#6B6861;font-size:.8rem;cursor:pointer;padding:0;margin-top:14px;text-decoration:underline}' +
    '.vs-pay{position:fixed;inset:0;z-index:99999;background:#F3F1EC;display:none;flex-direction:column}.vs-pay.on{display:flex}' +
    '.vs-pay .vs-head{background:#F3F1EC}.vs-pay iframe{flex:1;width:100%;border:0;background:#fff}' +
    '.vs-test{background:#0A0A0A;color:#F3F1EC;font-size:.72rem;letter-spacing:.08em;text-align:center;padding:6px}' +
    '.vs-add{display:block;width:100%;margin:22px 0 10px;padding:17px;background:#0A0A0A;color:#F3F1EC;border:0;font:400 13px Jost,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}' +
    '.vs-sizes span{cursor:pointer;user-select:none}.vs-sizes span.on{background:#0A0A0A;color:#F3F1EC;border-color:#0A0A0A}' +
    '.vs-hint{font-size:.8rem;color:#9b2c2c;min-height:1em;margin:0}' +
    '.vs-kp{display:flex;gap:8px;margin:2px 0 12px}.vs-kp input{flex:1;min-width:0;padding:10px 12px;border:1px solid #DFDBD2;background:#fff;font:300 15px Jost,Helvetica,Arial,sans-serif;color:#0A0A0A;text-transform:uppercase;border-radius:0}' +
    '.vs-kp button{padding:0 16px;background:none;border:1px solid #0A0A0A;color:#0A0A0A;font:400 11px Jost,Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}' +
    '.vs-kpok{display:flex;justify-content:space-between;align-items:center;margin:2px 0 12px;padding:10px 12px;background:#0A0A0A;color:#F3F1EC;font-size:.8rem;letter-spacing:.06em}.vs-kpok button{background:none;border:0;color:#F3F1EC;opacity:.7;cursor:pointer;font-size:.75rem;text-decoration:underline}' +
    '.vs-kperr{color:#9b2c2c;font-size:.78rem;margin:-6px 0 10px;min-height:0}' +
    '@media (max-width:600px){.vs-btn{left:16px;bottom:16px;height:48px;padding:0 16px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var kok = document.createElement('div');
  kok.innerHTML =
    '<button class="vs-btn" type="button" aria-label="Sepeti aç">Sepet <b>0</b></button>' +
    '<div class="vs-bg"></div>' +
    '<aside class="vs-panel" role="dialog" aria-label="Sepet">' +
    '<div class="vs-head"><h2>Sepetiniz</h2><button class="vs-x" type="button" aria-label="Kapat">×</button></div>' +
    '<div class="vs-body"></div><div class="vs-sum"></div></aside>' +
    '<div class="vs-pay" role="dialog" aria-label="Güvenli ödeme"><div class="vs-head"><h2>Güvenli Ödeme</h2><button class="vs-x" type="button" aria-label="Ödemeyi kapat">×</button></div><iframe id="paytriframe" title="PayTR güvenli ödeme" scrolling="yes"></iframe></div>';
  document.body.appendChild(kok);
  var btn = kok.querySelector('.vs-btn'), body = kok.querySelector('.vs-body'), sum = kok.querySelector('.vs-sum');
  var pay = kok.querySelector('.vs-pay');
  var adim = 'sepet';

  function ac() { document.documentElement.classList.add('vs-open'); }
  function kapat() { document.documentElement.classList.remove('vs-open'); adim = 'sepet'; ciz(); }
  btn.onclick = function () { adim = 'sepet'; ciz(); ac(); };
  kok.querySelector('.vs-bg').onclick = kapat;
  kok.querySelector('.vs-panel .vs-x').onclick = kapat;
  pay.querySelector('.vs-x').onclick = function () { pay.classList.remove('on'); pay.querySelector('iframe').src = 'about:blank'; };

  function ciz() {
    var s = oku(), t = toplamlar(s);
    btn.querySelector('b').textContent = t.adet;
    if (adim === 'form' && s.length) return formCiz(t);
    if (!s.length) { body.innerHTML = '<p class="vs-empty">Sepetiniz boş.</p>'; sum.innerHTML = ''; return; }
    body.innerHTML = s.map(function (x, i) {
      return '<div class="vs-item">' + (x.img ? '<img src="' + esc(x.img) + '" alt="" referrerpolicy="no-referrer">' : '<span></span>') +
        '<div><h3>' + esc(x.name) + '</h3><p>' + (x.size === 'Standart' ? '' : 'Beden: ' + esc(x.size) + ' · ') + tl(x.price) + '</p>' +
        '<div class="vs-qty"><button type="button" data-a="-" data-i="' + i + '" aria-label="Azalt">−</button><span>' + x.qty + '</span><button type="button" data-a="+" data-i="' + i + '" aria-label="Artır">+</button></div></div>' +
        '<button class="vs-del" type="button" data-a="x" data-i="' + i + '">Kaldır</button></div>';
    }).join('');
    sum.innerHTML = kuponAlani(t) + ozet(t) + '<button class="vs-go" type="button">Ödemeye Geç</button>' + GUVEN;
    sum.querySelector('.vs-go').onclick = function () { adim = 'form'; ciz(); };
    kuponBagla();
  }
  function kuponAlani(t) {
    if (!KUPONLAR) return '';
    if (t.kupon) return '<div class="vs-kpok"><span>✓ ' + esc(t.kupon.kod) + ' · ' + (t.kupon.oran ? '%' + t.kupon.oran + ' indirim' : 'Kargo ücretsiz') + '</span><button type="button" data-kp="sil">Kaldır</button></div>';
    return '<div class="vs-kp"><input placeholder="İndirim kodu" aria-label="İndirim kodu" autocomplete="off"><button type="button" data-kp="ekle">Uygula</button></div><p class="vs-kperr" aria-live="polite"></p>';
  }
  function kuponBagla() {
    var sil = sum.querySelector('[data-kp="sil"]'); if (sil) sil.onclick = function () { kuponYaz(''); ciz(); };
    var ek = sum.querySelector('[data-kp="ekle"]'); if (!ek) return;
    var inp = sum.querySelector('.vs-kp input');
    ek.onclick = inp.onkeydown = function (e) {
      if (e.type === 'keydown' && e.key !== 'Enter') return;
      var k = inp.value.trim().toUpperCase().replace(/\s+/g, '');
      if (!k) return;
      if (!KUPONLAR[k]) { sum.querySelector('.vs-kperr').textContent = 'Bu kod geçerli değil.'; return; }
      kuponYaz(k); ciz();
    };
  }
  function ozet(t) {
    return '<div class="vs-row"><span>Ara toplam</span><span>' + tl(t.ara) + '</span></div>' +
      (t.paket ? t.gruplar.map(function (g) { return '<div class="vs-row"><span>' + esc(g.ad) + (g.adet > 1 ? ' ×' + g.adet : '') + '</span><span>−' + tl(g.normal - g.fiyat * g.adet) + '</span></div>'; }).join('') : '') +
      (t.indirim ? '<div class="vs-row"><span>İndirim (' + esc(t.kupon.kod) + ')</span><span>−' + tl(t.indirim) + '</span></div>' : '') +
      '<div class="vs-row"><span>Kargo</span><span>' + (t.kargo ? tl(t.kargo) : 'Ücretsiz') + '</span></div>' +
      (t.kargo ? '<div class="vs-row" style="font-size:.78rem;color:#6B6861"><span>' + (PAKETLER ? '3\'lü pakette veya ' : '') + tl(UCRETSIZ_KARGO) + ' üzeri kargo ücretsiz</span></div>' : '') +
      (t.hediye ? '<div class="vs-row"><span>Hediye paketi</span><span>' + tl(t.hediye) + '</span></div>' : '') +
      '<div class="vs-row t"><span>Toplam</span><span>' + tl(t.toplam) + '</span></div>';
  }
  body.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var s = oku(), i = +b.dataset.i; if (!s[i]) return;
    if (b.dataset.a === '+') s[i].qty = Math.min(10, s[i].qty + 1);
    if (b.dataset.a === '-') s[i].qty -= 1;
    if (b.dataset.a === 'x' || s[i].qty < 1) s.splice(i, 1);
    yaz(s);
  });

  // Kasa paketi destekliyorsa: güncel fiyatları ve paketleri ürün listesinden al.
  function paketAc() {
    fetch('/products.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.paketler || !d.paketler.length) return;
      PAKETLER = d.paketler;
      var fiyat = {}; (d.products || []).forEach(function (p) { fiyat[String(p.id)] = Number(p.price); });
      var s = oku(), degisti = false;
      s.forEach(function (x) { var f = fiyat[String(x.id)]; if (f && f !== x.price) { x.price = f; degisti = true; } });
      if (degisti) yaz(s); else ciz();
      document.querySelectorAll('.paket[hidden]').forEach(function (el) { el.hidden = false; });
    }).catch(function () {});
  }
  var form = {}, HEDIYE = 0;
  // Hediye paketi seçeneği yalnızca kasa destekliyorsa görünür (fiyat kasada hesaplanır).
  fetch(KASA.replace(/\/odeme$/, '/surum')).then(function (r) { return r.json(); }).then(function (d) {
    HEDIYE = Number(d.hediye) || 0;
    if (d.paket) paketAc();
    // Kasa indirim kodlarını destekliyorsa kupon alanı ve hoş geldin çarkı açılır.
    if (d.kuponlar) {
      KUPONLAR = d.kuponlar;
      if (!/\/(admin|odeme-|hesap-)/.test(location.pathname)) { var sc = document.createElement('script'); sc.src = '/assets/cark.js?v=2'; sc.defer = true; document.head.appendChild(sc); }
    }
    ciz();
  }).catch(function () {});
  document.addEventListener('vaelo:kupon', function (e) { if (e.detail && e.detail.kod) { kuponYaz(String(e.detail.kod).toUpperCase()); ciz(); } });
  function formCiz(t) {
    var g = HEDIYE && form.gift ? HEDIYE : 0; t = { ara: t.ara, paket: t.paket, gruplar: t.gruplar, indirim: t.indirim, kupon: t.kupon, kargo: t.kargo, hediye: g, toplam: t.toplam + g, adet: t.adet };
    body.innerHTML = '<form class="vs-f" novalidate>' +
      '<label for="vs-ad">Ad soyad</label><input id="vs-ad" name="name" autocomplete="name" required>' +
      '<label for="vs-ep">E-posta</label><input id="vs-ep" name="email" type="email" autocomplete="email" required>' +
      '<label for="vs-tel">Telefon</label><input id="vs-tel" name="phone" type="tel" autocomplete="tel" placeholder="05xx xxx xx xx" required>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label for="vs-il">İl</label><input id="vs-il" name="city" autocomplete="address-level1" required></div><div><label for="vs-ilce">İlçe</label><input id="vs-ilce" name="district" autocomplete="address-level2" required></div></div>' +
      '<label for="vs-adr">Açık adres</label><textarea id="vs-adr" name="address" autocomplete="street-address" placeholder="Mahalle, sokak, bina ve daire no" required></textarea>' +
      (HEDIYE ? '<div class="vs-ok"><input id="vs-hediye" type="checkbox"' + (form.gift ? ' checked' : '') + '><label for="vs-hediye" style="all:unset"><strong style="font-weight:500">Hediye paketi</strong> (+' + tl(HEDIYE) + ') — özel kutu ve paketleme ile gönderilsin</label></div>' : '') +
      '<div class="vs-ok"><input id="vs-onay" type="checkbox"' + (form.onay ? ' checked' : '') + '><label for="vs-onay" style="all:unset"><a href="/on-bilgilendirme-formu.html" target="_blank">Ön Bilgilendirme Formu</a>’nu ve <a href="/mesafeli-satis-sozlesmesi.html" target="_blank">Mesafeli Satış Sözleşmesi</a>’ni okudum, kabul ediyorum.</label></div>' +
      '<p style="font-size:12px;opacity:.7;margin:6px 0 0">Bilgileriniz siparişinizin hazırlanması ve teslimi için <a href="/kvkk-aydinlatma-metni.html" target="_blank">KVKK Aydınlatma Metni</a> kapsamında işlenir.</p>' +
      '<p class="vs-err" aria-live="polite"></p>' +
      '<button class="vs-back" type="button">← Sepete dön</button></form>';
    var f = body.querySelector('form');
    var u = window.VAELO_UYE; if (u) { if (!form.name && u.ad) form.name = u.ad; if (!form.email && u.email) form.email = u.email; }
    ['name', 'email', 'phone', 'city', 'district', 'address'].forEach(function (k) { if (form[k]) f.elements[k].value = form[k]; f.elements[k].oninput = function () { form[k] = this.value; }; });
    f.querySelector('.vs-back').onclick = function () { adim = 'sepet'; ciz(); };
    f.querySelector('#vs-onay').onchange = function () { form.onay = this.checked; };
    var hk = f.querySelector('#vs-hediye'); if (hk) hk.onchange = function () { form.gift = hk.checked; ciz(); };
    sum.innerHTML = ozet(t) + '<button class="vs-go" type="button">Güvenli Öde · ' + tl(t.toplam) + '</button>' + GUVEN;
    var go = sum.querySelector('.vs-go'), err = f.querySelector('.vs-err');
    go.onclick = function () {
      err.textContent = '';
      if (!f.querySelector('#vs-onay').checked) { err.textContent = 'Devam etmek için sözleşmeleri onaylamanız gerekiyor.'; return; }
      var veri = { name: f.elements.name.value, email: f.elements.email.value, phone: f.elements.phone.value, city: f.elements.city.value, district: f.elements.district.value, address: f.elements.address.value,
        gift: !!(HEDIYE && form.gift),
        kupon: t.kupon ? t.kupon.kod : '',
        items: oku().map(function (x) { return { id: x.id, size: x.size, qty: x.qty }; }) };
      go.disabled = true; go.textContent = 'Ödeme ekranı açılıyor…';
      fetch(KASA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(veri) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) throw new Error(d.error || 'Bir sorun oluştu.');
          if (window.gtag) gtag('event', 'begin_checkout', { currency: 'TRY', value: d.total });
          if (window.fbq) fbq('track', 'InitiateCheckout', { value: d.total, currency: 'TRY' });
          try { sessionStorage.setItem('vaelo-tutar', String(d.total)); } catch (e3) {}
          haber('vaelo:odeme', { order: d.order, total: d.total, veri: veri, urunler: oku() });
          var fr = pay.querySelector('iframe'); fr.src = d.iframe; pay.classList.add('on');
          go.disabled = false; go.textContent = 'Güvenli Öde · ' + tl(t.toplam);
        })
        .catch(function (e2) {
          err.textContent = e2.message && !/fetch|network|json/i.test(e2.message) ? e2.message : 'Bağlantı kurulamadı. Lütfen tekrar deneyin veya bize ulaşın.';
          go.disabled = false; go.textContent = 'Güvenli Öde · ' + tl(t.toplam);
        });
    };
  }

  // ---- ürün sayfası: beden seç + sepete ekle ----
  var info = document.querySelector('.info[data-id]');
  if (info) {
    var secili = '', sizes = info.querySelector('.sizes');
    sizes.classList.add('vs-sizes');
    sizes.querySelectorAll('span').forEach(function (sp) {
      if (BEDENLER.indexOf(sp.textContent.trim()) < 0) return;
      sp.setAttribute('role', 'button'); sp.tabIndex = 0;
      sp.onclick = sp.onkeydown = function (e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        sizes.querySelectorAll('span').forEach(function (o) { o.classList.remove('on'); });
        sp.classList.add('on'); secili = sp.textContent.trim(); ipucu.textContent = '';
      };
    });
    if (sizes.querySelector('span[data-std]')) secili = 'Standart';   // saatlerde beden yok
    var ipucu = document.createElement('p'); ipucu.className = 'vs-hint'; ipucu.setAttribute('aria-live', 'polite');
    var ekleBtn = document.createElement('button'); ekleBtn.type = 'button'; ekleBtn.className = 'vs-add'; ekleBtn.textContent = 'Sepete Ekle';
    var buy = info.querySelector('.buy');
    info.insertBefore(ekleBtn, buy); info.insertBefore(ipucu, buy);
    if (buy) buy.style.display = 'none';
    ekleBtn.onclick = function () {
      if (!secili) { ipucu.textContent = 'Lütfen bir beden seçin.'; return; }
      ekle({ id: info.dataset.id, name: info.dataset.name, price: +info.dataset.price, img: info.dataset.img, size: secili });
      haber('vaelo:ekle', { id: info.dataset.id, name: info.dataset.name });
      if (window.gtag) gtag('event', 'add_to_cart', { currency: 'TRY', value: +info.dataset.price });
      if (window.fbq) fbq('track', 'AddToCart', { content_ids: [info.dataset.id], content_type: 'product_group', value: +info.dataset.price, currency: 'TRY' });
      adim = 'sepet'; ciz(); ac();
    };
  }
  // ürün sayfasında beden bulucu
  if (info && !info.querySelector('[data-std]') && !info.querySelector('[data-kadin]')) { var bj = document.createElement('script'); bj.src = '/assets/beden.js?v=2'; bj.defer = true; document.head.appendChild(bj); }
  // Menüdeki "Sepetim" bağlantısı sepeti açar.
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href="#sepet"]'); if (!a) return; e.preventDefault(); e.stopPropagation(); adim = 'sepet'; ciz(); ac(); }, true);
  if (location.hash === '#sepet') { ciz(); ac(); }
  ciz();
})();
