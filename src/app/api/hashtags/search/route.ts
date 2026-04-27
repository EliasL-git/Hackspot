import dbConnect from "@/lib/db";
import Post from "@/models/Post";
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
    // Find unique hashtags that start with the query across all posts
    const results = await Post.aggregate([
      { $unwind: "$hashtags" },
      { $match: { hashtags: { $regex: `^${query}`, $options: "i" } } },
      { $group: { _id: "$hashtags" } },
      { $limit: 5 }
    ]);

    const tags = results.map(r => r._id);
    return NextResponse.json(tags);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch hashtags" }, { status: 500 });
  }
}