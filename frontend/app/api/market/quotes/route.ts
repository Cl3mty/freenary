import { NextRequest, NextResponse } from "next/server";

type QuotesResponse = {
  quotes: Record<string, number>;
};

export async function GET(request: NextRequest) {
  const rawIsins = request.nextUrl.searchParams.get("isins") || "";
  const isins = rawIsins
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (isins.length === 0) {
    return NextResponse.json<QuotesResponse>({ quotes: {} });
  }

  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL;
  if (!pythonBackendUrl) {
    // Backend Python not configured yet: return empty quotes gracefully.
    return NextResponse.json<QuotesResponse>({ quotes: {} });
  }

  try {
    const response = await fetch(
      `${pythonBackendUrl.replace(/\/$/, "")}/market/quotes?isins=${encodeURIComponent(isins.join(","))}`,
      { method: "GET", cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json<QuotesResponse>({ quotes: {} });
    }

    const payload = (await response.json()) as { quotes?: Record<string, number> };
    return NextResponse.json<QuotesResponse>({ quotes: payload.quotes || {} });
  } catch {
    return NextResponse.json<QuotesResponse>({ quotes: {} });
  }
}
