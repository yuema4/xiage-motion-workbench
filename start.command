#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/app"
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo '请先安装 Node.js 22 LTS，再运行此文件。'
  exit 1
fi
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) { console.error("需要 Node.js 22 或更新版本"); process.exit(1); }'
if [ ! -d node_modules ]; then
  npm ci
fi
npm run build
exec node scripts/start-share.mjs
