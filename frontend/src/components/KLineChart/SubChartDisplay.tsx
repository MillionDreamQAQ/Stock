/**
 * 副图数据显示组件
 */

import React from "react";

interface VolumeDisplayProps {
  volume: string;
}

export const VolumeDisplay: React.FC<VolumeDisplayProps> = ({ volume }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "8px",
        left: "12px",
        padding: "4px 8px",
        fontSize: "12px",
        fontFamily: "monospace",
        pointerEvents: "none",
        zIndex: 10,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: "4px",
      }}
    >
      <span style={{ fontWeight: "600", color: "#666", marginRight: "6px" }}>
        成交量:
      </span>
      <span style={{ fontWeight: "600", color: "#2962FF" }}>{volume}</span>
    </div>
  );
};

interface MACDDisplayProps {
  dif: string;
  dea: string;
  macd: string;
}

export const MACDDisplay: React.FC<MACDDisplayProps> = ({ dif, dea, macd }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "8px",
        left: "12px",
        padding: "4px 8px",
        fontSize: "12px",
        fontFamily: "monospace",
        pointerEvents: "none",
        zIndex: 10,
        lineHeight: "1.6",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: "4px",
      }}
    >
      <div>
        <span style={{ fontWeight: "600", color: "#2196F3", marginRight: "6px" }}>
          DIF:
        </span>
        <span style={{ fontWeight: "600", color: "#2196F3" }}>{dif}</span>
      </div>
      <div>
        <span style={{ fontWeight: "600", color: "#FF6D00", marginRight: "6px" }}>
          DEA:
        </span>
        <span style={{ fontWeight: "600", color: "#FF6D00" }}>{dea}</span>
      </div>
      <div>
        <span style={{ fontWeight: "600", color: "#666", marginRight: "6px" }}>
          MACD:
        </span>
        <span
          style={{
            fontWeight: "600",
            color: macd.startsWith("-") ? "#26a69a" : "#ef5350",
          }}
        >
          {macd}
        </span>
      </div>
    </div>
  );
};
