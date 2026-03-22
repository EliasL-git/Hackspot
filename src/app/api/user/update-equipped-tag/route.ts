import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tag } = await req.json();

  await dbConnect();

  // Verify the user actually has this tag
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (tag !== null && !user.tags?.includes(tag)) {
    return NextResponse.json({ error: "You don't have this tag" }, { status: 400 });
  }

  await User.findByIdAndUpdate(session.user.id, { $set: { equippedTag: tag } });

  return NextResponse.json({ success: true });
}
