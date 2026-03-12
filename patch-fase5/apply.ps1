# AcheiAqui — Security Patch (Fase 5)
# Uso: .\apply.ps1 -Project "C:\caminho\para\AchAqui2-AchAquiTest"
param([string]$Project = (Get-Location).Path)

$Patch = $PSScriptRoot
Write-Host "🔐 AcheiAqui Security Patch — Fase 5"
Write-Host "📁 Projeto: $Project"
Write-Host ""

$files = @(
  "backend\src\booking\booking.controller.ts",
  "backend\src\business\business.service.ts",
  "src\hooks\useLiveSync.js",
  "src\operations\HospitalityModule.jsx",
  "src\shared\Modals\OperationalLayerRenderer.js"
)

foreach ($f in $files) {
  $src = "$Patch\$f"
  $dst = "$Project\$f"
  if (Test-Path $dst) {
    Copy-Item $src $dst
    Write-Host "  ✅ $f"
  } else {
    Write-Host "  ⚠️  Não encontrado (ignorado): $f"
  }
}

Write-Host ""
Write-Host "📦 A instalar @nestjs/throttler..."
Set-Location "$Project\backend"; npm install @nestjs/throttler --save

Write-Host ""
Write-Host "✅ Patch concluído!"
Write-Host ""
Write-Host "⚠️  Lembra-te de registar ThrottlerModule no AppModule e ValidationPipe no main.ts"
