"""
数据库迁移脚本：为 stock_info 表添加拼音字段
"""
from database import db, get_pinyin

def migrate_add_pinyin_columns():
    """添加拼音字段到 stock_info 表"""
    conn = db.get_connection()
    cursor = conn.cursor()

    try:
        # 添加 pinyin_full 字段
        print("添加 pinyin_full 字段...")
        try:
            cursor.execute('''
                ALTER TABLE stock_info
                ADD COLUMN pinyin_full VARCHAR(200) COMMENT '拼音全拼' AFTER name
            ''')
            print("pinyin_full 字段添加成功")
        except Exception as e:
            if 'Duplicate column name' in str(e):
                print("pinyin_full 字段已存在")
            else:
                raise e

        # 添加 pinyin_abbr 字段
        print("添加 pinyin_abbr 字段...")
        try:
            cursor.execute('''
                ALTER TABLE stock_info
                ADD COLUMN pinyin_abbr VARCHAR(50) COMMENT '拼音首字母缩写' AFTER pinyin_full
            ''')
            print("pinyin_abbr 字段添加成功")
        except Exception as e:
            if 'Duplicate column name' in str(e):
                print("pinyin_abbr 字段已存在")
            else:
                raise e

        # 为 pinyin_full 添加索引
        print("添加索引...")
        try:
            cursor.execute('CREATE INDEX idx_pinyin_full ON stock_info(pinyin_full)')
            print("✓ idx_pinyin_full 索引添加成功")
        except Exception as e:
            if 'Duplicate key name' in str(e):
                print("✓ idx_pinyin_full 索引已存在")
            else:
                print(f"添加索引失败: {e}")

        # 为 pinyin_abbr 添加索引
        try:
            cursor.execute('CREATE INDEX idx_pinyin_abbr ON stock_info(pinyin_abbr)')
            print("✓ idx_pinyin_abbr 索引添加成功")
        except Exception as e:
            if 'Duplicate key name' in str(e):
                print("✓ idx_pinyin_abbr 索引已存在")
            else:
                print(f"添加索引失败: {e}")

        conn.commit()
        print("\n数据库表结构更新完成")

    except Exception as e:
        print(f"更新表结构失败: {e}")
        conn.rollback()
        cursor.close()
        conn.close()
        return False

    cursor.close()
    conn.close()
    return True


def update_existing_pinyin():
    """为现有的股票数据生成拼音"""
    conn = db.get_connection()
    cursor = conn.cursor()

    try:
        # 获取所有股票
        cursor.execute('SELECT code, name FROM stock_info WHERE pinyin_full IS NULL OR pinyin_full = ""')
        stocks = cursor.fetchall()

        if not stocks:
            print("没有需要更新拼音的股票")
            return

        print(f"\n开始为 {len(stocks)} 支股票生成拼音...")

        updated = 0
        for stock in stocks:
            code = stock['code']
            name = stock['name']

            # 生成拼音
            pinyin_full, pinyin_abbr = get_pinyin(name)

            if pinyin_full:
                cursor.execute('''
                    UPDATE stock_info
                    SET pinyin_full = %s, pinyin_abbr = %s
                    WHERE code = %s
                ''', (pinyin_full, pinyin_abbr, code))
                updated += 1

                if updated % 100 == 0:
                    print(f"已更新 {updated}/{len(stocks)} 条记录...")

        conn.commit()
        print(f"\n成功为 {updated} 支股票生成拼音")

    except Exception as e:
        print(f"生成拼音失败: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    print("=" * 60)
    print("数据库迁移：添加拼音搜索功能")
    print("=" * 60)

    # 步骤1: 添加字段和索引
    if migrate_add_pinyin_columns():
        # 步骤2: 为现有数据生成拼音
        update_existing_pinyin()

        print("\n" + "=" * 60)
        print("迁移完成！现在可以使用拼音搜索功能了")
        print("示例：")
        print("  - 搜索 'shanghaidianqi' 可以找到 '上海电气'")
        print("  - 搜索 'shdq' 可以找到 '上海电气'")
        print("=" * 60)
    else:
        print("\n迁移失败，请检查错误信息")
