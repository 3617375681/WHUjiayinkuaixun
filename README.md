# 武大校园闪现 - WHU Campus Flash

## 项目简介

武汉大学校园竞赛信息聚合平台，自动爬取并展示各学院最新的竞赛、讲座、活动信息。

## 功能特点

- 🎯 自动爬取武大各学院官网竞赛信息
- 📊 智能分类（学科竞赛、双创经管、设计艺术等）
- 🤖 AI 竞赛助手（基于 DeepSeek，智能推荐竞赛与活动）
- 🔍 实时搜索和筛选
- 📱 响应式设计，支持移动端
- ⏰ 每小时自动更新数据
- 💾 本地数据持久化

## 技术栈

- **前端**: HTML5 + Tailwind CSS + Vanilla JavaScript
- **后端**: Node.js + HTTP Server
- **AI**: DeepSeek API (deepseek-chat)
- **爬虫**: Axios + Cheerio
- **数据**: JSON 本地存储

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件，添加 DeepSeek API Key：

```env
DEEPSEEK_API_KEY=your_api_key_here
PORT=8003
```

### 3. 启动服务

```bash
npm start
```

服务将在 `http://localhost:8003` 启动

### 手动运行爬虫

```bash
npm run crawl
```

## 项目结构

```
├── index.html          # 前端页面（含 AI 聊天侧边栏）
├── server.js           # HTTP服务器（含 /api/ai-chat 接口）
├── crawler.js          # 爬虫脚本
├── competitions.json   # 竞赛数据
├── messages.json       # 留言数据
├── .env                # 环境变量（API Key，不提交）
└── package.json        # 项目配置
```

## 数据来源

自动爬取武汉大学以下学院官网：

- 计算机学院
- 数学与统计学院
- 物理科学与技术学院
- 化学与分子科学学院
- 生命科学学院
- 资源与环境科学学院
- 水利水电学院
- 电气与自动化学院
- 动力与机械学院
- 城市设计学院
- 土木建筑工程学院
- 经济与管理学院
- 新闻与传播学院
- 文学院
- 历史学院
- 哲学学院
- 艺术学院
- 外国语言文学学院
- 法学院
- 政治与公共管理学院
- 信息管理学院
- 国际软件学院
- 遥感信息工程学院
- 测绘学院
- 印刷与包装系

## 功能说明

### 自动更新

- 服务启动时立即爬取一次
- 之后每小时自动更新
- 数据保存在 `competitions.json`

### 分类标签

- 学科竞赛
- 双创/经管
- 设计/艺术
- 文科/人文
- 理工科
- 其他

### 搜索功能

支持按标题、学院、分类实时搜索

## 开发

### 修改爬取学院

编辑 `crawler.js` 中的 `colleges` 数组

### 修改更新频率

编辑 `server.js` 中的 `UPDATE_INTERVAL` 常量（单位：毫秒）

### 修改端口

设置环境变量 `PORT` 或修改 `server.js` 中的默认端口

## 许可证

MIT

## 作者

trae

## 更新日期

2026年4月18日
