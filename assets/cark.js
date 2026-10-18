/* VAELO hoş geldin çarkı
 * Siteye ilk girişte bir kez açılır. Çıkan kod sepete otomatik uygulanır.
 * Kodların geçerliliği ve indirim ödeme kasasında (worker.js) hesaplanır.
 * Dilimler eşit olasılıklıdır.
 */
(function () {
  'use strict';
  var GORULDU = 'vaelo-cark';
  var DILIMLER = [
    { yazi: '%5', alt: 'İNDİRİM', kod: 'HOSGELDIN5', mesaj: '%5 indirim' },
    { yazi: 'KARGO', alt: 'BEDAVA', kod: 'KARGOBEDAVA', mesaj: 'Ücretsiz kargo' },
    { yazi: '%7', alt: 'İNDİRİM', kod: 'HOSGELDIN7', mesaj: '%7 indirim' },
    { yazi: '%10', alt: 'İNDİRİM', kod: 'HOSGELDIN10', mesaj: '%10 indirim' },
    { yazi: '%5', alt: 'İNDİRİM', kod: 'HOSGELDIN5', mesaj: '%5 indirim' },
    { yazi: 'KARGO', alt: 'BEDAVA', kod: 'KARGOBEDAVA', mesaj: 'Ücretsiz kargo' },
    { yazi: '%7', alt: 'İNDİRİM', kod: 'HOSGELDIN7', mesaj: '%7 indirim' },
    { yazi: '%10', alt: 'İNDİRİM', kod: 'HOSGELDIN10', mesaj: '%10 indirim' }
  ];
  function al(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function koy(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var durum = al(GORULDU); // null: hiç görmedi · 'kapatti' · kazanılan kod
  if (al('vaelo-kupon') && !durum) return; // zaten kodu var

  var css = '' +
    '.vk-bg{position:fixed;inset:0;z-index:99997;background:rgba(10,10,10,.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .4s}' +
    '.vk-bg.on{opacity:1}' +
    '.vk{position:relative;width:min(420px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#F3F1EC;color:#0A0A0A;text-align:center;padding:34px 26px 26px;font-family:Jost,Helvetica,Arial,sans-serif;font-weight:300;transform:translateY(16px) scale(.97);transition:transform .5s cubic-bezier(.16,.84,.24,1);box-shadow:0 30px 80px rgba(0,0,0,.35)}' +
    '.vk-bg.on .vk{transform:none}' +
    '.vk-x{position:absolute;top:8px;right:10px;background:none;border:0;font-size:26px;line-height:1;cursor:pointer;color:#6B6861;padding:6px 8px}' +
    '.vk small{display:block;font-size:.68rem;letter-spacing:.32em;text-transform:uppercase;color:#6B6861}' +
    '.vk h2{font:500 2rem/1.1 "Cormorant Garamond",Georgia,serif;margin:10px 0 6px;letter-spacing:.01em}' +
    '.vk p{font-size:.88rem;line-height:1.55;color:#3a3833;margin:0 0 18px}' +
    '.vk-w{position:relative;width:min(290px,78vw);aspect-ratio:1;margin:0 auto 20px}' +
    '.vk-w svg{width:100%;height:100%;display:block;transition:transform 5.2s cubic-bezier(.12,.72,.12,1);filter:drop-shadow(0 10px 24px rgba(0,0,0,.18))}' +
    '.vk-pin{position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-top:22px solid #0A0A0A;z-index:2;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}' +
    '.vk-hub{position:absolute;inset:0;margin:auto;width:24%;height:24%;border-radius:50%;background:#0A0A0A;color:#F3F1EC;display:flex;align-items:center;justify-content:center;font:500 1.5rem/1 "Cormorant Garamond",Georgia,serif;border:3px solid #F3F1EC;box-shadow:0 0 0 1px #B8A88A}' +
    '.vk-go{display:block;width:100%;padding:16px;background:#0A0A0A;color:#F3F1EC;border:0;font:400 13px Jost,Helvetica,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;cursor:pointer}' +
    '.vk-go[disabled]{opacity:.55;cursor:default}' +
    '.vk-no{background:none;border:0;color:#6B6861;font-size:.78rem;margin-top:12px;cursor:pointer;text-decoration:underline}' +
    '.vk-kod{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px dashed #0A0A0A;padding:12px 14px;margin:6px 0 10px;font:500 1.05rem Jost,Helvetica,Arial,sans-serif;letter-spacing:.14em}' +
    '.vk-kod button{background:#0A0A0A;color:#F3F1EC;border:0;padding:8px 12px;font:400 11px Jost,Helvetica,Arial,sans-serif;letter-spacing:.12em;cursor:pointer}' +
    '.vk-big{font:500 3rem/1 "Cormorant Garamond",Georgia,serif;margin:4px 0 6px}' +
    '.vk-ok{font-size:.78rem;color:#6B6861;margin:0 0 16px}' +
    '.vk-fine{font-size:.7rem;color:#8a867d;margin:14px 0 0;line-height:1.5}' +
    '.vk-tab{position:fixed;right:0;top:50%;z-index:99989;transform:translateY(-50%);writing-mode:vertical-rl;background:#0A0A0A;color:#F3F1EC;border:0;padding:16px 9px;font:400 11px Jost,Helvetica,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;box-shadow:-6px 0 20px rgba(0,0,0,.18)}' +
    '@media (prefers-reduced-motion:reduce){.vk-w svg{transition-duration:.01s}.vk,.vk-bg{transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function carkSvg() {
    var n = DILIMLER.length, r = 100, c = 100, html = '';
    for (var i = 0; i < n; i++) {
      var a1 = (i / n) * 2 * Math.PI - Math.PI / 2, a2 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      var x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1), x2 = c + r * Math.cos(a2), y2 = c + r * Math.sin(a2);
      var koyu = i % 2 === 0, renk = koyu ? '#0A0A0A' : '#F3F1EC', yazi = koyu ? '#F3F1EC' : '#0A0A0A';
      var orta = ((i + 0.5) / n) * 360;
      html += '<path d="M' + c + ',' + c + ' L' + x1.toFixed(2) + ',' + y1.toFixed(2) + ' A' + r + ',' + r + ' 0 0 1 ' + x2.toFixed(2) + ',' + y2.toFixed(2) + ' Z" fill="' + renk + '" stroke="#B8A88A" stroke-width=".6"/>';
      var d = DILIMLER[i], buyuk = d.yazi.length > 3;
      html += '<g transform="rotate(' + orta + ' 100 100)"><text x="100" y="' + (buyuk ? 33 : 35) + '" text-anchor="middle" fill="' + yazi + '" style="font:500 ' + (buyuk ? 11 : 17) + 'px Jost,Helvetica,Arial,sans-serif;letter-spacing:' + (buyuk ? '.08em' : '0') + '">' + d.yazi + '</text>' +
        '<text x="100" y="' + (buyuk ? 46 : 47) + '" text-anchor="middle" fill="' + yazi + '" opacity=".75" style="font:400 6.5px Jost,Helvetica,Arial,sans-serif;letter-spacing:.16em">' + d.alt + '</text></g>';
    }
    return '<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="99.5" fill="#0A0A0A"/>' + html + '<circle cx="100" cy="100" r="99" fill="none" stroke="#0A0A0A" stroke-width="2"/></svg>';
  }

  var bg, tab;
  function kodHtml(d) {
    return '<small>Tebrikler</small><div class="vk-big">' + (d.kod === 'KARGOBEDAVA' ? 'Kargo Bedava' : d.yazi) + '</div>' +
      '<p>' + d.mesaj + ' kazandın. Kodun sepetine otomatik uygulandı.</p>' +
      '<div class="vk-kod"><span>' + d.kod + '</span><button type="button" class="vk-cp">KOPYALA</button></div>' +
      '<p class="vk-ok">Sepette görürsün, ayrıca bir şey yapmana gerek yok.</p>' +
      '<button type="button" class="vk-go vk-al">Alışverişe Başla</button>';
  }
  function ac() {
    if (tab) { tab.remove(); tab = null; }
    var kazanilan = DILIMLER.filter(function (d) { return d.kod === durum; })[0];
    bg = document.createElement('div'); bg.className = 'vk-bg';
    bg.innerHTML = '<div class="vk" role="dialog" aria-modal="true" aria-label="Hoş geldin hediyesi"><button class="vk-x" type="button" aria-label="Kapat">×</button><div class="vk-in">' +
      (kazanilan ? kodHtml(kazanilan) :
        '<small>VAELO · Hoş geldin</small><h2>Çarkı çevir,<br>hediyeni kap.</h2><p>İlk alışverişine özel indirim ya da ücretsiz kargo seni bekliyor.</p>' +
        '<div class="vk-w"><span class="vk-pin"></span>' + carkSvg() + '<span class="vk-hub">V</span></div>' +
        '<button type="button" class="vk-go vk-spin">Çarkı Çevir</button><button type="button" class="vk-no">Teşekkürler, istemiyorum</button>' +
        '<p class="vk-fine">Her ziyaretçi bir kez çevirebilir. İndirim ürünlere uygulanır, kargo ve hediye paketine uygulanmaz.</p>') +
      '</div></div>';
    document.body.appendChild(bg);
    requestAnimationFrame(function () { requestAnimationFrame(function () { bg.classList.add('on'); }); });
    bg.querySelector('.vk-x').onclick = kapat;
    bg.addEventListener('click', function (e) { if (e.target === bg) kapat(); });
    document.addEventListener('keydown', esc);
    var no = bg.querySelector('.vk-no'); if (no) no.onclick = kapat;
    var spin = bg.querySelector('.vk-spin'); if (spin) spin.onclick = cevir;
    baglaKod();
  }
  function esc(e) { if (e.key === 'Escape') kapat(); }
  function kapat() {
    if (!bg) return;
    document.removeEventListener('keydown', esc);
    if (!durum) { durum = 'kapatti'; koy(GORULDU, 'kapatti'); }
    var b = bg; bg = null; b.classList.remove('on'); setTimeout(function () { b.remove(); }, 400);
    if (durum === 'kapatti') sekme();
  }
  function cevir() {
    var btn = bg.querySelector('.vk-spin'); btn.disabled = true; btn.textContent = 'Çevriliyor…';
    var no = bg.querySelector('.vk-no'); if (no) no.style.visibility = 'hidden';
    var n = DILIMLER.length, i = Math.floor(Math.random() * n), d = DILIMLER[i];
    var aci = 360 * 6 + (360 - ((i + 0.5) / n) * 360) + (Math.random() * 0.6 - 0.3) * (360 / n);
    durum = d.kod; koy(GORULDU, d.kod); // yenileyip tekrar çevirmek olmasın
    bg.querySelector('.vk-w svg').style.transform = 'rotate(' + aci + 'deg)';
    setTimeout(function () {
      try { document.dispatchEvent(new CustomEvent('vaelo:kupon', { detail: { kod: d.kod } })); } catch (e) {}
      if (window.gtag) gtag('event', 'cark_kazandi', { kupon: d.kod });
      if (!bg) return;
      bg.querySelector('.vk-in').innerHTML = kodHtml(d);
      baglaKod();
    }, 5400);
  }
  function baglaKod() {
    if (!bg) return;
    var cp = bg.querySelector('.vk-cp');
    if (cp) cp.onclick = function () {
      var t = bg.querySelector('.vk-kod span').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { cp.textContent = 'KOPYALANDI'; }).catch(function () { cp.textContent = t; });
    };
    var alb = bg.querySelector('.vk-al'); if (alb) alb.onclick = kapat;
  }
  function sekme() {
    if (tab || al('vaelo-kupon')) return;
    tab = document.createElement('button'); tab.type = 'button'; tab.className = 'vk-tab'; tab.textContent = '🎁 Hediyeni Al';
    tab.onclick = ac; document.body.appendChild(tab);
  }

  // Çerez bandı açıksa önce o kapansın, sonra çark gelsin.
  function cerezSecildi() { return !!al('vaelo-cerez'); }
  if (!durum) {
    var bekle = setInterval(function () {
      if (!cerezSecildi()) return;
      clearInterval(bekle);
      setTimeout(function () { if (!bg && !durum) ac(); }, 1200);
    }, 700);
  }
  else if (durum === 'kapatti') sekme();
})();
