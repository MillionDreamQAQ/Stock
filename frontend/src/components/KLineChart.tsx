import { useEffect, useRef, useState } from "react";
import {
  createChart,
  type IChartApi,
  type CandlestickData,
  type LineData,
  type HistogramData,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { KLineData } from "../types/stock";
import { calculateMACDFromKLineData } from "../utils/indicators";
import { analyzeChanLun } from "../utils/chanlun";

interface KLineChartProps {
  data: KLineData[];
  title?: string;
  onLoadMore?: () => void;
}

// 格式化成交量显示
const formatVolume = (volume: number): string => {
  if (volume >= 100000000) {
    return (volume / 100000000).toFixed(2) + "亿";
  } else if (volume >= 10000) {
    return (volume / 10000).toFixed(2) + "万";
  } else {
    return volume.toFixed(0);
  }
};

const KLineChart = ({ data, title, onLoadMore }: KLineChartProps) => {
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
  const penSeriesRef = useRef<any>(null); // 笔的线段系列
  const isFirstLoadRef = useRef(true);
  const previousDataLengthRef = useRef(0);
  const hasTriggeredLoadRef = useRef(false);

  // 成交量数据显示状态
  const [volumeDisplay, setVolumeDisplay] = useState<string>("--");

  // MACD 数据显示状态
  const [macdDisplay, setMacdDisplay] = useState<{
    dif: string;
    dea: string;
    macd: string;
  }>({
    dif: "--",
    dea: "--",
    macd: "--",
  });

  useEffect(() => {
    if (
      !mainChartContainerRef.current ||
      !volumeChartContainerRef.current ||
      !macdChartContainerRef.current
    )
      return;

    // 创建主图表（K线图）
    const mainChart = createChart(mainChartContainerRef.current, {
      width: mainChartContainerRef.current.clientWidth,
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
        tickMarkFormatter: (time: number) => {
          const date = new Date(time);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        },
      },
      rightPriceScale: {
        borderColor: "#ccc",
        minimumWidth: 80,
      },
      localization: {
        dateFormat: "yyyy-MM-dd",
      },
    });

    mainChartRef.current = mainChart;

    // 创建K线系列
    const candlestickSeries = mainChart.addCandlestickSeries({
      upColor: "#ef5350",
      downColor: "#26a69a",
      borderVisible: false,
      wickUpColor: "#ef5350",
      wickDownColor: "#26a69a",
    });

    candlestickSeriesRef.current = candlestickSeries;

    // 创建笔的线段系列（在主图上）
    const penSeries = mainChart.addLineSeries({
      color: "#2962FF",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    penSeriesRef.current = penSeries;

    // 创建成交量副图
    const volumeChart = createChart(volumeChartContainerRef.current, {
      width: volumeChartContainerRef.current.clientWidth,
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
        timeVisible: false,
        visible: false,
      },
      rightPriceScale: {
        borderColor: "#ccc",
        minimumWidth: 80,
      },
    });

    volumeChartRef.current = volumeChart;

    // 添加成交量柱状图
    const volumeSeries = volumeChart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });
    volumeSeriesRef.current = volumeSeries;

    // 创建MACD副图
    const macdChart = createChart(macdChartContainerRef.current, {
      width: macdChartContainerRef.current.clientWidth,
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
        timeVisible: false,
        visible: false,
      },
      rightPriceScale: {
        borderColor: "#ccc",
        minimumWidth: 80,
      },
    });

    macdChartRef.current = macdChart;

    // 添加MACD柱状图（DIF - DEA）
    const histogramSeries = macdChart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: {
        type: "price",
        precision: 4,
        minMove: 0.0001,
      },
    });
    histogramSeriesRef.current = histogramSeries;

    // 添加DIF线（快线）
    const difLine = macdChart.addLineSeries({
      color: "#2196F3",
      lineWidth: 2,
      title: "DIF",
    });
    macdLineRef.current = difLine;

    // 添加DEA线（信号线）
    const deaLine = macdChart.addLineSeries({
      color: "#FF6D00",
      lineWidth: 2,
      title: "DEA",
    });
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
    const timeScale = mainChart.timeScale();

    const handleVisibleLogicalRangeChange = () => {
      if (!onLoadMore) return;

      const logicalRange = timeScale.getVisibleLogicalRange();
      if (!logicalRange) return;

      // 当用户拖动到最左边（历史数据边界）时触发加载
      // logicalRange.from < 5 表示接近数据的最左端
      if (logicalRange.from < 20 && !hasTriggeredLoadRef.current) {
        hasTriggeredLoadRef.current = true;
        onLoadMore();

        setTimeout(() => {
          hasTriggeredLoadRef.current = false;
        }, 100);
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(
      handleVisibleLogicalRangeChange
    );

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
      timeScale.unsubscribeVisibleLogicalRangeChange(
        handleVisibleLogicalRangeChange
      );
      mainTimeScale.unsubscribeVisibleLogicalRangeChange(syncFromMain);
      volumeTimeScale.unsubscribeVisibleLogicalRangeChange(syncFromVolume);
      macdTimeScale.unsubscribeVisibleLogicalRangeChange(syncFromMacd);
      window.removeEventListener("resize", handleResize);
      mainChart.remove();
      volumeChart.remove();
      macdChart.remove();
    };
  }, [onLoadMore]);

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
    const chartData: CandlestickData[] = data.map((item) => ({
      time: item.date as any,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

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
      const timeSet = new Set<string>(); // 用于去重

      pens.forEach((pen) => {
        // 添加笔的起点
        const startKline = data[pen.startIndex];
        if (startKline && !timeSet.has(startKline.date)) {
          penLineData.push({
            time: startKline.date as Time,
            value: pen.startPrice,
          });
          timeSet.add(startKline.date);
        }

        // 添加笔的终点
        const endKline = data[pen.endIndex];
        if (endKline && !timeSet.has(endKline.date)) {
          penLineData.push({
            time: endKline.date as Time,
            value: pen.endPrice,
          });
          timeSet.add(endKline.date);
        }
      });

      // 按时间排序（确保升序）
      penLineData.sort((a, b) => {
        const timeA = typeof a.time === "string" ? a.time : String(a.time);
        const timeB = typeof b.time === "string" ? b.time : String(b.time);
        return timeA.localeCompare(timeB);
      });

      penSeriesRef.current.setData(penLineData);
    }

    // 转换成交量数据格式
    const volumeData: HistogramData[] = data.map((item, index) => ({
      time: item.date as any,
      value: item.volume,
      // 根据涨跌着色：涨红跌绿
      color:
        index === 0
          ? "#26a69a"
          : item.close >= data[index - 1]?.close
          ? "#ef5350"
          : "#26a69a",
    }));

    volumeSeriesRef.current.setData(volumeData);

    // 计算MACD数据
    const macdData = calculateMACDFromKLineData(data);

    // 转换数据格式
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
      color: item.macd >= 0 ? "#ef5350" : "#26a69a", // 正数红色，负数绿色
    }));

    // 设置MACD数据
    macdLineRef.current.setData(difLineData);
    signalLineRef.current.setData(deaLineData);
    histogramSeriesRef.current.setData(macdHistogramData);

    // 设置十字线移动监听和同步
    const handleMainCrosshairMove = (param: any) => {
      // 同步十字线到副图
      if (param.time) {
        // 获取成交量和MACD对应时间的数据
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
        // 鼠标离开图表，显示最新数据
        const lastIndex = macdData.length - 1;
        if (lastIndex >= 0) {
          setMacdDisplay({
            dif: macdData[lastIndex].dif.toFixed(4),
            dea: macdData[lastIndex].dea.toFixed(4),
            macd: macdData[lastIndex].macd.toFixed(4),
          });
          setVolumeDisplay(formatVolume(data[lastIndex].volume));
        }
        return;
      }

      // 找到对应时间的MACD数据和成交量数据
      const timeStr = param.time as string;
      const macdPoint = macdData.find((d) => d.time === timeStr);
      const volumePoint = data.find((d) => d.date === timeStr);

      if (macdPoint) {
        setMacdDisplay({
          dif: macdPoint.dif.toFixed(4),
          dea: macdPoint.dea.toFixed(4),
          macd: macdPoint.macd.toFixed(4),
        });
      }

      if (volumePoint) {
        setVolumeDisplay(formatVolume(volumePoint.volume));
      }
    };

    const handleVolumeCrosshairMove = (param: any) => {
      if (param.time) {
        const candleData = candlestickSeriesRef.current.dataByIndex(
          param.logical
        );
        const macdHistogramData = histogramSeriesRef.current.dataByIndex(
          param.logical
        );

        if (candleData) {
          mainChart.setCrosshairPosition(
            candleData.close,
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

        // 更新数据显示
        const timeStr = param.time as string;
        const macdPoint = macdData.find((d) => d.time === timeStr);
        const volumePoint = data.find((d) => d.date === timeStr);

        if (macdPoint) {
          setMacdDisplay({
            dif: macdPoint.dif.toFixed(4),
            dea: macdPoint.dea.toFixed(4),
            macd: macdPoint.macd.toFixed(4),
          });
        }

        if (volumePoint) {
          setVolumeDisplay(formatVolume(volumePoint.volume));
        }
      } else {
        mainChart.clearCrosshairPosition();
        macdChart.clearCrosshairPosition();

        // 显示最新数据
        const lastIndex = macdData.length - 1;
        if (lastIndex >= 0) {
          setMacdDisplay({
            dif: macdData[lastIndex].dif.toFixed(4),
            dea: macdData[lastIndex].dea.toFixed(4),
            macd: macdData[lastIndex].macd.toFixed(4),
          });
          setVolumeDisplay(formatVolume(data[lastIndex].volume));
        }
      }
    };

    const handleMacdCrosshairMove = (param: any) => {
      if (param.time) {
        const candleData = candlestickSeriesRef.current.dataByIndex(
          param.logical
        );
        const volumeData = volumeSeriesRef.current.dataByIndex(param.logical);

        if (candleData) {
          mainChart.setCrosshairPosition(
            candleData.close,
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

        // 更新数据显示
        const timeStr = param.time as string;
        const macdPoint = macdData.find((d) => d.time === timeStr);
        const volumePoint = data.find((d) => d.date === timeStr);

        if (macdPoint) {
          setMacdDisplay({
            dif: macdPoint.dif.toFixed(4),
            dea: macdPoint.dea.toFixed(4),
            macd: macdPoint.macd.toFixed(4),
          });
        }

        if (volumePoint) {
          setVolumeDisplay(formatVolume(volumePoint.volume));
        }
      } else {
        mainChart.clearCrosshairPosition();
        volumeChart.clearCrosshairPosition();

        // 显示最新数据
        const lastIndex = macdData.length - 1;
        if (lastIndex >= 0) {
          setMacdDisplay({
            dif: macdData[lastIndex].dif.toFixed(4),
            dea: macdData[lastIndex].dea.toFixed(4),
            macd: macdData[lastIndex].macd.toFixed(4),
          });
          setVolumeDisplay(formatVolume(data[lastIndex].volume));
        }
      }
    };

    mainChart.subscribeCrosshairMove(handleMainCrosshairMove);
    volumeChart.subscribeCrosshairMove(handleVolumeCrosshairMove);
    macdChart.subscribeCrosshairMove(handleMacdCrosshairMove);

    // 只在首次加载时自动调整视图
    if (isFirstLoadRef.current) {
      timeScale.fitContent();

      // 等待主图渲染完成后同步副图
      setTimeout(() => {
        const mainRange = timeScale.getVisibleLogicalRange();
        if (mainRange && macdChart) {
          macdChart.timeScale().setVisibleLogicalRange(mainRange);
        }
      }, 0);

      isFirstLoadRef.current = false;
    } else if (currentRange && data.length > previousDataLengthRef.current) {
      // 如果是加载了更多数据（向前加载历史数据）
      // 保持当前的可见范围不变
      const dataLengthDiff = data.length - previousDataLengthRef.current;

      // 调整可见范围，补偿新增的数据
      const newRange = {
        from: currentRange.from + dataLengthDiff,
        to: currentRange.to + dataLengthDiff,
      };

      timeScale.setVisibleLogicalRange(newRange);
      macdChart.timeScale().setVisibleLogicalRange(newRange);
    }

    previousDataLengthRef.current = data.length;

    // 初始化显示最新数据
    const lastIndex = macdData.length - 1;
    if (lastIndex >= 0) {
      setMacdDisplay({
        dif: macdData[lastIndex].dif.toFixed(4),
        dea: macdData[lastIndex].dea.toFixed(4),
        macd: macdData[lastIndex].macd.toFixed(4),
      });
    }

    // 初始化成交量显示
    const lastVolumeIndex = data.length - 1;
    if (lastVolumeIndex >= 0) {
      setVolumeDisplay(formatVolume(data[lastVolumeIndex].volume));
    }

    // 清理函数：取消十字线监听，防止内存泄漏
    return () => {
      mainChart.unsubscribeCrosshairMove(handleMainCrosshairMove);
      volumeChart.unsubscribeCrosshairMove(handleVolumeCrosshairMove);
      macdChart.unsubscribeCrosshairMove(handleMacdCrosshairMove);
    };
  }, [data]);

  return (
    <div style={{ width: "100%" }}>
      {title && (
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>{title}</h2>
      )}
      <div ref={mainChartContainerRef} style={{ marginBottom: "10px" }} />

      {/* 成交量副图容器 */}
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <div ref={volumeChartContainerRef} />
        {/* 成交量数据显示 - 覆盖在图表左上角 */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "12px",
            padding: "6px 12px",
            fontSize: "13px",
            fontFamily: "monospace",
            fontWeight: "600",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <span style={{ color: "#ff0000ff" }}>
            VOL: <span style={{ fontWeight: "700" }}>{volumeDisplay}</span>
          </span>
        </div>
      </div>

      {/* MACD副图容器 */}
      <div style={{ position: "relative" }}>
        <div ref={macdChartContainerRef} />
        {/* MACD 指标数据显示 - 覆盖在图表左上角 */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "12px",
            padding: "6px 12px",
            fontSize: "13px",
            fontFamily: "monospace",
            fontWeight: "600",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <span style={{ marginRight: "16px", color: "#2196F3" }}>
            DIF: <span style={{ fontWeight: "700" }}>{macdDisplay.dif}</span>
          </span>
          <span style={{ marginRight: "16px", color: "#FF6D00" }}>
            DEA: <span style={{ fontWeight: "700" }}>{macdDisplay.dea}</span>
          </span>
          <span
            style={{
              color: parseFloat(macdDisplay.macd) >= 0 ? "#ef5350" : "#26a69a",
            }}
          >
            MACD: <span style={{ fontWeight: "700" }}>{macdDisplay.macd}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default KLineChart;
