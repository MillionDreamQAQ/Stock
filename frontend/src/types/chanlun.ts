/**
 * 缠论相关的类型定义
 */

/**
 * 处理后的K线数据（处理包含关系后）
 */
export interface ProcessedKLine {
  index: number; // 在原始K线数组中的索引
  timestamp: string; // 时间戳
  open: number; // 开盘价
  high: number; // 最高价
  low: number; // 最低价
  close: number; // 收盘价
  volume: number; // 成交量
}

/**
 * 分型类型
 */
export type FractalType = "top" | "bottom";

/**
 * 分型数据结构
 */
export interface Fractal {
  type: FractalType; // 类型：'top'顶分型或'bottom'底分型
  index: number; // 中间K线在原始数据中的索引
  price: number; // 分型价格（顶分型取高点，底分型取低点）
  leftIndex: number; // 左侧K线索引
  rightIndex: number; // 右侧K线索引
  timestamp: string; // 时间戳
}

/**
 * 笔的类型
 */
export type PenType = "up" | "down";

/**
 * 笔数据结构
 */
export interface Pen {
  type: PenType; // 类型：'up'向上笔或'down'向下笔
  startIndex: number; // 起始K线索引
  endIndex: number; // 结束K线索引
  startPrice: number; // 起始价格
  endPrice: number; // 结束价格
  length: number; // 笔长度（价格差的绝对值）
}

/**
 * 线段类型
 */
export type SegmentType = "up" | "down";

/**
 * 线段数据结构
 */
export interface Segment {
  type: SegmentType; // 类型：'up'向上线段或'down'向下线段
  startIndex: number; // 起始K线索引
  endIndex: number; // 结束K线索引
  startPrice: number; // 起始价格
  endPrice: number; // 结束价格
  pens: Pen[]; // 包含的笔列表
  length: number; // 线段长度（价格差的绝对值）
}

/**
 * 中枢类型
 */
export type CenterType = "up" | "down";

/**
 * 中枢数据结构
 */
export interface Center {
  startIndex: number; // 起始K线索引
  endIndex: number; // 结束K线索引
  high: number; // 中枢上沿
  low: number; // 中枢下沿
  mid: number; // 中枢中点
  height: number; // 中枢高度
  segments: Segment[]; // 构成中枢的线段列表
  type: CenterType; // 类型：'up'上涨中枢或'down'下跌中枢
  level: number; // 中枢级别
}

/**
 * 背驰类型
 */
export type DivergenceType = "top" | "bottom";

/**
 * 背驰数据结构
 */
export interface Divergence {
  type: DivergenceType; // 类型：'top'顶背驰或'bottom'底背驰
  startSegment: Segment; // 起始线段
  endSegment: Segment; // 结束线段
  strength: number; // 背驰强度：0-1之间
  confidence: number; // 置信度：0-1之间
}

/**
 * 买卖点类型
 */
export type SignalType = "buy" | "sell";

/**
 * 买卖点级别
 */
export type SignalLevel = 1 | 2 | 3;

/**
 * 买卖点数据结构
 */
export interface TradingSignal {
  type: SignalType; // 类型：'buy'买点或'sell'卖点
  level: SignalLevel; // 级别：1, 2, 3
  price: number; // 价格
  timestamp: string; // 时间戳
  reason: string; // 产生原因
  confidence: number; // 置信度：0-1之间
}
