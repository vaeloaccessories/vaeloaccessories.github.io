/* VAELO Early November kampanyası
 * Yalnızca 1–7 Kasım 2026 arasında görünür; sonrasında kendiliğinden kapanır.
 * Test için adresin sonuna ?erken=1 eklenebilir.
 * Pencere, hoş geldin çarkı kapandıktan sonra açılır (iki pencere üst üste binmesin).
 */
(function () {
  'use strict';
  var BASLA = new Date('2026-11-01T00:00:00+03:00').getTime();
  var BITIS = new Date('2026-11-07T23:59:59+03:00').getTime();
  var test = /[?&]erken=1/.test(location.search);
  var simdi = Date.now();
  if (!test && (simdi < BASLA || simdi > BITIS)) return;

  var ANAHTAR = 'vaelo-erken-kasim';
  function al() { try { return sessionStorage.getItem(ANAHTAR); } catch (e) { return null; } }
  function koy() { try { sessionStorage.setItem(ANAHTAR, '1'); } catch (e) {} }

  // 1) Üstteki kayan şeride mesaj ekle
  function seride() {
    var tracks = document.querySelectorAll('.promo .track');
    for (var i = 0; i < tracks.length; i++) {
      var t = tracks[i];
      if (t.getAttribute('data-erken')) continue;
      t.setAttribute('data-erken', '1');
      t.insertAdjacentHTML('afterbegin', '<span>Early November · 1–7 Kasım · ilk 50 siparişe özel</span><i></i>');
    }
  }

  // 2) Pencere
  var css = '' +
    '.ek-bg{position:fixed;inset:0;z-index:99996;background:rgba(10,10,10,.72);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .35s}' +
    '.ek-bg.on{opacity:1}' +
    '.ek{position:relative;width:100%;max-width:440px;max-height:92vh;overflow:auto;background:#0A0A0A;border:1px solid #b9a98a;padding:42px 30px 30px;text-align:center;color:#f4efe6;font-family:Georgia,"Times New Roman",serif;transform:translateY(14px);transition:transform .35s}' +
    '.ek-bg.on .ek{transform:none}' +
    '.ek-x{position:absolute;top:8px;right:12px;background:none;border:0;color:#f4efe6;font-size:28px;line-height:1;cursor:pointer;padding:6px}' +
    '.ek-logo{font-size:15px;letter-spacing:.5em;color:#b9a98a}' +
    '.ek-tag{margin-top:22px;font:11px Arial,sans-serif;letter-spacing:.28em;color:#b9a98a;text-transform:uppercase}' +
    '.ek h2{margin-top:10px;font-size:34px;font-weight:400;letter-spacing:.14em;line-height:1.15}' +
    '.ek-date{margin-top:10px;font:13px Arial,sans-serif;color:#cfc7b8;letter-spacing:.06em}' +
    '.ek-list{margin-top:26px;text-align:left;border-top:1px solid #2a2a2a}' +
    '.ek-it{display:flex;gap:14px;padding:15px 2px;border-bottom:1px solid #2a2a2a}' +
    '.ek-n{font-size:20px;color:#b9a98a;min-width:26px}' +
    '.ek-it b{display:block;font:600 14px Arial,sans-serif;letter-spacing:.04em}' +
    '.ek-it span{display:block;margin-top:3px;font:13px/1.45 Arial,sans-serif;color:#b8b2a6}' +
    '.ek-btn{display:block;width:100%;margin-top:26px;background:#f4efe6;color:#0A0A0A;border:0;padding:15px;font:700 12px Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;cursor:pointer}' +
    '.ek-note{margin-top:14px;font:11px Arial,sans-serif;color:#7d786e}' +
    '@media (prefers-reduced-motion:reduce){.ek,.ek-bg{transition:none}}';

  var bg = null;
  function kapat() {
    if (!bg) return;
    document.removeEventListener('keydown', esc);
    var b = bg; bg = null; b.classList.remove('on');
    setTimeout(function () { b.remove(); }, 380);
  }
  function esc(e) { if (e.key === 'Escape') kapat(); }
  function ac() {
    if (bg) return;
    koy();
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    bg = document.createElement('div'); bg.className = 'ek-bg';
    bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-label', 'Early November');
    bg.innerHTML = '' +
      '<div class="ek">' +
        '<button class="ek-x" aria-label="Kapat">&times;</button>' +
        '<div class="ek-logo">VAĖLO</div>' +
        '<div class="ek-tag">Sezon açılışı</div>' +
        '<h2>EARLY<br>NOVEMBER</h2>' +
        '<div class="ek-date">1–7 Kasım 2026</div>' +
        '<div class="ek-list">' +
          '<div class="ek-it"><div class="ek-n">01</div><div><b>İlk 50 siparişe özel</b><span>Yeni sezon parçalar sınırlı sayıda üretilir. Stok bitince kampanya sona erer.</span></div></div>' +
          '<div class="ek-it"><div class="ek-n">02</div><div><b>Yorum yaz, kod kazan</b><span>Ürününü aldıktan sonra yorumunu bize WhatsApp\'tan veya e-postayla ilet, sonraki alışverişine özel kod hediye.</span></div></div>' +
        '</div>' +
        '<button class="ek-btn">Koleksiyonu Keşfet</button>' +
        '<div class="ek-note">Tüm siparişlerde kargo ücretsiz · 7 gün iade</div>' +
      '</div>';
    document.body.appendChild(bg);
    requestAnimationFrame(function () { requestAnimationFrame(function () { bg.classList.add('on'); }); });
    bg.querySelector('.ek-x').onclick = kapat;
    bg.querySelector('.ek-btn').onclick = function () {
      kapat();
      var h = document.getElementById('signature'); if (h && h.scrollIntoView) h.scrollIntoView({ behavior: 'smooth' });
    };
    bg.addEventListener('click', function (e) { if (e.target === bg) kapat(); });
    document.addEventListener('keydown', esc);
  }

  // Çark açıksa bekle, kapanınca göster
  function dene(n) {
    if (document.querySelector('.vk-bg')) { if (n < 120) setTimeout(function () { dene(n + 1); }, 1000); return; }
    ac();
  }
  function basla() {
    seride();
    if (!test && al()) return;
    setTimeout(function () { dene(0); }, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla); else basla();
})();
