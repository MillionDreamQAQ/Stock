/**
 * 缠论算法实现
 */

import type { KLineData } from "../types/stock";
import type {
  ProcessedKLine,
  Fractal,
  FractalType,
  Pen,
} from "../types/chanlun";

/**
 * 处理K线包含关系
 *
 * 包含关系定义：当一根K线的高低点完全包含在另一根K线的高低点范围内时，称为包含关系
 *
 * 处理规则：
 * - 向上走势：取两根K线的高点中的较高值和低点中的较高值
 * - 向下走势：取两根K线的高点中的较低值和低点中的较低值
 *
 * @param klines 原始K线数据
 * @returns 处理后的K线数据
 */
export function processKLineContainment(klines: KLineData[]): ProcessedKLine[] {
  if (klines.length === 0) return [];

  const result: ProcessedKLine[] = [];

  // 第一根K线直接添加
  result.push({
    index: 0,
    timestamp: klines[0].date,
    open: klines[0].open,
    high: klines[0].high,
    low: klines[0].low,
    close: klines[0].close,
    volume: klines[0].volume,
  });

  for (let i = 1; i < klines.length; i++) {
    const current = klines[i];
    const previous = result[result.length - 1];

    // 检查是否存在包含关系
    const isContained =
      (current.high <= previous.high && current.low >= previous.low) || // 当前K线被包含
      (current.high >= previous.high && current.low <= previous.low); // 当前K线包含前一根

    if (isContained) {
      // 判断走势方向：如果有至少两根K线，则通过比较来判断方向
      let isUpTrend = true;
      if (result.length >= 2) {
        const beforePrevious = result[result.length - 2];
        isUpTrend = previous.high >= beforePrevious.high;
      } else {
        // 如果只有一根K线，通过当前K线的收盘价和开盘价判断
        isUpTrend = current.close >= current.open;
      }

      // 根据走势方向合并K线
      if (isUpTrend) {
        // 向上走势：取高点中的较高值和低点中的较高值
        previous.high = Math.max(previous.high, current.high);
        previous.low = Math.max(previous.low, current.low);
      } else {
        // 向下走势：取高点中的较低值和低点中的较低值
        previous.high = Math.min(previous.high, current.high);
        previous.low = Math.min(previous.low, current.low);
      }

      // 更新收盘价和成交量
      previous.close = current.close;
      previous.volume += current.volume;
    } else {
      // 不存在包含关系，直接添加
      result.push({
        index: i,
        timestamp: current.date,
        open: current.open,
        high: current.high,
        low: current.low,
        close: current.close,
        volume: current.volume,
      });
    }
  }

  return result;
}

/**
 * 识别顶分型
 *
 * 定义：由3根相邻K线组成，第二根K线的高点为3根K线中的最高点，
 *      且其低点高于第一根与第三根K线的低点
 *
 * 判定条件：
 * 1. K线2的高点 > K线1的高点
 * 2. K线2的高点 > K线3的高点
 * 3. K线2的低点 > K线1的低点
 * 4. K线2的低点 > K线3的低点
 *
 * @param klines 处理后的K线数据
 * @returns 顶分型列表
 */
export function identifyTopFractals(klines: ProcessedKLine[]): Fractal[] {
  const fractals: Fractal[] = [];

  if (klines.length < 3) return fractals;

  // 从第2根K线开始遍历（索引1到n-2）
  for (let i = 1; i < klines.length - 1; i++) {
    const left = klines[i - 1];
    const middle = klines[i];
    const right = klines[i + 1];

    // 检查顶分型条件
    const isTopFractal =
      middle.high > left.high && // 条件1
      middle.high > right.high && // 条件2
      middle.low > left.low && // 条件3
      middle.low > right.low; // 条件4

    if (isTopFractal) {
      fractals.push({
        type: "top",
        index: middle.index,
        price: middle.high,
        leftIndex: left.index,
        rightIndex: right.index,
        timestamp: middle.timestamp,
      });
    }
  }

  return fractals;
}

