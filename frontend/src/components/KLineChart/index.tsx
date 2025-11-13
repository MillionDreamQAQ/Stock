/**
 * K线图主组件 - 重构版本
 */

import { useState } from "react";
import type { KLineData } from "../../types/stock";
import { useChartSetup } from "./useChartSetup";
import { useChartData } from "./useChartData";
import { ChartOverlay } from "./ChartOverlay";
import { VolumeDisplay, MACDDisplay } from "./SubChartDisplay";

interface KLineChartProps {
  data: KLineData[];
  title?: string;
  onLoadMore?: () => void;
}

const KLineChart = ({ data, title, onLoadMore }: KLineChartProps) => {
  const [isChanMode, setIsChanMode] = useState<boolean>(false);

  // 图表初始化
  const {
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
  } = useChartSetup({ onLoadMore });

  // 数据更新和交互
  const { volumeDisplay, macdDisplay, klineDisplay } = useChartData({
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
  });

  return (
    <div style={{ width: "100%" }}>
      {/* 主图容器 */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <div ref={mainChartContainerRef} />

        <ChartOverlay
          title={title}
          isChanMode={isChanMode}
          onToggleChanMode={() => setIsChanMode(!isChanMode)}
          klineDisplay={klineDisplay}
        />
      </div>

      {/* 成交量副图容器 */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <div ref={volumeChartContainerRef} />
        <VolumeDisplay volume={volumeDisplay} />
      </div>

      {/* MACD副图容器 */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <div ref={macdChartContainerRef} />
        <MACDDisplay dif={macdDisplay.dif} dea={macdDisplay.dea} macd={macdDisplay.macd} />
      </div>
    </div>
  );
};

export default KLineChart;
