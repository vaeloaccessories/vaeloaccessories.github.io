// Kadın ürün videolarını kendi sitemize (assets/video) indirir; telefonlar dış sunucudaki
// videoyu oynatmıyordu. Her video bir kez indirilir, telefona uygun (H.264, 720px) hale getirilir.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const DIR = 'assets/video';
fs.mkdirSync(DIR, { recursive: true });
const data = JSON.parse(fs.readFileSync('products.json', 'utf8'));
let ffmpeg = null;
const hasFfmpeg = () => {
  if (ffmpeg !== null) return ffmpeg;
  try { execSync('command -v ffmpeg || (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg)', { stdio: 'ignore' }); ffmpeg = true; }
  catch { ffmpeg = false; }
  return ffmpeg;
};

let degisti = false;
for (const p of data.products || []) {
  const url = p.video;
  if (!/^https?:\/\//i.test(url || '')) continue;
  const ad = url.split('/').pop().replace(/[^\w.-]/g, '').replace(/\.\w+$/, '') + '.mp4';
  const yol = `${DIR}/${ad}`;
  if (!fs.existsSync(yol)) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const ham = `${DIR}/_ham_${ad}`;
      fs.writeFileSync(ham, Buffer.from(await r.arrayBuffer()));
      if (hasFfmpeg()) {
        execSync(`ffmpeg -y -loglevel error -i "${ham}" -an -vf "scale='min(720,iw)':-2" -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 27 -preset veryfast -movflags +faststart "${yol}"`);
        fs.unlinkSync(ham);
      } else fs.renameSync(ham, yol);
      console.log('Video indirildi:', yol);
    } catch (e) { console.log('Video indirilemedi, dış adres kalıyor:', url, e.message); continue; }
  }
  p.video = '/' + yol;
  degisti = true;
}
if (degisti) fs.writeFileSync('products.json', JSON.stringify(data, null, 2) + '\n');
