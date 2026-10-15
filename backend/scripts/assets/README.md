# Imágenes demo de Lessons

`book.png`, `cup.png` y `ball.png` son ilustraciones originales de desarrollo (480 × 360): libro coral con páginas y marcador, taza verde con bebida y plato, pelota multicolor. No son assets oficiales ni contenido definitivo de Alma.

Se regeneran con `./backend/scripts/assets/generate-demo-assets.ps1` desde la raíz en Windows (System.Drawing). No requieren red, proveedor de imágenes ni dependencia de runtime de la app. El script dibuja los objetos desde geometría; no usa imágenes externas.

Solo `lessons-demo-data.ts` importa los PNG como data URLs en la configuración demo de Matching. IDs, tres pares, alt text y TAP permanecen iguales.

## Diagnostic — ilustraciones originales v4

`generate-diagnostic-assets.ps1` usa el mismo pipeline determinista System.Drawing, sin red ni imágenes de terceros. No representan a Alma ni son sus assets oficiales.

- Escenas 800 × 450 (16:9): `diagnostic-barista.png`, `diagnostic-station.png`, `diagnostic-cafe-visit.png`.
- Objetos 480 × 360 (4:3): `diagnostic-backpack.png`, `diagnostic-umbrella.png`, `diagnostic-key.png`.

Regenerar desde la raíz: `./backend/scripts/assets/generate-diagnostic-assets.ps1`. Los tres contextos IMAGE usan `/demo-media` development; el seed toma `LESSONS_DEMO_ASSET_BASE_URL`, que debe coincidir con el origen LAN de la API. Matching lleva los otros tres PNG como data URLs. No dependen de stock remoto y no se duplican como assets estáticos Mobile. Tests comprueban bytes HTTP, gating production, dimensiones, alt text y proyección pública.
