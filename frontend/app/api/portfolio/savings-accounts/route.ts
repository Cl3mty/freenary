import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

type SavingsAccount = {
  id: string;
  bank: string;
  account: string;
  balance: number;
  transactions: SavingsTransaction[];
};

type SavingsTransaction = {
  id: string;
  type: "IN" | "OUT";
  amount: number;
  date: string;
  createdAt: string;
};

type SavingsPayload = {
  accounts: SavingsAccount[];
};

type SavingsAccountFile = {
  account: string;
  data: SavingsAccount;
  updatedAt: string;
};

const storageDir = path.join(process.cwd(), "..", "data", "savings-accounts");
const legacyStorageFile = path.join(process.cwd(), "..", "data", "portfolio", "savingsAccounts.json");

const defaultPayload: SavingsPayload = {
  accounts: [
    {
      id: "acc-livret-a",
      bank: "Banque Populaire",
      account: "Livret A",
      balance: 1200,
      transactions: [],
    },
    {
      id: "acc-lep",
      bank: "Caisse d'Epargne",
      account: "Livret d'Epargne Populaire",
      balance: 3500,
      transactions: [],
    },
    {
      id: "acc-livret-jeune",
      bank: "Credit Agricole",
      account: "Livret Jeune",
      balance: 5000,
      transactions: [],
    },
  ],
};

async function ensureStorageDir() {
  await fs.mkdir(storageDir, { recursive: true });
}

function normalizePayload(input: Partial<SavingsPayload> | null | undefined): SavingsPayload {
  function normalizeTransactions(raw: unknown): SavingsTransaction[] {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => {
        const transaction = item as Partial<SavingsTransaction>;
        const type: SavingsTransaction["type"] = transaction.type === "OUT" ? "OUT" : "IN";
        const amount = Number(transaction.amount);
        const date = String(transaction.date || "").slice(0, 10);

        return {
          id: transaction.id || randomUUID(),
          type,
          amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
          date,
          createdAt: String(transaction.createdAt || new Date().toISOString()),
        };
      })
      .filter((tx) => tx.amount > 0 && tx.date.length === 10);
  }

  const accounts = Array.isArray(input?.accounts)
    ? input.accounts
        .map((item) => ({
          id: item?.id || randomUUID(),
          bank: String(item?.bank || "").trim(),
          account: String(item?.account || "").trim(),
          balance: Number.isFinite(Number(item?.balance)) ? Number(item?.balance) : 0,
          transactions: normalizeTransactions((item as Partial<SavingsAccount>)?.transactions),
        }))
        .filter((item) => item.bank.length > 0 && item.account.length > 0)
    : defaultPayload.accounts;

  return {
    accounts,
  };
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || "Compte";
  return trimmed.replace(/[\\/:*?"<>|]/g, "_");
}

function normalizeAccount(input: Partial<SavingsAccount>): SavingsAccount | null {
  function normalizeTransactions(raw: unknown): SavingsTransaction[] {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => {
        const transaction = item as Partial<SavingsTransaction>;
        const type: SavingsTransaction["type"] = transaction.type === "OUT" ? "OUT" : "IN";
        const amount = Number(transaction.amount);
        const date = String(transaction.date || "").slice(0, 10);

        return {
          id: transaction.id || randomUUID(),
          type,
          amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
          date,
          createdAt: String(transaction.createdAt || new Date().toISOString()),
        };
      })
      .filter((tx) => tx.amount > 0 && tx.date.length === 10);
  }

  const bank = String(input.bank || "").trim();
  const account = String(input.account || "").trim();
  const balance = Number(input.balance);

  if (!bank || !account || !Number.isFinite(balance) || balance < 0) {
    return null;
  }

  return {
    id: input.id || randomUUID(),
    bank,
    account,
    balance,
    transactions: normalizeTransactions(input.transactions),
  };
}

