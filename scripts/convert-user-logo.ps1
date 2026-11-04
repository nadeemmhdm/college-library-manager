Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\nadee\.gemini\antigravity\brain\240564ed-a477-4edd-8b12-efc71d4b20df\.user_uploaded\media_1793771631658_72a18af9.png"
Copy-Item $srcPath "public\logo.png" -Force
Copy-Item $srcPath "public\icon.png" -Force
Copy-Item $srcPath "build\icon.png" -Force

# Create crisp multi-size ICO
$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$sizes = @(256, 128, 64, 48, 32, 16)
$bitmaps = @()

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcBmp, 0, 0, $size, $size)
    $g.Dispose()
    $bitmaps += $bmp

    if ($size -eq 256) {
        $bmp.Save("build\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Save("public\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Save("public\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
    }
}

$icoPath = "build\icon.ico"
$fs = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)

$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$bitmaps.Count)

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
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$ms.Length)
    $bw.Write([uint32]$offset)

    $offset += $ms.Length
}

foreach ($ms in $pngStreams) {
    $bytes = $ms.ToArray()
    $bw.Write($bytes, 0, $bytes.Length)
    $ms.Dispose()
}

$bw.Flush()
$fs.Close()
$srcBmp.Dispose()
Write-Host "Generated build/icon.ico, build/icon.png, public/logo.png successfully!"
