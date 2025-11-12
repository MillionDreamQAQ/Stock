import axios from 'axios';
import type { StockData, StockInfo } from '../types/stock';

const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export interface GetIndexParams {
  days?: number;
  startDate?: string;
  endDate?: string;
}

export const stockApi = {
  // 获取上证指数数据
  getShangHaiIndex: async (params?: GetIndexParams): Promise<StockData> => {
    const queryParams = new URLSearchParams();

    if (params?.startDate) {
      queryParams.append('start_date', params.startDate);
    }
    if (params?.endDate) {
      queryParams.append('end_date', params.endDate);
    }
    if (params?.days) {
      queryParams.append('days', params.days.toString());
    }

    const url = `/api/stock/sh-index${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get<StockData>(url);
    return response.data;
  },

  // 获取任意股票数据
  getStockData: async (code: string, params?: GetIndexParams): Promise<StockData> => {
    const queryParams = new URLSearchParams();

    if (params?.startDate) {
      queryParams.append('start_date', params.startDate);
    }
    if (params?.endDate) {
      queryParams.append('end_date', params.endDate);
    }
    if (params?.days) {
      queryParams.append('days', params.days.toString());
    }

    const url = `/api/stock/${code}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get<StockData>(url);
    return response.data;
  },

  // 搜索股票
  searchStocks: async (keyword: string): Promise<StockInfo[]> => {
    const response = await apiClient.get<{ results: StockInfo[] }>(`/api/stocks/search?keyword=${keyword}`);
    return response.data.results;
  },

  // 获取股票列表
  getStockList: async (type?: string): Promise<StockInfo[]> => {
    const url = type ? `/api/stocks/list?type=${type}` : '/api/stocks/list';
    const response = await apiClient.get<{ stocks: StockInfo[] }>(url);
    return response.data.stocks;
  },
};
