"""数据库配置"""

# MySQL数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'xA123456',  # 请修改为你的MySQL密码
    'database': 'stock_data',
    'charset': 'utf8mb4'
}

# 或者使用环境变量（更安全）
# import os

# DB_CONFIG = {
#     'host': os.getenv('DB_HOST', 'localhost'),
#     'port': int(os.getenv('DB_PORT', 3306)),
#     'user': os.getenv('DB_USER', 'root'),
#     'password': os.getenv('DB_PASSWORD', 'your_password'),
#     'database': os.getenv('DB_NAME', 'stock_data'),
#     'charset': 'utf8mb4'
# }
