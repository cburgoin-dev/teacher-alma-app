# Imágenes demo de Lessons

`book.png`, `cup.png` y `ball.png` son ilustraciones originales de desarrollo (480 × 360): libro coral con páginas y marcador, taza verde con bebida y plato, pelota multicolor. No son assets oficiales ni contenido definitivo de Alma.

Se regeneran con `./backend/scripts/assets/generate-demo-assets.ps1` desde la raíz en Windows (System.Drawing). No requieren red, proveedor de imágenes ni dependencia de runtime de la app. El script dibuja los objetos desde geometría; no usa imágenes externas.

Solo `lessons-demo-data.ts` importa los PNG como data URLs en la configuración demo de Matching. IDs, tres pares, alt text y TAP permanecen iguales.
