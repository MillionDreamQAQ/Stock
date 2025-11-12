# 股票看盘系统

基于React + FastAPI的股票分析系统，支持缠论指标分析。

## 项目结构

```
Stock/
├── frontend/          # 前端项目 (React + TypeScript + Vite)
├── backend/           # 后端项目 (Python + FastAPI)
└── README.md
```

## 技术栈

### 前端
- React 18 + TypeScript
- Vite (构建工具)
- Ant Design (UI组件库)
- TradingView Lightweight Charts (K线图)
- React Query (数据请求管理)
- Axios (HTTP客户端)

### 后端
- Python 3.9+
- FastAPI (Web框架)
- AKShare (股票数据获取)
- Pandas (数据处理)

## 快速开始

### 1. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动后端服务

```bash
cd backend
python main.py
```

后端服务将运行在 http://localhost:8000

### 3. 安装前端依赖

```bash
cd frontend
npm install
```

### 4. 启动前端开发服务器

```bash
cd frontend
npm run dev
```

前端将运行在 http://localhost:5173

## 功能特性

- [x] 获取上证指数数据
- [x] K线图展示
- [ ] 缠论笔识别
- [ ] 缠论线段识别
- [ ] 缠论中枢识别
- [ ] 多股票对比分析
- [ ] 自选股管理

## API文档

后端服务启动后，访问以下地址查看API文档：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 当前接口

### GET /api/stock/sh-index
获取上证指数K线数据

参数:
- `days` (可选): 获取最近多少天的数据，默认100天

返回示例:
```json
{
  "code": "sh000001",
  "name": "上证指数",
  "data": [
    {
      "date": "2024-01-01",
      "open": 3000.0,
      "high": 3100.0,
      "low": 2950.0,
      "close": 3050.0,
      "volume": 1000000.0
    }
  ]
}
```

## 开发计划

1. Phase 1: 基础架构搭建 ✅
   - 前后端项目初始化
   - 数据获取接口
   - K线图展示

2. Phase 2: 缠论指标实现
   - 笔的识别算法
   - 线段的识别算法
   - 中枢的识别算法

3. Phase 3: 功能完善
   - 多股票切换
   - 自选股管理
   - 指标配置

## 注意事项

- 确保Python版本 >= 3.9
- 确保Node.js版本 >= 18
- 首次运行后端时，AKShare会下载数据，可能需要一些时间
- 数据来源于AKShare，仅供学习使用
