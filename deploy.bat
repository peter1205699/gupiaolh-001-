@echo off
REM ===================================
REM 量化分析平台 - Windows 部署脚本
REM ===================================

setlocal enabledelayedexpansion

echo ==========================================
echo  量化分析平台 - 部署脚本
echo ==========================================
echo.

REM 检查 Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker 未安装，请先安装 Docker Desktop
    pause
    exit /b 1
)

echo [INFO] Docker 环境检查通过
echo.

REM 检查环境变量文件
if not exist "backend\.env.production" (
    if not exist "backend\.env" (
        echo [WARN] 未找到 .env.production 文件
        copy backend\.env.production backend\.env
    )
) else (
    copy backend\.env.production backend\.env
    echo [INFO] 使用 .env.production 配置
)

REM 检查是否修改了默认密码
findstr /C:"CHANGE_THIS" backend\.env >nul
if not errorlevel 1 (
    echo [WARN] 警告: 检测到未修改的默认密码！
    set /p confirm="是否继续部署? (y/N): "
    if /i not "!confirm!"=="y" (
        echo [INFO] 部署已取消
        pause
        exit /b 0
    )
)

echo.
echo [INFO] 停止现有容器...
cd backend
docker-compose down 2>nul

echo.
echo [INFO] 构建并启动容器...
docker-compose up -d --build

echo.
echo [INFO] 等待服务启动...
timeout /t 10 /nobreak >nul

echo.
echo [INFO] 服务状态:
docker-compose ps

cd ..

echo.
echo ==========================================
echo  部署完成！
echo ==========================================
echo.
echo 后端 API: http://localhost:3000
echo 健康检查: http://localhost:3000/api/health
echo.
echo 常用命令:
echo   查看日志: cd backend ^&^& docker-compose logs -f
echo   停止服务: cd backend ^&^& docker-compose down
echo   重启服务: cd backend ^&^& docker-compose restart
echo.

pause
