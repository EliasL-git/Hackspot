import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  
  const adminUser = await User.findOne({ id: session.user.id });
  if (!adminUser?.tags?.includes('admin') && !adminUser?.tags?.includes('owner')) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await Post.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
