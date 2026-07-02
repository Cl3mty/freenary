import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type Support = {
  id: string;
  name: string;
  isin: string;
  quantity: number;
  pru: number;
  currentPrice: number;
};

type Transaction = {
  id: string;
  type: "BUY";
  isin: string;
  name: string;
  quantity: number;
  price: number;
  executedAt: string;
};

type AccountPayload = {
  id: string;
  order?: number;
  name: string;
  supports: Support[];
  initialSupports: Support[];
  transactions: Transaction[];
};

type AccountFile = {
  id?: string;
  order?: number;
  account: string;
  initialState: {
    supports: Support[];
    capturedAt: string;
  };
  transactions: Transaction[];
  currentState: {
    supports: Support[];
    updatedAt: string;
  };
};

const storageDir = path.join(process.cwd(), "..", "data", "portfolio", "stocks-funds");

function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || "Compte";
  return trimmed.replace(/[\\/:*?"<>|]/g, "_");
}

async function ensureDir() {
  await fs.mkdir(storageDir, { recursive: true });
}

async function readAccountFromFile(filePath: string): Promise<AccountPayload | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AccountFile>;
    const accountName = parsed.account || path.basename(filePath, ".json");
    const initialSupports = Array.isArray(parsed.initialState?.supports) ? parsed.initialState!.supports! : [];
    const supports = Array.isArray(parsed.currentState?.supports)
      ? parsed.currentState!.supports!
      : initialSupports;
    const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];

    return {
      id: parsed.id || crypto.randomUUID(),
      order: typeof parsed.order === "number" ? parsed.order : Number.MAX_SAFE_INTEGER,
      name: accountName,
      supports,
      initialSupports,
      transactions,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  await ensureDir();

  try {
    const files = (await fs.readdir(storageDir)).filter((name) => name.endsWith(".json"));

    const accounts = (
      await Promise.all(
        files.map((fileName) => readAccountFromFile(path.join(storageDir, fileName)))
      )
    )
      .filter((account): account is AccountPayload => Boolean(account))
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

    return NextResponse.json({ accounts });
  } catch {
    return NextResponse.json({ accounts: [] });
  }
}

export async function POST(request: Request) {
  await ensureDir();

  try {
    const body = (await request.json()) as { accounts?: AccountPayload[] };
    const accounts = Array.isArray(body.accounts) ? body.accounts : [];

    // Remove previous account files to keep folder aligned with current account list.
    const existingFiles = (await fs.readdir(storageDir)).filter((name) => name.endsWith(".json"));
    await Promise.all(existingFiles.map((fileName) => fs.unlink(path.join(storageDir, fileName))));

    const usedNames = new Set<string>();

    await Promise.all(
      accounts.map(async (account, index) => {
        const baseName = sanitizeFileName(account.name || "Compte");
        let candidate = baseName;
        let suffix = 2;

        while (usedNames.has(candidate.toLowerCase())) {
          candidate = `${baseName}-${suffix}`;
          suffix += 1;
        }
        usedNames.add(candidate.toLowerCase());

        const filePath = path.join(storageDir, `${candidate}.json`);

        const payload: AccountFile = {
          id: account.id || crypto.randomUUID(),
          order: typeof account.order === "number" ? account.order : index,
          account: account.name || candidate,
          initialState: {
            supports: Array.isArray(account.initialSupports) ? account.initialSupports : [],
            capturedAt: new Date().toISOString(),
          },
          transactions: Array.isArray(account.transactions) ? account.transactions : [],
          currentState: {
            supports: Array.isArray(account.supports) ? account.supports : [],
            updatedAt: new Date().toISOString(),
          },
        };

        await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      })
    );

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de sauvegarder les comptes" }, { status: 500 });
  }
}
