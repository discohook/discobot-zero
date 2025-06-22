// Borrowed & modified from https://github.com/jenseng/abuse-the-platform/blob/main/app/utils/singleton.ts

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
import Keyv from "keyv";
import JSONbig_ from "json-bigint";

const JSONbig = JSONbig_({ useNativeBigInt: true, alwaysParseAsBig: true });

const singleton = <Value>(name: string, valueFactory: () => Value): Value => {
  // biome-ignore lint/suspicious/noExplicitAny:
  const g = global as any;
  g.__singletons ??= {};
  g.__singletons[name] ??= valueFactory();
  return g.__singletons[name];
};

export const db = singleton("db", () =>
  drizzle(
    postgres(process.env.DATABASE_URL, {
      types: {
        bigint: postgres.BigInt,
        json: {
          // "json" in pg_catalog.pg_type
          from: [114],
          to: 114,
          parse: JSONbig.parse,
          serialize: JSONbig.stringify,
        },
      },
    }),
    { schema },
  ),
);

export const keyv = singleton("keyv", () => new Keyv());
