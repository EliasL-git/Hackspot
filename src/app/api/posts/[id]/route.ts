import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  try {
    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Only original author can delete
    if (post.author.id !== session.user.id) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await post.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
