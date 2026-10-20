$ErrorActionPreference = 'Stop'
$restoreArchive = [IO.Path]::GetFullPath($PSScriptRoot)
$restoreWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$restoreManifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$restoreItems = @()
foreach ($restoreItem in $restoreManifest.items) {
 $restoreSource = [IO.Path]::GetFullPath((Join-Path $restoreArchive $restoreItem.review_path))
 $restoreDestination = [IO.Path]::GetFullPath((Join-Path $restoreWorkspace $restoreItem.original_path))
 if (-not $restoreSource.StartsWith(($restoreArchive + '\'), [StringComparison]::OrdinalIgnoreCase)) { throw 'Source outside review folder' }
 if (-not $restoreDestination.StartsWith(($restoreWorkspace + '\img\'), [StringComparison]::OrdinalIgnoreCase)) { throw 'Destination outside workspace img folder' }
 if (-not (Test-Path -LiteralPath $restoreSource -PathType Leaf)) { continue }
 if (Test-Path -LiteralPath $restoreDestination) { throw "Destination exists; nothing restored: $restoreDestination" }
 $restoreItems += [PSCustomObject]@{ Source = $restoreSource; Destination = $restoreDestination }
}
foreach ($restoreItem in $restoreItems) {
 New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($restoreItem.Destination)) -Force | Out-Null
 Move-Item -LiteralPath $restoreItem.Source -Destination $restoreItem.Destination
}
Write-Output "Restored $($restoreItems.Count) images."
