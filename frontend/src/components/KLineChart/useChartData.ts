/**
 * 图表数据更新和交互的自定义 Hook
 */

import { useEffect, useState } from "react";
import type { KLineData } from "../../types/stock";
import type {
  IChartApi,
  SeriesMarker,
  Time,
  LineData,
  HistogramData,
} from "lightweight-charts";
import { calculateMACDFromKLineData } from "../../utils/indicators";
import { analyzeChanLun } from "../../utils/chanlun";
import {
  convertToStandardChartData,
  convertToChanChartData,
  convertToVolumeData,
  formatVolume,
  formatPrice,
  formatPercent,
} from "./utils";

interface UseChartDataProps {
  data: KLineData[];
  isChanMode: boolean;
  mainChartRef: React.RefObject<IChartApi | null>;
  volumeChartRef: React.RefObject<IChartApi | null>;
  macdChartRef: React.RefObject<IChartApi | null>;
  candlestickSeriesRef: React.RefObject<any>;
  volumeSeriesRef: React.RefObject<any>;
  macdLineRef: React.RefObject<any>;
  signalLineRef: React.RefObject<any>;
  histogramSeriesRef: React.RefObject<any>;
  penSeriesRef: React.RefObject<any>;
}

export const useChartData = ({
  data,
  isChanMode,
  mainChartRef,
  volumeChartRef,
  macdChartRef,
  candlestickSeriesRef,
  volumeSeriesRef,
  macdLineRef,
  signalLineRef,
  histogramSeriesRef,
  penSeriesRef,
}: UseChartDataProps) => {
  const [volumeDisplay, setVolumeDisplay] = useState<string>("--");
  const [macdDisplay, setMacdDisplay] = useState<{
    dif: string;
    dea: string;
    macd: string;
  }>({
    dif: "--",
    dea: "--",
    macd: "--",
  });
  const [klineDisplay, setKlineDisplay] = useState<{
    open: string;
    high: string;
    low: string;
    close: string;
    change: string;
    changePercent: string;
  }>({
    open: "--",
    high: "--",
    low: "--",
    close: "--",
    change: "--",
    changePercent: "--",
  });

  useEffect(() => {
    if (
      !candlestickSeriesRef.current ||
      !volumeSeriesRef.current ||
      !data ||
      data.length === 0
    )
      return;
    if (
      !macdLineRef.current ||
      !signalLineRef.current ||
      !histogramSeriesRef.current
    )
      return;

    const mainChart = mainChartRef.current;
    const volumeChart = volumeChartRef.current;
    const macdChart = macdChartRef.current;
    if (!mainChart || !volumeChart || !macdChart) return;

    // 保存当前的可见范围
    const timeScale = mainChart.timeScale();
    const currentRange = timeScale.getVisibleLogicalRange();

    // 转换K线数据格式
    const chartData = isChanMode
      ? convertToChanChartData(data)
      : convertToStandardChartData(data);

    candlestickSeriesRef.current.setData(chartData);

    // 进行缠论分析：识别分型和笔
    const { fractals, pens } = analyzeChanLun(data);

    // 添加分型标记
    const markers: SeriesMarker<Time>[] = fractals.map((fractal) => ({
      time: fractal.timestamp as Time,
      position: fractal.type === "top" ? "aboveBar" : "belowBar",
      color: fractal.type === "top" ? "#ef5350" : "#26a69a",
      shape: fractal.type === "top" ? "arrowDown" : "arrowUp",
      text: fractal.type === "top" ? "顶" : "底",
    }));
    candlestickSeriesRef.current.setMarkers(markers);

    // 绘制笔：将笔的端点连接成线段
    if (penSeriesRef.current && pens.length > 0) {
      const penLineData: LineData[] = [];
      const timeSet = new Set<string>();

      pens.forEach((pen) => {
        const startKline = data[pen.startIndex];
        if (startKline && !timeSet.has(startKline.date)) {
          penLineData.push({
            time: startKline.date as Time,
            value: pen.startPrice,
          });
          timeSet.add(startKline.date);
        }

        const endKline = data[pen.endIndex];
        if (endKline && !timeSet.has(endKline.date)) {
          penLineData.push({
            time: endKline.date as Time,
            value: pen.endPrice,
          });
          timeSet.add(endKline.date);
        }
      });

      penLineData.sort((a, b) => {
        const timeA = typeof a.time === "string" ? a.time : String(a.time);
        const timeB = typeof b.time === "string" ? b.time : String(b.time);
        return timeA.localeCompare(timeB);
      });

      penSeriesRef.current.setData(penLineData);
    }

    // 转换成交量数据格式
    const volumeData = convertToVolumeData(data);
    volumeSeriesRef.current.setData(volumeData);

    // 计算MACD数据
    const macdData = calculateMACDFromKLineData(data);

    const difLineData: LineData[] = macdData.map((item) => ({
      time: item.time as any,
      value: item.dif,
    }));

    const deaLineData: LineData[] = macdData.map((item) => ({
      time: item.time as any,
      value: item.dea,
    }));

    const macdHistogramData: HistogramData[] = macdData.map((item) => ({
      time: item.time as any,
      value: item.macd,
      color: item.macd >= 0 ? "#ef5350" : "#26a69a",
    }));

    macdLineRef.current.setData(difLineData);
    signalLineRef.current.setData(deaLineData);
    histogramSeriesRef.current.setData(macdHistogramData);

    // 设置十字线移动监听
    const handleMainCrosshairMove = (param: any) => {
      if (param.time) {
        const volumeData = volumeSeriesRef.current.dataByIndex(param.logical);
        const macdHistogramData = histogramSeriesRef.current.dataByIndex(
          param.logical
        );

        if (volumeData) {
          volumeChart.setCrosshairPosition(
            volumeData.value,
            param.time,
            volumeSeriesRef.current
          );
        }
        if (macdHistogramData) {
          macdChart.setCrosshairPosition(
            macdHistogramData.value,
            param.time,
            histogramSeriesRef.current
          );
        }
      } else {
        volumeChart.clearCrosshairPosition();
        macdChart.clearCrosshairPosition();
      }

      if (!param.time || !param.point) {
        const lastIndex = macdData.length - 1;
        if (lastIndex >= 0) {
          setMacdDisplay({
            dif: macdData[lastIndex].dif.toFixed(4),
            dea: macdData[lastIndex].dea.toFixed(4),
            macd: macdData[lastIndex].macd.toFixed(4),
          });
        }

        const lastVolumeIndex = data.length - 1;
        if (lastVolumeIndex >= 0) {
          setVolumeDisplay(formatVolume(data[lastVolumeIndex].volume));
        }

        if (data.length >= 2) {
          const lastData = data[data.length - 1];
          const prevData = data[data.length - 2];
          const change = lastData.close - prevData.close;
          const changePercent = (change / prevData.close) * 100;

          setKlineDisplay({
            open: formatPrice(lastData.open),
            high: formatPrice(lastData.high),
            low: formatPrice(lastData.low),
            close: formatPrice(lastData.close),
            change: (change >= 0 ? "+" : "") + formatPrice(change),
            changePercent:
              (change >= 0 ? "+" : "") + formatPercent(changePercent),
          });
        }
      } else {
        const klineData = candlestickSeriesRef.current.dataByIndex(
          param.logical
        );
        if (klineData) {
          let open, close;
          if (isChanMode) {
            open = klineData.low;
            close = klineData.high;
          } else {
            open = klineData.open;
            close = klineData.close;
          }

          const change = close - open;
          const changePercent = (change / open) * 100;

          setKlineDisplay({
            open: formatPrice(open),
            high: formatPrice(klineData.high),
            low: formatPrice(klineData.low),
            close: formatPrice(close),
            change: (change >= 0 ? "+" : "") + formatPrice(change),
            changePercent:
              (change >= 0 ? "+" : "") + formatPercent(changePercent),
          });
        }

        const macdData = histogramSeriesRef.current.dataByIndex(param.logical);
        if (macdData) {
          const difData = macdLineRef.current.dataByIndex(param.logical);
          const deaData = signalLineRef.current.dataByIndex(param.logical);

          setMacdDisplay({
            dif: difData?.value?.toFixed(4) || "--",
            dea: deaData?.value?.toFixed(4) || "--",
            macd: macdData.value.toFixed(4),
          });
        }

        const volumeDataPoint = volumeSeriesRef.current.dataByIndex(
          param.logical
        );
        if (volumeDataPoint) {
          setVolumeDisplay(formatVolume(volumeDataPoint.value));
        }
      }
    };

    const handleVolumeCrosshairMove = (param: any) => {
      if (param.time) {
        const klineData = candlestickSeriesRef.current.dataByIndex(
          param.logical
        );
        const macdHistogramData = histogramSeriesRef.current.dataByIndex(
          param.logical
        );

        if (klineData) {
          mainChart.setCrosshairPosition(
            klineData.close,
            param.time,
            candlestickSeriesRef.current
          );
        }
        if (macdHistogramData) {
          macdChart.setCrosshairPosition(
            macdHistogramData.value,
            param.time,
            histogramSeriesRef.current
          );
        }
      } else {
        mainChart.clearCrosshairPosition();
        macdChart.clearCrosshairPosition();
      }
    };

    const handleMacdCrosshairMove = (param: any) => {
      if (param.time) {
        const klineData = candlestickSeriesRef.current.dataByIndex(
          param.logical
        );
        const volumeData = volumeSeriesRef.current.dataByIndex(param.logical);

        if (klineData) {
          mainChart.setCrosshairPosition(
            klineData.close,
            param.time,
            candlestickSeriesRef.current
          );
        }
        if (volumeData) {
          volumeChart.setCrosshairPosition(
            volumeData.value,
            param.time,
            volumeSeriesRef.current
          );
        }
      } else {
        mainChart.clearCrosshairPosition();
        volumeChart.clearCrosshairPosition();
      }
    };

    mainChart.subscribeCrosshairMove(handleMainCrosshairMove);
    volumeChart.subscribeCrosshairMove(handleVolumeCrosshairMove);
    macdChart.subscribeCrosshairMove(handleMacdCrosshairMove);

    // 恢复可见范围
    if (currentRange) {
      timeScale.setVisibleLogicalRange(currentRange);
    } else {
      timeScale.fitContent();
    }

    return () => {
      mainChart.unsubscribeCrosshairMove(handleMainCrosshairMove);
      volumeChart.unsubscribeCrosshairMove(handleVolumeCrosshairMove);
      macdChart.unsubscribeCrosshairMove(handleMacdCrosshairMove);
    };
  }, [data, isChanMode]);

  return {
    volumeDisplay,
    macdDisplay,
    klineDisplay,
  };
};
