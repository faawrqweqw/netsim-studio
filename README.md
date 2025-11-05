# NetSim Studio - 网络拓扑设计与配置仿真工具

## 项目简介

NetSim Studio 是一款功能强大的、基于Web的可视化网络拓扑设计与配置仿真平台。它允许用户通过直观的拖拽方式构建复杂的网络拓扑，并对其中的网络设备进行详细配置。本工具旨在为网络工程师、学生及爱好者提供一个便捷的平台，用于学习网络协议、验证设计方案以及生成标准化的设备配置脚本。

与传统的模拟器不同，NetSim Studio 关注于配置的快速生成和验证，而非完整的数据包级仿真。它内置了对思科（Cisco）、华为（Huawei）、H3C等主流厂商设备的配置逻辑支持，能够根据用户在图形界面上的操作，实时生成对应的命令行接口（CLI）脚本，并提供中文解释，极大地降低了网络配置的复杂度和学习曲线。

## 功能特性

- **✨ 可视化拓扑设计**: 提供丰富的设备图标，支持通过拖拽方式自由构建、布局和连接网络设备。
- **💻 多厂商设备支持**: 核心功能已适配 Cisco (IOS), 华为 (VRP), H3C (Comware) 等主流网络设备厂商。
- **⚙️ 丰富的功能配置**:
  - **DHCP Server**: 支持地址池、租约、网关、DNS及静态绑定的图形化配置。
  - **VLAN & VLAN接口**: 轻松创建VLAN，并为其配置三层接口及DHCP服务。
  - **链路聚合 (Link Aggregation)**: 可视化配置LACP、PAgP或静态链路聚合组。
  - **生成树协议 (STP)**: 支持STP、RSTP、MSTP等模式的配置。
  - **路由协议**: 支持静态路由和OSPF动态路由协议的配置。
  - **虚拟路由冗余协议 (VRRP)**: 为网关提供高可用性配置。
  - **无线AC配置 (Wireless)**: 为华为、华三、思科AC设备提供独立的、模块化的无线网络配置面板。
- **📜 实时CLI生成与解释**: 所有图形化配置都会实时转换为对应厂商的CLI命令，并附带详细的中文命令解释，方便学习和审计。
- **💾 状态持久化**: 您的画布布局和设备配置会自动保存在浏览器的本地存储中，刷新页面不会丢失工作进度。
- **📤 导入/导出**:
  - **导出**: 可将当前拓扑图导出为PNG图片，或将完整的项目（包含设备、连接和所有配置）导出为JSON文件，方便分享和备份。
  - **导入**: 支持通过CSV模板批量导入AP设备信息，大幅提升配置效率。

## 环境准备

本项目是一个纯前端应用，所有逻辑均在浏览器中运行。您只需要一个现代的Web浏览器和Node.js环境即可进行开发和运行。

### 1. 安装 Node.js

请确保您的系统中已安装 Node.js (推荐 v16 或更高版本)。Node.js 的安装包中已包含 npm (Node.js 包管理器)。

- **Windows**:
  1.  访问 [Node.js 官方网站](https://nodejs.org/zh-cn/)。
  2.  下载长期支持版 (LTS) 的 `.msi` 安装程序。
  3.  运行安装程序，按照向导提示完成安装（建议保持默认选项）。

- **macOS**:
  推荐使用 [Homebrew](https://brew.sh/index_zh-cn) 进行安装。
  1.  打开“终端” (Terminal) 应用。
  2.  安装 Homebrew (如果尚未安装):
      ```bash
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      ```
  3.  使用 Homebrew 安装 Node.js:
      ```bash
      brew install node
      ```

- **Linux (以 Debian/Ubuntu 为例)**:
  推荐使用 `nvm` (Node Version Manager) 来管理不同版本的 Node.js。
  1.  打开终端。
  2.  安装 `nvm`:
      ```bash
      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
      ```
  3.  关闭并重新打开终端，然后安装 Node.js LTS 版本:
      ```bash
      nvm install --lts
      ```

### 2.安装git
1.  访问 [git 官方网站](https://git-scm.com/downloads)。
2.  下载不同系统的安装程序。
3.  运行安装程序，按照向导提示完成安装（建议保持默认选项）。

### 3. 验证安装

安装完成后，打开您的终端或命令行工具，输入以下命令来验证 Node.js 和 npm 是否安装成功。您应该能看到对应的版本号。

```bash
node -v
npm -v
```

## 快速开始

1.  **克隆项目代码**
    ```bash
    git clone https://github.com/faawrqweqw/netsim-studio.git
    ```

2.  **进入项目目录**
    ```bash
    cd netsim-studio
    ```

3.  **安装项目依赖**
    此命令会根据 `package.json` 文件自动下载并安装项目所需的所有库。
    ```bash
    npm install
    ```

4.  **启动开发服务器**
    此命令会启动一个本地开发服务器，您可以通过浏览器进行访问。
    ```bash
    # 推荐使用此命令，它会启动前端Vite服务器
    npm run dev:client
    ```
    或者，如果您想同时运行（当前未被核心功能使用的）后端API服务器：
    ```bash
    npm run dev
    ```

    如果是在Linux上后台运行该项目，需要下载pm进行管理
    ```
    npm install -g pm2
    pm2 start "npm run dev" --name netsim
    pm2 list          # 查看所有进程
    pm2 logs netsim   # 查看日志
    pm2 stop netsim   # 停止项目
    pm2 restart netsim  # 重启项目
    pm2 delete netsim   # 删除项目 
    ```

5.  **访问应用**
    打开您的浏览器，访问以下地址即可开始使用：
    [http://localhost:5173](http://127.0.0.1:5173)

## 项目结构

```
netsim-studio/
├── public/                # 静态资源
├── components/            # React通用组件
│   ├── config/            # 配置面板的模块化子组件 (DHCP, VLAN, STP等)
│   ├── Icons.tsx          # SVG图标组件
│   ├── AdvancedWirelessConfigModal.tsx # 华为/思科无线配置模态框
│   └── ...
├── services/              # 核心服务逻辑 (如CLI生成)
│   └── configService.ts   # 多厂商CLI生成引擎
├── types.ts               # 全局TypeScript类型定义
├── constants.tsx          # 应用常量 (设备列表, 默认配置等)
├── App.tsx                # 应用主组件
├── index.tsx              # React应用入口
└── server.js              # [旧版]Express API服务器 (当前核心功能不依赖)
```
