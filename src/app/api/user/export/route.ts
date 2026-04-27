import dbConnect from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const userId = session.user.id;
    
    // Better-Auth stores the user ID in _id when using MongoDB
    // Mongoose throws CastError if we pass a non-ObjectId string to _id
    const query: any[] = [{ id: userId }];
    
    if (mongoose.Types.ObjectId.isValid(userId)) {
      query.push({ _id: userId });
    }

    const user = await User.findOne({ $or: query }).lean();
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all posts by the user
    const posts = await Post.find({ "author.id": user.id || (user._id ? user._id.toString() : userId) }).lean();

    const exportData = {
      user: {
        name: user.name,
        email: user.email,
        slackId: user.slackId,
        githubUsername: user.githubUsername,
        githubStats: user.githubStats,
        tags: user.tags,
        equippedTag: user.equippedTag,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      posts: posts.map((post: any) => ({
        id: post._id,
        content: post.content,
        media: post.media,
        likes: post.likes?.length || 0,
        reposts: post.reposts?.length || 0,
        viewCount: post.viewCount || 0,
        createdAt: post.createdAt,
      }))
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="hackspot-export-${user.slackId || user.id || user._id || 'data'}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
