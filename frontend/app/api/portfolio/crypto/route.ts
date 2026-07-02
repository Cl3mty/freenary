import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

type CryptoAsset = {
  id: string;
  name: string;
  symbol: string;
  quantity: number;
  unitPurchasePrice: number;
  currentUnitPrice: number;
};

type CryptoSource = {
  id: string;
  name: string;
  cashBalanceEur: number;
  assets: CryptoAsset[];
};

type TransactionType = "BUY" | "SELL" | "SWAP" | "DEPOSIT" | "WITHDRAWAL";

type CryptoTransaction = {
  id: string;
  type: TransactionType;
  sourceId: string;
  date: string;
  assetSymbol?: string;
  assetName?: string;
  quantity?: number;
  unitPrice?: number;
  fromSymbol?: string;
  fromName?: string;
  fromQuantity?: number;
  toSymbol?: string;
  toName?: string;
  toQuantity?: number;
  toUnitPrice?: number;
  amountEur?: number;
  note?: string;
  createdAt: string;
};

type HistoryPoint = {
  date: string;
  total: number;
};

type CryptoPayload = {
  sources: CryptoSource[];
  history: HistoryPoint[];
  transactions: CryptoTransaction[];
};

const storageFile = path.join(process.cwd(), "..", "data", "portfolio", "crypto.json");

const fallbackPayload: CryptoPayload = {
  sources: [],
  history: [],
  transactions: [],
};

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSymbol(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDate(value: unknown) {
  const asString = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(asString) ? asString : new Date().toISOString().slice(0, 10);
}

function normalizeAsset(asset: Partial<CryptoAsset>, sourceId: string, index: number): CryptoAsset {
  return {
    id: String(asset.id || `${sourceId}-asset-${index + 1}`),
    name: String(asset.name || asset.symbol || "Asset").trim(),
    symbol: normalizeSymbol(asset.symbol || asset.name || "ASSET"),
    quantity: Math.max(0, normalizeNumber(asset.quantity, 0)),
    unitPurchasePrice: Math.max(0, normalizeNumber(asset.unitPurchasePrice, 0)),
    currentUnitPrice: Math.max(0, normalizeNumber(asset.currentUnitPrice, 0)),
  };
}

function normalizeSource(source: Partial<CryptoSource>, index: number): CryptoSource {
  const id = String(source.id || `source-${index + 1}`);
  const assets = Array.isArray(source.assets)
    ? source.assets.map((asset, assetIndex) => normalizeAsset(asset, id, assetIndex))
    : [];

  return {
    id,
    name: String(source.name || `Source ${index + 1}`).trim(),
    cashBalanceEur: normalizeNumber(source.cashBalanceEur, 0),
    assets,
  };
}

function normalizeTransaction(transaction: Partial<CryptoTransaction>, index: number): CryptoTransaction {
  const type = String(transaction.type || "BUY") as TransactionType;
  const allowed: TransactionType[] = ["BUY", "SELL", "SWAP", "DEPOSIT", "WITHDRAWAL"];
  const safeType = allowed.includes(type) ? type : "BUY";

  return {
    id: String(transaction.id || randomUUID() || `tx-${index + 1}`),
    type: safeType,
    sourceId: String(transaction.sourceId || ""),
    date: normalizeDate(transaction.date),
    assetSymbol: normalizeSymbol(transaction.assetSymbol),
    assetName: String(transaction.assetName || "").trim(),
    quantity: normalizeNumber(transaction.quantity, 0),
    unitPrice: normalizeNumber(transaction.unitPrice, 0),
    fromSymbol: normalizeSymbol(transaction.fromSymbol),
    fromName: String(transaction.fromName || "").trim(),
    fromQuantity: normalizeNumber(transaction.fromQuantity, 0),
    toSymbol: normalizeSymbol(transaction.toSymbol),
    toName: String(transaction.toName || "").trim(),
    toQuantity: normalizeNumber(transaction.toQuantity, 0),
    toUnitPrice: normalizeNumber(transaction.toUnitPrice, 0),
    amountEur: normalizeNumber(transaction.amountEur, 0),
    note: String(transaction.note || "").trim(),
    createdAt: String(transaction.createdAt || new Date().toISOString()),
  };
}

function normalizePayload(input: Partial<CryptoPayload>): CryptoPayload {
  const sources = Array.isArray(input.sources) ? input.sources.map((source, index) => normalizeSource(source, index)) : [];
  const history = Array.isArray(input.history)
    ? input.history.map((point) => ({
        date: String(point.date || ""),
        total: normalizeNumber(point.total, 0),
      }))
    : [];
  const transactions = Array.isArray(input.transactions)
    ? input.transactions.map((tx, index) => normalizeTransaction(tx, index))
    : [];

  return { sources, history, transactions };
}

async function writePayload(payload: CryptoPayload) {
  await fs.mkdir(path.dirname(storageFile), { recursive: true });
  await fs.writeFile(storageFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function readPayload(): Promise<CryptoPayload> {
  try {
    const raw = await fs.readFile(storageFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<CryptoPayload>;
    return normalizePayload(parsed);
  } catch {
    return fallbackPayload;
  }
}

export async function GET() {
  const payload = await readPayload();
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CryptoPayload>;
    const normalized = normalizePayload(body);
    await writePayload(normalized);
    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json({ error: "Impossible de sauvegarder la partie crypto" }, { status: 500 });
  }
}
