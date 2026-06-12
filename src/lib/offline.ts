"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type PendingRecording = {
  id: string;
  studentId: string;
  entryId: string;
  date: string;
  blob: Blob;
  mimeType: string;
  ext: string;
  durationSec: number;
  sizeBytes: number;
  note: string;
  createdAt: number;
};

interface OfflineDB extends DBSchema {
  pending: {
    key: string;
    value: PendingRecording;
    indexes: { byEntry: string };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>("bitacora-offline", 1, {
      upgrade(db) {
        const store = db.createObjectStore("pending", { keyPath: "id" });
        store.createIndex("byEntry", "entryId");
      },
    });
  }
  return dbPromise;
}

export async function queueRecording(
  rec: Omit<PendingRecording, "id" | "createdAt">,
): Promise<PendingRecording> {
  const db = await getDB();
  const item: PendingRecording = {
    ...rec,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.put("pending", item);
  return item;
}

export async function allPending(): Promise<PendingRecording[]> {
  const db = await getDB();
  return db.getAll("pending");
}

export async function pendingForEntry(
  entryId: string,
): Promise<PendingRecording[]> {
  const db = await getDB();
  return db.getAllFromIndex("pending", "byEntry", entryId);
}

export async function deletePending(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("pending", id);
}

export async function countPending(): Promise<number> {
  const db = await getDB();
  return db.count("pending");
}
