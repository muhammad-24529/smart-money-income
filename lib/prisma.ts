
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../prisma/contract";
import contractJson from "../prisma/contract.json" with { type: "json" };

import { Temporal } from "@js-temporal/polyfill";

if (!("Temporal" in globalThis)) {
  Object.defineProperty(globalThis, "Temporal", {
    value: Temporal,
    configurable: true,
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined in .env");
}

export const db = postgres<Contract>({
  contractJson,
  url: databaseUrl,
});

let connectPromise: Promise<void> | null = null;

export async function connectDB() {
  if (!connectPromise) {
    connectPromise = db.connect().then(() => undefined).catch((error) => {
      connectPromise = null;
      throw error;
    });
  }

  await connectPromise;
}

export async function closeDB() {
  if (!connectPromise) return;

  await db.close();
  connectPromise = null;

  console.log("Database connection closed.");
}
