@echo off
chcp 65001 >nul
cd /d %~dp0..\
echo ==============================
echo 正在启动课堂系统...
echo ==============================

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js。
  pause
  exit /b
)

if not exist package.json (
  echo [错误] 当前目录下找不到 package.json
  echo 请把这个 bat 文件放在项目根目录再运行。
  pause
  exit /b
)

if not exist server.js (
  echo [错误] 当前目录下找不到 server.js
  echo 请确认项目文件完整。
  pause
  exit /b
)

npm start

pause