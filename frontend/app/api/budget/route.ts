import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type Item = {
  id: string;
  name: string;
  amount: number;
};

type Category = {
  name: string;
  items: Item[];
};

type BudgetData = {
  revenues: Item[];
  expenses: { categories: Category[] };
  investments: { categories: Category[] };
};

type BudgetSnapshot = {
  id: string;
  savedAt: string;
  data: BudgetData;
};

const budgetDirectory = path.join(process.cwd(), "..", "data", "budget");
const budgetFilePath = path.join(budgetDirectory, "budgetDiagrams.json");

const emptyBudgetData: BudgetData = {
  revenues: [],
  expenses: { categories: [] },
  investments: { categories: [] },
};

async function ensureBudgetFile() {
  await fs.mkdir(budgetDirectory, { recursive: true });

  try {
    await fs.access(budgetFilePath);
  } catch {
    await fs.writeFile(budgetFilePath, "[]\n", "utf8");
  }
}

async function readSnapshots(): Promise<BudgetSnapshot[]> {
  await ensureBudgetFile();

  try {
    const raw = await fs.readFile(budgetFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const snapshots = await readSnapshots();
  const latestSnapshot = snapshots.at(-1) ?? null;

  return NextResponse.json({
    snapshots,
    latest: latestSnapshot?.data ?? emptyBudgetData,
    latestSnapshot,
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as BudgetData;
  const snapshots = await readSnapshots();

  const nextSnapshot: BudgetSnapshot = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    data: payload,
  };

  snapshots.push(nextSnapshot);
  await fs.writeFile(budgetFilePath, `${JSON.stringify(snapshots, null, 2)}\n`, "utf8");

  return NextResponse.json({ saved: true, snapshot: nextSnapshot });
}