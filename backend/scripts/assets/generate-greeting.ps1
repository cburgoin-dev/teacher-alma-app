# Original demo illustration: two people greeting; no external media or fonts bundled.
Add-Type -AssemblyName System.Drawing
$canvas = New-Object System.Drawing.Bitmap 800,420
$draw = [System.Drawing.Graphics]::FromImage($canvas)
$draw.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
function Brush([string]$color) { [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color)) }
$sky = Brush '#EAF4FF'; $blue = Brush '#2580EA'; $rose = Brush '#FA647A'; $skin = Brush '#EDBE99'; $hair = Brush '#51403C'; $white = Brush '#FFFFFF'; $ink = Brush '#173860'; $green = Brush '#D3EADB'
try {
  $draw.Clear($sky.Color)
  $draw.FillEllipse($white, 60, 40, 150, 35)
  $draw.FillEllipse($white, 636, 68, 110, 28)
  $draw.FillEllipse($green, -80, 330, 960, 200)
  $detail = Brush '#B9D8C6'; $lightBlue = Brush '#75B5F5'; $lightRose = Brush '#FFA5B1'; $cheek = Brush '#EBA68D'
  $draw.FillEllipse($detail, 115, 390, 200, 22)
  $draw.FillEllipse($detail, 470, 390, 210, 22)
  $draw.FillEllipse($hair, 138, 78, 140, 160)
  $draw.FillEllipse($skin, 160, 96, 100, 118)
  $draw.FillEllipse($blue, 120, 212, 188, 280)
  $draw.FillEllipse($skin, 190, 201, 42, 29)
  $draw.FillEllipse($skin, 524, 98, 100, 118)
  $draw.FillEllipse($hair, 516, 78, 111, 52)
  $draw.FillEllipse($rose, 484, 215, 196, 280)
  $draw.FillEllipse($skin, 554, 203, 42, 28)
  $arm = [System.Drawing.Pen]::new($skin.Color, 30)
  $arm.StartCap = $arm.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $draw.DrawLine($arm, 292, 272, 340, 182)
  $draw.FillEllipse($skin, 323, 151, 34, 55)
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
  $draw.FillEllipse($white, 314, 30, 174, 110)
  $tail = [System.Drawing.Point[]]@([System.Drawing.Point]::new(348,120), [System.Drawing.Point]::new(335,153), [System.Drawing.Point]::new(387,130))
  $draw.FillPolygon($white, $tail)
  $font = [System.Drawing.Font]::new('Arial', 34, [System.Drawing.FontStyle]::Bold)
  $draw.DrawString('Hello!', $font, $ink, 328, 52)
  $draw.FillRectangle($white, 160, 270, 116, 48)
  $nameFont = [System.Drawing.Font]::new('Arial', 20, [System.Drawing.FontStyle]::Bold)
  $draw.DrawString('Sofía', $nameFont, $ink, 178, 278)
  $canvas.Save((Join-Path $PSScriptRoot 'greeting-hello-v9.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  foreach ($item in @($detail, $lightBlue, $lightRose, $cheek, $seam, $font, $nameFont, $arm, $eye, $draw, $canvas, $sky, $blue, $rose, $skin, $hair, $white, $ink, $green)) { if ($null -ne $item) { $item.Dispose() } }
}

