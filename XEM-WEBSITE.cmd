@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Hay cai Node.js 24 tu https://nodejs.org/ roi mo lai file nay.
  pause
  exit /b 1
)
node -p "'Xe Dien Duc Tu - V3.0 Beta, phien ban ' + require('./package.json').version"
echo Ban se chon mat khau quan tri cua minh. Ghi nho de dang nhap tai /admin.
echo Giu cua so nay mo khi xem website. Nhan Ctrl+C de dung.
node launch.js
pause
