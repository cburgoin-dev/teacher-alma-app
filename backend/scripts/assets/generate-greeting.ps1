# Deterministic V10 variants (no answer text): two people greeting; no external media or fonts bundled.
Add-Type -AssemblyName System.Drawing
$canvas = New-Object System.Drawing.Bitmap 800,420
$draw = [System.Drawing.Graphics]::FromImage($canvas)
$draw.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
function Brush([string]$color) { [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color)) }
$sky = Brush '#EAF4FF'; $blue = Brush '#2580EA'; $rose = Brush '#FA647A'; $skin = Brush '#EDBE99'; $hair = Brush '#51403C'; $white = Brush '#FFFFFF'; $ink = Brush '#173860'; $green = Brush '#D3EADB'
function Cloud([int]$x, [int]$y) {
  $draw.FillEllipse($white, $x, ($y + 16), 100, 25)
  $draw.FillEllipse($white, ($x + 14), ($y + 3), 44, 36)
  $draw.FillEllipse($white, ($x + 45), $y, 42, 38)
}
function Shirt($brush, [int]$x, [int]$y) {
  $shape = [System.Drawing.Drawing2D.GraphicsPath]::new()
  try {
    $shape.AddBezier($x, ($y + 200), ($x - 4), ($y + 75), ($x + 8), ($y + 18), ($x + 65), $y)
    $shape.AddBezier(($x + 65), $y, ($x + 104), ($y - 4), ($x + 126), ($y + 6), ($x + 145), ($y + 26))
    $shape.AddBezier(($x + 145), ($y + 26), ($x + 184), ($y + 60), ($x + 188), ($y + 140), ($x + 184), ($y + 200))
    $shape.CloseFigure()
    $draw.FillPath($brush, $shape)
  } finally { $shape.Dispose() }
}
try {
 foreach ($variant in @('wave', 'response')) {
  $draw.Clear($sky.Color)
  Cloud 66 35
  Cloud 640 57
  $draw.FillEllipse($green, -80, 330, 960, 200)
  $detail = Brush '#B9D8C6'; $lightBlue = Brush '#75B5F5'; $lightRose = Brush '#FFA5B1'; $cheek = Brush '#EBA68D'
  $draw.FillEllipse($detail, 115, 390, 200, 22)
  $draw.FillEllipse($detail, 470, 390, 210, 22)
  $draw.FillEllipse($hair, 138, 78, 140, 160)
  $draw.FillEllipse($skin, 160, 96, 100, 118)
  Shirt $blue 120 212
  $draw.FillEllipse($skin, 190, 201, 42, 29)
  $draw.FillEllipse($skin, 524, 98, 100, 118)
  $draw.FillEllipse($hair, 516, 78, 111, 44)
  $draw.FillEllipse($hair, 514, 92, 28, 44)
  Shirt $rose 484 215
  $draw.FillEllipse($skin, 554, 203, 42, 28)
  $arm = [System.Drawing.Pen]::new($skin.Color, 30)
  $arm.StartCap = $arm.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  if ($variant -eq 'wave') {
    $draw.DrawLine($arm, 292, 272, 340, 182)
    $draw.FillEllipse($skin, 323, 151, 34, 55)
    $gesture = [System.Drawing.Pen]::new($blue.Color, 4)
    $draw.DrawArc($gesture, 355, 143, 25, 42, -65, 115)
    $draw.DrawArc($gesture, 366, 132, 26, 60, -65, 115)
    $gesture.Dispose()
  } else {
    $draw.DrawLine($arm, 290, 273, 340, 250)
    $draw.FillEllipse($skin, 326, 231, 39, 24)
    $draw.DrawLine($arm, 493, 279, 548, 247)
    $draw.FillEllipse($skin, 531, 226, 31, 36)
  }
  $eye = [System.Drawing.Pen]::new($ink.Color, 5)
  foreach ($x in @(188, 230, 550, 590)) { $draw.DrawEllipse($eye, $x, 145, 3, 3) }
  $draw.DrawArc($eye, 192, 160, 36, 24, 0, 180)
  $draw.DrawArc($eye, 550, 162, 36, 24, 0, 180)
  $draw.FillEllipse($cheek, 173, 159, 18, 9)
  $draw.FillEllipse($cheek, 234, 159, 18, 9)
  $draw.FillEllipse($cheek, 533, 161, 18, 9)
  $draw.FillEllipse($cheek, 595, 161, 18, 9)
  $seam = [System.Drawing.Pen]::new($lightBlue.Color, 5)
  $draw.DrawArc($seam, 140, 238, 26, 135, 115, 110)
  $seam.Color = $lightRose.Color
  $draw.DrawArc($seam, 620, 246, 28, 136, -45, 100)
  $brow = [System.Drawing.Pen]::new($hair.Color, 3)
  $draw.DrawArc($brow, 185, 132, 15, 6, 195, 135)
  $draw.DrawArc($brow, 227, 132, 15, 6, 195, 135)
  $draw.DrawArc($brow, 546, 132, 15, 6, 195, 135)
  $draw.DrawArc($brow, 586, 132, 15, 6, 195, 135)
  $brow.Dispose()
  if ($variant -eq 'response') {
  $draw.FillEllipse($white, 318, 45, 166, 80)
  $tail = [System.Drawing.Point[]]@([System.Drawing.Point]::new(348,120), [System.Drawing.Point]::new(335,153), [System.Drawing.Point]::new(387,130))
  $draw.FillPolygon($white, $tail)
  foreach ($dot in @(370, 395, 420)) { $draw.FillEllipse($blue, $dot, 80, 10, 10) }
  }
  $draw.FillRectangle($white, 160, 270, 116, 48)
  $nameFont = [System.Drawing.Font]::new('Arial', 20, [System.Drawing.FontStyle]::Bold)
  $draw.DrawString('Sofía', $nameFont, $ink, 178, 278)
  $canvas.Save((Join-Path $PSScriptRoot ('greeting-' + $variant + '-v10.png')), [System.Drawing.Imaging.ImageFormat]::Png)
  foreach ($item in @($detail, $lightBlue, $lightRose, $cheek, $seam, $nameFont, $arm, $eye)) { $item.Dispose() }
 }
} finally {
  foreach ($item in @($draw, $canvas, $sky, $blue, $rose, $skin, $hair, $white, $ink, $green)) { if ($null -ne $item) { $item.Dispose() } }
}

