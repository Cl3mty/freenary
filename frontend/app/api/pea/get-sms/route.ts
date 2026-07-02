import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: 200,
    message: "Code SMS envoye (mode local)",
    hint: "Utilisez le code 123456 pour la demo.",
  });
}
