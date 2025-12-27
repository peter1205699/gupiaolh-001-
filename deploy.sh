#!/bin/bash
# ===================================
# 量化分析平台 - 一键部署脚本
# ===================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    log_info "Docker 环境检查通过"
}

# 检查环境变量文件
check_env_file() {
    if [ ! -f "backend/.env.production" ]; then
        log_warn "未找到 .env.production 文件，使用默认配置"
        cp backend/.env.production backend/.env
    else
        cp backend/.env.production backend/.env
        log_info "使用 .env.production 配置"
    fi

    # 检查是否修改了默认密码
    if grep -q "CHANGE_THIS" backend/.env; then
        log_warn "警告: 检测到未修改的默认密码，请在生产环境修改！"
        read -p "是否继续部署? (y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            log_info "部署已取消"
            exit 0
        fi
    fi
}

# 停止现有容器
stop_containers() {
    log_info "停止现有容器..."
    cd backend
    docker-compose down 2>/dev/null || true
    cd ..
}

# 构建并启动容器
start_containers() {
    log_info "构建并启动容器..."
    cd backend

    # 加载环境变量
    if [ -f ../.env ]; then
        export $(cat ../.env | grep -v '^#' | xargs)
    fi

    docker-compose up -d --build
    cd ..
}

# 等待服务启动
wait_for_services() {
    log_info "等待服务启动..."
    sleep 10

    # 检查后端服务
    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
            log_info "后端服务启动成功"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    log_error "后端服务启动超时"
    return 1
}

# 显示服务状态
show_status() {
    log_info "服务状态:"
    cd backend
    docker-compose ps
    cd ..
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "=========================================="
    log_info "部署完成！"
    echo "=========================================="
    echo ""
    echo "后端 API: http://localhost:3000"
    echo "健康检查: http://localhost:3000/api/health"
    echo ""
    echo "常用命令:"
    echo "  查看日志: cd backend && docker-compose logs -f"
    echo "  停止服务: cd backend && docker-compose down"
    echo "  重启服务: cd backend && docker-compose restart"
    echo ""
    echo "数据库连接:"
    echo "  主机: localhost"
    echo "  端口: 3306"
    echo "  用户: quant_user"
    echo "  数据库: quant_analysis"
    echo ""
}

# 主函数
main() {
    log_info "开始部署量化分析平台..."
    echo ""

    check_docker
    check_env_file
    stop_containers
    start_containers
    wait_for_services
    show_status
    show_deployment_info
}

# 执行主函数
main "$@"
