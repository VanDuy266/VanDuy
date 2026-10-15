@echo off
cd /d "%~dp0"
if not exist package.json goto missingfiles
if not exist launch.js goto missingfiles
if not exist v31.js goto missingfiles
where node >nul 2>nul
if errorlevel 1 (
  echo Hay cai Node.js 24 tu https://nodejs.org/ roi mo lai file nay.
  pause
  exit /b 1
)
node -p "'Xe Dien Duc Tu - V3.1 Beta, phien ban ' + require('./package.json').version"
echo Ban se chon mat khau quan tri cua minh. Ghi nho de dang nhap tai /admin.
echo Giu cua so nay mo khi xem website. Nhan Ctrl+C de dung.
node launch.js
pause
exit /b
:missingfiles
echo Khong tim thay du bo website. Hay nhap phai file ZIP va chon Extract All / Giai nen tat ca.
echo Mo thu muc da giai nen co package.json, launch.js va v31.js roi chay lai.
pause
exit /b 1
