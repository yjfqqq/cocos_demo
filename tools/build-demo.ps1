param([string]$CreatorRoot = 'C:\ProgramData\cocos\editors\Creator\3.8.8')
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$creatorExecutable = Join-Path $CreatorRoot 'CocosCreator.exe'
if (!(Test-Path -LiteralPath $creatorExecutable)) { throw 'Cocos Creator 3.8.8 not found. Pass -CreatorRoot with your installation directory.' }
$configPath = (Join-Path $PSScriptRoot 'build-demo.json').Replace('\', '/')
& $creatorExecutable --project $projectRoot --build "configPath=$configPath"
if ($LASTEXITCODE -ne 0) { throw "Creator build failed with exit code $LASTEXITCODE" }
