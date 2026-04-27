import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    
    // Aggregate hashtags from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trends = await Post.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $unwind: "$hashtags" },
      { $group: { _id: "$hashtags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return NextResponse.json(trends.map(t => ({
      name: t._id,
      count: t.count
    })));
  } catch (error) {
    console.error("Trends API Error:", error);
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
  }
}
