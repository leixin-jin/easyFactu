# 反结算功能说明

## 功能概述

反结算功能允许撤销已完成的结账交易，将订单恢复到未付状态。本功能仅支持**整单反结算**，即一次性回退某笔交易涉及的所有菜品数量。

## 限制条件

### 必须满足的条件

1. **交易必须有明细记录**：只有在新版本结账流程中产生的交易（包含 `transaction_items` 明细）才能反结算。历史交易如无明细则无法反结算。

2. **交易必须是收入类型**：只有 `type = 'income'` 的交易才能反结算，支出类交易不支持。

3. **交易必须关联订单**：交易必须有有效的 `orderId`。

4. **桌台无冲突订单**：如果交易关联的桌台已有其他 `open` 状态的订单，则无法反结算（返回 409 错误）。

### 反结算后的状态变化

| 项目 | 反结算后状态 |
|------|-------------|
| 交易记录 | **物理删除** |
| 交易明细 | **级联删除** |
| 订单状态 | 变为 `open`（如有未付菜品） |
| 订单折扣 | **重置为 0** |
| `paid_amount` | 按剩余交易汇总 |
| 桌台状态 | 仅当订单重开且有关联桌台时，变为 `occupied` |

## 对报表的影响

由于反结算会**物理删除**交易记录，以下报表数据会同步减少：

- **日结报表**：`grossRevenue` 和 `netRevenue` 会减少反结算金额
- **数据报表**：销售趋势和 KPI 会同步更新
- **历史记录**：反结算后该交易不再出现在结算记录列表

> ⚠️ 注意：反结算不会产生"退款记录"或"作废记录"，而是直接删除原交易，如需留痕请考虑业务层面的日志。

## API 接口

### 获取交易详情

```
GET /api/transactions/:id
```

响应示例：
```json
{
  "transaction": {
    "id": "uuid",
    "type": "income",
    "amount": 100.00,
    "paymentMethod": "cash",
    "tableNumber": "A1"
  },
  "items": [
    {
      "nameSnapshot": "红烧肉",
      "quantity": 2
    }
  ],
  "hasItems": true
}
```

### 执行反结算

```
POST /api/transactions/:id/reverse
```

成功响应：
```json
{
  "success": true,
  "orderId": "uuid",
  "orderStatus": "open",
  "tableNumber": "A1",
  "reversedAmount": 100.00,
  "newPaidAmount": 0
}
```

错误码：
| 状态码 | code | 说明 |
|--------|------|------|
| 400 | `NO_TRANSACTION_ITEMS` | 缺少明细，无法反结算 |
| 400 | `INVALID_TRANSACTION_TYPE` | 非收入交易 |
| 400 | `NO_ORDER_ID` | 交易无关联订单 |
| 404 | `TRANSACTION_NOT_FOUND` | 交易不存在 |
| 404 | `ORDER_NOT_FOUND` | 关联订单不存在 |
| 409 | `TABLE_HAS_OPEN_ORDER` | 桌台已有其他打开的订单 |

## 技术实现

### 数据表

- `transaction_items`：记录每次结账的菜品明细
  - `transaction_id`：关联交易
  - `order_item_id`：关联订单项
  - `quantity`：本次结账数量（增量）
  - `name_snapshot`：菜品名称快照
  - `unit_price`：结账时单价

### 反结算流程

1. 验证交易存在且有明细
2. 若有关联桌台，检查是否有其他 open 订单（有则返回 409）
3. 遍历 `transaction_items`，回退 `order_items.paid_quantity`
4. 删除交易记录（级联删除明细）
5. 重算订单金额，`discount = 0`
6. 若订单重开（`status = open`）且有关联桌台，更新桌台状态为 `occupied`
