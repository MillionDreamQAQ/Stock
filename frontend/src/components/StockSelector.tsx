import { useState, useCallback } from "react";
import { AutoComplete, Input } from "antd";
import type { StockInfo } from "../types/stock";
import { stockApi } from "../api/stock";
import { SearchOutlined } from "@ant-design/icons";

interface StockSelectorProps {
  onChange?: (code: string, stock: StockInfo) => void;
  placeholder?: string;
}

const StockSelector = ({
  onChange,
  placeholder = "搜索股票代码或名称",
}: StockSelectorProps) => {
  const [options, setOptions] = useState<
    { value: string; label: string; stock: StockInfo }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = useCallback(async (keyword: string) => {
    setSearchValue(keyword);

    if (!keyword || keyword.length < 1) {
      setOptions([]);
      return;
    }

    setSearching(true);
    try {
      const results = await stockApi.searchStocks(keyword);

      const newOptions = results.map((stock) => ({
        value: stock.code,
        label: `${stock.code} - ${stock.name} (${stock.market})`,
        stock,
      }));

      setOptions(newOptions);
    } catch (error) {
      console.error("搜索失败:", error);
      setOptions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelect = useCallback(
    (selectedValue: string) => {
      const selectedOption = options.find((opt) => opt.value === selectedValue);
      if (selectedOption && onChange) {
        onChange(selectedOption.value, selectedOption.stock);
        // 选中后清空输入框
        setSearchValue("");
        setOptions([]);
      }
    },
    [options, onChange]
  );

  return (
    <AutoComplete
      value={searchValue}
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      style={{ width: "100%", minWidth: 300 }}
      notFoundContent={searching ? "搜索中..." : "无匹配结果"}
    >
      <Input prefix={<SearchOutlined />} placeholder={placeholder} allowClear />
    </AutoComplete>
  );
};

export default StockSelector;
