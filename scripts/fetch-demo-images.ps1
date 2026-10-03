# Demo photos: Pexels License (free use). Stored locally — no hotlinking.
$dest = Join-Path $PSScriptRoot "..\public\images\demo"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Remove-Item "$dest\*" -Force -ErrorAction SilentlyContinue

$files = @{
    "clinic-interior-01.jpg" = "https://images.pexels.com/photos/12427085/pexels-photo-12427085.jpeg?auto=compress&cs=tinysrgb&w=960"
    "clinic-interior-02.jpg" = "https://images.pexels.com/photos/3845813/pexels-photo-3845813.jpeg?auto=compress&cs=tinysrgb&w=960"
    "clinic-interior-03.jpg" = "https://images.pexels.com/photos/3845558/pexels-photo-3845558.jpeg?auto=compress&cs=tinysrgb&w=960"
    "clinic-exterior-01.jpg" = "https://images.pexels.com/photos/708902/pexels-photo-708902.jpeg?auto=compress&cs=tinysrgb&w=960"
    "clinic-exterior-02.jpg" = "https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=960"
    "clinic-equipment-01.jpg" = "https://images.pexels.com/photos/4971555/pexels-photo-4971555.jpeg?auto=compress&cs=tinysrgb&w=960"
    "clinic-equipment-02.jpg" = "https://images.pexels.com/photos/3845625/pexels-photo-3845625.jpeg?auto=compress&cs=tinysrgb&w=960"
    "clinic-team-01.jpg" = "https://images.pexels.com/photos/3779709/pexels-photo-3779709.jpeg?auto=compress&cs=tinysrgb&w=960"
    "procedure-01.jpg" = "https://images.pexels.com/photos/3845736/pexels-photo-3845736.jpeg?auto=compress&cs=tinysrgb&w=960"
    "procedure-02.jpg" = "https://images.pexels.com/photos/6627379/pexels-photo-6627379.jpeg?auto=compress&cs=tinysrgb&w=960"
    "doctor-01.jpg" = "https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=480"
    "doctor-02.jpg" = "https://images.pexels.com/photos/5214958/pexels-photo-5214958.jpeg?auto=compress&cs=tinysrgb&w=480"
    "doctor-03.jpg" = "https://images.pexels.com/photos/5327580/pexels-photo-5327580.jpeg?auto=compress&cs=tinysrgb&w=480"
    "doctor-04.jpg" = "https://images.pexels.com/photos/5327656/pexels-photo-5327656.jpeg?auto=compress&cs=tinysrgb&w=480"
    "doctor-05.jpg" = "https://images.pexels.com/photos/5215021/pexels-photo-5215021.jpeg?auto=compress&cs=tinysrgb&w=480"
    "doctor-06.jpg" = "https://images.pexels.com/photos/5214866/pexels-photo-5214866.jpeg?auto=compress&cs=tinysrgb&w=480"
    "doctor-07.jpg" = "https://images.pexels.com/photos/5215025/pexels-photo-5215025.jpeg?auto=compress&cs=tinysrgb&w=480"
    "doctor-08.jpg" = "https://images.pexels.com/photos/5214867/pexels-photo-5214867.jpeg?auto=compress&cs=tinysrgb&w=480"
    "hero-01.jpg" = "https://images.pexels.com/photos/3845813/pexels-photo-3845813.jpeg?auto=compress&cs=tinysrgb&w=1200"
    "hero-02.jpg" = "https://images.pexels.com/photos/3845558/pexels-photo-3845558.jpeg?auto=compress&cs=tinysrgb&w=800"
    "hero-03.jpg" = "https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=800"
}

foreach ($entry in $files.GetEnumerator()) {
    $out = Join-Path $dest $entry.Key
    curl.exe -sL -A "Mozilla/5.0" -o $out $entry.Value
    $sz = (Get-Item $out).Length
    if ($sz -lt 5000) { Write-Warning "Small file $($entry.Key): $sz bytes" } else { Write-Host "OK $($entry.Key): $sz bytes" }
}
