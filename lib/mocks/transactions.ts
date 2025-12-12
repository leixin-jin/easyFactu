export interface Transaction {
  id: string
  type: "income" | "expense"
  category: string
  amount: number
  description: string
  date: string
  paymentMethod: string
  orderId?: string
}

export const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "income",
    category: "餐饮收入",
    amount: 3245.8,
    description: "今日营业收入",
    date: "2025-10-29",
    paymentMethod: "混合支付",
  },
  {
    id: "2",
    type: "expense",
    category: "食材采购",
    amount: 1250.0,
    description: "海鲜市场采购",
    date: "2025-10-29",
    paymentMethod: "银行转账",
  },
  {
    id: "3",
    type: "expense",
    category: "员工工资",
    amount: 4500.0,
    description: "10月工资发放",
    date: "2025-10-28",
    paymentMethod: "银行转账",
  },
  {
    id: "4",
    type: "income",
    category: "餐饮收入",
    amount: 2890.5,
    description: "昨日营业收入",
    date: "2025-10-28",
    paymentMethod: "混合支付",
  },
  {
    id: "5",
    type: "expense",
    category: "水电费",
    amount: 680.0,
    description: "10月水电费",
    date: "2025-10-27",
    paymentMethod: "自动扣款",
  },
  {
    id: "6",
    type: "expense",
    category: "食材采购",
    amount: 980.0,
    description: "蔬菜水果采购",
    date: "2025-10-27",
    paymentMethod: "现金",
  },
  {
    id: "7",
    type: "income",
    category: "餐饮收入",
    amount: 3120.0,
    description: "前日营业收入",
    date: "2025-10-27",
    paymentMethod: "混合支付",
  },
  {
    id: "8",
    type: "expense",
    category: "设备维修",
    amount: 450.0,
    description: "冰箱维修",
    date: "2025-10-26",
    paymentMethod: "现金",
  },
]

export const paymentMethodStats = [
  { value: "cash", label: "现金", count: 23, amount: 1250.5 },
  { value: "card", label: "银行卡", count: 45, amount: 2890.3 },
  { value: "wechat", label: "微信支付", count: 67, amount: 3456.8 },
  { value: "alipay", label: "支付宝", count: 52, amount: 2678.9 },
]
