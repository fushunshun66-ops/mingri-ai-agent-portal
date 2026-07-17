# 本地联调启动：FunASR + gateway + chat-portal
# 用法：
#   .\start-dev.ps1
#   .\start-dev.ps1 -SkipFunasr
#   .\start-dev.ps1 -SkipPortal
# Qwen：在 gateway\.env 写入 DASHSCOPE_API_KEY=sk-...（勿提交）

param(
  [switch]$SkipFunasr,
  [switch]$SkipPortal
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$GatewayDir = Join-Path $Root "gateway"
$PortalDir = Join-Path $Root "chat-portal"
$EnvFile = Join-Path $GatewayDir ".env"

function Import-DotEnv([string]$Path) {
  if (-not (Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $key = $line.Substring(0, $i).Trim()
    $val = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
    Set-Item -Path "Env:$key" -Value $val
  }
}

Import-DotEnv $EnvFile

if (-not $env:DASHSCOPE_API_KEY) {
  Write-Host "[warn] 未设置 DASHSCOPE_API_KEY —— FunASR 可用；切到 Qwen 会提示「语音识别服务未配置」。" -ForegroundColor Yellow
  Write-Host "       请复制 gateway\.env.example 为 gateway\.env 并填入密钥。" -ForegroundColor Yellow
} else {
  Write-Host "[ok] 已检测到 DASHSCOPE_API_KEY（用于 Qwen 通道）" -ForegroundColor Green
}

if (-not $SkipFunasr) {
  Write-Host "[funasr] 检查 Docker / 容器 funasr-asr ..."
  $docker = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $docker) {
    Write-Host "[warn] 未找到 docker，跳过 FunASR。本地识别将不可用。" -ForegroundColor Yellow
  } else {
    $running = docker ps --filter "name=funasr-asr" --format "{{.Names}}" 2>$null
    if ($running -eq "funasr-asr") {
      Write-Host "[funasr] 已在运行 (10095)" -ForegroundColor Green
    } else {
      $exists = docker ps -a --filter "name=funasr-asr" --format "{{.Names}}" 2>$null
      if ($exists -eq "funasr-asr") {
        Write-Host "[funasr] 启动已有容器 ..."
        docker start funasr-asr | Out-Null
      } else {
        Write-Host "[funasr] docker compose up -d funasr ..."
        Push-Location $Root
        try {
          docker compose up -d funasr
        } finally {
          Pop-Location
        }
      }
      Write-Host "[funasr] 模型加载可能需数十秒，端口 10095" -ForegroundColor Green
    }
  }
}

# 子窗口自行读 .env，避免密钥出现在进程命令行
$gatewayCmd = @"
Set-Location '$GatewayDir'
`$envPath = Join-Path (Get-Location) '.env'
if (Test-Path `$envPath) {
  Get-Content `$envPath | ForEach-Object {
    `$line = `$_.Trim()
    if (-not `$line -or `$line.StartsWith('#')) { return }
    `$i = `$line.IndexOf('=')
    if (`$i -lt 1) { return }
    `$key = `$line.Substring(0, `$i).Trim()
    `$val = `$line.Substring(`$i + 1).Trim().Trim('"').Trim("'")
    Set-Item -Path ("Env:" + `$key) -Value `$val
  }
}
Write-Host '[gateway] http://127.0.0.1:3001' -ForegroundColor Cyan
npm run dev
"@

Write-Host "[gateway] 新窗口启动 ..."
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $gatewayCmd)

if (-not $SkipPortal) {
  $portalCmd = @"
Set-Location '$PortalDir'
Write-Host '[portal] Vite 开发服（见终端输出 URL）' -ForegroundColor Cyan
npm run dev
"@
  Write-Host "[portal] 新窗口启动 ..."
  Start-Process powershell -ArgumentList @("-NoExit", "-Command", $portalCmd)
}

Write-Host ""
Write-Host "完成。前端 TopBar「设置」可切换 FunASR / Qwen。" -ForegroundColor Cyan
Write-Host "  FunASR: 经网关 /api/asr/stream?engine=funasr → 本地 10095"
Write-Host "  Qwen:   经网关 ?engine=qwen（需 gateway\.env 中的 DASHSCOPE_API_KEY）"
