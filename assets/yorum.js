/* VAELO · Ürün sayfası müşteri yorumları (yıldızlı).
 * Müşteri yorum yazar → "onay bekliyor" olarak kaydedilir → admin panelinden onaylanınca sitede görünür. */
import { db } from '/assets/fb.js';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';

const info = document.querySelector('.info[data-id]');
const main = document.querySelector('main');
if (info && main) baslat();

function baslat() {
  const id = info.dataset.id;
  const ad = info.dataset.name || document.title;
  const P = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z';
  const yildiz = (n, c) => Array.from({ length: 5 }, (_, i) => `<svg class="${c} ${i < Math.round(n) ? 'on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P}"/></svg>`).join('');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const virgul = n => n.toFixed(1).replace('.', ',');

  const css = document.createElement('style');
  css.textContent = `
  .yz-mini{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);margin:-6px 0 16px}
  .yz-mini a{color:var(--black);text-underline-offset:3px}
  .yz-s{width:15px;height:15px;fill:var(--sand)} .yz-s.on{fill:var(--black)}
  .yz{max-width:1200px;margin:0 auto;padding:40px 16px 64px;border-top:1px solid var(--sand)}
  .yz h2{font-family:var(--serif);font-weight:500;font-size:clamp(1.7rem,3vw,2.2rem);margin-bottom:24px}
  .yz-grid{display:grid;gap:32px}
  @media(min-width:860px){.yz-grid{grid-template-columns:260px 1fr;gap:64px}}
  .yz-big{font-family:var(--serif);font-size:52px;line-height:1}
  .yz-say{color:var(--muted);font-size:13px;margin:6px 0 16px}
  .yz-bar{display:grid;grid-template-columns:24px 1fr 24px;gap:8px;align-items:center;font-size:12px;color:var(--muted);margin-bottom:6px;font-variant-numeric:tabular-nums}
  .yz-tr{height:4px;background:var(--sand)} .yz-fi{height:100%;background:var(--black)}
  .yz-list{min-width:0}
  .yz-bos{border:1px solid var(--sand);padding:28px;text-align:center;color:var(--muted);line-height:1.6}
  .yz-bos strong{display:block;font-family:var(--serif);font-size:22px;font-weight:500;color:var(--black)}
  .yz-it{border-bottom:1px solid var(--sand);padding:18px 0;line-height:1.6}
  .yz-it h3{font-size:15px;font-weight:500;margin:6px 0 2px}
  .yz-it p{overflow-wrap:anywhere}
  .yz-meta{font-size:12px;color:var(--muted);margin-top:4px}
  .yz form{margin-top:24px;border:1px solid var(--sand);background:#fff;padding:24px;display:grid;gap:14px}
  .yz form h3{font-family:var(--serif);font-weight:500;font-size:22px}
  .yz label{display:block;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .yz input,.yz textarea{width:100%;border:1px solid var(--sand);background:var(--paper);padding:11px 12px;font:inherit;font-size:14px;color:var(--black)}
  .yz textarea{min-height:100px;resize:vertical}
  .yz-pick{display:flex;gap:4px}
  .yz-pick button{background:none;border:0;padding:2px;cursor:pointer}
  .yz-pick svg{width:28px;height:28px;fill:var(--sand);transition:fill .15s}
  .yz-pick button.on svg{fill:var(--black)}
  .yz-send{background:var(--black);color:var(--paper);border:0;padding:15px;font:inherit;font-size:13px;letter-spacing:2px;text-transform:uppercase;cursor:pointer}
  .yz-send:disabled{opacity:.5}
  .yz-msg{font-size:13px;min-height:1em}
  .yz-msg.err{color:#a3402c}
  .yz-hp{position:absolute;left:-9999px}
  .yz button:focus-visible,.yz input:focus-visible,.yz textarea:focus-visible{outline:2px solid var(--black);outline-offset:2px}`;
  document.head.appendChild(css);

  // Başlığın altına küçük yıldız satırı
  const mini = document.createElement('div');
  mini.className = 'yz-mini';
  info.querySelector('h1')?.after(mini);

  const sec = document.createElement('section');
  sec.className = 'yz';
  sec.id = 'yorumlar';
  sec.innerHTML = `
    <h2>Müşteri Yorumları</h2>
    <div class="yz-grid">
      <div><div class="yz-big" id="yzAvg">–</div><div id="yzStars"></div><p class="yz-say" id="yzSay">Henüz yorum yok</p><div id="yzBars"></div></div>
      <div class="yz-list">
        <div id="yzItems"><div class="yz-bos"><strong>İlk yorumu sen yaz</strong>Bu ürünü aldıysan deneyimini paylaş.</div></div>
        <form id="yzForm" novalidate>
          <h3>Yorum Yaz</h3>
          <div><label>Puanın</label><div class="yz-pick" id="yzPick"></div></div>
          <div><label for="yzAd">Adın</label><input id="yzAd" maxlength="40" placeholder="Örn. Ayşe K." autocomplete="given-name"></div>
          <div><label for="yzBaslik">Başlık</label><input id="yzBaslik" maxlength="60"></div>
          <div><label for="yzYorum">Yorumun</label><textarea id="yzYorum" maxlength="600"></textarea></div>
          <input class="yz-hp" id="yzWeb" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="yz-msg" id="yzMsg"></div>
          <button class="yz-send" type="submit">Gönder</button>
          <p class="yz-say" style="margin:0">Yorumlar incelendikten sonra yayınlanır.</p>
        </form>
      </div>
    </div>`;
  main.after(sec);

  let puan = 0;
  const pick = sec.querySelector('#yzPick');
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', i + ' yıldız');
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${P}"/></svg>`;
    b.onclick = () => { puan = i; [...pick.children].forEach((x, k) => x.classList.toggle('on', k < i)); };
    pick.appendChild(b);
  }

  function goster(liste) {
    const n = liste.length;
    const ort = n ? liste.reduce((a, r) => a + r.puan, 0) / n : 0;
    mini.innerHTML = n
      ? `<span>${yildiz(ort, 'yz-s')}</span><span>${virgul(ort)} (${n} yorum)</span> · <a href="#yorumlar">Yorumları gör</a>`
      : `<span>${yildiz(0, 'yz-s')}</span><span>Henüz yorum yok</span> · <a href="#yorumlar">Yorum yaz</a>`;
    sec.querySelector('#yzAvg').textContent = n ? virgul(ort) : '–';
    sec.querySelector('#yzStars').innerHTML = yildiz(ort, 'yz-s');
    sec.querySelector('#yzSay').textContent = n ? n + ' yorum' : 'Henüz yorum yok';
    sec.querySelector('#yzBars').innerHTML = [5, 4, 3, 2, 1].map(k => {
      const c = liste.filter(r => r.puan === k).length;
      return `<div class="yz-bar"><span>${k}★</span><div class="yz-tr"><div class="yz-fi" style="width:${n ? c / n * 100 : 0}%"></div></div><span>${c}</span></div>`;
    }).join('');
    if (n) sec.querySelector('#yzItems').innerHTML = liste.map(r => {
      const t = r.t?.toDate ? r.t.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      return `<div class="yz-it"><div>${yildiz(r.puan, 'yz-s')}</div>${r.baslik ? `<h3>${esc(r.baslik)}</h3>` : ''}<p>${esc(r.yorum)}</p><div class="yz-meta">${esc(r.ad)}${t ? ' · ' + t : ''}</div></div>`;
    }).join('');
  }

  goster([]);
  getDocs(query(collection(db, 'yorumlar'), where('urun', '==', id), where('onay', '==', true)))
    .then(s => {
      const l = s.docs.map(d => d.data()).sort((a, b) => (b.t?.seconds || 0) - (a.t?.seconds || 0));
      goster(l);
    })
    .catch(() => {});

  const form = sec.querySelector('#yzForm');
  const msg = sec.querySelector('#yzMsg');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const adV = form.yzAd.value.trim(), bas = form.yzBaslik.value.trim(), yor = form.yzYorum.value.trim();
    msg.className = 'yz-msg err';
    if (form.yzWeb.value) return;
    if (!puan) { msg.textContent = 'Lütfen yıldız seçin.'; return; }
    if (!adV || yor.length < 5) { msg.textContent = 'Adınızı ve yorumunuzu yazın.'; return; }
    const btn = form.querySelector('.yz-send');
    btn.disabled = true;
    try {
      await addDoc(collection(db, 'yorumlar'), { urun: id, urunAd: ad.slice(0, 120), ad: adV, baslik: bas, yorum: yor, puan, onay: false, t: serverTimestamp() });
      form.reset(); puan = 0; [...pick.children].forEach(x => x.classList.remove('on'));
      msg.className = 'yz-msg';
      msg.textContent = 'Teşekkürler! Yorumunuz incelendikten sonra yayınlanacak.';
    } catch {
      msg.textContent = 'Yorum gönderilemedi. Lütfen biraz sonra tekrar deneyin.';
    }
    btn.disabled = false;
  });
}
