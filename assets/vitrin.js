/* VAELO Vitrin — kaydırdıkça dönen 3D ürün vitrini */
(function () {
  var sec = document.getElementById('vitrin');
  if (!sec) return;
  var stage = sec.querySelector('.vt-stage');
  var cards = [].slice.call(sec.querySelectorAll('.vt-item'));
  var infos = [].slice.call(sec.querySelectorAll('.vt-info'));
  var dots = [].slice.call(sec.querySelectorAll('.vt-dots button'));
  var intro = sec.querySelector('.vt-intro');
  var outro = sec.querySelector('.vt-outro');
  var shadow = sec.querySelector('.vt-shadow');
  var N = cards.length;

  // fiyatları güncel ürün listesinden al (Shopier'den güncellenen dosya)
  fetch('products.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
    var map = {};
    (d.products || []).forEach(function (p) { map[p.id] = p; });
    infos.forEach(function (el) {
      var p = map[el.getAttribute('data-id')], pr = el.querySelector('.vt-price');
      if (p && pr && p.price) pr.textContent = Number(p.price).toLocaleString('tr-TR') + ' TL';
    });
  }).catch(function () {});

  var hexToRgb = function (h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
  var glow = cards.map(function (c) { return hexToRgb(c.getAttribute('data-glow')); });
  var baseGlow = hexToRgb('#8a7660');
  var flips = cards.map(function (c) { return !!c.querySelector('.vt-back'); });

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (a, b, v) { var x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  var lerp = function (a, b, k) { return a + (b - a) * k; };

  function lineup(i, mobile) {
    var sp = mobile ? 15 : 13;                       // aralık (vw)
    return { x: (i - (N - 1) / 2) * sp, y: mobile ? -4 : 2, s: mobile ? 0.3 : 0.4, rz: (i % 2 ? 9 : -9), ry: 0, o: 1 };
  }
  function hero(i, c, mobile) {
    var a = clamp(Math.abs(c), 0, 1), s = smooth(0.28, 0.72, a), dir = c > 0 ? -1 : 1;
    var ry = c * 50;
    if (flips[i]) ry += 180 * smooth(-0.05, 0.09, c);   // arkasını göstermek için hızlı dönüş
    return { x: mobile ? 0 : 8, y: (mobile ? -11 : 0) + dir * s * 115, s: 1 - s * 0.15, rz: -7 + c * 18, ry: ry, o: 1 - smooth(0.45, 0.8, a) };
  }

  var mobile = false, H = 1, raf = 0, active = false, last = -1;
  function measure() { mobile = window.innerWidth < 760; H = sec.offsetHeight - window.innerHeight; }

  function frame() {
    raf = 0;
    var r = sec.getBoundingClientRect();
    if (!r.height) return;                          // bölüm gizliyse (başka sayfa açık) hiçbir şey yapma
    var t = clamp(-r.top / Math.max(H, 1), 0, 1) * (N + 1);
    if (Math.abs(t - last) < 0.0005) return;
    last = t;
    var a0 = smooth(0, 1, t), a2 = smooth(N + 0.3, N + 1, t);

    for (var i = 0; i < N; i++) {
      var L = lineup(i, mobile), P;
      if (t < 1) {
        var T = i === 0 ? hero(0, -0.3, mobile) : { x: L.x * 3.2, y: L.y + 30, s: 0.3, rz: L.rz * 3, ry: 0, o: 0 };
        P = { x: lerp(L.x, T.x, a0), y: lerp(L.y, T.y, a0), s: lerp(L.s, T.s, a0), rz: lerp(L.rz, T.rz, a0), ry: lerp(L.ry, T.ry, a0), o: lerp(1, T.o, a0) };
      } else {
        P = hero(i, t - (i + 1), mobile);
        if (a2 > 0) {
          var ry = P.ry % 360;
          P = { x: lerp(P.x, L.x, a2), y: lerp(P.y, L.y, a2), s: lerp(P.s, L.s, a2), rz: lerp(P.rz, L.rz, a2), ry: lerp(ry, ry > 90 ? 360 : 0, a2), o: lerp(P.o, 1, a2) };
        }
      }
      var el = cards[i];
      el.style.transform = 'translate3d(' + P.x.toFixed(2) + 'vw,' + P.y.toFixed(2) + 'vh,0) scale(' + P.s.toFixed(4) + ') rotateZ(' + P.rz.toFixed(2) + 'deg)';
      el.firstElementChild.style.transform = 'rotateY(' + P.ry.toFixed(2) + 'deg)';
      el.style.opacity = P.o.toFixed(3);
      el.style.zIndex = Math.round(P.s * 100);
    }

    // arka plan ışığının rengi
    var idx = clamp(Math.round(t - 1), 0, N - 1), g;
    if (t < 1) g = [lerp(baseGlow[0], glow[0][0], a0), lerp(baseGlow[1], glow[0][1], a0), lerp(baseGlow[2], glow[0][2], a0)];
    else {
      var f = clamp(t - 1, 0, N - 1), lo = Math.floor(f), hi = Math.min(lo + 1, N - 1), k = smooth(0.35, 0.65, f - lo);
      g = [lerp(glow[lo][0], glow[hi][0], k), lerp(glow[lo][1], glow[hi][1], k), lerp(glow[lo][2], glow[hi][2], k)];
      if (a2 > 0) g = [lerp(g[0], baseGlow[0], a2), lerp(g[1], baseGlow[1], a2), lerp(g[2], baseGlow[2], a2)];
    }
    stage.style.setProperty('--glow', Math.round(g[0]) + ',' + Math.round(g[1]) + ',' + Math.round(g[2]));

    // yazılar
    var heroOn = (t > 0.6 && t < N + 0.45);
    infos.forEach(function (el, j) {
      var c = t - (j + 1), o = 1 - smooth(0.18, 0.38, Math.abs(c));
      if (j === 0) o = Math.min(o, smooth(0.55, 0.9, t));
      el.style.opacity = o.toFixed(3);
      el.style.transform = 'translateY(' + (c * -40).toFixed(1) + 'px)';
      el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    });
    intro.style.opacity = (1 - smooth(0.05, 0.4, t)).toFixed(3);
    outro.style.opacity = smooth(N + 0.55, N + 0.95, t).toFixed(3);
    outro.style.pointerEvents = t > N + 0.8 ? 'auto' : 'none';
    shadow.style.opacity = (heroOn ? 1 : 0.0).toString();
    dots.forEach(function (d, j) { d.classList.toggle('on', heroOn && j === idx); });
  }
  function req() { if (!raf) raf = requestAnimationFrame(frame); }

  // noktalara tıklayınca o ürüne kaydır
  dots.forEach(function (d, j) {
    d.addEventListener('click', function () {
      var y = window.scrollY + sec.getBoundingClientRect().top + (j + 1) / (N + 1) * H + 2;
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 }); else window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { active = e[0].isIntersecting; if (active) { last = -1; req(); } }).observe(sec);
  } else active = true;
  window.addEventListener('scroll', function () { if (active) req(); }, { passive: true });
  window.addEventListener('resize', function () { measure(); last = -1; req(); });
  // sayfa (Ana sayfa / Signature / Street) değişince yeniden ölç
  new MutationObserver(function () { measure(); last = -1; req(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-view'] });
  measure(); req();
  window.addEventListener('load', function () { measure(); last = -1; req(); });
})();
