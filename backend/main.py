from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import akshare as ak
import pandas as pd
from typing import List, Dict, Optional
from database import db

app = FastAPI(title="Stock Analysis API")

# 初始化数据库
try:
    db.init_database()
    print("数据库初始化成功")
except Exception as e:
    print(f"数据库初始化失败: {e}")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite默认端口
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Stock Analysis API is running"}


@app.get("/api/stocks/list")
def get_stock_list(type: Optional[str] = Query(None, description="类型筛选：stock-股票，index-指数")):
    """
    获取所有股票列表
    """
    try:
        stocks = db.get_all_stocks(stock_type=type)
        return {
            "total": len(stocks),
            "stocks": stocks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.get("/api/stocks/search")
def search_stocks(keyword: str = Query(..., description="搜索关键词（股票代码或名称）")):
    """
    搜索股票
    """
    try:
        results = db.search_stocks(keyword)
        return {
            "keyword": keyword,
            "total": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/api/sync/stock-list")
def sync_stock_list():
    """
    同步A股股票列表到数据库
    """
    try:
        print("开始同步股票列表...")

        # 使用akshare获取A股股票列表
        df = ak.stock_zh_a_spot()

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="No stock list from akshare")

        print(f"获取到 {len(df)} 支股票")

        # 插入股票信息
        inserted = 0
        for _, row in df.iterrows():
            try:
                code = row['代码']
                name = row['名称']

                # 判断市场
                if code.startswith('6'):
                    market = '上交所'
                elif code.startswith('0') or code.startswith('3'):
                    market = '深交所'
                else:
                    market = '其他'

                db.add_stock_info(code, name, market, 'stock')
                inserted += 1
            except Exception as e:
                print(f"插入股票 {code} 失败: {e}")
                continue

        # 同时添加常用指数
        indices = [
            ('sh000001', '上证指数', '上交所', 'index'),
            ('sz399001', '深证成指', '深交所', 'index'),
            ('sz399006', '创业板指', '深交所', 'index'),
        ]

        for code, name, market, type_ in indices:
            db.add_stock_info(code, name, market, type_)

        print(f"同步完成，更新了 {inserted} 支股票")

        return {
            "success": True,
            "total_stocks": inserted,
            "message": "股票列表同步完成"
        }

    except Exception as e:
        print(f"同步失败: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@app.post("/api/sync/stock/{code}")
def sync_stock_data(code: str):
    """
    同步指定股票或指数的历史数据
    """
    try:
        print(f"开始同步 {code} 数据...")

        # 规范化股票代码
        db_code, pure_code, is_index = normalize_stock_code(code)

        # 根据类型选择不同的akshare接口
        if is_index:
            # 指数使用专门的接口
            print(f"使用指数接口获取数据: {db_code}")
            df = ak.stock_zh_index_daily(symbol=db_code)
        else:
            # 股票使用前复权接口
            print(f"使用股票接口获取数据: {pure_code}")
            df = ak.stock_zh_a_hist(symbol=pure_code, adjust="qfq")

        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {code}")

        # 确保date列是datetime类型并统一列名
        if is_index:
            # 指数接口返回：date, open, close, high, low, volume
            df['date'] = pd.to_datetime(df['date'])
        else:
            # 股票接口返回：日期, 开盘, 收盘, 最高, 最低, 成交量
            df['date'] = pd.to_datetime(df['日期'])
            df = df.rename(columns={
                '开盘': 'open',
                '最高': 'high',
                '最低': 'low',
                '收盘': 'close',
                '成交量': 'volume'
            })

        print(f"从akshare获取到 {len(df)} 条数据")

        # 批量插入数据库
        inserted = db.insert_batch(db_code, df[['date', 'open', 'high', 'low', 'close', 'volume']])

        # 更新同步记录
        db.update_sync_record(db_code, len(df))

        # 获取数据库中的数据范围
        data_range = db.get_data_range(db_code)

        print(f"同步完成，新插入 {inserted} 条数据")

        return {
            "success": True,
            "code": db_code,
            "total_from_akshare": len(df),
            "inserted": inserted,
            "database_info": data_range
        }

    except Exception as e:
        print(f"同步失败: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


def normalize_stock_code(code: str) -> tuple:
    """
    规范化股票代码
    :param code: 输入的股票代码（可能是 600000 或 sh600000 格式）
    :return: (数据库中的代码, akshare使用的代码, 是否是指数)
    """
    code = code.lower().strip()

    # 判断是否已经带有市场前缀
    if code.startswith('sh') or code.startswith('sz'):
        db_code = code  # 数据库中存储的格式：sh600000
        pure_code = code[2:]  # akshare使用的格式：600000
    else:
        pure_code = code  # 输入就是纯数字：600000
        # 根据代码判断市场
        if code.startswith('6'):
            db_code = 'sh' + code  # 6开头是上交所
        elif code.startswith('0') or code.startswith('3'):
            db_code = 'sz' + code  # 0或3开头是深交所
        else:
            db_code = code  # 其他情况保持原样

    # 判断是否是指数（000001是上证指数，399001是深证成指等）
    is_index = code in ['000001', 'sh000001', '399001', 'sz399001', '399006', 'sz399006']

    return db_code, pure_code, is_index


@app.get("/api/stock/{code}")
def get_stock_data(
    code: str,
    start_date: Optional[str] = Query(None, description="开始日期 YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="结束日期 YYYY-MM-DD"),
    days: int = Query(100, description="获取最近多少天的数据")
):
    """
    获取股票K线数据（从数据库读取，如果没有则自动同步）
    支持股票和指数，自动识别代码格式
    :param code: 股票代码（支持 600000 或 sh600000 格式）
    :param start_date: 开始日期，格式：YYYY-MM-DD
    :param end_date: 结束日期，格式：YYYY-MM-DD
    :param days: 如果没有指定日期范围，则获取最近N天的数据
    :return: K线数据列表
    """
    import time

    try:
        # 规范化股票代码
        db_code, pure_code, is_index = normalize_stock_code(code)

        print(f"\n=== 查询请求 ===")
        print(f"原始代码: {code}, 数据库代码: {db_code}, akshare代码: {pure_code}, 是否指数: {is_index}")
        print(f"参数: start_date={start_date}, end_date={end_date}, days={days}")

        # 检查数据库中是否有该股票的数据（使用数据库格式的代码）
        data_range = db.get_data_range(db_code)

        # 如果数据库中没有数据，自动同步
        if not data_range:
            print(f"数据库中没有股票 {db_code} 的数据，开始自动同步...")

            try:
                # 获取股票信息（名称等）
                stock_info = db.search_stocks(db_code)
                stock_name = stock_info[0]['name'] if stock_info else "未知股票"

                print(f"正在同步 {stock_name} ({db_code}) 的历史数据...")

                # 根据类型选择不同的akshare接口
                if is_index:
                    # 指数使用专门的接口
                    print(f"使用指数接口获取数据: {db_code}")
                    df = ak.stock_zh_index_daily(symbol=db_code)
                else:
                    # 股票使用前复权接口（使用纯数字代码）
                    print(f"使用股票接口获取数据: {pure_code}")
                    df = ak.stock_zh_a_hist(symbol=pure_code, period="daily", adjust="qfq")

                if df is None or df.empty:
                    raise HTTPException(
                        status_code=404,
                        detail=f"无法从 akshare 获取股票 {db_code} 的数据，请检查股票代码是否正确"
                    )

                print(f"从 akshare 获取到 {len(df)} 条数据")

                # 转换数据格式为统一的列名
                # 指数接口返回的列名是英文，股票接口返回的是中文
                if is_index:
                    # 指数接口返回：date, open, close, high, low, volume
                    df['date'] = pd.to_datetime(df['date'])
                else:
                    # 股票接口返回：日期, 开盘, 收盘, 最高, 最低, 成交量
                    df['date'] = pd.to_datetime(df['日期'])
                    df = df.rename(columns={
                        '开盘': 'open',
                        '最高': 'high',
                        '最低': 'low',
                        '收盘': 'close',
                        '成交量': 'volume'
                    })

                # 批量插入数据库（使用数据库格式的代码）
                inserted = db.insert_batch(db_code, df[['date', 'open', 'high', 'low', 'close', 'volume']])

                print(f"自动同步完成，插入 {inserted} 条数据")

                # 等待一下再查询，确保数据已写入
                time.sleep(0.5)

            except Exception as sync_error:
                print(f"自动同步失败: {sync_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"自动同步数据失败: {str(sync_error)}"
                )

        # 从数据库查询数据（使用数据库格式的代码）
        if start_date and end_date:
            result = db.query_by_date_range(db_code, start_date, end_date)
            print(f"数据库返回 {len(result)} 条数据")
        elif start_date or end_date:
            result = db.query_by_date_range(db_code, start_date, end_date)
            print(f"数据库返回 {len(result)} 条数据")
        else:
            result = db.query_latest(db_code, days)
            print(f"数据库返回最近 {len(result)} 条数据")

        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"未能获取到股票 {db_code} 的数据"
            )

        # 获取股票名称
        stock_info = db.search_stocks(db_code)
        stock_name = stock_info[0]['name'] if stock_info else db_code

        return {
            "code": db_code,  # 返回数据库格式的代码
            "name": stock_name,
            "data": result,
            "total": len(result),
            "from_database": True,
            "auto_synced": not bool(data_range)  # 标记是否是自动同步的
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"查询失败: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)