import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, Layout, Spin, Alert } from "antd";
import zhCN from "antd/locale/zh_CN";
import KLineChart from "./components/KLineChart";
import StockSelector from "./components/StockSelector";
import { stockApi } from "./api/stock";
import type { KLineData } from "./types/stock";
import "./App.css";

const { Header, Content } = Layout;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function StockPage() {
  const [allData, setAllData] = useState<KLineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentStock, setCurrentStock] = useState<{
    code: string;
    name: string;
  }>({
    code: "sh000001",
    name: "上证指数",
  });
  const [earliestDate, setEarliestDate] = useState<string | null>(null);
  const isLoadingMoreRef = useRef(false);

  // 加载股票数据的通用函数
  const loadStockData = useCallback(
    async (code: string, days: number = 200) => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await stockApi.getStockData(code, { days });
        setAllData(result.data);
        setCurrentStock({ code: result.code, name: result.name });
        setEarliestDate(result.earliestDate || null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 初始加载上证指数数据
  useEffect(() => {
    loadStockData("sh000001", 2000);
  }, [loadStockData]);

  // 股票切换处理
  const handleStockChange = useCallback(
    (code: string) => {
      loadStockData(code, 2000);
    },
    [loadStockData]
  );

  // 加载更多历史数据
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMoreRef.current) {
      return;
    }

    isLoadingMoreRef.current = true;

    try {
      setAllData((prevData) => {
        if (prevData.length === 0) {
          isLoadingMoreRef.current = false;
          return prevData;
        }

        const currentEarliestDate = prevData[0].date;

        // 检查是否已经到达数据库中的最早日期
        if (earliestDate && currentEarliestDate <= earliestDate) {
          console.log("已到达数据边界，跳过加载");
          isLoadingMoreRef.current = false;
          return prevData;
        }

        const earliestDateObj = new Date(currentEarliestDate);

        // 往前推2000天
        const endDate = new Date(earliestDateObj);
        endDate.setDate(endDate.getDate() - 1);

        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 2000);

        const startDateStr = startDate.toISOString().split("T")[0];
        const endDateStr = endDate.toISOString().split("T")[0];

        // 异步加载，使用当前股票代码
        stockApi
          .getStockData(currentStock.code, {
            startDate: startDateStr,
            endDate: endDateStr,
          })
          .then((result) => {
            if (result.data && result.data.length > 0) {
              setAllData((currentData) => {
                const existingDates = new Set(currentData.map((d) => d.date));
                const newData = result.data.filter(
                  (d) => !existingDates.has(d.date)
                );
                return [...newData, ...currentData];
              });
            }
          })
          .catch((err) => {
            console.error("加载失败:", err);
          })
          .finally(() => {
            setTimeout(() => {
              isLoadingMoreRef.current = false;
            }, 1000);
          });

        return prevData;
      });
    } catch (err) {
      console.error("错误:", err);
      isLoadingMoreRef.current = false;
    }
  }, [currentStock.code, earliestDate]);

  // 使用 useMemo 稳定 data 的引用，避免不必要的重渲染
  const memoizedData = useMemo(() => allData, [allData]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 50px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ margin: 0, lineHeight: "64px" }}></h1>
        <div style={{ width: "400px" }}>
          <StockSelector
            onChange={handleStockChange}
            placeholder="搜索股票代码或名称"
          />
        </div>
      </Header>
      <Content style={{ padding: "12px", background: "#f0f2f5" }}>
        <div
          style={{
            background: "#fff",
            padding: "8px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {isLoading && (
            <div style={{ textAlign: "center", padding: "50px" }}>
              <Spin size="large" tip="加载中..." />
            </div>
          )}

          {error && (
            <Alert
              message="数据加载失败"
              description={
                error.message || "请确保后端服务已启动 (python main.py)"
              }
              type="error"
              showIcon
            />
          )}

          {!isLoading && allData.length > 0 && (
            <>
              <KLineChart
                data={memoizedData}
                title={`${currentStock.name} (${currentStock.code})`}
                onLoadMore={handleLoadMore}
              />
            </>
          )}
        </div>
      </Content>
    </Layout>
  );
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <QueryClientProvider client={queryClient}>
        <StockPage />
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
