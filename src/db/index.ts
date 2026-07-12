import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env.local");
  }
  return drizzle(neon(url), { schema });
}

let cached: Db | undefined;

// Lazy init: the connection string is only required on first query,
// not at import time (which runs during `next build` page-data collection).
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    cached ??= createDb();
    const value = Reflect.get(cached, prop);
    return typeof value === "function" ? value.bind(cached) : value;
  },
});
