"""数据库操作模块"""
import pymysql
from typing import List, Dict, Optional
import pandas as pd
from config import DB_CONFIG
from dbutils.pooled_db import PooledDB

try:
    from pypinyin import lazy_pinyin, Style
    PINYIN_AVAILABLE = True
except ImportError:
    PINYIN_AVAILABLE = False
    print("警告: pypinyin 库未安装，拼音搜索功能将不可用")


def get_pinyin(text: str) -> tuple:
    """
    获取文本的拼音全拼和首字母缩写
    :param text: 中文文本
    :return: (全拼, 首字母缩写)
    """
    if not PINYIN_AVAILABLE or not text:
        return '', ''

    try:
        # 获取全拼（小写，无音调）
        pinyin_full = ''.join(lazy_pinyin(text, style=Style.NORMAL))

        # 获取首字母缩写
        pinyin_abbr = ''.join(lazy_pinyin(text, style=Style.FIRST_LETTER))

        return pinyin_full.lower(), pinyin_abbr.lower()
    except Exception as e:
        print(f"获取拼音失败: {e}")
        return '', ''


class StockDatabase:
    def __init__(self):
        self.config = DB_CONFIG
        # 创建数据库连接池
        self.pool = PooledDB(
            creator=pymysql,  # 使用 pymysql 作为数据库模块
            maxconnections=10,  # 连接池允许的最大连接数
            mincached=2,  # 初始化时，连接池中至少创建的空闲连接
            maxcached=5,  # 连接池中最多闲置的连接
            maxshared=3,  # 连接池中最多共享的连接数量
            blocking=True,  # 连接池中如果没有可用连接后，是否阻塞等待
            maxusage=None,  # 一个连接最多被重复使用的次数，None表示无限制
            setsession=[],  # 开始会话前执行的命令列表
            ping=1,  # ping MySQL服务端，检查是否服务可用
            host=self.config['host'],
            port=self.config['port'],
            user=self.config['user'],
            password=self.config['password'],
            database=self.config['database'],
            charset=self.config['charset'],
            cursorclass=pymysql.cursors.DictCursor
        )
        print("数据库连接池初始化成功")

    def get_connection(self):
        """从连接池获取数据库连接"""
        return self.pool.connection()

    def init_database(self):
        """初始化数据库表"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # 创建股票日线数据表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stock_daily (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(20) NOT NULL COMMENT '股票代码',
                date DATE NOT NULL COMMENT '日期',
                open DECIMAL(10, 3) NOT NULL COMMENT '开盘价',
                high DECIMAL(10, 3) NOT NULL COMMENT '最高价',
                low DECIMAL(10, 3) NOT NULL COMMENT '最低价',
                close DECIMAL(10, 3) NOT NULL COMMENT '收盘价',
                volume BIGINT NOT NULL COMMENT '成交量',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                UNIQUE KEY uk_code_date (code, date),
                KEY idx_code (code),
                KEY idx_date (date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='股票日线数据表'
        ''')

        # 创建数据同步记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sync_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(20) NOT NULL COMMENT '股票代码',
                last_sync_date DATE COMMENT '最后同步日期',
                total_records INT COMMENT '总记录数',
                sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '同步时间',
                UNIQUE KEY uk_code (code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据同步记录表'
        ''')

        # 创建股票信息表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stock_info (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(20) NOT NULL COMMENT '股票代码',
                name VARCHAR(100) NOT NULL COMMENT '股票名称',
                pinyin_full VARCHAR(200) COMMENT '拼音全拼',
                pinyin_abbr VARCHAR(50) COMMENT '拼音首字母缩写',
                market VARCHAR(20) COMMENT '市场（如：上交所、深交所）',
                type VARCHAR(20) DEFAULT 'stock' COMMENT '类型（stock-股票，index-指数）',
                is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_code (code),
                KEY idx_name (name),
                KEY idx_pinyin_full (pinyin_full),
                KEY idx_pinyin_abbr (pinyin_abbr),
                KEY idx_type (type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='股票基础信息表'
        ''')

        conn.commit()
        cursor.close()
        conn.close()

        print("数据库表初始化完成")

    def insert_batch(self, code: str, df: pd.DataFrame) -> int:
        """批量插入数据（使用INSERT IGNORE避免重复）"""
        if df.empty:
            return 0

        conn = self.get_connection()
        cursor = conn.cursor()

        # 准备批量插入的数据
        values = []
        for _, row in df.iterrows():
            values.append((
                code,
                row['date'].strftime('%Y-%m-%d') if isinstance(row['date'], pd.Timestamp) else str(row['date']),
                float(row['open']),
                float(row['high']),
                float(row['low']),
                float(row['close']),
                int(row['volume'])
            ))

        # 批量插入（INSERT IGNORE会自动跳过重复数据）
        sql = '''
            INSERT IGNORE INTO stock_daily
            (code, date, open, high, low, close, volume)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        '''

        cursor.executemany(sql, values)
        inserted = cursor.rowcount

        conn.commit()
        cursor.close()
        conn.close()

        return inserted

    def query_by_date_range(
        self,
        code: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict]:
        """按日期范围查询数据"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            sql = "SELECT date, open, high, low, close, volume FROM stock_daily WHERE code = %s"
            params = [code]

            if start_date:
                sql += " AND date >= %s"
                params.append(start_date)

            if end_date:
                sql += " AND date <= %s"
                params.append(end_date)

            sql += " ORDER BY date ASC"

            cursor.execute(sql, params)
            rows = cursor.fetchall()

            # 转换日期格式
            for row in rows:
                if row['date']:
                    row['date'] = row['date'].strftime('%Y-%m-%d')
                row['open'] = float(row['open'])
                row['high'] = float(row['high'])
                row['low'] = float(row['low'])
                row['close'] = float(row['close'])
                row['volume'] = float(row['volume'])

            return rows
        finally:
            cursor.close()
            conn.close()

    def query_latest(self, code: str, days: int = 100) -> List[Dict]:
        """查询最近N天的数据"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            sql = '''
                SELECT date, open, high, low, close, volume
                FROM stock_daily
                WHERE code = %s
                ORDER BY date DESC
                LIMIT %s
            '''

            cursor.execute(sql, (code, days))
            rows = cursor.fetchall()

            # 转换格式并按日期升序
            result = []
            for row in reversed(rows):
                result.append({
                    'date': row['date'].strftime('%Y-%m-%d'),
                    'open': float(row['open']),
                    'high': float(row['high']),
                    'low': float(row['low']),
                    'close': float(row['close']),
                    'volume': float(row['volume'])
                })

            return result
        finally:
            cursor.close()
            conn.close()

    def get_data_range(self, code: str) -> Optional[Dict]:
        """获取某个股票的数据范围"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            sql = '''
                SELECT
                    MIN(date) as earliest,
                    MAX(date) as latest,
                    COUNT(*) as total
                FROM stock_daily
                WHERE code = %s
            '''

            cursor.execute(sql, (code,))
            row = cursor.fetchone()

            if row and row['total'] > 0:
                return {
                    'earliest': row['earliest'].strftime('%Y-%m-%d') if row['earliest'] else None,
                    'latest': row['latest'].strftime('%Y-%m-%d') if row['latest'] else None,
                    'total': row['total']
                }
            return None
        finally:
            cursor.close()
            conn.close()

    def update_sync_record(self, code: str, total_records: int):
        """更新同步记录"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            sql = '''
                INSERT INTO sync_records (code, last_sync_date, total_records)
                VALUES (%s, CURDATE(), %s)
                ON DUPLICATE KEY UPDATE
                    last_sync_date = CURDATE(),
                    total_records = %s
            '''

            cursor.execute(sql, (code, total_records, total_records))
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    def add_stock_info(self, code: str, name: str, market: str = None, stock_type: str = 'stock'):
        """添加股票信息（自动生成拼音）"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # 生成拼音
            pinyin_full, pinyin_abbr = get_pinyin(name)

            sql = '''
                INSERT INTO stock_info (code, name, pinyin_full, pinyin_abbr, market, type)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    name = %s,
                    pinyin_full = %s,
                    pinyin_abbr = %s,
                    market = %s
            '''

            cursor.execute(sql, (
                code, name, pinyin_full, pinyin_abbr, market, stock_type,
                name, pinyin_full, pinyin_abbr, market
            ))
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    def get_all_stocks(self, stock_type: Optional[str] = None) -> List[Dict]:
        """获取所有股票列表"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            if stock_type:
                sql = "SELECT code, name, market, type FROM stock_info WHERE type = %s AND is_active = 1"
                cursor.execute(sql, (stock_type,))
            else:
                sql = "SELECT code, name, market, type FROM stock_info WHERE is_active = 1"
                cursor.execute(sql)

            rows = cursor.fetchall()
            return rows
        finally:
            cursor.close()
            conn.close()

    def search_stocks(self, keyword: str) -> List[Dict]:
        """搜索股票（按代码、名称或拼音）"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # 转换搜索关键词为小写，用于拼音匹配
            keyword_lower = keyword.lower()

            sql = '''
                SELECT code, name, market, type
                FROM stock_info
                WHERE (
                    code LIKE %s
                    OR name LIKE %s
                    OR pinyin_full LIKE %s
                    OR pinyin_abbr LIKE %s
                )
                AND is_active = 1
                ORDER BY
                    CASE
                        WHEN code = %s THEN 0
                        WHEN code LIKE %s THEN 1
                        WHEN name LIKE %s THEN 2
                        WHEN pinyin_abbr LIKE %s THEN 3
                        ELSE 4
                    END
                LIMIT 50
            '''

            keyword_pattern = f'%{keyword}%'
            keyword_pattern_lower = f'%{keyword_lower}%'
            keyword_start = f'{keyword}%'
            keyword_start_lower = f'{keyword_lower}%'

            cursor.execute(sql, (
                keyword_pattern,        # code LIKE
                keyword_pattern,        # name LIKE
                keyword_pattern_lower,  # pinyin_full LIKE
                keyword_pattern_lower,  # pinyin_abbr LIKE
                keyword,                # ORDER BY: exact code match
                keyword_start,          # ORDER BY: code starts with
                keyword_pattern,        # ORDER BY: name contains
                keyword_start_lower     # ORDER BY: pinyin_abbr starts with
            ))
            rows = cursor.fetchall()
            return rows
        finally:
            cursor.close()
            conn.close()


# 全局数据库实例
db = StockDatabase()
