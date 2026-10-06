/* VAELO sepet ve PayTR ödeme
 * Şimdilik yalnızca deneme için açık: siteye ?odeme=test ile girildiğinde görünür.
 * PayTR onayı gelince CANLI = true yapılır ve herkese açılır.
 */
(function () {
  'use strict';
  var CANLI = false;
  var KASA = 'https://vaelo-odeme.vaeloaccessories.workers.dev/odeme';
  var UCRETSIZ_KARGO = 3000, KARGO = 120;
  var BEDENLER = ['S', 'M', 'L', 'XL', 'XXL'];

  // ---- açık mı? ----
  var q = new URLSearchParams(location.search);
  try {
    if (q.get('odeme') === 'test') sessionStorage.setItem('vaelo-odeme', '1');
    if (q.get('odeme') === 'kapat') sessionStorage.removeItem('vaelo-odeme');
  } catch (e) {}
  var acik = CANLI;
  try { acik = acik || sessionStorage.getItem('vaelo-odeme') === '1'; } catch (e) {}
  if (!acik) return;

  // ---- sepet verisi ----
  var KEY = 'vaelo-sepet', mem = [];
  function oku() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return mem; } }
  function yaz(s) { mem = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} ciz(); }
  function ekle(u) {
    var s = oku(), v = s.filter(function (x) { return x.id === u.id && x.size === u.size; })[0];
    if (v) v.qty = Math.min(10, v.qty + 1); else s.push({ id: u.id, name: u.name, price: u.price, img: u.img, size: u.size, qty: 1 });
    yaz(s);
  }
  function toplamlar(s) {
    var ara = s.reduce(function (t, x) { return t + x.price * x.qty; }, 0);
    var kargo = ara === 0 || ara >= UCRETSIZ_KARGO ? 0 : KARGO;
    return { ara: ara, kargo: kargo, toplam: ara + kargo, adet: s.reduce(function (t, x) { return t + x.qty; }, 0) };
  }
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
    '@media (max-width:600px){.vs-btn{left:16px;bottom:16px;height:48px;padding:0 16px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var kok = document.createElement('div');
  kok.innerHTML =
    '<button class="vs-btn" type="button" aria-label="Sepeti aç">Sepet <b>0</b></button>' +
    '<div class="vs-bg"></div>' +
    '<aside class="vs-panel" role="dialog" aria-label="Sepet"><div class="vs-test">DENEME MODU · gerçek ödeme alınmaz</div>' +
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
        '<div><h3>' + esc(x.name) + '</h3><p>Beden: ' + esc(x.size) + ' · ' + tl(x.price) + '</p>' +
        '<div class="vs-qty"><button type="button" data-a="-" data-i="' + i + '" aria-label="Azalt">−</button><span>' + x.qty + '</span><button type="button" data-a="+" data-i="' + i + '" aria-label="Artır">+</button></div></div>' +
        '<button class="vs-del" type="button" data-a="x" data-i="' + i + '">Kaldır</button></div>';
    }).join('');
    sum.innerHTML = ozet(t) + '<button class="vs-go" type="button">Ödemeye Geç</button>';
    sum.querySelector('.vs-go').onclick = function () { adim = 'form'; ciz(); };
  }
  function ozet(t) {
    return '<div class="vs-row"><span>Ara toplam</span><span>' + tl(t.ara) + '</span></div>' +
      '<div class="vs-row"><span>Kargo</span><span>' + (t.kargo ? tl(t.kargo) : 'Ücretsiz') + '</span></div>' +
      (t.kargo ? '<div class="vs-row" style="font-size:.78rem;color:#6B6861"><span>' + tl(UCRETSIZ_KARGO) + ' üzeri kargo ücretsiz</span></div>' : '') +
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

  var form = {};
  function formCiz(t) {
    body.innerHTML = '<form class="vs-f" novalidate>' +
      '<label for="vs-ad">Ad soyad</label><input id="vs-ad" name="name" autocomplete="name" required>' +
      '<label for="vs-ep">E-posta</label><input id="vs-ep" name="email" type="email" autocomplete="email" required>' +
      '<label for="vs-tel">Telefon</label><input id="vs-tel" name="phone" type="tel" autocomplete="tel" placeholder="05xx xxx xx xx" required>' +
      '<label for="vs-adr">Teslimat adresi</label><textarea id="vs-adr" name="address" autocomplete="street-address" placeholder="Mahalle, sokak, bina/daire no, ilçe / il" required></textarea>' +
      '<div class="vs-ok"><input id="vs-onay" type="checkbox"><label for="vs-onay" style="all:unset"><a href="/on-bilgilendirme-formu.html" target="_blank">Ön Bilgilendirme Formu</a>’nu ve <a href="/mesafeli-satis-sozlesmesi.html" target="_blank">Mesafeli Satış Sözleşmesi</a>’ni okudum, kabul ediyorum.</label></div>' +
      '<p class="vs-err" aria-live="polite"></p>' +
      '<button class="vs-back" type="button">← Sepete dön</button></form>';
    var f = body.querySelector('form');
    ['name', 'email', 'phone', 'address'].forEach(function (k) { if (form[k]) f.elements[k].value = form[k]; f.elements[k].oninput = function () { form[k] = this.value; }; });
    f.querySelector('.vs-back').onclick = function () { adim = 'sepet'; ciz(); };
    sum.innerHTML = ozet(t) + '<button class="vs-go" type="button">Güvenli Öde · ' + tl(t.toplam) + '</button>';
    var go = sum.querySelector('.vs-go'), err = f.querySelector('.vs-err');
    go.onclick = function () {
      err.textContent = '';
      if (!f.querySelector('#vs-onay').checked) { err.textContent = 'Devam etmek için sözleşmeleri onaylamanız gerekiyor.'; return; }
      var veri = { name: f.elements.name.value, email: f.elements.email.value, phone: f.elements.phone.value, address: f.elements.address.value,
        items: oku().map(function (x) { return { id: x.id, size: x.size, qty: x.qty }; }) };
      go.disabled = true; go.textContent = 'Ödeme ekranı açılıyor…';
      fetch(KASA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(veri) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) throw new Error(d.error || 'Bir sorun oluştu.');
          if (window.gtag) gtag('event', 'begin_checkout', { currency: 'TRY', value: d.total });
          var fr = pay.querySelector('iframe'); fr.src = d.iframe; pay.classList.add('on');
          go.disabled = false; go.textContent = 'Güvenli Öde · ' + tl(t.toplam);
        })
        .catch(function (e2) {
          err.textContent = e2.message && !/fetch|network|json/i.test(e2.message) ? e2.message : 'Bağlantı kurulamadı. Lütfen tekrar deneyin veya WhatsApp’tan bize yazın.';
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
    var ipucu = document.createElement('p'); ipucu.className = 'vs-hint'; ipucu.setAttribute('aria-live', 'polite');
    var ekleBtn = document.createElement('button'); ekleBtn.type = 'button'; ekleBtn.className = 'vs-add'; ekleBtn.textContent = 'Sepete Ekle';
    var buy = info.querySelector('.buy');
    info.insertBefore(ekleBtn, buy); info.insertBefore(ipucu, buy);
    if (buy) buy.style.display = 'none';
    ekleBtn.onclick = function () {
      if (!secili) { ipucu.textContent = 'Lütfen bir beden seçin.'; return; }
      ekle({ id: info.dataset.id, name: info.dataset.name, price: +info.dataset.price, img: info.dataset.img, size: secili });
      if (window.gtag) gtag('event', 'add_to_cart', { currency: 'TRY', value: +info.dataset.price });
      adim = 'sepet'; ciz(); ac();
    };
  }
  ciz();
})();
