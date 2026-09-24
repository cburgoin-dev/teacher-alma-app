# Original demo illustrations; no external media or runtime dependencies.
Add-Type -AssemblyName System.Drawing
function Paint-Asset([string]$Name, [scriptblock]$Paint) {
  $canvas = New-Object System.Drawing.Bitmap 480,360
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#FFF9EF'))
  try { & $Paint $g; $canvas.Save((Join-Path $PSScriptRoot ($Name+'.png')), [System.Drawing.Imaging.ImageFormat]::Png) }
  finally { $g.Dispose(); $canvas.Dispose() }
}
function Fill([string]$Color) { New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Color)) }
function Ellipse($g,$color,$x,$y,$w,$h) { $b=Fill $color; try { $g.FillEllipse($b,$x,$y,$w,$h) } finally { $b.Dispose() } }
function Rect($g,$color,$x,$y,$w,$h) { $b=Fill $color; try { $g.FillRectangle($b,$x,$y,$w,$h) } finally { $b.Dispose() } }
function Line($g,$color,$width,$x1,$y1,$x2,$y2) { $p=New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($color)),$width; try { $g.DrawLine($p,$x1,$y1,$x2,$y2) } finally { $p.Dispose() } }
Paint-Asset 'book' {
  param($g)
  Ellipse $g '#E5DDD1' 85 293 315 28
  Rect $g '#853929' 107 52 268 248
  Rect $g '#E3694D' 97 42 260 244
  Rect $g '#B74A37' 97 42 27 244
  Rect $g '#F7E7C8' 124 268 233 28
  foreach($y in @(274,281,288)) { Line $g '#D8C5A4' 2 131 $y 351 $y }
  Rect $g '#E3694D' 97 295 270 7
  Rect $g '#FFEFCF' 150 91 181 78
  Rect $g '#37585C' 164 106 153 7
  Rect $g '#37585C' 180 123 121 7
  Rect $g '#37585C' 194 140 93 7
  Rect $g '#F8C35D' 295 272 22 48
  Line $g '#F5AA89' 3 128 51 128 255
}
Paint-Asset 'cup' {
  param($g)
  Ellipse $g '#E5DDD1' 78 281 327 35
  Ellipse $g '#D5E4DC' 68 258 329 53
  Ellipse $g '#F6F7E7' 79 250 302 45
  Ellipse $g '#527E6B' 301 120 104 118
  Ellipse $g '#FFF9EF' 320 138  60  80
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.Rectangle]::new(116,99,212,179)),([System.Drawing.ColorTranslator]::FromHtml('#B4D2AF')),([System.Drawing.ColorTranslator]::FromHtml('#4C7864')),0
  try { $g.FillRectangle($gradient,116,119,212,123); $g.FillEllipse($gradient,116,207,212,65) } finally { $gradient.Dispose() }
  Ellipse $g '#DCE7C9' 114 90 216 65
  Ellipse $g '#75503A' 129 103 186 39
  Ellipse $g '#B27A49' 144 108 146 18
  Line $g '#DDE8CC' 5 134 154 134 219
}
Paint-Asset 'ball' {
  param($g)
  Ellipse $g '#E5DDD1' 112 297 272 29
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.Rectangle]::new(112,40,256,256)),([System.Drawing.ColorTranslator]::FromHtml('#FFF2B1')),([System.Drawing.ColorTranslator]::FromHtml('#DF9B35')),45
  try { $g.FillEllipse($gradient,112,40,256,256) } finally { $gradient.Dispose() }
  $b=Fill '#DE634D'; try { $g.FillPie($b,112,40,256,256,10, 90) } finally { $b.Dispose() }
  $b=Fill '#528A9C'; try { $g.FillPie($b,112,40,256,256,190, 90) } finally { $b.Dispose() }
  Ellipse $g '#FFF0CD' 214 142 51 51
  $p=New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#FFF3D8')),4
  try { $g.DrawEllipse($p,112,40,256,256); $g.DrawArc($p,149,40,182,256,90,180); $g.DrawArc($p,112,77,256,182,0,180) } finally { $p.Dispose() }
  Ellipse $g '#FFF9E4' 164 77 33 17
}

