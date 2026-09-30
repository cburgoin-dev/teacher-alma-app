// Optional offline asset preparation: node scripts/prepare-logo.cjs <path-to-sharp>
// Sharp is a development tool only; it is not a Mobile runtime dependency.
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const directory = path.resolve(__dirname, '../assets/branding');
(async () => {
  for (const density of [1, 2, 3, 4]) {
    await sharp(path.join(directory, 'la-teacher-alma-logo.png'))
      .resize(60 * density, 44 * density, {
        fit: 'contain', kernel: 'lanczos3', withoutEnlargement: true,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      }).png().toFile(path.join(directory, `la-teacher-alma-mobile${density === 1 ? '' : `@${density}x`}.png`));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
