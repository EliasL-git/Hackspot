import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { optionIndex } = await req.json();

  if (typeof optionIndex !== 'number') {
    return NextResponse.json({ error: "Option index is required" }, { status: 400 });
  }

  await dbConnect();

  try {
    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!post.poll) {
      return NextResponse.json({ error: "Post does not contain a poll" }, { status: 400 });
    }

    if (optionIndex < 0 || optionIndex >= post.poll.options.length) {
      return NextResponse.json({ error: "Invalid option index" }, { status: 400 });
    }

    const userId = session.user.id;

    // Remove user's vote from any other option
    post.poll.options.forEach((option: any) => {
      option.votes = option.votes.filter((v: string) => v !== userId);
    });

    // Add vote to selected option
    post.poll.options[optionIndex].votes.push(userId);

    await post.save();

    return NextResponse.json({ success: true, poll: post.poll });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
