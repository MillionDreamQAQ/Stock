export interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockData {
  code: string;
  name: string;
  data: KLineData[];
  total: number;
  earliestDate?: string; // 数据库中的最早日期（YYYY-MM-DD）
}

export interface StockInfo {
  code: string;
  name: string;
  market: string;
  type: string;
}
