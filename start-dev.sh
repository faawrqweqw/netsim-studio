#!/bin/bash

# 启动开发环境脚本
echo "Starting NetSim Studio development environment..."

# 检查Python是否可用
if ! command -v python3 &> /dev/null; then
    echo "Warning: Python3 not found. Configuration generation will use fallback implementation."
else
    echo "✓ Python3 found"
fi

# 检查Node.js依赖
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
else
    echo "✓ Node.js dependencies found"
fi

# 测试Python脚本
echo "Testing Python configuration generator..."
python3 scripts/config_generator.py --vendor cisco --device-type router --feature dhcp --config '{"pools":[{"poolName":"TEST","network":"192.168.1.0","subnetMask":"255.255.255.0","gateway":"192.168.1.1","dnsServer":"8.8.8.8"}]}' > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Python configuration generator working"
else
    echo "⚠ Python configuration generator has issues, will use fallback"
fi

# 启动开发服务器
echo "Starting development servers..."
echo "- API server will run on http://localhost:3001"
echo "- Frontend will run on http://localhost:5173"
npm run dev