# Original deterministic Diagnostic illustrations, using the Lessons System.Drawing pipeline.
# Scenes: 800x450; objects: 480x360. No external media, fonts, answer text or runtime dependency.
Add-Type -AssemblyName System.Drawing
function Paint([string]$name, [int]$w, [int]$h, [scriptblock]$paint) {
  $canvas = [System.Drawing.Bitmap]::new($w,$h)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#EAF4FF'))
  try { & $paint $g; $canvas.Save((Join-Path $PSScriptRoot ($name+'.png')), [System.Drawing.Imaging.ImageFormat]::Png) }
  finally { $g.Dispose(); $canvas.Dispose() }
}
function Ellipse($g,$c,$x,$y,$w,$h) { $b=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($c)); try {$g.FillEllipse($b,$x,$y,$w,$h)} finally {$b.Dispose()} }
function Rect($g,$c,$x,$y,$w,$h) { $b=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($c)); try {$g.FillRectangle($b,$x,$y,$w,$h)} finally {$b.Dispose()} }
function Line($g,$c,$w,$x,$y,$xx,$yy) { $p=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($c),$w); $p.StartCap=$p.EndCap=[System.Drawing.Drawing2D.LineCap]::Round; try {$g.DrawLine($p,$x,$y,$xx,$yy)} finally {$p.Dispose()} }
function Cloud($g,$x,$y) { Ellipse $g '#FFFFFF' $x ($y+14) 110 26; Ellipse $g '#FFFFFF' ($x+20) $y 42 40; Ellipse $g '#FFFFFF' ($x+48) ($y+4) 48 35 }
function Person($g,$x,$y,$shirt) {
  Ellipse $g $shirt ($x-22) ($y+100) 144 155
  Rect $g $shirt ($x-22) ($y+170) 144 85
  Rect $g '#EDBE99' ($x+35) ($y+88) 30 30
  Ellipse $g '#EDBE99' $x $y 100 112
  Ellipse $g '#51403C' ($x-3) ($y-7) 106 40
  Ellipse $g '#173860' ($x+26) ($y+51) 6 7
  Ellipse $g '#173860' ($x+66) ($y+51) 6 7
  $p=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#173860'),4)
  try {$g.DrawArc($p,($x+34),($y+65),30,18,0,180)} finally {$p.Dispose()}
}
Paint 'diagnostic-barista' 800 450 {
  param($g)
  Rect $g '#DCEBFA' 35 35 210 280; Rect $g '#FFFFFF' 48 48 184 254
  Rect $g '#D1E9F5' 58 58 164 234; Line $g '#FFFFFF' 9 140 58 140 292
  Cloud $g 63 85
  Rect $g '#BED4E8' 530 75 220 10
  foreach($x in @(548,608,668)) { Rect $g '#FFF9EF' $x 42 35 32 }
  Person $g 337 70 '#2580EA'
  Rect $g '#37585C' 330 202 112 125
  Line $g '#FFFFFF' 4 347 190 347 262; Line $g '#FFFFFF' 4 424 190 424 262
  Rect $g '#FA647A' 330 264 112 12
  Line $g '#EDBE99' 22 323 229 278 282
  Line $g '#EDBE99' 22 452 229 500 260
  Ellipse $g '#EDBE99' 486 238 30 44
  Rect $g '#C7946C' 0 325 800 125; Rect $g '#E8BC94' 0 315 800 20
  Rect $g '#FFFFFF' 140 270 75 42; Ellipse $g '#FFFFFF' 138 260 80 22
  Rect $g '#527E6B' 580 265 65 50
  Line $g '#527E6B' 9 612 266 612 214
  Ellipse $g '#74A58C' 583 206 34 20; Ellipse $g '#74A58C' 612 190 35 22
}
Paint 'diagnostic-station' 800 450 {
  param($g)
  Cloud $g 80 40; Cloud $g 585 45
  Rect $g '#C5DCF0' 0 310 800 140
  Rect $g '#173860' 0 363 800 8; Rect $g '#173860' 0 402 800 8
  foreach($x in 0..15) { Line $g '#7393B2' 8 ($x*55) 365 (($x*55)+15) 407 }
  Rect $g '#2580EA' 95 155 570 170; Ellipse $g '#2580EA' 567 155 130 170
  Rect $g '#B9DBFF' 115 177 90 70; Rect $g '#B9DBFF' 225 177 90 70
  Rect $g '#B9DBFF' 335 177 90 70; Rect $g '#B9DBFF' 455 177 70 132
  Rect $g '#173860' 564 179 65 70
  Rect $g '#FA647A' 95 283 570 15
  foreach($x in @(165,510)) { Ellipse $g '#173860' $x 310 62 62; Ellipse $g '#7393B2' ($x+18) 328 26 26 }
  Line $g '#7393B2' 12 720 140 720 340
  Ellipse $g '#FFFFFF' 674 50 92 92
  Line $g '#173860' 5 720 96 720 67; Line $g '#173860' 5 720 96 697 107
}
Paint 'diagnostic-cafe-visit' 800 450 {
  param($g)
  Cloud $g 50 28; Cloud $g 640 32
  Rect $g '#E5DCD2' 0 384 800 66
  Rect $g '#FFEDD9' 130 110 440 275
  Rect $g '#173860' 390 190 125 195; Rect $g '#A8D9ED' 403 203 99 95
  Ellipse $g '#F8C35D' 490 314 9 9
  Rect $g '#A8D9ED' 165 190 185 130; Line $g '#FFFFFF' 7 257 190 257 320
  Rect $g '#FFFFFF' 115 112 470 55
  foreach($x in @(115,205,295,385,475)) { Rect $g '#FA647A' $x 112 45 55 }
  Person $g 595 134 '#2580EA'
  Line $g '#173860' 20 608 377 600 425; Line $g '#173860' 20 670 377 680 425
  Line $g '#EDBE99' 20 581 279 547 246
  Rect $g '#527E6B' 45 326 52 59; Ellipse $g '#74A58C' 32 251 80 90
}
Paint 'diagnostic-backpack' 480 360 {
  param($g)
  Ellipse $g '#D4E2EF' 90 306 300 25
  Line $g '#173860' 16 205 75 205 49; Line $g '#173860' 16 205 49 275 49; Line $g '#173860' 16 275 49 275 75
  Ellipse $g '#2580EA' 129 64 222 190; Rect $g '#2580EA' 129 154 222 153
  Rect $g '#FA647A' 159 201 162 86; Line $g '#FFD0D7' 5 174 219 305 219
  Rect $g '#B9DBFF' 204 113 72 28; Line $g '#173860' 6 139 170 340 170
  Line $g '#FFFFFF' 5 301 171 301 191
}
Paint 'diagnostic-umbrella' 480 360 {
  param($g)
  Ellipse $g '#D4E2EF' 115 310 250 20
  Line $g '#173860' 10 240 158 240 285
  $p=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#173860'),10)
  try {$g.DrawArc($p,240,260,48,48,0,180)} finally {$p.Dispose()}
  $path=[System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddBezier(85,180,95,18,385,18,395,180)
  $path.AddBezier(395,180,355,152,322,152,290,180)
  $path.AddBezier(290,180,255,155,225,155,190,180)
  $path.AddBezier(190,180,150,152,120,152,85,180)
  $b=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#FA647A'))
  try {$g.FillPath($b,$path)} finally {$b.Dispose();$path.Dispose()}
  Line $g '#FFB9C5' 4 240 65 190 169; Line $g '#FFB9C5' 4 240 65 290 169
  Line $g '#173860' 7 240 45 240 58
}
Paint 'diagnostic-key' 480 360 {
  param($g)
  Ellipse $g '#D4E2EF' 100 290 295 25
  Ellipse $g '#F8C35D' 83 68 158 158; Ellipse $g '#EAF4FF' 117 102 90 90
  Line $g '#F8C35D' 30 213 191 352 276
  Line $g '#F8C35D' 26 302 246 322 214
  Line $g '#F8C35D' 26 337 267 358 235
  Line $g '#FFE6A3' 6 212 183 335 258
}
