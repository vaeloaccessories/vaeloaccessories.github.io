/* VAELO · Üyelik + site istatistikleri
 * - "Hesabım" penceresi: üye ol, giriş yap, şifremi unuttum, siparişlerim, çıkış
 * - Ziyaret sayıları, ürün görüntülemeleri, sepetler ve siparişler admin paneli için kaydedilir.
 *   Çerezleri reddeden ziyaretçiden yalnızca kimliksiz toplam sayılar alınır.
 */
import { auth, db, gun, hataMetni, vaeloMail } from './fb.js';
import {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import {
  doc, setDoc, updateDoc, addDoc, collection, serverTimestamp, increment,
  query, where, limit, getDocs
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';

const sessizce = (p) => p && p.catch && p.catch(() => {});
let uye = null;               // giriş yapmış üye
let ilkDurum = false;         // giriş durumu öğrenildi mi

// ---------- ziyaretçi kimliği ----------
const YONETICI = (() => { try { return localStorage.getItem('vaelo-admin') === '1'; } catch (e) { return false; } })();
function izinVar() {
  if (YONETICI) return false;
  try { return localStorage.getItem('vaelo-cerez') === 'kabul'; } catch (e) { return false; }
}
function rastgele() {
  const a = new Uint8Array(12); crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}
function ziyaretciNo() {
  try {
    let z = localStorage.getItem('vaelo-ziyaretci');
    if (!z) { z = rastgele(); localStorage.setItem('vaelo-ziyaretci', z); }
    return z;
  } catch (e) { return null; }
}
const cihaz = matchMedia('(max-width: 820px)').matches ? 'mobil' : 'bilgisayar';
function kaynak() {
  try {
    const r = document.referrer ? new URL(document.referrer).hostname : '';
    if (!r || /vaelo\.com\.tr$/.test(r)) return new URLSearchParams(location.search).get('utm_source') || 'doğrudan';
    return r.replace(/^www\./, '').replace(/^l\.|^lm\./, '');
  } catch (e) { return 'doğrudan'; }
}

// ---------- sayaçlar (herkes için, kimliksiz) ----------
function say(alanlar) { if (YONETICI) return; sessizce(setDoc(doc(db, 'gunluk', gun()), alanlar, { merge: true })); }

// ---------- ayrıntılı kayıt (izin verenler ve üyeler) ----------
function olay(tur, ek) {
  if (!izinVar()) return;
  const z = ziyaretciNo(); if (!z) return;
  sessizce(addDoc(collection(db, 'olaylar'), Object.assign({
    t: serverTimestamp(), tur,
    sayfa: (location.pathname + location.hash).slice(0, 180),
    oturum: z, uye: uye ? (uye.email || uye.uid) : null,
    cihaz, kaynak: kaynak().slice(0, 60)
  }, ek || {})));
}

// ilk açılış
(function () {
  let yeniOturum = false;
  try { if (!sessionStorage.getItem('vaelo-oturum')) { sessionStorage.setItem('vaelo-oturum', '1'); yeniOturum = true; } } catch (e) {}
  const s = { sayfa: increment(1) };
  if (yeniOturum) s.oturum = increment(1);
  const info = document.querySelector('.info[data-id]');
  if (info) s.urun = { [info.dataset.id]: increment(1) };
  say(s);
  // Giriş durumunu bekleyip (en fazla 1,5 sn) ayrıntılı kaydı at: üye bilgisi de eklensin.
  const at = () => {
    if (info) olay('urun', { urun: info.dataset.id, ad: (info.dataset.name || '').slice(0, 120) });
    else olay('sayfa');
  };
  let atildi = false;
  const bir = () => { if (!atildi) { atildi = true; at(); } };
  setTimeout(bir, 1500);
  onAuthStateChanged(auth, () => setTimeout(bir, 50));
})();

// Ana sayfadaki bölüm değişimleri (Signature / Street) de sayfa olarak sayılsın.
let sonHash = location.hash;
addEventListener('hashchange', () => {
  if (location.hash === sonHash || /^#(sepet|hesap)$/.test(location.hash)) return;
  sonHash = location.hash;
  say({ sayfa: increment(1) });
  olay('sayfa');
});

// ---------- sepet (sepet.js'ten gelen haberler) ----------
function sepetiGonder(liste) {
  if (!izinVar()) return;
  const z = ziyaretciNo(); if (!z) return;
  const s = (liste || []).slice(0, 30);
  sessizce(setDoc(doc(db, 'sepetler', z), {
    urunler: s.map((x) => ({ id: String(x.id), ad: String(x.name || '').slice(0, 120), beden: String(x.size || ''), adet: Number(x.qty) || 1, fiyat: Number(x.price) || 0, img: String(x.img || '').slice(0, 300) })),
    toplam: s.reduce((t, x) => t + (Number(x.price) || 0) * (Number(x.qty) || 1), 0),
    guncel: serverTimestamp(),
    uye: uye ? uye.uid : null,
    ad: uye ? (uye.displayName || null) : null,
    email: uye ? (uye.email || null) : null,
    cihaz
  }));
}
function kayitliSepet() {
  try { const s = JSON.parse(localStorage.getItem('vaelo-sepet') || '[]'); return Array.isArray(s) ? s : []; } catch (e) { return []; }
}
// Sepet her değiştiğinde
document.addEventListener('vaelo:sepet', (e) => sepetiGonder(e.detail));
// Çerezleri sonradan kabul eden ya da sonradan üye girişi yapan ziyaretçinin
// zaten dolu olan sepeti de panele düşsün; sayfa her açıldığında da güncellensin.
document.addEventListener('vaelo:cerez', () => { const s = kayitliSepet(); if (s.length) sepetiGonder(s); });
onAuthStateChanged(auth, () => {
  setTimeout(() => { const s = kayitliSepet(); if (s.length) sepetiGonder(s); }, 300);
});
document.addEventListener('vaelo:ekle', (e) => {
  const u = e.detail || {}; if (!u.id) return;
  say({ sepet: { [String(u.id)]: increment(1) } });
  olay('sepet', { urun: String(u.id), ad: String(u.name || '').slice(0, 120) });
});
document.addEventListener('vaelo:odeme', (e) => {
  const d = e.detail || {}; if (!d.order) return;
  const v = d.veri || {};
  try { sessionStorage.setItem('vaelo-siparis', d.order); } catch (e2) {}
  say({ odeme: increment(1) });
  olay('odeme', { urun: null, ad: d.order });
  sessizce(setDoc(doc(db, 'siparisler', String(d.order)), {
    t: serverTimestamp(), durum: 'odeme-ekrani', toplam: Number(d.total) || 0,
    ad: String(v.name || '').slice(0, 120), email: String(v.email || '').slice(0, 160), tel: String(v.phone || '').slice(0, 40),
    il: String(v.city || '').slice(0, 60), ilce: String(v.district || '').slice(0, 60), adres: String(v.address || '').slice(0, 500),
    hediye: !!v.gift,
    urunler: (d.urunler || []).slice(0, 30).map((x) => ({ id: String(x.id), ad: String(x.name || '').slice(0, 120), beden: String(x.size || ''), adet: Number(x.qty) || 1, fiyat: Number(x.price) || 0 })),
    uid: uye ? uye.uid : null
  }));
});

// Ödeme başarılı sayfası: siparişi "müşteri ödemeyi tamamladı" olarak işaretle.
if (/odeme-basarili/.test(location.pathname)) {
  let no = null; try { no = sessionStorage.getItem('vaelo-siparis'); } catch (e) {}
  if (no) {
    sessizce(updateDoc(doc(db, 'siparisler', no), { durum: 'musteri-dondu' }));
    say({ siparis: increment(1) });
    try { sessionStorage.removeItem('vaelo-siparis'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('vaelo:sepet', { detail: [] }));
  }
}

// ---------- Hesabım penceresi ----------
const css = `
.vu-bg{position:fixed;inset:0;z-index:99997;background:rgba(10,10,10,.5);opacity:0;pointer-events:none;transition:opacity .35s}
.vu-open .vu-bg{opacity:1;pointer-events:auto}
.vu-panel{position:fixed;top:0;right:0;bottom:0;z-index:99998;width:min(440px,100%);background:#F3F1EC;color:#0A0A0A;font-family:Jost,Helvetica,Arial,sans-serif;font-weight:300;transform:translateX(100%);transition:transform .45s cubic-bezier(.16,.84,.24,1);display:flex;flex-direction:column}
.vu-open .vu-panel{transform:none}
.vu-head{display:flex;justify-content:space-between;align-items:center;padding:22px 22px 18px;border-bottom:1px solid #DFDBD2}
.vu-head h2{font:500 1.6rem/1 "Cormorant Garamond",Georgia,serif;margin:0}
.vu-x{background:none;border:0;font-size:26px;line-height:1;cursor:pointer;color:inherit;padding:4px 8px}
.vu-body{flex:1;overflow:auto;padding:6px 22px calc(28px + env(safe-area-inset-bottom,0px))}
.vu-body p.vu-lead{font-size:.9rem;line-height:1.6;color:#3a3833;margin:18px 0 4px}
.vu-f label{display:block;font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:#6B6861;margin:16px 0 6px}
.vu-f input[type=text],.vu-f input[type=email],.vu-f input[type=password]{width:100%;box-sizing:border-box;padding:12px;border:1px solid #DFDBD2;background:#fff;font:300 16px Jost,Helvetica,Arial,sans-serif;color:#0A0A0A;border-radius:0}
.vu-ok{display:flex;gap:10px;align-items:flex-start;font-size:.8rem;line-height:1.55;margin-top:16px;color:#3a3833}.vu-ok input{width:18px;height:18px;margin-top:2px;flex:none}
.vu-ok a{color:inherit}
.vu-go{display:block;width:100%;margin-top:20px;padding:16px;background:#0A0A0A;color:#F3F1EC;border:0;font:400 13px Jost,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.vu-go[disabled]{opacity:.5;cursor:default}
.vu-go.vu-ghost{background:transparent;color:#0A0A0A;border:1px solid #0A0A0A}
.vu-link{background:none;border:0;color:#6B6861;font:300 .85rem Jost,Helvetica,Arial,sans-serif;cursor:pointer;padding:0;margin-top:16px;text-decoration:underline;display:block}
.vu-err{color:#9b2c2c;font-size:.85rem;margin:12px 0 0;min-height:1em}
.vu-msg{color:#2f5d3a;font-size:.85rem;margin:12px 0 0}
.vu-tabs{display:flex;border-bottom:1px solid #DFDBD2;margin:0 -22px}
.vu-tabs button{flex:1;background:none;border:0;padding:16px 0 14px;font:400 12px Jost,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6B6861;cursor:pointer;border-bottom:2px solid transparent}
.vu-tabs button.on{color:#0A0A0A;border-color:#0A0A0A}
.vu-hi{font:500 1.5rem/1.2 "Cormorant Garamond",Georgia,serif;margin:22px 0 4px}
.vu-mail{color:#6B6861;font-size:.88rem;margin:0}
.vu-h3{font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;color:#6B6861;margin:28px 0 8px;font-weight:400}
.vu-ord{border-top:1px solid #DFDBD2;padding:14px 0;font-size:.85rem;line-height:1.55}
.vu-ord b{font-weight:400}
.vu-ord span{color:#6B6861}
.vu-empty{color:#6B6861;font-size:.88rem}
.vu-nav-btn{cursor:pointer}
.vu-hg{position:fixed;inset:0;z-index:100001;background:#0A0A0A;color:#F3F1EC;display:flex;align-items:center;justify-content:center;text-align:center;padding:32px 24px calc(32px + env(safe-area-inset-bottom,0px));opacity:0;transition:opacity .8s ease;font-family:Jost,Helvetica,Arial,sans-serif;font-weight:300}
.vu-hg.on{opacity:1}
.vu-hg-in{max-width:520px;transform:translateY(18px);transition:transform 1.1s cubic-bezier(.16,.84,.24,1)}
.vu-hg.on .vu-hg-in{transform:none}
.vu-hg-logo{font:600 2.1rem/1 "Cormorant Garamond",Georgia,serif;letter-spacing:.34em;padding-left:.34em}
.vu-hg-sub{font-size:.62rem;letter-spacing:.32em;text-transform:uppercase;color:#8F8B83;margin-top:10px}
.vu-hg-line{width:40px;height:1px;background:#C8B79E;margin:44px auto 36px}
.vu-hg h2{font:500 clamp(2.2rem,7vw,3.4rem)/1.1 "Cormorant Garamond",Georgia,serif;margin:0 0 18px}
.vu-hg p{font-size:.98rem;line-height:1.75;color:#CFCBC3;margin:0 auto;max-width:420px}
.vu-hg-btns{display:flex;flex-direction:column;gap:10px;margin-top:42px}
.vu-hg-btns button{padding:16px;font:400 12px Jost,Helvetica,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;border:1px solid #F3F1EC}
.vu-hg-a{background:#F3F1EC;color:#0A0A0A}.vu-hg-b{background:transparent;color:#F3F1EC}
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

const kok = document.createElement('div');
kok.innerHTML = '<div class="vu-bg"></div><aside class="vu-panel" role="dialog" aria-label="Hesabım"><div class="vu-head"><h2>Hesabım</h2><button class="vu-x" type="button" aria-label="Kapat">×</button></div><div class="vu-body"></div></aside>';
document.body.appendChild(kok);
const govde = kok.querySelector('.vu-body');
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tl = (n) => '₺' + Number(n || 0).toLocaleString('tr-TR');
let gorunum = 'giris';

function ac(v) { if (v) gorunum = v; ciz(); document.documentElement.classList.add('vu-open'); }
function kapat() { document.documentElement.classList.remove('vu-open'); if (location.hash === '#hesap') history.replaceState(null, '', location.pathname + location.search); }
kok.querySelector('.vu-bg').onclick = kapat;
kok.querySelector('.vu-x').onclick = kapat;
addEventListener('keydown', (e) => { if (e.key === 'Escape') kapat(); });

function ciz() {
  if (uye) return hesapCiz();
  if (gorunum === 'sifre') return sifreCiz();
  const kayit = gorunum === 'kayit';
  govde.innerHTML = `
    <div class="vu-tabs"><button type="button" data-v="giris" class="${kayit ? '' : 'on'}">Giriş Yap</button><button type="button" data-v="kayit" class="${kayit ? 'on' : ''}">Üye Ol</button></div>
    <p class="vu-lead">${kayit ? 'VAĖLO ailesine katılın; siparişlerinizi takip edin, ödeme bilgileriniz otomatik dolsun.' : 'Tekrar hoş geldiniz.'}</p>
    <form class="vu-f" novalidate>
      ${kayit ? '<label for="vu-ad">Ad soyad</label><input id="vu-ad" type="text" name="ad" autocomplete="name" required>' : ''}
      <label for="vu-ep">E-posta</label><input id="vu-ep" type="email" name="email" autocomplete="email" required>
      <label for="vu-sf">Şifre</label><input id="vu-sf" type="password" name="sifre" autocomplete="${kayit ? 'new-password' : 'current-password'}" required${kayit ? ' minlength="8" placeholder="En az 8 karakter"' : ''}>
      ${kayit ? `<div class="vu-ok"><input id="vu-kvkk" type="checkbox"><label for="vu-kvkk" style="all:unset"><a href="/kvkk-aydinlatma-metni.html" target="_blank">KVKK Aydınlatma Metni</a>’ni okudum; üyeliğim ve siparişlerim için bilgilerimin işleneceğini biliyorum.</label></div>
      <div class="vu-ok"><input id="vu-izin" type="checkbox"><label for="vu-izin" style="all:unset">Alışveriş deneyimimin geliştirilmesi için sitede gezindiğim sayfaların ve sepetimin kaydedilmesine izin veriyorum. (İsteğe bağlı)</label></div>
      <div class="vu-ok"><input id="vu-bulten" type="checkbox"><label for="vu-bulten" style="all:unset">Yeni koleksiyon ve kampanyalardan e-posta ile haberdar olmak istiyorum. (İsteğe bağlı)</label></div>` : ''}
      <p class="vu-err" aria-live="polite"></p>
      <button class="vu-go" type="submit">${kayit ? 'Üye Ol' : 'Giriş Yap'}</button>
      ${kayit ? '' : '<button class="vu-link" type="button" data-v="sifre">Şifremi unuttum</button>'}
    </form>`;
  govde.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { gorunum = b.dataset.v; ciz(); }; });
  const f = govde.querySelector('form'), err = f.querySelector('.vu-err'), go = f.querySelector('.vu-go');
  f.onsubmit = async (e) => {
    e.preventDefault(); err.textContent = '';
    const email = f.email.value.trim(), sifre = f.sifre.value;
    if (kayit) {
      const ad = f.ad.value.trim();
      if (ad.length < 2) { err.textContent = 'Lütfen adınızı ve soyadınızı yazın.'; return; }
      if (sifre.length < 8) { err.textContent = 'Şifreniz en az 8 karakter olmalı.'; return; }
      if (!f.querySelector('#vu-kvkk').checked) { err.textContent = 'Üye olmak için KVKK Aydınlatma Metni’ni okuduğunuzu onaylayın.'; return; }
      if (f.querySelector('#vu-izin').checked) {
        try { localStorage.setItem('vaelo-cerez', 'kabul'); } catch (x) {}
        if (window.gtag) gtag('consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
        if (window.fbq) fbq('consent', 'grant');
        try { document.dispatchEvent(new CustomEvent('vaelo:cerez')); } catch (x) {}
      }
      go.disabled = true; go.textContent = 'Üyeliğiniz oluşturuluyor…';
      try {
        const k = await createUserWithEmailAndPassword(auth, email, sifre);
        await updateProfile(k.user, { displayName: ad });
        await setDoc(doc(db, 'uyeler', k.user.uid), { ad: ad.slice(0, 120), email: k.user.email, kayit: serverTimestamp(), son: serverTimestamp(), bulten: f.querySelector('#vu-bulten').checked, cihaz });
        say({ uye: increment(1) });
        k.user.getIdToken().then((t) => vaeloMail('hosgeldin', { idToken: t })).catch(() => {});
        uye = auth.currentUser; olay('uye', { urun: null, ad: 'Yeni üyelik' });
        kapat(); hosGeldin(ad);
      } catch (x) { err.textContent = hataMetni(x); go.disabled = false; go.textContent = 'Üye Ol'; }
    } else {
      go.disabled = true; go.textContent = 'Giriş yapılıyor…';
      try {
        const k = await signInWithEmailAndPassword(auth, email, sifre);
        sessizce(updateDoc(doc(db, 'uyeler', k.user.uid), { son: serverTimestamp() }));
      } catch (x) { err.textContent = hataMetni(x); go.disabled = false; go.textContent = 'Giriş Yap'; }
    }
  };
}

function hosGeldin(ad) {
  const ilk = esc(String(ad || '').trim().split(/\s+/)[0] || '');
  const k = document.createElement('div');
  k.className = 'vu-hg'; k.setAttribute('role', 'dialog'); k.setAttribute('aria-label', 'Hoş geldiniz');
  k.innerHTML = `<div class="vu-hg-in">
    <div class="vu-hg-logo">VAĖLO</div><div class="vu-hg-sub">Accessories &amp; Apparel</div>
    <div class="vu-hg-line"></div>
    <h2>Hoş geldiniz${ilk ? ', ' + ilk : ''}.</h2>
    <p>Artık VAĖLO ailesinin bir parçasısınız. Siparişlerinizi Hesabım bölümünden takip edebilir, bir sonraki alışverişinizi çok daha hızlı tamamlayabilirsiniz. Hoş geldin mailiniz de yolda.</p>
    <div class="vu-hg-btns"><button type="button" class="vu-hg-a">Koleksiyonu Keşfet</button><button type="button" class="vu-hg-b">Hesabım</button></div>
  </div>`;
  document.body.appendChild(k);
  requestAnimationFrame(() => requestAnimationFrame(() => k.classList.add('on')));
  const git = (sonra) => { k.classList.remove('on'); setTimeout(() => { k.remove(); sonra(); }, 600); };
  k.querySelector('.vu-hg-a').onclick = () => git(() => {
    const a = document.querySelector('a[data-view="signature"]');
    if (a) a.click(); else location.href = '/#signature';
  });
  k.querySelector('.vu-hg-b').onclick = () => git(() => ac());
  k.querySelector('.vu-hg-a').focus();
}

function sifreCiz() {
  govde.innerHTML = `
    <p class="vu-lead">E-posta adresinizi yazın, şifrenizi yenilemeniz için size bir bağlantı gönderelim.</p>
    <form class="vu-f" novalidate>
      <label for="vu-ep2">E-posta</label><input id="vu-ep2" type="email" name="email" autocomplete="email" required>
      <p class="vu-err" aria-live="polite"></p>
      <button class="vu-go" type="submit">Bağlantı Gönder</button>
      <button class="vu-link" type="button" data-v="giris">← Girişe dön</button>
    </form>`;
  govde.querySelector('[data-v]').onclick = () => { gorunum = 'giris'; ciz(); };
  const f = govde.querySelector('form'), err = f.querySelector('.vu-err');
  f.onsubmit = async (e) => {
    e.preventDefault(); err.textContent = '';
    try {
      const em = f.email.value.trim();
      if (!(await vaeloMail('sifre', { email: em }))) await sendPasswordResetEmail(auth, em);
      err.className = 'vu-msg'; err.textContent = 'Bağlantı gönderildi. Gelen kutunuzu (ve gereksiz klasörünü) kontrol edin.';
    } catch (x) { err.className = 'vu-err'; err.textContent = x.vaelo ? x.message : hataMetni(x); }
  };
}

const DURUM = { 'odeme-ekrani': 'Ödeme bekleniyor', 'musteri-dondu': 'Ödeme alındı', 'odendi': 'Hazırlanıyor', 'kargoda': 'Kargoda', 'teslim': 'Teslim edildi', 'iptal': 'İptal edildi' };
async function hesapCiz() {
  const ad = uye.displayName || '';
  govde.innerHTML = `
    <p class="vu-hi">Merhaba${ad ? ', ' + esc(ad.split(' ')[0]) : ''}</p>
    <p class="vu-mail">${esc(uye.email)}</p>
    <p class="vu-h3">Siparişlerim</p>
    <div class="vu-orders"><p class="vu-empty">Yükleniyor…</p></div>
    <button class="vu-go vu-ghost" type="button" data-c="cikis">Çıkış Yap</button>`;
  govde.querySelector('[data-c=cikis]').onclick = () => signOut(auth);
  const kutu = govde.querySelector('.vu-orders');
  try {
    const q = await getDocs(query(collection(db, 'siparisler'), where('uid', '==', uye.uid), limit(30)));
    const l = q.docs.map((d) => Object.assign({ no: d.id }, d.data())).filter((o) => o.durum !== 'odeme-ekrani')
      .sort((a, b) => (b.t ? b.t.seconds : 0) - (a.t ? a.t.seconds : 0));
    kutu.innerHTML = l.length ? l.map((o) => `<div class="vu-ord"><b>${esc(o.no)}</b> · ${tl(o.toplam)}<br><span>${o.t ? new Date(o.t.seconds * 1000).toLocaleDateString('tr-TR') : ''} · ${esc(DURUM[o.durum] || o.durum)}</span><br>${(o.urunler || []).map((x) => esc(x.ad) + ' (' + esc(x.beden) + ') ×' + x.adet).join('<br>')}</div>`).join('')
      : '<p class="vu-empty">Henüz siparişiniz yok.</p>';
  } catch (e) { kutu.innerHTML = '<p class="vu-empty">Siparişler şu an yüklenemedi.</p>'; }
}

// Menüye "Hesabım" bağlantısı (yoksa ekle) ve tıklanınca pencereyi aç
function menuyeEkle() {
  if (document.querySelector('a[href="#hesap"]')) return;
  const back = document.querySelector('header .back');
  if (back) {
    const kap = document.createElement('span'); kap.style.cssText = 'display:flex;gap:18px;align-items:center';
    const a = document.createElement('a'); a.href = '#hesap'; a.className = 'back'; a.textContent = 'Hesabım'; a.dataset.kisa = '1';
    back.replaceWith(kap); kap.appendChild(back); kap.appendChild(a);
  }
}
menuyeEkle();
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href="#hesap"]'); if (!a) return;
  e.preventDefault(); e.stopPropagation();
  document.documentElement.classList.remove('menu-open');
  const mb = document.getElementById('menuBtn'); if (mb) { mb.classList.remove('active'); mb.setAttribute('aria-expanded', 'false'); }
  ac();
}, true);

onAuthStateChanged(auth, (u) => {
  uye = u;
  window.VAELO_UYE = u ? { ad: u.displayName || '', email: u.email || '' } : null;
  document.querySelectorAll('a[href="#hesap"]').forEach((a) => { a.textContent = u || a.dataset.kisa ? 'Hesabım' : 'Giriş / Üye Ol'; });
  if (document.documentElement.classList.contains('vu-open')) ciz();
  if (!ilkDurum) { ilkDurum = true; if (location.hash === '#hesap') ac(); }
});
