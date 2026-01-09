# Mac mini M4 本地部署指南

恭喜您使用最新的 Mac mini M4！以下是部署中国智慧农业平台的详细步骤。

## 准备工作
1.  确保您的 Mac 已连接互联网。
2.  下载我为您准备的两个文件：
    - `china-smart-agriculture-v1.8.0.tar.gz` (项目代码包)
    - `setup_mac.sh` (一键部署脚本)

## 部署步骤

### 1. 放置文件
将下载的两个文件放在同一个文件夹中（例如：桌面上的 `smart-agri` 文件夹）。

### 2. 打开终端
按下 `Command + 空格`，输入 `Terminal` 并回车。

### 3. 进入文件夹
在终端中输入以下命令（假设您放在了桌面）：
```bash
cd ~/Desktop/smart-agri
```

### 4. 赋予脚本执行权限
输入以下命令：
```bash
chmod +x setup_mac.sh
```

### 5. 运行部署脚本
输入以下命令开始部署：
```bash
./setup_mac.sh
```

### 6. 访问平台
脚本运行完成后，会自动启动服务。请打开浏览器访问：
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 常见问题处理

### 1. 提示 "Permission denied"
请确保运行了 `chmod +x setup_mac.sh` 命令。

### 2. Homebrew 安装缓慢
如果安装 Homebrew 进度缓慢，可以尝试切换国内镜像源（脚本会自动尝试官方源，若失败请联系我获取镜像源安装方式）。

### 3. 想要停止服务
在终端窗口按下 `Ctrl + C` 即可停止运行。

### 4. 下次如何启动？
下次启动时，只需进入项目文件夹并运行：
```bash
cd ~/Desktop/smart-agri/china-smart-agriculture
NODE_ENV=production node dist/index.js
```