/**
 * 识别底分型
 *
 * 定义：由3根相邻K线组成,第二根K线的低点为3根K线中的最低点，
 *      且其高点低于第一根与第三根K线的高点
 *
 * 判定条件：
 * 1. K线2的低点 < K线1的低点
 * 2. K线2的低点 < K线3的低点
 * 3. K线2的高点 < K线1的高点
 * 4. K线2的高点 < K线3的高点
 *
 * @param klines 处理后的K线数据
 * @returns 底分型列表
 */
export function identifyBottomFractals(klines: ProcessedKLine[]): Fractal[] {
  const fractals: Fractal[] = [];

  if (klines.length < 3) return fractals;

  // 从第2根K线开始遍历（索引1到n-2）
  for (let i = 1; i < klines.length - 1; i++) {
    const left = klines[i - 1];
    const middle = klines[i];
    const right = klines[i + 1];

    // 检查底分型条件
    const isBottomFractal =
      middle.low < left.low && // 条件1
      middle.low < right.low && // 条件2
      middle.high < left.high && // 条件3
      middle.high < right.high; // 条件4

    if (isBottomFractal) {
      fractals.push({
        type: "bottom",
        index: middle.index,
        price: middle.low,
        leftIndex: left.index,
        rightIndex: right.index,
        timestamp: middle.timestamp,
      });
    }
  }

  return fractals;
}

/**
 * 识别所有分型（顶分型和底分型）
 *
 * 重要规则：
 * 1. 必须基于处理过包含关系后的K线
 * 2. 顶分型和底分型之间必须至少间隔3根处理后的K线
 * 3. 相邻的两个分型必须是不同类型（顶和底交替出现）
 *
 * @param klines 原始K线数据
 * @returns 有效的分型列表（按时间顺序排序）
 */
export function identifyFractals(klines: KLineData[]): Fractal[] {
  // 1. 处理K线包含关系
  const processedKLines = processKLineContainment(klines);

  if (processedKLines.length < 5) return []; // 至少需要5根K线才能形成有效的分型序列

  // 2. 识别所有可能的顶分型和底分型
  const topFractals = identifyTopFractals(processedKLines);
  const bottomFractals = identifyBottomFractals(processedKLines);

  // 3. 合并并按处理后K线的索引排序（注意这里用处理后数组的索引，不是原始索引）
  const allCandidates: Array<Fractal & { processedIndex: number }> = [
    ...topFractals.map((f, idx) => {
      // 找到该分型在processedKLines中的位置
      const processedIndex = processedKLines.findIndex(
        (k) => k.index === f.index
      );
      return { ...f, processedIndex };
    }),
    ...bottomFractals.map((f, idx) => {
      const processedIndex = processedKLines.findIndex(
        (k) => k.index === f.index
      );
      return { ...f, processedIndex };
    }),
  ];

  allCandidates.sort((a, b) => a.processedIndex - b.processedIndex);

  // 4. 筛选有效的分型：确保相邻分型类型不同，且间隔至少3根处理后的K线
  const validFractals: Fractal[] = [];

  for (const candidate of allCandidates) {
    if (validFractals.length === 0) {
      // 第一个分型直接添加
      const { processedIndex, ...fractal } = candidate;
      validFractals.push(fractal);
      continue;
    }

    const lastFractal = validFractals[validFractals.length - 1];
    const lastProcessedIndex = processedKLines.findIndex(
      (k) => k.index === lastFractal.index
    );

    // 检查两个条件：
    // 1. 类型必须不同（顶底交替）
    // 2. 在处理后的K线数组中，至少间隔3根K线（即索引差>=4）
    const isDifferentType = candidate.type !== lastFractal.type;
    const hasEnoughGap = candidate.processedIndex - lastProcessedIndex >= 4;

    if (isDifferentType && hasEnoughGap) {
      const { processedIndex, ...fractal } = candidate;
      validFractals.push(fractal);
    } else if (isDifferentType && !hasEnoughGap) {
      // 如果类型不同但间隔不够，跳过
      continue;
    } else if (!isDifferentType) {
      // 如果类型相同，选择更极端的那个（顶分型选更高的，底分型选更低的）
      if (candidate.type === "top" && candidate.price > lastFractal.price) {
        // 替换为更高的顶
        validFractals[validFractals.length - 1] = { ...candidate };
        delete (validFractals[validFractals.length - 1] as any).processedIndex;
      } else if (
        candidate.type === "bottom" &&
        candidate.price < lastFractal.price
      ) {
        // 替换为更低的底
        validFractals[validFractals.length - 1] = { ...candidate };
        delete (validFractals[validFractals.length - 1] as any).processedIndex;
      }
    }
  }

  return validFractals;
}

