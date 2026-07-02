import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

type Loan = {
  id: string;
  name: string;
  capital: number;
  apport: number;
  taeg: number;
  termMonths: number;
  deferredMonths: number;
  insuranceMonthly: number;
  dossierFees: number;
  firstPaymentDate: string;
  createdAt: string;
};

type LoanFile = {
  name: string;
  data: Loan;
  updatedAt: string;
};

const storageDir = path.join(process.cwd(), "..", "data", "debts", "loans");
const previousStorageDir = path.join(process.cwd(), "..", "data", "portfolio", "debts", "loans");

function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || "Emprunt";
  return trimmed.replace(/[\\/:*?"<>|]/g, "_");
}

function normalizeDate(value: unknown): string {
  const asString = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asString)) {
    return "";
  }
  return asString;
}

function normalizeLoan(input: Partial<Loan>): Loan | null {
  const name = String(input.name || "").trim();
  const capital = Number(input.capital);
  const apport = Number(input.apport);
  const taeg = Number(input.taeg);
  const termMonths = Number(input.termMonths);
  const deferredMonths = Number(input.deferredMonths);
  const insuranceMonthly = Number(input.insuranceMonthly);
  const dossierFees = Number(input.dossierFees);
  const firstPaymentDate = normalizeDate(input.firstPaymentDate);

  if (!name || !Number.isFinite(capital) || capital <= 0) return null;
  if (!Number.isFinite(apport) || apport < 0) return null;
  if (!Number.isFinite(taeg) || taeg < 0) return null;
  if (!Number.isFinite(termMonths) || termMonths <= 0) return null;
  if (!Number.isFinite(deferredMonths) || deferredMonths < 0) return null;
  if (!Number.isFinite(insuranceMonthly) || insuranceMonthly < 0) return null;
  if (!Number.isFinite(dossierFees) || dossierFees < 0) return null;
  if (!firstPaymentDate) return null;

  return {
    id: input.id || randomUUID(),
    name,
    capital,
    apport,
    taeg,
    termMonths: Math.round(termMonths),
    deferredMonths: Math.round(deferredMonths),
    insuranceMonthly,
    dossierFees,
    firstPaymentDate,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

async function ensureStorageDir() {
  await fs.mkdir(storageDir, { recursive: true });
}

async function migratePreviousStorageDirIfNeeded() {
  await ensureStorageDir();

  let newDirFiles: string[] = [];
  try {
    newDirFiles = (await fs.readdir(storageDir)).filter((name) => name.endsWith(".json"));
  } catch {
    newDirFiles = [];
  }

  if (newDirFiles.length > 0) {
    return;
  }

  let oldDirFiles: string[] = [];
  try {
    oldDirFiles = (await fs.readdir(previousStorageDir)).filter((name) => name.endsWith(".json"));
  } catch {
    oldDirFiles = [];
  }

  if (oldDirFiles.length === 0) {
    return;
  }

  await Promise.all(
    oldDirFiles.map(async (fileName) => {
      const from = path.join(previousStorageDir, fileName);
      const to = path.join(storageDir, fileName);
      await fs.rename(from, to);
    })
  );
}

async function readLoanFromFile(filePath: string): Promise<Loan | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LoanFile> | Partial<Loan>;
    const wrapped = parsed as Partial<LoanFile>;
    const direct = parsed as Partial<Loan>;

    const normalized = normalizeLoan(
      wrapped.data && typeof wrapped.data === "object" ? wrapped.data : direct
    );

    return normalized;
  } catch {
    return null;
  }
}

async function writeLoanToFile(loan: Loan, index: number, used: Set<string>) {
  const base = sanitizeFileName(loan.name);
  let candidate = base;
  let suffix = 2;

  while (used.has(candidate.toLowerCase())) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate.toLowerCase());

  const payload: LoanFile = {
    name: loan.name,
    data: loan,
    updatedAt: new Date().toISOString(),
  };

  const prefix = String(index + 1).padStart(3, "0");
  const filePath = path.join(storageDir, `${prefix}-${candidate}.json`);
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function readAllLoans(): Promise<Loan[]> {
  await migratePreviousStorageDirIfNeeded();
  await ensureStorageDir();
  const files = (await fs.readdir(storageDir)).filter((name) => name.endsWith(".json")).sort();

  const loans = (
    await Promise.all(files.map((fileName) => readLoanFromFile(path.join(storageDir, fileName))))
  ).filter((loan): loan is Loan => Boolean(loan));

  if (loans.length > 0) {
    return loans;
  }

  return [];
}

async function writeAllLoans(loans: Loan[]) {
  await ensureStorageDir();
  const existingFiles = (await fs.readdir(storageDir)).filter((name) => name.endsWith(".json"));
  await Promise.all(existingFiles.map((fileName) => fs.unlink(path.join(storageDir, fileName))));

  const usedNames = new Set<string>();
  await Promise.all(loans.map((loan, index) => writeLoanToFile(loan, index, usedNames)));
}

export async function GET() {
  try {
    const loans = await readAllLoans();
    return NextResponse.json({ loans });
  } catch {
    return NextResponse.json({ loans: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { loan?: Partial<Loan> };
    const normalized = normalizeLoan(body.loan || {});

    if (!normalized) {
      return NextResponse.json({ error: "Donnees invalides pour l'emprunt" }, { status: 400 });
    }

    const current = await readAllLoans();
    const next = [...current, normalized];
    await writeAllLoans(next);

    return NextResponse.json({ loans: next });
  } catch {
    return NextResponse.json({ error: "Impossible de sauvegarder l'emprunt" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = String(request.nextUrl.searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id manquant" }, { status: 400 });
    }

    const current = await readAllLoans();
    const next = current.filter((loan) => loan.id !== id);

    await writeAllLoans(next);
    return NextResponse.json({ loans: next });
  } catch {
    return NextResponse.json({ error: "Impossible de supprimer l'emprunt" }, { status: 500 });
  }
}
