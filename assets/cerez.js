/* VAELO çerez izni (KVKK). Ziyaretçi kabul edene kadar Google Analytics ve Meta
 * ölçüm çerezleri kapalı kalır (Google Consent Mode + Meta consent). */
(function () {
  'use strict';
  var KEY = 'vaelo-cerez', secim = null;
  try { secim = localStorage.getItem(KEY); } catch (e) {}
  if (secim === 'kabul' || secim === 'red') return;

  function kaydet(deger) {
    try { localStorage.setItem(KEY, deger); } catch (e) {}
    if (deger === 'kabul') {
      if (window.gtag) gtag('consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
      if (window.fbq) fbq('consent', 'grant');
    }
    bant.style.transform = 'translateY(110%)';
    setTimeout(function () { bant.remove(); }, 500);
  }

  var css = '.vc-bant{position:fixed;left:0;right:0;bottom:0;z-index:100000;background:#0A0A0A;color:#F3F1EC;font:300 13px/1.6 Jost,"Helvetica Neue",Arial,sans-serif;padding:16px 20px calc(16px + env(safe-area-inset-bottom,0px));display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px 24px;transform:translateY(110%);transition:transform .5s cubic-bezier(.16,.84,.24,1);box-shadow:0 -10px 30px rgba(0,0,0,.2)}' +
    '.vc-bant p{margin:0;max-width:640px}.vc-bant a{color:#F3F1EC;text-decoration:underline}' +
    '.vc-bant div{display:flex;gap:10px}.vc-bant button{font:400 12px Jost,"Helvetica Neue",Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;padding:11px 20px;cursor:pointer;border:1px solid #F3F1EC}' +
    '.vc-k{background:#F3F1EC;color:#0A0A0A}.vc-r{background:transparent;color:#F3F1EC}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var bant = document.createElement('div');
  bant.className = 'vc-bant'; bant.setAttribute('role', 'dialog'); bant.setAttribute('aria-label', 'Çerez tercihi');
  bant.innerHTML = '<p>Sitemizi geliştirmek ve size uygun içerik göstermek için çerezler kullanıyoruz. Ayrıntılar için <a href="/gizlilik-politikasi.html">Gizlilik Politikası</a> ve <a href="/kvkk-aydinlatma-metni.html">KVKK Aydınlatma Metni</a>.</p>' +
    '<div><button type="button" class="vc-r">Reddet</button><button type="button" class="vc-k">Kabul Et</button></div>';
  function goster() { document.body.appendChild(bant); requestAnimationFrame(function () { requestAnimationFrame(function () { bant.style.transform = 'none'; }); }); }
  if (document.body) goster(); else document.addEventListener('DOMContentLoaded', goster);
  bant.querySelector('.vc-k').onclick = function () { kaydet('kabul'); };
  bant.querySelector('.vc-r').onclick = function () { kaydet('red'); };
})();
