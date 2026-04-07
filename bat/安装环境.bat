@echo off
chcp 65001 >nul
cd /d %~dp0..\
echo ==============================
echo 正在安装课堂系统依赖...
echo ==============================

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js。
  pause
  exit /b
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 npm，请先正确安装 Node.js。
  pause
  exit /b
)

npm install

if errorlevel 1 (
  echo.
  echo [失败] 依赖安装失败，请检查网络或 npm 环境。
) else (
  echo.
  echo [成功] 依赖安装完成。
)

pause