/**
 * 识别笔
 *
 * 笔的定义：
 * - 连接相邻的顶分型和底分型
 * - 向上笔：从底分型到顶分型，顶分型的高点 > 底分型的高点
 * - 向下笔：从顶分型到底分型，底分型的低点 < 顶分型的低点
 *
 * 根据新笔规则（推荐）：
 * - 顶底分型之间至少有3根非包含K线（这个已经在分型识别时保证）
 * - 整个笔至少包含5根K线
 * - 必须满足方向要求（向上笔顶高于底，向下笔底低于顶）
 *
 * @param klines 原始K线数据
 * @param fractals 有效的分型列表
 * @returns 笔列表
 */
export function identifyPens(klines: KLineData[], fractals: Fractal[]): Pen[] {
  const pens: Pen[] = [];

  if (fractals.length < 2) return pens;

  // 遍历相邻的分型对，构建笔
  for (let i = 0; i < fractals.length - 1; i++) {
    const currentFractal = fractals[i];
    const nextFractal = fractals[i + 1];

    // 确保分型类型交替（应该已经保证了，但再检查一次）
    if (currentFractal.type === nextFractal.type) {
      continue;
    }

    // 判断笔的类型和有效性
    let penType: "up" | "down";
    let startPrice: number;
    let endPrice: number;

    if (currentFractal.type === "bottom" && nextFractal.type === "top") {
      // 向上笔：从底分型到顶分型
      penType = "up";
      startPrice = currentFractal.price; // 底分型的低点
      endPrice = nextFractal.price; // 顶分型的高点

      // 检查有效性：顶分型的高点必须 > 底分型的高点
      const bottomHigh =
        klines[currentFractal.index]?.high || currentFractal.price;
      if (endPrice <= bottomHigh) {
        continue; // 不是有效的向上笔
      }
    } else if (currentFractal.type === "top" && nextFractal.type === "bottom") {
      // 向下笔：从顶分型到底分型
      penType = "down";
      startPrice = currentFractal.price; // 顶分型的高点
      endPrice = nextFractal.price; // 底分型的低点

      // 检查有效性：底分型的低点必须 < 顶分型的低点
      const topLow = klines[currentFractal.index]?.low || currentFractal.price;
      if (endPrice >= topLow) {
        continue; // 不是有效的向下笔
      }
    } else {
      continue;
    }

    // 检查笔是否包含至少5根K线
    const klineCount = Math.abs(nextFractal.index - currentFractal.index) + 1;
    if (klineCount < 5) {
      continue; // 笔太短，不符合要求
    }

    // 创建笔对象
    pens.push({
      type: penType,
      startIndex: currentFractal.index,
      endIndex: nextFractal.index,
      startPrice: startPrice,
      endPrice: endPrice,
      length: Math.abs(endPrice - startPrice),
    });
  }

  return pens;
}

/**
 * 完整的缠论分析：识别分型和笔
 *
 * @param klines 原始K线数据
 * @returns 包含分型和笔的分析结果
 */
export function analyzeChanLun(klines: KLineData[]): {
  fractals: Fractal[];
  pens: Pen[];
} {
  // 1. 识别分型
  const fractals = identifyFractals(klines);

  // 2. 识别笔
  const pens = identifyPens(klines, fractals);

  return {
    fractals,
    pens,
  };
}
