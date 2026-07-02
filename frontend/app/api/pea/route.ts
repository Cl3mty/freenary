import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

type PeaData = {
  evaluation_totale: string;
  solde_espece: string;
  solde_titres: string;
};

const peaDir = path.join(process.cwd(), "..", "data", "portfolio");
const peaFilePath = path.join(peaDir, "stocksFunds.json");

const fallbackData: PeaData = {
  evaluation_totale: "0 EUR",
  solde_espece: "0 EUR",
  solde_titres: "0 EUR",
};

async function ensureFile() {
  await fs.mkdir(peaDir, { recursive: true });
  try {
    await fs.access(peaFilePath);
  } catch {
    await fs.writeFile(peaFilePath, `${JSON.stringify(fallbackData, null, 2)}\n`, "utf8");
  }
}

export async function GET() {
  await ensureFile();

  try {
    const raw = await fs.readFile(peaFilePath, "utf8");
    const data = JSON.parse(raw) as Partial<PeaData>;

    const normalized: PeaData = {
      evaluation_totale: data.evaluation_totale || fallbackData.evaluation_totale,
      solde_espece: data.solde_espece || fallbackData.solde_espece,
      solde_titres: data.solde_titres || fallbackData.solde_titres,
    };

    return NextResponse.json({ status: 200, dataPea: normalized });
  } catch {
    return NextResponse.json({ status: 200, dataPea: fallbackData });
  }
}
