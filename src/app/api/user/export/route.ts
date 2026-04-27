import dbConnect from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    // Better-Auth stores the user ID in _id when using MongoDB
    const user = await User.findOne({ 
      $or: [
        { id: session.user.id },
        { _id: session.user.id }
      ]
    }).lean();
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all posts by the user
    const posts = await Post.find({ "author.id": user.id || user._id.toString() }).lean();

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
        "Content-Disposition": `attachment; filename="hackspot-export-${user.slackId || user.id || user._id}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
