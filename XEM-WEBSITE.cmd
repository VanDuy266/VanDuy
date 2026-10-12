@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Hay cai Node.js 24 tu https://nodejs.org/ roi mo lai file nay.
  pause
  exit /b 1
)
node -p "'Xe Dien Duc Tu - phien ban ' + require('./package.json').version"
echo Mo http://localhost:3000 tren trinh duyet may nay.
echo Giu cua so nay mo khi xem website. Nhan Ctrl+C de dung.
echo Mat khau quan tri tam thoi duoc tao ngau nhien cho lan xem thu.
node -e "process.env.ADMIN_PASSWORD=require('node:crypto').randomBytes(32).toString('hex');require('./server.js')"
pause
