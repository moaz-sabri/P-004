$ErrorActionPreference = 'Stop'

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $name"
  }
}

Require-Command node
Require-Command npm
Require-Command docker

if (-not (Test-Path .env)) { throw '.env is required for production preflight.' }
$envText = Get-Content .env -Raw

foreach ($key in @('APP_ENV', 'DB_PASSWORD', 'DB_ROOT_PASSWORD', 'AUTH_SECRET')) {
  if ($envText -notmatch "(?m)^$key=") { throw "Missing environment variable: $key" }
}

if ($envText -match 'APP_ENV=production') {
  foreach ($weak in @('studio_secure_pass_2026', 'studio_root_pass_2026', 'studio_secret_key_change_in_production_894872918237', 'admin123')) {
    if ($envText -match [regex]::Escape($weak)) { throw "Weak production value detected: $weak" }
  }
}

docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
npm test
npm run test:php
npm run test:auth
npm run test:permissions
npm run build

Write-Output 'Production preflight passed.'
