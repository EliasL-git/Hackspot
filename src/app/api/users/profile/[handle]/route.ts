import dbConnect from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import { NextRequest, NextResponse } from "next/server";
import md5 from "md5";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  await dbConnect();
  try {
    const { handle } = await params;
    
    // Find the user by their slackId (handle)
    const user = await User.findOne({ slackId: handle.toLowerCase() }).lean();
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get their posts
    const posts = await Post.find({ "author.id": user.id || user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Generate Gravatar
    const gravatar = `https://www.gravatar.com/avatar/${md5(user.email.toLowerCase().trim())}?d=identicon&s=200`;

    // Enrich posts with the user's latest data (like githubStats)
    const enrichedPosts = posts.map((post: any) => ({
      ...post,
      author: {
        ...post.author,
        image: user.image || gravatar,
        tags: user.tags || [],
        equippedTag: user.equippedTag || (user.tags && user.tags[0]),
        verificationStatus: user.verificationStatus,
        githubStats: user.githubStats || null,
      }
    }));

    return NextResponse.json({
      user: {
        ...user,
        image: user.image || gravatar
      },
      posts: enrichedPosts
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}