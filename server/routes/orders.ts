import { Router } from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import { db } from "../db";
import { orders, order_items } from "../../shared/schema";

export const ordersRouter = Router();

ordersRouter.post("/api/orders", async (req, res) => {
  const { floor, bay, items } = req.body;      // items = [{id,name,price_cents,qty}]
  const lineItems = items.map((i: any) => ({
    name: i.name,
    quantity: i.qty.toString(),
    base_price_money: { amount: i.price_cents, currency: "USD" },
  }));

  const sq = await fetch("https://connect.squareupsandbox.com/v2/orders", {
    method: "POST",
    headers: {
      "Square-Version": "2025-04-16",
      Authorization: `Bearer ${process.env.SQUARE_SANDBOX_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: process.env.SQUARE_SANDBOX_LOCATION,
        line_items: lineItems,
      },
    }),
  }).then((r) => r.json());

  const squareId = sq.order?.id || "ERROR_" + Date.now();
  const orderId = crypto.randomUUID();

  await db.insert(orders).values({ id: orderId, floor, bay, square_order_id: squareId });
  for (const it of items) {
    await db.insert(order_items).values({ order_id: orderId, menu_item_id: it.id, qty: it.qty });
  }

  // TODO: broadcast to kitchen WS here (next step)
  res.json({ orderId, squareOrderId: squareId });
});