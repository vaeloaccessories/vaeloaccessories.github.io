/* VAELO 11.11 kampanyası
 * 9–10 Kasım 2026: üstteki şeritte "11.11 geliyor" duyurusu.
 * 11 Kasım 2026 (00:00–23:59): şeritte kod + açılış penceresi. "Kodu Uygula" denince VAELO1111 sepete eklenir.
 * Öncesinde ve sonrasında kendiliğinden kapalıdır. Test için adresin sonuna ?k11=1 (gün) ya da ?k11=0 (duyuru) eklenebilir.
 * Pencere, hoş geldin çarkı kapandıktan sonra açılır.
 */
(function () {
  'use strict';
  var DUYURU = new Date('2026-11-09T00:00:00+03:00').getTime();
  var BASLA = new Date('2026-11-11T00:00:00+03:00').getTime();
  var BITIS = new Date('2026-11-11T23:59:59+03:00').getTime();
  var m = location.search.match(/[?&]k11=([01])/);
  var simdi = Date.now();
  var gun = m ? m[1] === '1' : (simdi >= BASLA && simdi <= BITIS);
  var duyuru = m ? m[1] === '0' : (simdi >= DUYURU && simdi < BASLA);
  if (!gun && !duyuru) return;

  var ANAHTAR = 'vaelo-1111';
  function al() { try { return sessionStorage.getItem(ANAHTAR); } catch (e) { return null; } }
  function koy() { try { sessionStorage.setItem(ANAHTAR, '1'); } catch (e) {} }

  function seride() {
    var yazi = gun ? '11.11 · Sadece bugün · VAELO1111 koduyla %11 indirim' : '11.11 geliyor · 11 Kasım’da tek günlük kod · Takipte kal';
    var tracks = document.querySelectorAll('.promo .track');
    for (var i = 0; i < tracks.length; i++) {
      var t = tracks[i];
      if (t.getAttribute('data-k11')) continue;
      t.setAttribute('data-k11', '1');
      t.insertAdjacentHTML('afterbegin', '<span>' + yazi + '</span><i></i>');
    }
  }

  var css = '' +
    '.k11-bg{position:fixed;inset:0;z-index:99996;background:rgba(10,10,10,.72);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .35s}' +
    '.k11-bg.on{opacity:1}' +
    '.k11{position:relative;width:100%;max-width:420px;max-height:94vh;overflow:auto;background:#0A0A0A;border:1px solid #3a3a3a;padding:0 0 18px;text-align:center;color:#F5F4F1;transform:translateY(14px);transition:transform .35s}' +
    '.k11-bg.on .k11{transform:none}' +
    '.k11-img{display:block;width:100%;height:auto;max-height:68vh;object-fit:contain;background:#0A0A0A}' +
    '.k11-x{position:absolute;z-index:2;top:8px;right:10px;background:rgba(10,10,10,.7);border:0;color:#F5F4F1;font-size:28px;line-height:1;cursor:pointer;padding:6px}' +
    '.k11-btn{display:block;width:calc(100% - 36px);margin:16px 18px 0;background:#F5F4F1;color:#0A0A0A;border:0;padding:15px;font:700 12px Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;cursor:pointer}' +
    '.k11-note{margin:12px 18px 0;font:11px Arial,sans-serif;color:#8C8C8C}' +
    '@media (prefers-reduced-motion:reduce){.k11,.k11-bg{transition:none}}';

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
    bg = document.createElement('div'); bg.className = 'k11-bg';
    bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-label', '11.11 kampanyası');
    bg.innerHTML = '' +
      '<div class="k11">' +
        '<button class="k11-x" aria-label="Kapat">&times;</button>' +
        '<img class="k11-img" src="/assets/1111.webp" alt="VAELO 11.11, sadece 11 Kasım, VAELO1111 koduyla yüzde 11 indirim" width="810" height="1013">' +
        '<button class="k11-btn">Kodu Uygula · Alışverişe Başla</button>' +
        '<div class="k11-note">%11 indirim tüm giyimde ve 5.500 TL üstü saatlerde geçerlidir · Kargo ücretsiz</div>' +
      '</div>';
    document.body.appendChild(bg);
    requestAnimationFrame(function () { requestAnimationFrame(function () { bg.classList.add('on'); }); });
    bg.querySelector('.k11-x').onclick = kapat;
    bg.querySelector('.k11-btn').onclick = function () {
      kapat();
      document.dispatchEvent(new CustomEvent('vaelo:kupon', { detail: { kod: 'VAELO1111' } }));
      var a = document.getElementById('nav-sig'); if (a) a.click(); else location.href = '/#signature';
    };
    bg.addEventListener('click', function (e) { if (e.target === bg) kapat(); });
    document.addEventListener('keydown', esc);
  }

  function dene(n) {
    if (document.querySelector('.vk-bg')) { if (n < 120) setTimeout(function () { dene(n + 1); }, 1000); return; }
    ac();
  }
  function basla() {
    seride();
    if (!gun) return;
    if (!m && al()) return;
    setTimeout(function () { dene(0); }, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla); else basla();
})();
