/* VAELO beden bulucu
 * Ürün sayfasında "Bedenimi Bul" ile açılır. 3 adım: boy/kilo → vücut şekli → kalıp tercihi.
 * Hesap, ürünün gerçek ölçülerine (göğüs genişliği, boy uzunluğu) göre yapılır.
 * Sonuç bu cihazda saklanır, diğer ürün sayfalarında bedeni otomatik seçer.
 */
(function () {
  'use strict';
  var info = document.querySelector('.info[data-id]');
  if (!info) return;
  var sizesEl = info.querySelector('.sizes');
  if (!sizesEl) return;

  var BEDEN = ['S', 'M', 'L', 'XL', 'XXL'];
  var isim = info.getAttribute('data-name') || '';
  var tisort = /ti[sş][oö]rt/i.test(isim);
  // Ürün düz zeminde: göğüs genişliği (cm) ve boy uzunluğu (cm). Çevre = genişlik x 2.
  var OLCU = tisort
    ? { gogus: [55, 56, 59, 61, 63], boy: [71, 73, 75, 76, 78], pay: { dar: 8, normal: 14, bol: 22 } }
    : { gogus: [57, 60, 63, 66, 69], boy: [71, 73, 75, 76, 78], pay: { dar: 10, normal: 18, bol: 26 } };
  var KEY = 'vaelo-beden';
  function oku() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function yaz(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  var d = oku() || {};
  var s = { cins: d.cins || 'erkek', boy: d.boy || 178, kilo: d.kilo || 75, gogus: d.gogus || 0, karin: d.karin || 0, kalca: d.kalca || 0, kalip: d.kalip || 'normal' };
  var adim = 1;

  // ---- hesap ----
  function hesap(st) {
    var cevre = 0.6 * st.kilo + 0.25 * st.boy + 8 - (st.cins === 'kadin' ? 4 : 0);   // tahmini göğüs çevresi
    var gogusEk = [-4, 0, 5][st.gogus + 1], karinEk = [-2, 0, 6][st.karin + 1], kalcaEk = [-1, 0, 3][st.kalca + 1];
    var vucut = cevre + gogusEk + karinEk * 0.6 + kalcaEk * 0.3;
    var hedef = vucut + OLCU.pay[st.kalip];
    var gi = BEDEN.length - 1;
    for (var i = 0; i < BEDEN.length; i++) { if (OLCU.gogus[i] * 2 >= hedef - 1) { gi = i; break; } }
    var bi = st.boy <= 170 ? 0 : st.boy <= 176 ? 1 : st.boy <= 182 ? 2 : st.boy <= 188 ? 3 : 4;
    var idx = Math.max(gi, bi - 1);
    var fark = OLCU.gogus[idx] * 2 - hedef;                       // + bol, - dar
    var boyFark = OLCU.boy[idx] - [71, 73, 75, 76, 78][bi];
    var uyum = Math.round(Math.max(68, Math.min(97, 97 - Math.abs(fark) * 1.6 - Math.abs(boyFark) * 2)));
    var buyuk = OLCU.gogus[BEDEN.length - 1] * 2 < hedef - 6;
    var belFark = fark - karinEk * 0.6;
    return { beden: BEDEN[idx], idx: idx, uyum: uyum, buyuk: buyuk,
      gogus: konum(fark), bel: konum(belFark), boy: konum(boyFark * 3) };
  }
  function konum(f) { return Math.max(0, Math.min(1, 0.5 + f / 24)); }   // 0 dar · .5 ideal · 1 bol

  // ---- görünüm ----
  var css = '' +
    '.vb-ac{display:inline-flex;align-items:center;gap:8px;margin:12px 0 2px;padding:0;background:none;border:0;border-bottom:1px solid currentColor;font:400 12px Jost,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:inherit;cursor:pointer}' +
    '.vb-ac svg{width:14px;height:14px}' +
    '.vb-senin{display:block;font-size:.8rem;color:#6B6861;margin:6px 0 0}' +
    '.vb-bg{position:fixed;inset:0;z-index:99997;background:rgba(10,10,10,.45);opacity:0;pointer-events:none;transition:opacity .35s}' +
    '.vb-on .vb-bg{opacity:1;pointer-events:auto}' +
    '.vb{position:fixed;top:0;right:0;bottom:0;z-index:99998;width:min(460px,100%);background:#F7F6F2;color:#0A0A0A;font-family:Jost,Helvetica,Arial,sans-serif;font-weight:300;transform:translateX(100%);transition:transform .45s cubic-bezier(.16,.84,.24,1);display:flex;flex-direction:column}' +
    '.vb-on .vb{transform:none}' +
    '.vb-top{display:flex;justify-content:space-between;align-items:center;padding:18px 22px 10px;font-size:.68rem;letter-spacing:.28em;text-transform:uppercase;color:#6B6861}' +
    '.vb-x{background:none;border:0;font-size:26px;line-height:1;cursor:pointer;color:#0A0A0A;padding:2px 6px}' +
    '.vb-urun{display:flex;align-items:center;gap:12px;margin:0 22px;padding:12px;background:#ECEAE4}' +
    '.vb-urun img{width:44px;height:44px;object-fit:cover;background:#DFDBD2}.vb-urun b{display:block;font-weight:400;font-size:.85rem}.vb-urun span{font-size:.78rem;color:#6B6861}' +
    '.vb-bar{display:flex;gap:6px;margin:16px 22px 0}.vb-bar i{flex:1;height:2px;background:#DFDBD2}.vb-bar i.on{background:#0A0A0A}' +
    '.vb-body{flex:1;overflow:auto;padding:12px 22px 20px}' +
    '.vb-no{font-size:.68rem;letter-spacing:.2em;color:#6B6861;margin:8px 0 4px}' +
    '.vb h3{font:500 1.7rem/1.1 "Cormorant Garamond",Georgia,serif;margin:0 0 6px}' +
    '.vb-alt{font-size:.82rem;color:#6B6861;margin:0 0 18px;line-height:1.5}' +
    '.vb-lbl{font-size:.66rem;letter-spacing:.22em;text-transform:uppercase;color:#6B6861;margin:0 0 8px}' +
    '.vb-cins{display:grid;grid-template-columns:1fr 1fr;border:1px solid #0A0A0A;margin-bottom:22px}' +
    '.vb-cins button{padding:11px;background:none;border:0;font:400 12px Jost,Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;color:#0A0A0A}.vb-cins button.on{background:#0A0A0A;color:#F3F1EC}' +
    '.vb-olc{display:grid;grid-template-columns:76px 1fr;gap:12px;align-items:center}' +
    '.vb-fig{display:flex;align-items:flex-end;justify-content:center;height:190px}.vb-fig svg{transition:all .3s}' +
    '.vb-row{margin-bottom:20px}.vb-row .vb-lbl{display:flex;justify-content:space-between}' +
    '.vb-val{font:400 2rem/1 "Cormorant Garamond",Georgia,serif}.vb-val small{font:300 .8rem Jost,Helvetica,Arial,sans-serif;color:#6B6861;margin-left:3px}' +
    '.vb-sl{display:flex;align-items:center;gap:10px;margin-top:6px}.vb-sl button{width:30px;height:30px;flex:none;border:1px solid #DFDBD2;background:#fff;cursor:pointer;font-size:16px;color:#0A0A0A}' +
    '.vb-sl input{flex:1;-webkit-appearance:none;appearance:none;height:2px;background:#0A0A0A;outline:none;margin:0}' +
    '.vb-sl input::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#F7F6F2;border:1.5px solid #0A0A0A;cursor:grab}' +
    '.vb-sl input::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#F7F6F2;border:1.5px solid #0A0A0A;cursor:grab}' +
    '.vb-canli{display:flex;justify-content:space-between;align-items:end;border-top:1px solid #DFDBD2;padding-top:14px;margin-top:4px}.vb-canli p{margin:0;font-size:.66rem;letter-spacing:.2em;text-transform:uppercase;color:#6B6861}.vb-canli small{display:block;font-size:.72rem;letter-spacing:0;text-transform:none;margin-top:3px}.vb-canli b{font:500 2.2rem/1 "Cormorant Garamond",Georgia,serif}' +
    '.vb-gizli{font-size:.72rem;color:#8a867d;margin:14px 0 0}' +
    '.vb-sek{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px}' +
    '.vb-sek button{background:#fff;border:1px solid #DFDBD2;padding:12px 4px 10px;cursor:pointer;font:400 10px Jost,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6B6861;display:flex;flex-direction:column;align-items:center;gap:8px}' +
    '.vb-sek button.on{border-color:#0A0A0A;color:#0A0A0A;background:#ECEAE4}.vb-sek svg{width:34px;height:40px}' +
    '.vb-kal button{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:#fff;border:1px solid #DFDBD2;padding:14px;margin-bottom:10px;cursor:pointer;color:#0A0A0A;font-family:inherit}' +
    '.vb-kal button.on{border-color:#0A0A0A;background:#ECEAE4}.vb-kal b{display:block;font-weight:400;font-size:.8rem;letter-spacing:.16em;text-transform:uppercase}.vb-kal span{font-size:.78rem;color:#6B6861}.vb-kal svg{width:30px;height:34px;flex:none}' +
    '.vb-son{text-align:center}.vb-halka{width:150px;height:150px;margin:6px auto 10px;border-radius:50%;border:1.5px solid #0A0A0A;display:flex;align-items:center;justify-content:center;font:500 3.4rem/1 "Cormorant Garamond",Georgia,serif;position:relative}' +
    '.vb-halka svg{position:absolute;inset:-6px;width:calc(100% + 12px);height:calc(100% + 12px);transform:rotate(-90deg)}' +
    '.vb-uyum{font-size:.7rem;letter-spacing:.22em;text-transform:uppercase}.vb-son .vb-alt{margin:4px 0 18px}' +
    '.vb-skala{display:flex;justify-content:space-between;position:relative;margin:0 6px 22px;padding-top:16px;border-top:1px solid #DFDBD2;font-size:.75rem;color:#8a867d}.vb-skala span.on{color:#0A0A0A;font-weight:500}' +
    '.vb-skala i{position:absolute;top:-5px;width:9px;height:9px;border-radius:50%;background:#0A0A0A;transform:translateX(-50%)}' +
    '.vb-ol{text-align:left}.vb-ol .vb-bas{display:grid;grid-template-columns:70px 1fr 1fr 1fr;font-size:.62rem;letter-spacing:.18em;text-transform:uppercase;color:#8a867d;margin-bottom:6px}.vb-ol .vb-bas span{text-align:center}' +
    '.vb-cz{display:grid;grid-template-columns:70px 1fr;align-items:center;margin-bottom:10px;font-size:.78rem}.vb-cz div{position:relative;height:1px;background:#DFDBD2}.vb-cz div i{position:absolute;top:-4px;width:9px;height:9px;border-radius:50%;background:#0A0A0A;transform:translateX(-50%)}' +
    '.vb-not{background:#ECEAE4;padding:12px 14px;font-size:.8rem;line-height:1.5;text-align:left;margin:16px 0 0}.vb-not b{display:block;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;font-weight:400;color:#6B6861;margin-bottom:4px}' +
    '.vb-alt2{font-size:.72rem;color:#8a867d;margin:12px 0 0;line-height:1.5}' +
    '.vb-alt3{display:flex;gap:10px;padding:14px 22px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid #DFDBD2}' +
    '.vb-geri{width:50px;flex:none;background:none;border:1px solid #0A0A0A;cursor:pointer;font-size:16px;color:#0A0A0A}' +
    '.vb-ileri{flex:1;padding:16px;background:#0A0A0A;color:#F3F1EC;border:0;font:400 12px Jost,Helvetica,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;cursor:pointer}' +
    '.vb-bastan{background:none;border:0;color:#6B6861;text-decoration:underline;font-size:.78rem;cursor:pointer;margin-top:14px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // açma bağlantısı + "senin bedenin"
  var ac = document.createElement('button'); ac.type = 'button'; ac.className = 'vb-ac';
  ac.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h18v8H3z"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg>Bedenimi Bul';
  var senin = document.createElement('span'); senin.className = 'vb-senin';
  sizesEl.parentNode.insertBefore(ac, sizesEl.nextSibling);
  ac.parentNode.insertBefore(senin, ac.nextSibling);
  function seninYaz() {
    var o = oku(); if (!o || !o.boy) { senin.textContent = ''; return; }
    var r = hesap(Object.assign({}, s, o));
    senin.textContent = 'Senin için önerilen beden: ' + r.beden + ' (' + o.boy + ' cm · ' + o.kilo + ' kg)';
    sec(r.beden);
  }
  function sec(b) {
    sizesEl.querySelectorAll('span').forEach(function (sp) { if (sp.textContent.trim() === b && !sp.classList.contains('on')) sp.click(); });
  }

  var kok = document.createElement('div');
  kok.innerHTML = '<div class="vb-bg"></div><aside class="vb" role="dialog" aria-label="Beden bulucu">' +
    '<div class="vb-top"><span>Bedenini Bul</span><button class="vb-x" type="button" aria-label="Kapat">×</button></div>' +
    '<div class="vb-urun">' + (info.dataset.img ? '<img src="' + info.dataset.img + '" alt="" referrerpolicy="no-referrer">' : '') + '<div><b>' + isim.replace(/</g, '') + '</b><span>₺' + Number(info.dataset.price || 0).toLocaleString('tr-TR') + '</span></div></div>' +
    '<div class="vb-bar"><i></i><i></i><i></i></div><div class="vb-body"></div><div class="vb-alt3"></div></aside>';
  document.body.appendChild(kok);
  var govde = kok.querySelector('.vb-body'), alt = kok.querySelector('.vb-alt3');
  function ac2() { adim = s.boy && oku() ? 4 : 1; ciz(); document.documentElement.classList.add('vb-on'); }
  function kapat() { document.documentElement.classList.remove('vb-on'); }
  ac.onclick = function () { adim = 1; ciz(); document.documentElement.classList.add('vb-on'); };
  kok.querySelector('.vb-bg').onclick = kapat;
  kok.querySelector('.vb-x').onclick = kapat;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') kapat(); });

  function figur() {
    var bmi = s.kilo / Math.pow(s.boy / 100, 2);
    var w = Math.max(0.75, Math.min(1.7, bmi / 23)), h = Math.max(0.78, Math.min(1.12, s.boy / 178));
    var kadin = s.cins === 'kadin';
    return '<svg width="' + Math.round(46 * w) + '" height="' + Math.round(170 * h) + '" viewBox="0 0 46 170" preserveAspectRatio="none" fill="#0A0A0A" aria-hidden="true">' +
      '<circle cx="23" cy="11" r="9"/>' +
      '<path d="M10 24h26c3 0 5 2 5 5l2 46c0 2-2 3-4 3l-3-1-2-36' + (kadin ? 'c0 8 3 18 5 30h-32c2-12 5-22 5-30' : 'v30h-20v-30') + 'l-2 36-3 1c-2 0-4-1-4-3l2-46c0-3 2-5 5-5z"/>' +
      '<path d="M13 ' + (kadin ? 92 : 84) + 'h9l1 82h-8zM24 ' + (kadin ? 92 : 84) + 'h9l-2 82h-8z"/></svg>';
  }
  function bar() { kok.querySelectorAll('.vb-bar i').forEach(function (b, i) { b.classList.toggle('on', i < Math.min(adim, 3)); }); }
  function ikon(tur, k) {
    var g = [[10, 18], [9, 16], [8, 14]][k];
    var p = {
      gogus: ['M12 6h10l-1 28h-8z', 'M10 6h14l-2 28h-10z', 'M7 6h20l-4 28h-12z'],
      karin: ['M13 4c-1 10-1 22 0 32M21 4c1 10 1 22 0 32', 'M13 4c-2 10-2 22 0 32M21 4c3 10 3 22 0 32', 'M13 4c-2 10-2 22 0 32M21 4c7 8 7 24 0 32'],
      kalca: ['M12 4c-1 10 0 22 2 32M22 4c1 10 0 22-2 32', 'M12 4c-3 10-2 22 2 32M22 4c3 10 2 22-2 32', 'M12 4c-6 10-4 22 2 32M22 4c6 10 4 22-2 32']
    }[tur][k];
    return '<svg viewBox="0 0 34 40" fill="none" stroke="currentColor" stroke-width="1.4">' + '<path d="' + p + '"/></svg>' + (g ? '' : '');
  }
  function kalipIkon(k) {
    var p = { dar: 'M9 4h12l3 6-3 2v20H9V12l-3-2z', normal: 'M7 4h16l4 7-4 2v19H7V13l-4-2z', bol: 'M5 4h20l5 8-5 2v18H5V14l-5-2z' }[k];
    return '<svg viewBox="0 0 30 34" fill="#0A0A0A"><path d="' + p + '"/></svg>';
  }

  function ciz() {
    bar();
    var r = hesap(s);
    if (adim === 1) {
      govde.innerHTML = '<p class="vb-no">01 / 03</p><h3>Bedenini birlikte bulalım</h3><p class="vb-alt">Sadece iki ölçü yeter. Kaydırarak ayarla.</p>' +
        '<p class="vb-lbl">Kesim</p><div class="vb-cins"><button type="button" data-c="kadin"' + (s.cins === 'kadin' ? ' class="on"' : '') + '>Kadın</button><button type="button" data-c="erkek"' + (s.cins === 'erkek' ? ' class="on"' : '') + '>Erkek</button></div>' +
        '<div class="vb-olc"><div class="vb-fig">' + figur() + '</div><div>' +
        satir('boy', 'Boy', 'cm', 145, 210) + satir('kilo', 'Kilo', 'kg', 40, 160) + '</div></div>' +
        '<div class="vb-canli"><p>Anlık tahmin<small>Sonraki adımlarda netleşir</small></p><b class="vb-tah">' + r.beden + '</b></div>' +
        '<p class="vb-gizli">🔒 Ölçülerin sadece bu cihazda saklanır, her üründe bedenin hazır gelir.</p>';
      govde.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { s.cins = b.dataset.c; ciz(); }; });
      ['boy', 'kilo'].forEach(function (k) {
        var inp = govde.querySelector('input[data-k="' + k + '"]');
        var guncelle = function (v) { s[k] = Math.max(+inp.min, Math.min(+inp.max, v)); inp.value = s[k]; govde.querySelector('[data-v="' + k + '"]').firstChild.nodeValue = s[k]; govde.querySelector('.vb-fig').innerHTML = figur(); govde.querySelector('.vb-tah').textContent = hesap(s).beden; };
        inp.oninput = function () { guncelle(+inp.value); };
        govde.querySelector('[data-e="' + k + '-"]').onclick = function () { guncelle(s[k] - 1); };
        govde.querySelector('[data-e="' + k + '+"]').onclick = function () { guncelle(s[k] + 1); };
      });
      alt.innerHTML = '<button type="button" class="vb-ileri">Devam →</button>';
    } else if (adim === 2) {
      govde.innerHTML = '<p class="vb-no">02 / 03</p><h3>Vücut şeklin</h3><p class="vb-alt">Kıyafet sayılara değil vücuda oturur. Emin değilsen “Orta”da bırak.</p>' +
        sekil('gogus', 'Göğüs', ['İnce', 'Orta', 'Geniş']) + sekil('karin', 'Karın', ['Düz', 'Orta', 'Yuvarlak']) + sekil('kalca', 'Kalça', ['Dar', 'Orta', 'Geniş']);
      govde.querySelectorAll('.vb-sek button').forEach(function (b) { b.onclick = function () { s[b.dataset.t] = +b.dataset.k - 1; ciz(); }; });
      alt.innerHTML = '<button type="button" class="vb-geri" aria-label="Geri">←</button><button type="button" class="vb-ileri">Devam →</button>';
    } else if (adim === 3) {
      govde.innerHTML = '<p class="vb-no">03 / 03</p><h3>Nasıl otursun?</h3><p class="vb-alt">Bedeni, giymeyi sevdiğin şekle göre ayarlayalım.</p><div class="vb-kal">' +
        [['dar', 'Dar', 'Vücudu takip eder, net ve oturaklı.'], ['normal', 'Normal', 'Tasarımcının öngördüğü rahat duruş.'], ['bol', 'Bol', 'Hareket alanı geniş, altına kat giyilir.']].map(function (k) {
          return '<button type="button" data-k="' + k[0] + '"' + (s.kalip === k[0] ? ' class="on"' : '') + '>' + kalipIkon(k[0]) + '<div><b>' + k[1] + '</b><span>' + k[2] + '</span></div></button>';
        }).join('') + '</div>';
      govde.querySelectorAll('.vb-kal button').forEach(function (b) { b.onclick = function () { s.kalip = b.dataset.k; ciz(); }; });
      alt.innerHTML = '<button type="button" class="vb-geri" aria-label="Geri">←</button><button type="button" class="vb-ileri">Bedenimi Bul →</button>';
    } else {
      yaz({ cins: s.cins, boy: s.boy, kilo: s.kilo, gogus: s.gogus, karin: s.karin, kalca: s.kalca, kalip: s.kalip });
      var cev = 2 * Math.PI * 80, dolu = cev * r.uyum / 100;
      var nm = ['Dar', 'İdeal', 'Bol'];
      var not = r.buyuk ? 'Ölçülerine göre XXL bile dar gelebilir. Siparişten önce WhatsApp’tan bize yaz, birlikte bakalım.'
        : r.gogus > 0.7 ? 'Bu ürün sana biraz bol oturur; oversize sevdiğin bir duruş olur.' : r.gogus < 0.3 ? 'Bu ürün sana biraz oturaklı gelir; daha rahat istersen bir üst beden seç.' : 'Ölçülerine göre bu ürün sana tam beden oturur.';
      govde.innerHTML = '<div class="vb-son"><p class="vb-no">En iyi eşleşme</p>' +
        '<div class="vb-halka"><svg viewBox="0 0 172 172"><circle cx="86" cy="86" r="80" fill="none" stroke="#0A0A0A" stroke-width="1.5" stroke-dasharray="' + dolu.toFixed(1) + ' ' + cev.toFixed(1) + '"/></svg>' + r.beden + '</div>' +
        '<p class="vb-uyum">%' + r.uyum + ' uyum</p><p class="vb-alt">Ölçülerine göre güvenle seçebileceğin beden.</p>' +
        '<div class="vb-skala"><i style="left:' + (r.idx * 25) + '%"></i>' + BEDEN.map(function (b) { return '<span' + (b === r.beden ? ' class="on"' : '') + '>' + b + '</span>'; }).join('') + '</div>' +
        '<div class="vb-ol"><div class="vb-bas"><span></span><span>Dar</span><span>İdeal</span><span>Bol</span></div>' +
        [['Göğüs', r.gogus], ['Bel', r.bel], ['Boy', r.boy]].map(function (c) { return '<div class="vb-cz"><span>' + c[0] + '</span><div><i style="left:' + (c[1] * 100).toFixed(0) + '%" title="' + nm[c[1] < .33 ? 0 : c[1] > .67 ? 2 : 1] + '"></i></div></div>'; }).join('') + '</div>' +
        '<div class="vb-not"><b>Kalıp notu</b>' + not + '</div>' +
        '<p class="vb-alt2">Bu genel bir öneridir; kişisel tercihe göre değişebilir. Beden değişimi mümkün ama yine de emin değilsen <a href="https://wa.me/905513708320?text=' + encodeURIComponent('Merhaba, ' + isim + ' için beden sormak istiyorum. Boy: ' + s.boy + ' cm, kilo: ' + s.kilo + ' kg.') + '" target="_blank" rel="noopener">WhatsApp’tan sor</a>.</p>' +
        '<button type="button" class="vb-bastan">Ölçüleri değiştir</button></div>';
      govde.querySelector('.vb-bastan').onclick = function () { adim = 1; ciz(); };
      alt.innerHTML = '<button type="button" class="vb-ileri">Sepete ' + r.beden + ' Ekle</button>';
      alt.querySelector('.vb-ileri').onclick = function () {
        sec(r.beden); seninYaz(); kapat();
        var b = info.querySelector('.vs-add'); if (b) setTimeout(function () { b.click(); }, 350);
      };
      if (window.gtag) gtag('event', 'beden_bulundu', { beden: r.beden });
      return;
    }
    var ileri = alt.querySelector('.vb-ileri'), geri = alt.querySelector('.vb-geri');
    ileri.onclick = function () { adim++; ciz(); govde.scrollTop = 0; };
    if (geri) geri.onclick = function () { adim--; ciz(); };
  }
  function satir(k, ad, birim, min, max) {
    return '<div class="vb-row"><p class="vb-lbl"><span>' + ad + '</span><span>' + birim + '</span></p><span class="vb-val" data-v="' + k + '">' + s[k] + '<small>' + birim + '</small></span>' +
      '<div class="vb-sl"><button type="button" data-e="' + k + '-" aria-label="' + ad + ' azalt">−</button><input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" value="' + s[k] + '" aria-label="' + ad + '"><button type="button" data-e="' + k + '+" aria-label="' + ad + ' artır">+</button></div></div>';
  }
  function sekil(t, ad, adlar) {
    return '<p class="vb-lbl">' + ad + '</p><div class="vb-sek">' + adlar.map(function (n, k) {
      return '<button type="button" data-t="' + t + '" data-k="' + k + '"' + (s[t] === k - 1 ? ' class="on"' : '') + '>' + ikon(t, k) + n + '</button>';
    }).join('') + '</div>';
  }

  // sepet.js beden seçicisini kurduktan sonra kayıtlı bedeni seç
  setTimeout(seninYaz, 50);
})();
