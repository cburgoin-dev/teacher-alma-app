# Original demo illustration: two people greeting; no external media or fonts bundled.
Add-Type -AssemblyName System.Drawing
$canvas = New-Object System.Drawing.Bitmap 800,420
$draw = [System.Drawing.Graphics]::FromImage($canvas)
$draw.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
function Brush([string]$color) { [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color)) }
$sky = Brush '#EAF4FF'; $blue = Brush '#2580EA'; $rose = Brush '#FA647A'; $skin = Brush '#EDBE99'; $hair = Brush '#51403C'; $white = Brush '#FFFFFF'; $ink = Brush '#173860'; $green = Brush '#D3EADB'
try {
  $draw.Clear($sky.Color)
  $draw.FillEllipse($green, -80, 330, 960, 200)
  $draw.FillEllipse($hair, 138, 78, 140, 160)
  $draw.FillEllipse($skin, 160, 96, 100, 118)
  $draw.FillEllipse($blue, 110, 212, 206, 300)
  $draw.FillEllipse($skin, 524, 98, 100, 118)
  $draw.FillEllipse($hair, 516, 78, 111, 52)
  $draw.FillEllipse($rose, 478, 215, 210, 300)
  $arm = [System.Drawing.Pen]::new($skin.Color, 30)
  $arm.StartCap = $arm.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $draw.DrawLine($arm, 292, 272, 340, 182)
  $draw.FillEllipse($skin, 323, 151, 34, 55)
  $eye = [System.Drawing.Pen]::new($ink.Color, 5)
  foreach ($x in @(188, 230, 550, 590)) { $draw.DrawEllipse($eye, $x, 145, 3, 3) }
  $draw.DrawArc($eye, 192, 160, 36, 24, 0, 180)
  $draw.DrawArc($eye, 550, 162, 36, 24, 0, 180)
  $draw.FillEllipse($white, 314, 30, 174, 110)
  $tail = [System.Drawing.Point[]]@([System.Drawing.Point]::new(348,120), [System.Drawing.Point]::new(335,153), [System.Drawing.Point]::new(387,130))
  $draw.FillPolygon($white, $tail)
  $font = [System.Drawing.Font]::new('Arial', 34, [System.Drawing.FontStyle]::Bold)
  $draw.DrawString('Hello!', $font, $ink, 328, 52)
  $draw.FillRectangle($white, 160, 270, 116, 48)
  $nameFont = [System.Drawing.Font]::new('Arial', 20, [System.Drawing.FontStyle]::Bold)
  $draw.DrawString('Sofía', $nameFont, $ink, 178, 278)
  $canvas.Save((Join-Path $PSScriptRoot 'greeting.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  foreach ($item in @($font, $nameFont, $arm, $eye, $draw, $canvas, $sky, $blue, $rose, $skin, $hair, $white, $ink, $green)) { if ($null -ne $item) { $item.Dispose() } }
}

