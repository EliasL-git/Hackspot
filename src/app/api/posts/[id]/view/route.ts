import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await dbConnect();

  try {
    let userId = null;
    try {
      const session = await auth.api.getSession({ headers: await headers() });
      if (session?.user) {
        userId = session.user.id;
      }
    } catch (e) {
      // Ignore auth errors for views (anonymous view)
    }

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let updated = false;

    if (userId) {
      const hasViewed = post.views?.includes(userId);
      if (!hasViewed) {
        post.views = post.views || [];
        post.views.push(userId);
        post.viewCount = (post.viewCount || 0) + 1;
        updated = true;
      }
    } else {
      // Anonymous view
      post.viewCount = (post.viewCount || 0) + 1;
      updated = true;
    }

    if (updated) {
      await post.save();
    }

    return NextResponse.json({ success: true, viewCount: post.viewCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
