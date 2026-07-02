import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

type IsinEntry = {
  isin: string;
  name: string;
};

const filePath = path.join(process.cwd(), "..", "data", "portfolio", "isinCatalog.json");

async function readCatalog(): Promise<IsinEntry[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IsinEntry[]) : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().toUpperCase();
  const catalog = await readCatalog();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const results = catalog
    .filter((entry) => {
      const isin = entry.isin.toUpperCase();
      const name = entry.name.toUpperCase();
      return isin.includes(query) || name.includes(query);
    })
    .slice(0, 10);

  return NextResponse.json({ results });
}
