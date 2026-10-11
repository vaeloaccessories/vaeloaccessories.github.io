/* VAELO Vitrin — kaydırdıkça yana kayan ürün vitrini (Signature ve Street sayfalarında ayrı ayrı)
   Ortadaki ürün net, yanlardaki ürünler soluk ve bulanık. "İncele"ye basınca ekran karelere bölünüp ürün sayfası açılır. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  // fiyatları güncel ürün listesinden al (Shopier'den güncellenen dosya)
  var prices = {};
  fetch('products.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
    (d.products || []).forEach(function (p) { if (p.price) prices[p.id] = Number(p.price).toLocaleString('tr-TR') + ' TL'; });
    document.querySelectorAll('.vv-item').forEach(function (el) {
      var p = prices[el.getAttribute('data-id')]; if (p) el.setAttribute('data-price', p);
    });
    document.querySelectorAll('.vitrin').forEach(function (s) { if (s._vs) s._vs.info(true); });
  }).catch(function () {});

  function Vitrin(sec) {
    var stage = sec.querySelector('.vv-stage');
    var items = [].slice.call(sec.querySelectorAll('.vv-item'));
    var info = sec.querySelector('.vv-info');
    var nameEl = info.querySelector('.vv-name'), tagEl = info.querySelector('.vv-tag'), specEl = info.querySelector('.vv-spec');
    var priceEl = info.querySelector('.vv-price'), btn = info.querySelector('.vv-btn');
    var nowEl = sec.querySelector('.vv-now'), barEl = sec.querySelector('.vv-bar i'), hint = sec.querySelector('.vv-hint');
    var pix = sec.querySelector('.vv-pix');
    var N = items.length, pos = 0, target = 0, cur = -1, raf = 0, active = false, mobile = false, H = 1, busy = false, swapT = 0;

    function measure() {
      mobile = window.innerWidth < 760;
      sec.style.height = (100 + N * (mobile ? 60 : 70)) + 'vh';
      H = Math.max(1, sec.offsetHeight - window.innerHeight);
    }
    function layout() {
      var step = mobile ? 46 : 27;
      for (var i = 0; i < N; i++) {
        var d = i - pos, a = Math.abs(d), c = Math.min(a, 1), el = items[i];
        var o = a <= 1 ? 1 - c * 0.55 : Math.max(0, 0.45 - (a - 1) * 0.9);
        el.style.transform = 'translateX(' + (d * step).toFixed(3) + 'vw) scale(' + (1 - c * 0.22).toFixed(4) + ')';
        el.style.opacity = o.toFixed(3);
        el.style.filter = c < 0.02 ? 'none' : 'blur(' + (c * 3).toFixed(2) + 'px)';
        el.style.zIndex = 10 - Math.round(a);
        el.classList.toggle('on', a < 0.5);
        el.tabIndex = a < 1.5 ? 0 : -1;
        el.style.pointerEvents = a < 1.5 ? 'auto' : 'none';
      }
    }
    function info2(now) {
      var el = items[cur]; if (!el) return;
      var fill = function () {
        nameEl.textContent = el.getAttribute('data-name');
        tagEl.textContent = el.getAttribute('data-tag');
        specEl.textContent = el.getAttribute('data-spec');
        priceEl.textContent = el.getAttribute('data-price');
        btn.setAttribute('href', el.getAttribute('data-href'));
        info.classList.remove('swap');
      };
      clearTimeout(swapT);
      if (now || reduce) return fill();
      info.classList.add('swap'); swapT = setTimeout(fill, 260);
    }
    function tick() {
      raf = 0;
      var diff = target - pos;
      pos = (Math.abs(diff) < 0.0005 || reduce) ? target : pos + diff * 0.075;
      layout();
      if (Math.abs(target - pos) > 0.0005) raf = requestAnimationFrame(tick);
    }
    function update() {
      var r = sec.getBoundingClientRect();
      if (!r.height) return;                          // bölüm gizliyse (başka sayfa açık) hiçbir şey yapma
      var p = clamp(-r.top / H, 0, 1);
      var t = p * (N - 1), f = Math.min(N - 2, Math.floor(t)), fr = t - Math.max(0, f);
      // her ürün ortada biraz bekler, aradaki geçiş yumuşakça olur
      target = N < 2 ? 0 : Math.max(0, f) + ease(clamp((fr - 0.15) / 0.7, 0, 1));
      if (!raf) raf = requestAnimationFrame(tick);
      hint.style.opacity = p > 0.02 ? 0 : 1;
      var i = Math.round(target);
      if (i !== cur) {
        var first = cur < 0; cur = i; info2(first);
        nowEl.textContent = pad(i + 1);
        barEl.style.transform = 'scaleX(' + ((i + 1) / N) + ')';
      }
    }
    function goTo(i) {
      var y = window.scrollY + sec.getBoundingClientRect().top + (N < 2 ? 0 : i / (N - 1)) * H + 2;
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
    // ekran küçük karelere bölünür, kareler rastgele dolar, sonra ürün sayfası açılır
    function pixelGo(href) {
      if (reduce || busy) { location.href = href; return; }
      busy = true;
      var cols = mobile ? 8 : 16, rows = mobile ? 14 : 9, cells = [], T = 600;
      pix.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
      pix.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
      pix.innerHTML = '';
      for (var k = 0; k < cols * rows; k++) { var s = document.createElement('span'); pix.appendChild(s); cells.push(s); }
      cells.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (c, j, arr) {
        setTimeout(function () { c.classList.add('in'); }, (j / arr.length) * T);
      });
      setTimeout(function () { location.href = href; }, T + 380);
    }

    items.forEach(function (el, i) {
      el.addEventListener('click', function () { if (i === cur) pixelGo(el.getAttribute('data-href')); else goTo(i); });
    });
    btn.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault(); pixelGo(btn.getAttribute('href'));
    });
    // geri tuşuyla dönülünce kareleri temizle
    window.addEventListener('pageshow', function () { pix.innerHTML = ''; busy = false; });

    function refresh() { measure(); update(); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { active = e[0].isIntersecting; if (active) update(); }).observe(sec);
    } else active = true;
    window.addEventListener('scroll', function () { if (active) update(); }, { passive: true });
    window.addEventListener('resize', function () { refresh(); layout(); });
    // sayfa (Ana sayfa / Signature / Street) değişince yeniden ölç
    new MutationObserver(function () { setTimeout(refresh, 30); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-view'] });
    window.addEventListener('load', refresh);
    measure(); layout(); update();
    sec._vs = { info: function () { info2(true); } };
  }

  // vitrin yalnızca bu dosya gerçekten çalışınca görünür (eski/bozuk dosyada sayfa takılmasın)
  document.documentElement.classList.add('vt-on');
  document.querySelectorAll('.vitrin').forEach(function (s) { Vitrin(s); });
})();
