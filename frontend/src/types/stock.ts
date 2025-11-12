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
}

export interface StockInfo {
  code: string;
  name: string;
  market: string;
  type: string;
}
