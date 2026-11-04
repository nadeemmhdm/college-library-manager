Add-Type -AssemblyName System.Drawing

function Generate-AppIcon {
    $sizes = @(256, 128, 64, 48, 32, 16)
    $bitmaps = @()

    foreach ($size in $sizes) {
        $bmp = New-Object System.Drawing.Bitmap $size, $size
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        $scale = $size / 256.0

        # Background rounded rect
        $rect = New-Object System.Drawing.RectangleF (16 * $scale), (16 * $scale), (224 * $scale), (224 * $scale)
        $radius = 48 * $scale
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc($rect.X, $rect.Y, $radius, $radius, 180, 90)
        $path.AddArc($rect.Right - $radius, $rect.Y, $radius, $radius, 270, 90)
        $path.AddArc($rect.Right - $radius, $rect.Bottom - $radius, $radius, $radius, 0, 90)
        $path.AddArc($rect.X, $rect.Bottom - $radius, $radius, $radius, 90, 90)
        $path.CloseFigure()

        # Dark Navy gradient brush
        $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            [System.Drawing.PointF]::new(0, 0),
            [System.Drawing.PointF]::new($size, $size),
            [System.Drawing.Color]::FromArgb(255, 30, 41, 59),
            [System.Drawing.Color]::FromArgb(255, 2, 6, 23)
        )
        $g.FillPath($bgBrush, $path)

        # Blue border
        $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 37, 99, 235), [Math]::Max(1.5, 4 * $scale))
        $g.DrawPath($borderPen, $path)

        # Open book pages (Left & Right)
        $bookBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
        $bookLeft = New-Object System.Drawing.Drawing2D.GraphicsPath
        $bookLeft.AddLines(@(
            [System.Drawing.PointF]::new(124 * $scale, 148 * $scale),
            [System.Drawing.PointF]::new(52 * $scale, 136 * $scale),
            [System.Drawing.PointF]::new(52 * $scale, 182 * $scale),
            [System.Drawing.PointF]::new(124 * $scale, 194 * $scale)
        ))
        $bookLeft.CloseFigure()
        $g.FillPath($bookBrush, $bookLeft)
        $penColor = [System.Drawing.Color]::FromArgb(255, 203, 213, 225)
        $penWidth = [float]([Math]::Max(1.0, 1.5 * $scale))
        $g.DrawPath((New-Object System.Drawing.Pen($penColor, $penWidth)), $bookLeft)

        $bookRight = New-Object System.Drawing.Drawing2D.GraphicsPath
        $bookRight.AddLines(@(
            [System.Drawing.PointF]::new(132 * $scale, 148 * $scale),
            [System.Drawing.PointF]::new(204 * $scale, 136 * $scale),
            [System.Drawing.PointF]::new(204 * $scale, 182 * $scale),
            [System.Drawing.PointF]::new(132 * $scale, 194 * $scale)
        ))
        $bookRight.CloseFigure()
        $g.FillPath($bookBrush, $bookRight)
        $g.DrawPath((New-Object System.Drawing.Pen($penColor, $penWidth)), $bookRight)

        # Center spine
        $spineColor = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)
        $spineWidth = [float]([Math]::Max(2.0, 4.0 * $scale))
        $g.DrawLine((New-Object System.Drawing.Pen($spineColor, $spineWidth)), [System.Drawing.PointF]::new(128 * $scale, 142 * $scale), [System.Drawing.PointF]::new(128 * $scale, 198 * $scale))

        # Golden Mortarboard (Graduation Cap)
        $capBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            [System.Drawing.PointF]::new(128 * $scale, 60 * $scale),
            [System.Drawing.PointF]::new(128 * $scale, 108 * $scale),
            [System.Drawing.Color]::FromArgb(255, 251, 191, 36),
            [System.Drawing.Color]::FromArgb(255, 217, 119, 6)
        )
        $capTop = New-Object System.Drawing.Drawing2D.GraphicsPath
        $capTop.AddPolygon(@(
            [System.Drawing.PointF]::new(128 * $scale, 60 * $scale),
            [System.Drawing.PointF]::new(204 * $scale, 84 * $scale),
            [System.Drawing.PointF]::new(128 * $scale, 108 * $scale),
            [System.Drawing.PointF]::new(52 * $scale, 84 * $scale)
        ))
        $g.FillPath($capBrush, $capTop)
        $capBorderColor = [System.Drawing.Color]::FromArgb(255, 180, 83, 9)
        $capBorderWidth = [float]([Math]::Max(1.0, 1.5 * $scale))
        $g.DrawPath((New-Object System.Drawing.Pen($capBorderColor, $capBorderWidth)), $capTop)

        # Cap base
        $capBase = New-Object System.Drawing.Drawing2D.GraphicsPath
        $capBase.AddLines(@(
            [System.Drawing.PointF]::new(92 * $scale, 96 * $scale),
            [System.Drawing.PointF]::new(92 * $scale, 114 * $scale),
            [System.Drawing.PointF]::new(164 * $scale, 114 * $scale),
            [System.Drawing.PointF]::new(164 * $scale, 96 * $scale)
        ))
        $capBase.CloseFigure()
        $g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 180, 83, 9))), $capBase)

        # Tassel
        $tasselPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 245, 158, 11), [Math]::Max(1.5, 2.5 * $scale))
        $g.DrawLine($tasselPen, [System.Drawing.PointF]::new(128 * $scale, 84 * $scale), [System.Drawing.PointF]::new(176 * $scale, 110 * $scale))

        $g.Dispose()
        $bitmaps += $bmp

        if ($size -eq 256) {
            $bmp.Save("build/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
            $bmp.Save("public/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
        }
    }

    # Save Multi-resolution ICO file
    $icoPath = "build/icon.ico"
    $fs = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR header
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type (1 for icon)
    $bw.Write([uint16]$bitmaps.Count) # Image count

    $pngStreams = @()
    foreach ($bmp in $bitmaps) {
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngStreams += $ms
    }

    $offset = 6 + ($bitmaps.Count * 16)
    for ($i = 0; $i -lt $bitmaps.Count; $i++) {
        $bmp = $bitmaps[$i]
        $ms = $pngStreams[$i]
        $w = if ($bmp.Width -ge 256) { 0 } else { $bmp.Width }
        $h = if ($bmp.Height -ge 256) { 0 } else { $bmp.Height }

        $bw.Write([byte]$w)
        $bw.Write([byte]$h)
        $bw.Write([byte]0) # Color palette count
        $bw.Write([byte]0) # Reserved
        $bw.Write([uint16]1) # Color planes
        $bw.Write([uint16]32) # Bits per pixel
        $bw.Write([uint32]$ms.Length) # Image bytes
        $bw.Write([uint32]$offset) # Offset

        $offset += $ms.Length
    }

    foreach ($ms in $pngStreams) {
        $bytes = $ms.ToArray()
        $bw.Write($bytes, 0, $bytes.Length)
        $ms.Dispose()
    }

    $bw.Flush()
    $fs.Close()
    Write-Host "Generated build/icon.png, public/icon.png, and build/icon.ico successfully!"
}

Generate-AppIcon
