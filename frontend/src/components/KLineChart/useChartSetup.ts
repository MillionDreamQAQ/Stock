/**
 * 图表初始化和设置的自定义 Hook
 */

import { useEffect, useRef } from "react";
import { createChart, type IChartApi } from "lightweight-charts";
import {
  mainChartConfig,
  subChartConfig,
  candlestickSeriesConfig,
  penSeriesConfig,
  macdHistogramConfig,
  difLineConfig,
  deaLineConfig,
} from "./chartConfig";
import { tickMarkFormatter } from "./utils";

interface UseChartSetupProps {
  onLoadMore?: () => void;
}

export const useChartSetup = ({ onLoadMore }: UseChartSetupProps) => {
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const volumeChartContainerRef = useRef<HTMLDivElement>(null);
  const macdChartContainerRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const volumeChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const macdLineRef = useRef<any>(null);
  const signalLineRef = useRef<any>(null);
  const histogramSeriesRef = useRef<any>(null);
  const penSeriesRef = useRef<any>(null);

  const hasTriggeredLoadRef = useRef(false);

  useEffect(() => {
    if (
      !mainChartContainerRef.current ||
      !volumeChartContainerRef.current ||
      !macdChartContainerRef.current
    )
      return;

    // 创建主图表（K线图）
    const mainChart = createChart(mainChartContainerRef.current, {
      ...mainChartConfig,
      width: mainChartContainerRef.current.clientWidth,
      timeScale: {
        ...mainChartConfig.timeScale,
        tickMarkFormatter,
      },
    });
    mainChartRef.current = mainChart;

    // 创建K线系列
    const candlestickSeries = mainChart.addCandlestickSeries(candlestickSeriesConfig);
    candlestickSeriesRef.current = candlestickSeries;

    // 创建笔的线段系列（在主图上）
    const penSeries = mainChart.addLineSeries(penSeriesConfig);
    penSeriesRef.current = penSeries;

    // 创建成交量副图
    const volumeChart = createChart(volumeChartContainerRef.current, {
      ...subChartConfig,
      width: volumeChartContainerRef.current.clientWidth,
    });
    volumeChartRef.current = volumeChart;

    // 添加成交量柱状图
    const volumeSeries = volumeChart.addHistogramSeries({
      priceFormat: {
        type: "volume",
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // 创建MACD副图
    const macdChart = createChart(macdChartContainerRef.current, {
      ...subChartConfig,
      width: macdChartContainerRef.current.clientWidth,
    });
    macdChartRef.current = macdChart;

    // 添加MACD柱状图
    const histogramSeries = macdChart.addHistogramSeries(macdHistogramConfig);
    histogramSeriesRef.current = histogramSeries;

    // 添加DIF线
    const difLine = macdChart.addLineSeries(difLineConfig);
    macdLineRef.current = difLine;

    // 添加DEA线
    const deaLine = macdChart.addLineSeries(deaLineConfig);
    signalLineRef.current = deaLine;

    // 同步三个图表的时间轴
    const mainTimeScale = mainChart.timeScale();
    const volumeTimeScale = volumeChart.timeScale();
    const macdTimeScale = macdChart.timeScale();

    const syncFromMain = () => {
      const mainRange = mainTimeScale.getVisibleLogicalRange();
      if (mainRange) {
        volumeTimeScale.setVisibleLogicalRange(mainRange);
        macdTimeScale.setVisibleLogicalRange(mainRange);
      }
    };

    const syncFromVolume = () => {
      const volumeRange = volumeTimeScale.getVisibleLogicalRange();
      if (volumeRange) {
        mainTimeScale.setVisibleLogicalRange(volumeRange);
        macdTimeScale.setVisibleLogicalRange(volumeRange);
      }
    };

    const syncFromMacd = () => {
      const macdRange = macdTimeScale.getVisibleLogicalRange();
      if (macdRange) {
        mainTimeScale.setVisibleLogicalRange(macdRange);
        volumeTimeScale.setVisibleLogicalRange(macdRange);
      }
    };

    mainTimeScale.subscribeVisibleLogicalRangeChange(syncFromMain);
    volumeTimeScale.subscribeVisibleLogicalRangeChange(syncFromVolume);
    macdTimeScale.subscribeVisibleLogicalRangeChange(syncFromMacd);

    // 监听时间轴变化，检测是否到达边界
    const handleVisibleLogicalRangeChange = () => {
      if (!onLoadMore) return;

      const logicalRange = mainTimeScale.getVisibleLogicalRange();
      if (!logicalRange) return;

      if (logicalRange.from < 20 && !hasTriggeredLoadRef.current) {
        hasTriggeredLoadRef.current = true;
        onLoadMore();

        setTimeout(() => {
          hasTriggeredLoadRef.current = false;
        }, 100);
      }
    };

    mainTimeScale.subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);

    // 响应式处理
    const handleResize = () => {
      if (mainChartContainerRef.current && mainChartRef.current) {
        mainChartRef.current.applyOptions({
          width: mainChartContainerRef.current.clientWidth,
        });
      }
      if (volumeChartContainerRef.current && volumeChartRef.current) {
        volumeChartRef.current.applyOptions({
          width: volumeChartContainerRef.current.clientWidth,
        });
      }
      if (macdChartContainerRef.current && macdChartRef.current) {
        macdChartRef.current.applyOptions({
          width: macdChartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      mainTimeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
      mainTimeScale.unsubscribeVisibleLogicalRangeChange(syncFromMain);
      volumeTimeScale.unsubscribeVisibleLogicalRangeChange(syncFromVolume);
      macdTimeScale.unsubscribeVisibleLogicalRangeChange(syncFromMacd);
      window.removeEventListener("resize", handleResize);
      mainChart.remove();
      volumeChart.remove();
      macdChart.remove();
    };
  }, [onLoadMore]);

  return {
    mainChartContainerRef,
    volumeChartContainerRef,
    macdChartContainerRef,
    mainChartRef,
    volumeChartRef,
    macdChartRef,
    candlestickSeriesRef,
    volumeSeriesRef,
    macdLineRef,
    signalLineRef,
    histogramSeriesRef,
    penSeriesRef,
  };
};
