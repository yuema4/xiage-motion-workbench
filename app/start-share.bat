@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Please install Node.js 22 LTS or newer. & exit /b 1)
where npm >nul 2>nul || (echo Please install npm. & exit /b 1)
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 22 (echo Node.js 22 LTS or newer is required. & exit /b 1)
if not exist node_modules npm ci
npm run build || exit /b 1
node scripts\start-share.mjs
