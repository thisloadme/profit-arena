import { prisma } from "@/lib/prisma";
import { recordTrade } from "./price-engine";
import { getIO } from "./socket-server";
import { isMarketOpen } from "./tick-scheduler";

/**
 * Check all PENDING limit orders against current market prices.
 * Executes those whose conditions are met, then broadcasts.
 *
 * Two order shapes share this table:
 *  - limitPrice set  → classic limit order, matches when price crosses, 24/7.
 *  - limitPrice null → queued MARKET order for STOCK placed while the market
 *    was closed; fills at the next open price, no price condition.
 *
 * ponytail: scans all pending orders per tick. For large order books,
 * index on (status, symbol) keeps it fast — at MVP scale, negligible.
 */
export async function executeLimitOrders(): Promise<void> {
  const ordersRaw = await prisma.limitOrder.findMany({
    where: { status: "PENDING" },
    select: { id: true, userId: true, symbol: true, type: true, quantity: true, limitPrice: true },
  });
  const orders = ordersRaw.map((o) => ({
    id: o.id,
    userId: o.userId,
    symbol: o.symbol,
    type: o.type,
    quantity: o.limitPrice === null ? 0 : Number(o.quantity),
    limitPrice: o.limitPrice === null ? null : Number(o.limitPrice),
  }));
  if (orders.length === 0) return;

  // Group by symbol, fetch market prices once
  const symbols = [...new Set(orders.map((o) => o.symbol))];
  const markets = await prisma.marketData.findMany({
    where: { symbol: { in: symbols } },
    select: { symbol: true, currentPrice: true, type: true },
  });
  const priceMap = new Map(markets.map((m) => [m.symbol, { price: Number(m.currentPrice), type: m.type }]));

  const toExecute: typeof orders = [];

  for (const o of orders) {
    const m = priceMap.get(o.symbol);
    if (!m) continue; // asset no longer exists
    // Queued market order (null limit): fills only when the stock market is open.
    if (o.limitPrice === null) {
      if (m.type === "STOCK" && !isMarketOpen("STOCK")) continue;
      toExecute.push(o);
      continue;
    }
    if (o.type === "BUY" && m.price <= o.limitPrice) toExecute.push(o);
    if (o.type === "SELL" && m.price >= o.limitPrice) toExecute.push(o);
  }

  if (toExecute.length === 0) return;

  const io = getIO();

  for (const o of toExecute) {
    const m = priceMap.get(o.symbol)!;
    const executionPrice = m.price; // execute at current market price
    const total = executionPrice * o.quantity;

    try {
      if (o.type === "BUY") {
        // Check cash (fast-path). The real guard is the atomic conditional
        // decrement inside the txn — protects against concurrent ticks and
        // the user draining cash between check and write.
        const user = await prisma.user.findUnique({
          where: { id: o.userId },
          select: { cash: true },
        });
        if (!user || Number(user.cash) < total) {
          // Not enough cash — leave as pending, next tick might work
          continue;
        }

        const executed = await prisma.$transaction(async (tx) => {
          // Atomically claim the order: PENDING → EXECUTED. Only one tick
          // (or concurrent API call) can win. If count===0, skip this order.
          const claimed = await tx.limitOrder.updateMany({
            where: { id: o.id, status: "PENDING" },
            data: { status: "EXECUTED", executedAt: new Date() },
          });
          if (claimed.count === 0) return false;

          const spent = await tx.user.updateMany({
            where: { id: o.userId, cash: { gte: total } },
            data: { cash: { decrement: total } },
          });
          if (spent.count === 0) {
            // Roll the order back to PENDING so a future tick can retry.
            await tx.limitOrder.update({ where: { id: o.id }, data: { status: "PENDING", executedAt: null } });
            return false;
          }

          const existing = await tx.asset.findUnique({
            where: { userId_symbol: { userId: o.userId, symbol: o.symbol } },
            select: { id: true, quantity: true, averagePrice: true },
          });

          if (existing) {
            const curQty = Number(existing.quantity);
            const curAvg = Number(existing.averagePrice);
            const newQty = curQty + o.quantity;
            const newAvg = (curAvg * curQty + executionPrice * o.quantity) / newQty;
            await tx.asset.update({
              where: { id: existing.id },
              data: { quantity: newQty, averagePrice: newAvg, currentPrice: executionPrice },
            });
          } else {
            await tx.asset.create({
              data: {
                userId: o.userId,
                symbol: o.symbol,
                type: m.type,
                name: o.symbol,
                quantity: o.quantity,
                averagePrice: executionPrice,
                currentPrice: executionPrice,
              },
            });
          }

          await tx.transaction.create({
            data: {
              userId: o.userId,
              type: "BUY",
              amount: -total,
              description: `Limit buy ${o.quantity} × ${o.symbol} @ ${executionPrice}`,
              relatedAsset: o.symbol,
            },
          });
          return true;
        });

        if (!executed) continue;

        recordTrade(o.symbol, o.quantity);
        io?.to(`user:${o.userId}`).emit("notification:new", {
          title: "🔔 Limit Buy Executed",
          message: `Bought ${o.quantity} × ${o.symbol} @ $${executionPrice}`,
          at: new Date().toISOString(),
        });
      } else {
        // SELL
        const asset = await prisma.asset.findUnique({
          where: { userId_symbol: { userId: o.userId, symbol: o.symbol } },
          select: { id: true, quantity: true },
        });
        if (!asset || Number(asset.quantity) < o.quantity) {
          // Not enough units — leave pending
          continue;
        }

        const executed = await prisma.$transaction(async (tx) => {
          const claimed = await tx.limitOrder.updateMany({
            where: { id: o.id, status: "PENDING" },
            data: { status: "EXECUTED", executedAt: new Date() },
          });
          if (claimed.count === 0) return false;

          const decremented = await tx.asset.updateMany({
            where: { id: asset.id, quantity: { gte: o.quantity } },
            data: { quantity: { decrement: o.quantity } },
          });
          if (decremented.count === 0) {
            await tx.limitOrder.update({ where: { id: o.id }, data: { status: "PENDING", executedAt: null } });
            return false;
          }

          await tx.user.update({
            where: { id: o.userId },
            data: { cash: { increment: total } },
          });

          const after = await tx.asset.findUnique({
            where: { id: asset.id },
            select: { quantity: true },
          });
          if (after && Number(after.quantity) <= 0) {
            await tx.asset.delete({ where: { id: asset.id } });
          }

          await tx.transaction.create({
            data: {
              userId: o.userId,
              type: "SELL",
              amount: total,
              description: `Limit sell ${o.quantity} × ${o.symbol} @ ${executionPrice}`,
              relatedAsset: o.symbol,
            },
          });
          return true;
        });

        if (!executed) continue;

        recordTrade(o.symbol, -o.quantity);
        io?.to(`user:${o.userId}`).emit("notification:new", {
          title: "🔔 Limit Sell Executed",
          message: `Sold ${o.quantity} × ${o.symbol} @ $${executionPrice}`,
          at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error(`[limit-order] failed to execute ${o.id}:`, e);
    }
  }
}
