/**
 * 图表覆盖层组件 - 包含标题、按钮、数据显示等
 */

import React from "react";

interface ChartOverlayProps {
  title?: string;
  isChanMode: boolean;
  onToggleChanMode: () => void;
  klineDisplay: {
    open: string;
    high: string;
    low: string;
    close: string;
    change: string;
    changePercent: string;
  };
}

export const ChartOverlay: React.FC<ChartOverlayProps> = ({
  title,
  isChanMode,
  onToggleChanMode,
  klineDisplay,
}) => {
  return (
    <>
      {/* 股票名称 - 覆盖在图表顶部中间 */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "6px 20px",
            fontSize: "18px",
            fontWeight: "700",
            color: "#333",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "4px",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {title}
        </div>
      )}

      {/* 缠论K线模式切换按钮 - 右上角 */}
      <button
        onClick={onToggleChanMode}
        style={{
          position: "absolute",
          top: "4px",
          right: "96px",
          padding: "6px 12px",
          fontSize: "14px",
          fontWeight: "600",
          color: isChanMode ? "#fff" : "#333",
          backgroundColor: isChanMode ? "#2962FF" : "rgba(255, 255, 255, 0.9)",
          border: isChanMode ? "none" : "1px solid #ccc",
          borderRadius: "4px",
          cursor: "pointer",
          zIndex: 10,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (!isChanMode) {
            e.currentTarget.style.backgroundColor = "rgba(41, 98, 255, 0.1)";
            e.currentTarget.style.borderColor = "#2962FF";
          }
        }}
        onMouseLeave={(e) => {
          if (!isChanMode) {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
            e.currentTarget.style.borderColor = "#ccc";
          }
        }}
      >
        {isChanMode ? "标准K线" : "缠论K线"}
      </button>

      {/* K线数据显示 - 覆盖在图表左上角，纵向排列 */}
      <div
        style={{
          position: "absolute",
          top: "8px",
          left: "12px",
          padding: "8px 12px",
          fontSize: "14px",
          fontFamily: "monospace",
          pointerEvents: "none",
          zIndex: 10,
          lineHeight: "1.7",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: "4px",
        }}
      >
        <div>
          <span style={{ fontWeight: "600", color: "#666", marginRight: "6px" }}>
            开盘价:
          </span>
          <span style={{ fontWeight: "600", color: "#ff00f2ff" }}>
            {klineDisplay.open}
          </span>
        </div>
        <div>
          <span style={{ fontWeight: "600", color: "#666", marginRight: "6px" }}>
            最高价:
          </span>
          <span style={{ fontWeight: "600", color: "#ef5350" }}>
            {klineDisplay.high}
          </span>
        </div>
        <div>
          <span style={{ fontWeight: "600", color: "#666", marginRight: "6px" }}>
            最低价:
          </span>
          <span style={{ fontWeight: "600", color: "#26a69a" }}>
            {klineDisplay.low}
          </span>
        </div>
        <div>
          <span style={{ fontWeight: "600", color: "#666", marginRight: "6px" }}>
            收盘价:
          </span>
          <span style={{ fontWeight: "600", color: "#2962FF" }}>
            {klineDisplay.close}
          </span>
        </div>
        <div>
          <span style={{ fontWeight: "600", color: "#666", marginRight: "6px" }}>
            涨跌额:
          </span>
          <span
            style={{
              fontWeight: "600",
              color: klineDisplay.change.startsWith("-") ? "#26a69a" : "#ef5350",
            }}
          >
            {klineDisplay.change}
          </span>
        </div>
        <div>
          <span style={{ fontWeight: "600", color: "#666", marginRight: "6px" }}>
            涨跌幅:
          </span>
          <span
            style={{
              fontWeight: "600",
              color: klineDisplay.changePercent.startsWith("-")
                ? "#26a69a"
                : "#ef5350",
            }}
          >
            {klineDisplay.changePercent}
          </span>
        </div>
      </div>
    </>
  );
};
