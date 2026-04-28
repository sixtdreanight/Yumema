#!/usr/bin/env bash
# V-Partner 一键启动脚本
# 自动处理：首次运行→引导设置→安装依赖→启动

set -e
cd "$(dirname "$0")/.."

echo "  💕 V-Partner"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 未找到 Node.js，请先安装: https://nodejs.org/"
  echo "   安装后重新打开终端，再运行此脚本。"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 版本过低 (当前: $(node -v))，需要 18 或以上"
  echo "   请更新: https://nodejs.org/"
  exit 1
fi

# 安装依赖
if [ ! -d node_modules ]; then
  echo "📦 首次运行，安装依赖中..."
  npm install --silent
  echo ""
fi

# 检查角色卡
if [ ! -f data/profile.json ]; then
  echo "📝 未找到角色卡，进入设置向导..."
  echo ""
  npx tsx src/cli/setup.ts
  echo ""
fi

# 检查 .env 是否已配置
if grep -q "your_api_key_here" .env 2>/dev/null; then
  echo "⚠️  .env 中的 API Key 未配置，终端聊天模式启动"
  echo ""
  exec npx tsx src/cli/index.ts --terminal
fi

# 正常启动
echo "🚀 启动中..."
exec npx tsx src/cli/index.ts
