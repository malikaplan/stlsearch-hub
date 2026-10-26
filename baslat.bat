@echo off
chcp 65001 >nul
title STLArama - Coklu Pazar Yeri 3D Arama Motoru
cd /d "%~dp0"
echo =================================================================
echo Eski sunucu oturumu kontrol ediliyor ve yenileniyor...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3456 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo STLArama (Printables, Thingiverse, Cults3D, MakerWorld, MyMiniFactory, GrabCAD, Thangs) Baslatiliyor...
echo Tarayicinizda http://localhost:3456 acilacak.
echo =================================================================
start http://localhost:3456
node server.js
pause
