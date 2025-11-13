/**
 * 图表配置
 */

import type { DeepPartial, ChartOptions } from "lightweight-charts";

/**
 * 主图表配置
 */
export const mainChartConfig: DeepPartial<ChartOptions> = {
  width: 0, // 将在运行时设置
  height: 450,
  layout: {
    background: { color: "#ffffff" },
    textColor: "#333",
  },
  grid: {
    vertLines: { color: "#f0f0f0" },
    horzLines: { color: "#f0f0f0" },
  },
  timeScale: {
    borderColor: "#ccc",
    timeVisible: true,
  },
  rightPriceScale: {
    borderColor: "#ccc",
    minimumWidth: 80,
  },
  localization: {
    dateFormat: "yyyy-MM-dd",
  },
};

/**
 * 副图表配置（成交量、MACD）
 */
export const subChartConfig: DeepPartial<ChartOptions> = {
  width: 0, // 将在运行时设置
  height: 150,
  layout: {
    background: { color: "#ffffff" },
    textColor: "#333",
  },
  grid: {
    vertLines: { color: "#f0f0f0" },
    horzLines: { color: "#f0f0f0" },
  },
  timeScale: {
    borderColor: "#ccc",
    visible: false,
  },
  rightPriceScale: {
    borderColor: "#ccc",
    minimumWidth: 80,
  },
};

/**
 * K线系列配置
 */
export const candlestickSeriesConfig = {
  upColor: "#ef5350",
  downColor: "#26a69a",
  borderVisible: false,
  wickUpColor: "#ef5350",
  wickDownColor: "#26a69a",
};

/**
 * 笔的线段系列配置
 */
export const penSeriesConfig = {
  color: "#2962FF",
  lineWidth: 2,
  priceLineVisible: false,
  lastValueVisible: false,
  crosshairMarkerVisible: false,
};

/**
 * MACD 柱状图配置
 */
export const macdHistogramConfig = {
  color: "#26a69a",
  priceFormat: {
    type: "price" as const,
    precision: 4,
    minMove: 0.0001,
  },
};

/**
 * DIF 线配置
 */
export const difLineConfig = {
  color: "#2196F3",
  lineWidth: 2,
  title: "DIF",
};

/**
 * DEA 线配置
 */
export const deaLineConfig = {
  color: "#FF6D00",
  lineWidth: 2,
  title: "DEA",
};
