#!/bin/bash

# 中国智慧农业平台 - Mac mini M4 一键部署脚本
# 适用系统: macOS (Apple Silicon M1/M2/M3/M4)

echo "🚀 开始部署中国智慧农业平台..."

# 1. 检查 Homebrew
if ! command -v brew &> /dev/null; then
    echo "📦 正在安装 Homebrew (这可能需要一些时间，请在提示时输入密码)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # 为 Apple Silicon 配置环境变量
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
else
    echo "✅ Homebrew 已安装"
fi

# 2. 安装 Node.js (推荐 v20 LTS)
if ! command -v node &> /dev/null; then
    echo "🟢 正在安装 Node.js..."
    brew install node@20
    brew link --overwrite node@20
else
    echo "✅ Node.js 已安装 ($(node -v))"
fi

# 3. 安装 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 正在安装 pnpm..."
    npm install -g pnpm
else
    echo "✅ pnpm 已安装 ($(pnpm -v))"
fi

# 4. 解压项目代码 (假设压缩包在当前目录)
PROJECT_ZIP="china-smart-agriculture-v1.8.0.tar.gz"
if [ -f "$PROJECT_ZIP" ]; then
    echo "📂 正在解压项目代码..."
    tar -xzvf "$PROJECT_ZIP"
    cd china-smart-agriculture
else
    echo "❌ 错误: 未找到项目压缩包 $PROJECT_ZIP"
    echo "请确保脚本和压缩包放在同一个文件夹内。"
    exit 1
fi

# 5. 安装依赖
echo "📥 正在安装项目依赖..."
pnpm install

# 6. 构建项目
echo "🏗️ 正在构建生产版本..."
pnpm build

# 7. 启动服务
echo "🎉 部署完成！"
echo "🌐 正在启动服务，请访问: http://localhost:3000"
echo "按 Ctrl+C 可以停止服务。"

NODE_ENV=production node dist/index.js
