/**
 * K线图相关工具函数
 */

import type { KLineData } from "../../types/stock";
import type { CandlestickData, HistogramData } from "lightweight-charts";

/**
 * 格式化成交量显示
 */
export const formatVolume = (volume: number): string => {
  if (volume >= 100000000) {
    return (volume / 100000000).toFixed(2) + "亿";
  } else if (volume >= 10000) {
    return (volume / 10000).toFixed(2) + "万";
  } else {
    return volume.toFixed(0);
  }
};

/**
 * 格式化价格显示
 */
export const formatPrice = (price: number): string => {
  return price.toFixed(2);
};

/**
 * 格式化百分比显示
 */
export const formatPercent = (percent: number): string => {
  return percent.toFixed(2) + "%";
};

/**
 * 转换K线数据为图表数据（标准模式）
 */
export const convertToStandardChartData = (
  data: KLineData[]
): CandlestickData[] => {
  return data.map((item) => ({
    time: item.date as any,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
  }));
};

/**
 * 转换K线数据为图表数据（缠论模式）
 */
export const convertToChanChartData = (
  data: KLineData[]
): CandlestickData[] => {
  return data.map((item) => ({
    time: item.date as any,
    open: item.low,
    high: item.high,
    low: item.low,
    close: item.high,
  }));
};

/**
 * 转换成交量数据
 */
export const convertToVolumeData = (data: KLineData[]): HistogramData[] => {
  return data.map((item, index) => ({
    time: item.date as any,
    value: item.volume,
    color:
      index === 0
        ? "#26a69a"
        : item.close >= data[index - 1]?.close
        ? "#ef5350"
        : "#26a69a",
  }));
};

/**
 * 时间戳格式化函数
 */
export const tickMarkFormatter = (time: number): string => {
  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
