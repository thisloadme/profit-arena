import { prisma } from "@/lib/prisma";
import { recordTrade } from "./price-engine";
import { getIO } from "./socket-server";

/**
 * Check all PENDING limit orders against current market prices.
 * Executes those whose conditions are met, then broadcasts.
 *
 * ponytail: scans all pending orders per tick. For large order books,
 * index on (status, symbol) keeps it fast — at MVP scale, negligible.
 */
export async function executeLimitOrders(): Promise<void> {
  const orders = await prisma.limitOrder.findMany({
    where: { status: "PENDING" },
    select: { id: true, userId: true, symbol: true, type: true, quantity: true, limitPrice: true },
  });
  if (orders.length === 0) return;

  // Group by symbol, fetch market prices once
  const symbols = [...new Set(orders.map((o) => o.symbol))];
  const markets = await prisma.marketData.findMany({
    where: { symbol: { in: symbols } },
    select: { symbol: true, currentPrice: true, type: true },
  });
  const priceMap = new Map(markets.map((m) => [m.symbol, { price: m.currentPrice, type: m.type }]));

  const toExecute: typeof orders = [];

  for (const o of orders) {
    const m = priceMap.get(o.symbol);
    if (!m) continue; // asset no longer exists
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
        // Check cash
        const user = await prisma.user.findUnique({
          where: { id: o.userId },
          select: { cash: true },
        });
        if (!user || user.cash < total) {
          // Not enough cash — leave as pending, next tick might work
          // (or user deposited cash since placing the order)
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.limitOrder.update({
            where: { id: o.id },
            data: { status: "EXECUTED", executedAt: new Date() },
          });

          await tx.user.update({
            where: { id: o.userId },
            data: { cash: { decrement: total } },
          });

          const existing = await tx.asset.findUnique({
            where: { userId_symbol: { userId: o.userId, symbol: o.symbol } },
            select: { id: true, quantity: true, averagePrice: true },
          });

          if (existing) {
            const newQty = existing.quantity + o.quantity;
            const newAvg =
              (existing.averagePrice * existing.quantity + executionPrice * o.quantity) / newQty;
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
        });

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
        if (!asset || asset.quantity < o.quantity) {
          // Not enough units — leave pending
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.limitOrder.update({
            where: { id: o.id },
            data: { status: "EXECUTED", executedAt: new Date() },
          });

          await tx.user.update({
            where: { id: o.userId },
            data: { cash: { increment: total } },
          });

          const remaining = asset.quantity - o.quantity;
          if (remaining <= 0) {
            await tx.asset.delete({ where: { id: asset.id } });
          } else {
            await tx.asset.update({
              where: { id: asset.id },
              data: { quantity: remaining },
            });
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
        });

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