async function writeAccountsToFiles(accounts: SavingsAccount[]): Promise<void> {
  await ensureStorageDir();
  const existingFiles = (await fs.readdir(storageDir)).filter((name) => name.endsWith(".json"));
  await Promise.all(existingFiles.map((fileName) => fs.unlink(path.join(storageDir, fileName))));

  const usedNames = new Set<string>();

  await Promise.all(
    accounts.map(async (account, index) => {
      const baseName = sanitizeFileName(account.account);
      let candidate = baseName;
      let suffix = 2;

      while (usedNames.has(candidate.toLowerCase())) {
        candidate = `${baseName}-${suffix}`;
        suffix += 1;
      }
      usedNames.add(candidate.toLowerCase());

      const payload: SavingsAccountFile = {
        account: account.account,
        data: account,
        updatedAt: new Date().toISOString(),
      };

      const orderPrefix = String(index + 1).padStart(3, "0");
      const filePath = path.join(storageDir, `${orderPrefix}-${candidate}.json`);
      await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    })
  );
}

async function readLegacyAccounts(): Promise<SavingsAccount[]> {
  try {
    const raw = await fs.readFile(legacyStorageFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<SavingsPayload>;
    const normalized = normalizePayload(parsed).accounts;
    return normalized
      .map((account) => normalizeAccount(account))
      .filter((account): account is SavingsAccount => Boolean(account));
  } catch {
    return [];
  }
}

async function readAccountsFromFiles(): Promise<SavingsAccount[]> {
  await ensureStorageDir();
  const files = (await fs.readdir(storageDir)).filter((name) => name.endsWith(".json")).sort();

  const accounts = (
    await Promise.all(
      files.map(async (fileName) => {
        try {
          const raw = await fs.readFile(path.join(storageDir, fileName), "utf8");
          const parsed = JSON.parse(raw) as Partial<SavingsAccountFile> | Partial<SavingsAccount>;

          const maybeWrapped = parsed as Partial<SavingsAccountFile>;
          const maybeDirect = parsed as Partial<SavingsAccount>;
          const normalized = normalizeAccount(
            maybeWrapped.data && typeof maybeWrapped.data === "object"
              ? maybeWrapped.data
              : maybeDirect
          );

          return normalized;
        } catch {
          return null;
        }
      })
    )
  ).filter((account): account is SavingsAccount => Boolean(account));

  return accounts;
}

async function readPayload(): Promise<SavingsPayload> {
  const accountsFromFiles = await readAccountsFromFiles();
  if (accountsFromFiles.length > 0) {
    return { accounts: accountsFromFiles };
  }

  const legacyAccounts = await readLegacyAccounts();
  if (legacyAccounts.length > 0) {
    await writeAccountsToFiles(legacyAccounts);
    return { accounts: legacyAccounts };
  }

  await writeAccountsToFiles(defaultPayload.accounts);
  return { accounts: defaultPayload.accounts };
}

async function writePayload(payload: SavingsPayload) {
  await writeAccountsToFiles(payload.accounts);
}

export async function GET() {
  const payload = await readPayload();
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      account?: Partial<SavingsAccount>;
      accounts?: SavingsAccount[];
    };

    const current = await readPayload();

    if (Array.isArray(body.accounts)) {
      const normalizedAccounts = body.accounts
        .map((account) => normalizeAccount(account))
        .filter((account): account is SavingsAccount => Boolean(account));
      const next = { accounts: normalizedAccounts };
      await writePayload(next);
      return NextResponse.json(next);
    }

    if (body.account) {
      const normalized = normalizeAccount(body.account);

      if (!normalized) {
        return NextResponse.json(
          { error: "Donnees invalides pour le compte d'epargne" },
          { status: 400 }
        );
      }

      const next: SavingsPayload = {
        ...current,
        accounts: [
          ...current.accounts,
          normalized,
        ],
      };

      await writePayload(next);
      return NextResponse.json(next);
    }

    return NextResponse.json({ error: "Aucune donnee a sauvegarder" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Impossible de sauvegarder l'epargne" }, { status: 500 });
  }
}
