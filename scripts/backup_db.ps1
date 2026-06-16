# =========================================================================
#  SCRIPT DE RESPALDO Y RESTAURACIÓN DE BASE DE DATOS (PSQL / NEONDB / PGADMIN)
#  SISTEMA DE GESTIÓN DE FARMACIA - PODOCARE SYSTEM
# =========================================================================

param (
    [string]$Action = "backup", # "backup" o "restore"
    [string]$BackupFile = "",    # Ruta del archivo para restauración (obligatorio si Action es "restore")
    [string]$BackupDir = "C:\farmacia\backups"
)

# 1. Cargar variables desde el archivo .env si existe
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Write-Host "[Entorno] Cargando configuración desde .env..." -ForegroundColor Cyan
    Get-Content $envFile | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $parts = $_ -split '=', 2
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        # Limpiar comillas si existen
        $value = $value.Replace('"', '').Replace("'", "")
        [System.Environment]::SetEnvironmentVariable($key, $value)
    }
}

# 2. Extraer URL de Base de Datos
$dbUrl = [System.Environment]::GetEnvironmentVariable("DATABASE_URL")
if ([string]::IsNullOrEmpty($dbUrl)) {
    Write-Error "DATABASE_URL no está configurada en el archivo .env o en las variables de entorno."
    exit 1
}

# Asegurar existencia de la carpeta de backups
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Write-Host "[Directorio] Creado carpeta de respaldos en $BackupDir" -ForegroundColor Green
}

# 3. Identificar Ejecutable de PostgreSQL
$pgPath = "C:\Program Files\PostgreSQL"
$dumpExe = ""
$restoreExe = ""

# Buscar pg_dump y pg_restore en Archivos de Programa
if (Test-Path $pgPath) {
    $latestVer = Get-ChildItem $pgPath | Select-Object -First 1
    if ($latestVer) {
        $dumpExe = Join-Path $latestVer.FullName "bin\pg_dump.exe"
        $restoreExe = Join-Path $latestVer.FullName "bin\pg_restore.exe"
    }
}

# Fallback si no se encuentra en ruta por defecto
if (!(Test-Path $dumpExe)) { $dumpExe = "pg_dump" }
if (!(Test-Path $restoreExe)) { $restoreExe = "pg_restore" }

# 4. Operaciones
if ($Action -eq "backup") {
    $dateStr = Get-Date -Format "yyyyMMdd_HHmmss"
    $outputFile = Join-Path $BackupDir "respaldo_farmacia_$dateStr.dump"
    
    Write-Host "[Respaldo] Iniciando copia de seguridad de la base de datos..." -ForegroundColor Yellow
    Write-Host "[Destino] Archivo: $outputFile" -ForegroundColor Cyan
    
    # Ejecutar pg_dump en formato Custom (-Fc) que es el recomendado
    # Es compatible con NeonDB y cualquier hosting PostgreSQL
    $cmd = "& '$dumpExe' --dbname='$dbUrl' --format=custom --file='$outputFile' --no-owner --no-privileges"
    
    Invoke-Expression $cmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ [Éxito] Respaldo generado correctamente en: $outputFile" -ForegroundColor Green
        
        # Política de Retención: Eliminar backups de más de 30 días
        Write-Host "[Retención] Ejecutando limpieza de archivos antiguos..." -ForegroundColor Cyan
        Get-ChildItem -Path $BackupDir -Filter "respaldo_farmacia_*.dump" | Where-Object { 
            $_.LastWriteTime -lt (Get-Date).AddDays(-30) 
        } | Remove-Item -Force
        Write-Host "✅ [Limpieza] Archivos de más de 30 días eliminados." -ForegroundColor Green
    } else {
        Write-Error "❌ Error al generar el respaldo de base de datos."
    }

} elseif ($Action -eq "restore") {
    if ([string]::IsNullOrEmpty($BackupFile) -or !(Test-Path $BackupFile)) {
        Write-Error "Debe especificar un archivo válido de backup mediante el parámetro -BackupFile."
        exit 1
    }
    
    Write-Host "⚠️ [Advertencia] Se restaurará la base de datos desde el archivo: $BackupFile" -ForegroundColor Yellow
    Write-Host "⚠️ Esto reemplazará los datos actuales. Presione una tecla para continuar o Ctrl+C para cancelar..." -ForegroundColor Red
    $null = [System.Console]::ReadKey($true)
    
    Write-Host "[Restauración] Iniciando restauración de la base de datos..." -ForegroundColor Yellow
    
    # Ejecutar pg_restore
    # --clean limpia tablas existentes antes de recrear, --no-owner omite propietarios para compatibilidad
    $cmd = "& '$restoreExe' --dbname='$dbUrl' --clean --no-owner --no-privileges '$BackupFile'"
    
    Invoke-Expression $cmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ [Éxito] Base de datos restaurada correctamente." -ForegroundColor Green
    } else {
        Write-Error "❌ Error durante la restauración de la base de datos."
    }
}
