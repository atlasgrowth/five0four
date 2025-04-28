import { Client, Environment } from "square";

if (!process.env.SQUARE_SANDBOX_TOKEN)
  throw new Error("SQUARE_SANDBOX_TOKEN not set");

export const sq = new Client({
  environment: Environment.Sandbox,
  accessToken: process.env.SQUARE_SANDBOX_TOKEN,
});

export const catalogApi  = sq.catalogApi;
export const ordersApi   = sq.ordersApi;
export const paymentsApi = sq.paymentsApi;
