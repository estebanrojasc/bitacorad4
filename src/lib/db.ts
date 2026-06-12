import mongoose from "mongoose";
import { env } from "./env";

/**
 * Conexión a MongoDB con cache global para evitar múltiples conexiones
 * durante el hot-reload de Next.js en desarrollo.
 */

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  _mongoose?: MongooseCache;
};

const cache: MongooseCache =
  globalForMongoose._mongoose ?? { conn: null, promise: null };

globalForMongoose._mongoose = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(env.mongoUri, {
      bufferCommands: false,
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
