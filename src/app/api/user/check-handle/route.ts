import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle")?.toLowerCase();

  if (!handle) {
    return NextResponse.json({ available: false }, { status: 400 });
  }

  await dbConnect();
  try {
    const existingUser = await User.findOne({ slackId: handle });
    return NextResponse.json({ available: !existingUser });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
