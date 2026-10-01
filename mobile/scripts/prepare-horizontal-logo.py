"""Offline official PDF extraction. Requires pypdfium2 + Pillow, never edits sources.
Run from any directory: python mobile/scripts/prepare-horizontal-logo.py
"""
from pathlib import Path
import pypdfium2 as pdfium
from PIL import Image

root = Path(__file__).resolve().parents[2]
source = root / 'docs/branding/LaTeacherAlma-Logo.pdf'
destination = root / 'mobile/assets/branding'
document = pdfium.PdfDocument(source)
page = document[0]
# Upper-left full-colour horizontal composition, including tagline and TM.
# PDF coordinates measured on the official 1009.81 x 678 pt brand sheet.
left, top, right, bottom = 100, 96, 353, 145
width, height = page.get_size()
bitmap = page.render(scale=4, crop=(left, height-bottom, width-right, top),
                     fill_color=(255, 255, 255, 0))
mark = bitmap.to_pil().convert('RGBA')
for density in (1, 2, 3, 4):
    canvas = Image.new('RGBA', (124*density, 26*density), (0, 0, 0, 0))
    resized = mark.copy()
    resized.thumbnail(canvas.size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, ((canvas.width-resized.width)//2, (canvas.height-resized.height)//2))
    suffix = '' if density == 1 else f'@{density}x'
    canvas.save(destination / f'la-teacher-alma-horizontal{suffix}.png', optimize=True)
