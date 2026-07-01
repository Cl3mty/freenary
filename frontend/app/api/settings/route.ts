import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type SettingsData = {
  email: string;
  currency: string;
  activeTabs: string[];
};

const DEFAULT_SETTINGS: SettingsData = {
  email: "baptiste@freenary.app",
  currency: "EUR",
  activeTabs: [
    "Actions & Fonds",
    "Startups & PME",
    "Immobilier",
    "Crypto",
    "Metaux precieux",
    "Epargne",
    "Autres",
    "Emprunts",
  ],
};

function getSettingsPath() {
  const dirPath = path.join(process.cwd(), "..", "data", "settings");
  const settingsPath = path.join(dirPath, "settings.json");
  return { dirPath, settingsPath };
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function GET() {
  try {
    const { dirPath, settingsPath } = getSettingsPath();
    ensureDir(dirPath);

    let settings = DEFAULT_SETTINGS;
    if (fs.existsSync(settingsPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Partial<SettingsData>;
        settings = {
          email: parsed.email || DEFAULT_SETTINGS.email,
          currency: parsed.currency || DEFAULT_SETTINGS.currency,
          activeTabs: Array.isArray(parsed.activeTabs) ? parsed.activeTabs : DEFAULT_SETTINGS.activeTabs,
        };
      } catch {
        settings = DEFAULT_SETTINGS;
      }
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de charger les reglages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      settings?: Partial<SettingsData>;
    };

    const { dirPath, settingsPath } = getSettingsPath();
    ensureDir(dirPath);

    const previous = fs.existsSync(settingsPath)
      ? (JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Partial<SettingsData>)
      : {};

    const merged: SettingsData = {
      email: body.settings?.email || previous.email || DEFAULT_SETTINGS.email,
      currency: body.settings?.currency || previous.currency || DEFAULT_SETTINGS.currency,
      activeTabs: Array.isArray(body.settings?.activeTabs)
        ? body.settings.activeTabs
        : Array.isArray(previous.activeTabs)
          ? previous.activeTabs
          : DEFAULT_SETTINGS.activeTabs,
    };

    fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), "utf8");

    return NextResponse.json({ success: true, settings: merged });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de sauvegarder les reglages" }, { status: 500 });
  }
}
