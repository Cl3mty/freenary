import { NextRequest, NextResponse } from "next/server";

const DEMO_SMS_CODE = "123456";

function isValid(code: string) {
  return code.trim() === DEMO_SMS_CODE;
}

export async function GET(request: NextRequest) {
  const smsCode = request.nextUrl.searchParams.get("smsCode") ?? "";

  if (isValid(smsCode)) {
    return NextResponse.json({ status: 200, connected: true });
  }

  return NextResponse.json({ status: 401, connected: false, message: "Code invalide" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { smsCode?: string };
  const smsCode = body.smsCode ?? "";

  if (isValid(smsCode)) {
    return NextResponse.json({ status: 200, connected: true });
  }

  return NextResponse.json({ status: 401, connected: false, message: "Code invalide" }, { status: 401 });
}
