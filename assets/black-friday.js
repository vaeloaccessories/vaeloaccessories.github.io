/* VAELO Black Friday kampanyası
 * Yalnızca 22–28 Kasım 2026 arasında görünür; öncesinde ve sonrasında kendiliğinden kapalıdır.
 * Pencerede "Kodu Uygula" denince BLACKFRIDAY kodu sepete kendiliğinden eklenir.
 * Test için adresin sonuna ?bf=1 eklenebilir.
 * Pencere, hoş geldin çarkı kapandıktan sonra açılır (iki pencere üst üste binmesin).
 */
(function () {
  'use strict';
  var BASLA = new Date('2026-11-22T00:00:00+03:00').getTime();
  var BITIS = new Date('2026-11-28T23:59:59+03:00').getTime();
  var test = /[?&]bf=1/.test(location.search);
  var simdi = Date.now();
  if (!test && (simdi < BASLA || simdi > BITIS)) return;

  var ANAHTAR = 'vaelo-black-friday';
  function al() { try { return sessionStorage.getItem(ANAHTAR); } catch (e) { return null; } }
  function koy() { try { sessionStorage.setItem(ANAHTAR, '1'); } catch (e) {} }

  // 1) Üstteki kayan şeride mesaj ekle
  function seride() {
    var tracks = document.querySelectorAll('.promo .track');
    for (var i = 0; i < tracks.length; i++) {
      var t = tracks[i];
      if (t.getAttribute('data-bf')) continue;
      t.setAttribute('data-bf', '1');
      t.insertAdjacentHTML('afterbegin', '<span>Black Friday · 22–28 Kasım · BLACKFRIDAY koduyla %15 indirim</span><i></i>');
    }
  }

  // 2) Pencere
  var css = '' +
    '.bf-bg{position:fixed;inset:0;z-index:99996;background:rgba(10,10,10,.72);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .35s}' +
    '.bf-bg.on{opacity:1}' +
    '.bf{position:relative;width:100%;max-width:420px;max-height:94vh;overflow:auto;background:#0A0A0A;border:1px solid #b9a98a;padding:0 0 18px;text-align:center;color:#f4efe6;font-family:Georgia,"Times New Roman",serif;transform:translateY(14px);transition:transform .35s}' +
    '.bf-bg.on .bf{transform:none}' +
    '.bf-img{display:block;width:100%;height:auto;max-height:68vh;object-fit:contain;background:#0A0A0A}' +
    '.bf-x{position:absolute;z-index:2;top:8px;right:10px;background:rgba(10,10,10,.7);border:0;color:#f4efe6;font-size:28px;line-height:1;cursor:pointer;padding:6px}' +
    '.bf-logo{font-size:15px;letter-spacing:.5em;color:#b9a98a}' +
    '.bf-tag{margin-top:22px;font:11px Arial,sans-serif;letter-spacing:.28em;color:#b9a98a;text-transform:uppercase}' +
    '.bf h2{margin-top:10px;font-size:34px;font-weight:400;letter-spacing:.14em;line-height:1.15}' +
    '.bf-date{margin-top:10px;font:13px Arial,sans-serif;color:#cfc7b8;letter-spacing:.06em}' +
    '.bf-list{margin-top:26px;text-align:left;border-top:1px solid #2a2a2a}' +
    '.bf-it{display:flex;gap:14px;padding:15px 2px;border-bottom:1px solid #2a2a2a}' +
    '.bf-n{font-size:20px;color:#b9a98a;min-width:26px}' +
    '.bf-it b{display:block;font:600 14px Arial,sans-serif;letter-spacing:.04em}' +
    '.bf-it span{display:block;margin-top:3px;font:13px/1.45 Arial,sans-serif;color:#b8b2a6}' +
    '.bf-btn{display:block;width:calc(100% - 36px);margin:16px 18px 0;background:#f4efe6;color:#0A0A0A;border:0;padding:15px;font:700 12px Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;cursor:pointer}' +
    '.bf-note{margin:12px 18px 0;font:11px Arial,sans-serif;color:#7d786e}' +
    '@media (prefers-reduced-motion:reduce){.bf,.bf-bg{transition:none}}';

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
    bg = document.createElement('div'); bg.className = 'bf-bg';
    bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-label', 'Black Friday');
    bg.innerHTML = '' +
      '<div class="bf">' +
        '<button class="bf-x" aria-label="Kapat">&times;</button>' +
        '<img class="bf-img" src="/assets/black-friday.webp" alt="VAELO Black Friday, 22–28 Kasım, BLACKFRIDAY koduyla yüzde 15 indirim" width="810" height="1013">' +
        '<button class="bf-btn">Kodu Uygula · Alışverişe Başla</button>' +
        '<div class="bf-note">%15 indirim saatler hariç tüm giyimde geçerlidir · Kargo ücretsiz</div>' +
      '</div>';
    document.body.appendChild(bg);
    requestAnimationFrame(function () { requestAnimationFrame(function () { bg.classList.add('on'); }); });
    bg.querySelector('.bf-x').onclick = kapat;
    bg.querySelector('.bf-btn').onclick = function () {
      kapat();
      document.dispatchEvent(new CustomEvent('vaelo:kupon', { detail: { kod: 'BLACKFRIDAY' } }));
      var a = document.getElementById('nav-sig'); if (a) a.click(); else location.href = '/#signature';
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
