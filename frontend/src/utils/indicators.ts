/**
 * 技术指标计算工具
 */

export interface MACDResult {
  time: string;
  dif: number; // DIF线（差离值）= 快线EMA - 慢线EMA
  dea: number; // DEA线（信号线）= DIF的EMA
  macd: number; // MACD柱状图 = DIF - DEA
}

/**
 * 计算EMA（指数移动平均）
 * @param data 价格数据
 * @param period 周期
 */
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  if (data.length === 0) return ema;

  const multiplier = 2 / (period + 1);

  // 第一个EMA值使用第一个价格
  ema[0] = data[0];

  // 从第二个数据开始使用EMA公式
  for (let i = 1; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }

  return ema;
}

/**
 * 计算MACD指标
 * @param prices 收盘价数组
 * @param fastPeriod 快线周期，默认12
 * @param slowPeriod 慢线周期，默认26
 * @param signalPeriod DEA周期，默认9
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { dif: number[]; dea: number[]; macd: number[] } {
  const result: { dif: number[]; dea: number[]; macd: number[] } = {
    dif: [],
    dea: [],
    macd: [],
  };

  if (prices.length === 0) {
    return result;
  }

  // 计算快线EMA和慢线EMA（从第一个数据点开始）
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);

  // 计算DIF（差离值）= 快线EMA - 慢线EMA
  // 从第一个数据点就开始计算
  const difLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    difLine[i] = emaFast[i] - emaSlow[i];
  }

  // 计算DEA（信号线）= DIF的EMA
  const deaLine = calculateEMA(difLine, signalPeriod);

  // 计算MACD柱状图 = (DIF - DEA) * 2
  // 注意：很多软件中MACD柱状图会乘以2来放大显示
  const macdHistogram: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdHistogram[i] = (difLine[i] - deaLine[i]) * 2;
  }

  result.dif = difLine;
  result.dea = deaLine;
  result.macd = macdHistogram;

  return result;
}

/**
 * 从K线数据计算MACD
 */
export function calculateMACDFromKLineData(
  data: Array<{ date: string; close: number }>,
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult[] {
  const prices = data.map((d) => d.close);
  const { dif, dea, macd } = calculateMACD(
    prices,
    fastPeriod,
    slowPeriod,
    signalPeriod
  );

  const results: MACDResult[] = [];

  // 为所有数据点创建条目（现在从第一个数据点就有值了）
  for (let i = 0; i < data.length; i++) {
    results.push({
      time: data[i].date,
      dif: dif[i], // DIF线
      dea: dea[i], // DEA线
      macd: macd[i], // MACD柱状图
    });
  }

  return results;
}
