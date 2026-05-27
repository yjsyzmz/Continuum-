$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$publicIconDir = Join-Path $root "public\icon"
$storeDir = Join-Path $root "assets\store"

New-Item -ItemType Directory -Force $publicIconDir, $storeDir | Out-Null

function New-RoundedRectanglePath {
  param(
    [single] $X,
    [single] $Y,
    [single] $Width,
    [single] $Height,
    [single] $Radius
  )

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Pen {
  param(
    [System.Drawing.Color] $Color,
    [single] $Width
  )

  $pen = [System.Drawing.Pen]::new($Color, $Width)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

function New-MasterIcon {
  $bitmap = [System.Drawing.Bitmap]::new(128, 128, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  # Chrome Web Store guidance: 96x96 icon body with 16px transparent padding.
  $plate = New-RoundedRectanglePath 16.5 16.5 95 95 22
  $plateFill = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 248, 238))
  $plateBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(150, 214, 196, 172), 1)
  $graphics.FillPath($plateFill, $plate)
  $graphics.DrawPath($plateBorder, $plate)
  $graphics.SetClip($plate)

  $orange = [System.Drawing.Color]::FromArgb(255, 249, 115, 22)
  $orangeDark = [System.Drawing.Color]::FromArgb(255, 234, 88, 12)
  $orangeSoft = [System.Drawing.Color]::FromArgb(215, 253, 186, 116)

  $cPen = [System.Drawing.Pen]::new($orange, 16)
  $cPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Flat
  $cPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Flat
  $cPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Miter
  $graphics.DrawArc($cPen, 31, 35, 56, 58, 45, 270)

  $crescentPen = [System.Drawing.Pen]::new($orangeSoft, 15)
  $crescentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Flat
  $crescentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Flat
  $graphics.DrawArc($crescentPen, 70, 36, 38, 56, 300, 120)

  $streamPen = New-Pen $orangeDark 2.4
  $streamPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $streamPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $topStream = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $topStream.AddBezier(49, 63, 61, 58, 76, 56, 93, 55)
  $graphics.DrawPath($streamPen, $topStream)

  $midStream = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $midStream.AddBezier(49, 64, 62, 63, 77, 63, 96, 63)
  $graphics.DrawPath($streamPen, $midStream)

  $bottomStream = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $bottomStream.AddBezier(49, 65, 61, 70, 76, 72, 93, 73)
  $graphics.DrawPath($streamPen, $bottomStream)

  $dashPen = New-Pen ([System.Drawing.Color]::FromArgb(170, 249, 115, 22)) 2.2
  $dashPen.DashPattern = [single[]] @(2.5, 4)
  $graphics.DrawLine($dashPen, 76, 58, 96, 56)
  $graphics.DrawLine($dashPen, 76, 63, 99, 63)
  $graphics.DrawLine($dashPen, 76, 70, 96, 72)

  $dotBrush = [System.Drawing.SolidBrush]::new($orangeDark)
  $graphics.FillEllipse($dotBrush, 43.5, 58.5, 11, 11)
  $graphics.ResetClip()

  $plate.Dispose()
  $plateFill.Dispose()
  $plateBorder.Dispose()
  $cPen.Dispose()
  $crescentPen.Dispose()
  $streamPen.Dispose()
  $dashPen.Dispose()
  $dotBrush.Dispose()
  $topStream.Dispose()
  $midStream.Dispose()
  $bottomStream.Dispose()
  $graphics.Dispose()

  return $bitmap
}

function Save-ScaledIcon {
  param(
    [System.Drawing.Bitmap] $Source,
    [int] $Size,
    [string] $Path
  )

  $target = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($target)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($Source, 0, 0, $Size, $Size)
  $graphics.Dispose()

  $target.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $target.Dispose()
}

$master = New-MasterIcon

foreach ($size in @(16, 32, 48, 96, 128)) {
  Save-ScaledIcon $master $size (Join-Path $publicIconDir "$size.png")
}

Save-ScaledIcon $master 128 (Join-Path $storeDir "icon-128.png")

$master.Dispose()

Write-Host "Generated Continuum icons in public/icon and assets/store."
