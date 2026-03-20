import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
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

    const userId = session.user.id;
    const hasLiked = post.likes.includes(userId);

    if (hasLiked) {
      // Unlike
      post.likes = post.likes.filter((uid: string) => uid !== userId);
    } else {
      // Like
      post.likes.push(userId);
    }

    await post.save();
    return NextResponse.json({ likes: post.likes.length, hasLiked: !hasLiked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
