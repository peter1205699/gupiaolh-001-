# 量化分析平台 - 部署指南

## 部署架构

```
┌─────────────────────────────────────────────────┐
│                   云服务器                        │
├─────────────────────────────────────────────────┤
│  ┌──────────┐      ┌──────────────┐            │
│  │  Nginx   │──────│  前端静态文件  │            │
│  │  :80/443 │      │  /var/www/    │            │
│  └──────────┘      └──────────────┘            │
│         │                                       │
│         │ /api/*                                │
│         ↓                                       │
│  ┌──────────┐      ┌──────────────┐            │
│  │ Node.js  │──────│   MySQL DB    │            │
│  │  :3000   │      │    :3306      │            │
│  └──────────┘      └──────────────┘            │
└─────────────────────────────────────────────────┘
```

---

## 一、本地开发环境启动

### 前置要求
- Node.js 16+
- MySQL 8.0+ (可选，不配置则使用内存存储)

### 启动步骤

```bash
# 1. 安装后端依赖
cd backend
npm install

# 2. 启动后端服务
npm start

# 3. 在浏览器打开前端
# 直接打开 index.html 或使用 Live Server
```

---

## 二、Docker 本地部署（推荐）

### 快速启动

**Windows:**
```bash
# 双击运行
deploy.bat
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### 手动启动

```bash
cd backend
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 三、云服务器部署

### 3.1 服务器配置建议

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 1核 | 2核 |
| 内存 | 2GB | 4GB |
| 带宽 | 1Mbps | 5Mbps |
| 系统 | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| 成本 | ¥50-100/月 | ¥100-200/月 |

### 3.2 服务器初始化

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Nginx
sudo apt install nginx -y

# 创建项目目录
sudo mkdir -p /var/www/quant-analysis
sudo chown -R $USER:$USER /var/www/quant-analysis
```

### 3.3 部署步骤

#### 1. 上传代码到服务器

```bash
# 方式1: 使用 git
git clone <your-repo-url> /var/www/quant-analysis

# 方式2: 使用 scp (本地执行)
scp -r ./gupiaolh-001/* user@server:/var/www/quant-analysis/
```

#### 2. 配置环境变量

```bash
cd /var/www/quant-analysis/backend

# 复制并编辑环境配置
cp .env.production .env
nano .env
```

**必须修改的配置项:**
```env
DB_PASSWORD=your_secure_password_here
DB_ROOT_PASSWORD=your_root_password_here
JWT_SECRET=your_jwt_secret_here
```

#### 3. 生成 JWT 密钥

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 4. 启动服务

```bash
# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

#### 5. 配置 Nginx

```bash
# 复制 Nginx 配置
sudo cp nginx.conf /etc/nginx/sites-available/quant-analysis

# 创建软链接
sudo ln -s /etc/nginx/sites-available/quant-analysis /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx

# 复制前端文件到静态目录
sudo mkdir -p /var/www/quant-analysis
sudo cp -r index.html login.html register.html css js /var/www/quant-analysis/
```

#### 6. 配置防火墙

```bash
# Ubuntu UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# 或使用 iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

---

## 四、域名和 HTTPS 配置（可选）

### 4.1 域名解析

在你的域名服务商添加 A 记录：
```
类型: A
主机记录: @
记录值: 你的服务器IP
```

### 4.2 安装 SSL 证书

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 申请证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 4.3 更新 Nginx 配置

取消 `nginx.conf` 中 HTTPS 配置部分的注释，修改域名后重载：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 五、维护和管理

### 常用命令

```bash
# 查看服务状态
cd backend && docker-compose ps

# 查看后端日志
cd backend && docker-compose logs -f backend

# 查看数据库日志
cd backend && docker-compose logs -f mysql

# 重启服务
cd backend && docker-compose restart

# 更新代码
git pull
cd backend && docker-compose up -d --build

# 备份数据库
docker exec quant-mysql mysqldump -uquant_user -p quant_analysis > backup.sql
```

### 监控服务

```bash
# 健康检查
curl http://localhost:3000/api/health

# 查看资源使用
docker stats
```

---

## 六、故障排查

### 问题1: 后端服务无法启动

```bash
# 检查端口占用
sudo lsof -i :3000

# 查看详细日志
cd backend && docker-compose logs backend
```

### 问题2: 数据库连接失败

```bash
# 检查数据库状态
cd backend && docker-compose ps mysql

# 进入数据库容器
docker exec -it quant-mysql bash
mysql -uquant_user -p
```

### 问题3: Nginx 502 错误

```bash
# 检查后端是否运行
curl http://localhost:3000/api/health

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

---

## 七、项目结构

```
gupiaolh-001/
├── backend/                      # 后端服务
│   ├── database/                 # 数据库
│   │   ├── schema.sql           # 表结构
│   │   └── db.js                # 数据库连接
│   ├── routes/                   # API路由
│   │   ├── user.js              # 用户认证
│   │   ├── market.js            # 市场数据
│   │   ├── trend.js             # 趋势分析
│   │   ├── risk.js              # 风险评估
│   │   └── event.js             # 事件跟踪
│   ├── services/                 # 业务逻辑
│   ├── Dockerfile               # Docker镜像
│   ├── docker-compose.yml       # 容器编排
│   ├── .env.production          # 生产环境变量
│   └── package.json
├── css/                         # 样式文件
├── js/                          # 前端脚本
│   ├── app.js                   # 主应用逻辑
│   └── auth.js                  # 认证功能
├── index.html                   # 主页
├── login.html                   # 登录页
├── register.html                # 注册页
├── nginx.conf                   # Nginx配置
├── deploy.sh                    # Linux/Mac部署脚本
└── deploy.bat                   # Windows部署脚本
```

---

## 八、安全检查清单

- [ ] 修改 .env 中的默认密码
- [ ] 生成强随机 JWT_SECRET
- [ ] 配置防火墙，仅开放必要端口
- [ ] 启用 HTTPS
- [ ] 定期备份数据库
- [ ] 监控服务日志
- [ ] 更新系统和依赖
