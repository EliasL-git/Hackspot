import dbConnect from "@/lib/db";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  if (query.length < 1) {
    return NextResponse.json([]);
  }

  await dbConnect();
  try {
    // Find users whose slackId/handle starts with the query
    // We only return public identifies (name, slackId) for privacy
    const users = await User.find({
      slackId: { $regex: `^${query}`, $options: "i" }
    })
    .select("name slackId")
    .limit(5)
    .lean();

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
