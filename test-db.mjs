import postgres from "@prisma/orm-postgres/runtime";
import contractJson from "./prisma/contract.json" with { type: "json" };

const db = postgres({
  contractJson,
  url: process.env.DATABASE_URL,
});

await db.connect();

const result = await db.sql`SELECT 1 AS test`;

console.log("SQL RESULT:");
console.log(result);

await db.close();