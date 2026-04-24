import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  
  const adminUser = await User.findOne({ id: session.user.id });
  if (!adminUser?.tags?.includes('admin') && !adminUser?.tags?.includes('owner')) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
