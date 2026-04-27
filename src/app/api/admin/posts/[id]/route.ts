import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";
import Notification from "@/models/Notification";
import AuditLog from "@/models/AuditLog";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import mongoose from "mongoose";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  
  const userId = session.user.id;
  const query: any[] = [{ id: userId }];
  if (mongoose.Types.ObjectId.isValid(userId)) {
    query.push({ _id: userId });
  }

  const adminUser = await User.findOne({ $or: query });
  if (!adminUser?.tags?.includes('admin') && !adminUser?.tags?.includes('owner')) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const post = await Post.findById(id);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const reporters = post.reports || [];
    await Post.findByIdAndDelete(id);

    await AuditLog.create({
      adminId: adminUser.id,
      adminName: adminUser.name,
      action: 'DELETE_POST',
      targetId: id,
      targetType: 'Post',
      details: { authorId: post.author.id, contentExcerpt: post.content?.substring(0, 50) }
    });

    if (reporters.length > 0) {
      const orpheus = await User.findOne({ slackId: 'orpheus' });
      if (orpheus) {
        for (const reporterId of reporters) {
          const reporter = await User.findOne({ $or: [{ id: reporterId }, { _id: reporterId }] });
          if (reporter) {
            const handle = reporter.slackId || reporter.name.replace(/\s+/g, '').toLowerCase();
            const content = `@${handle} Hey we saw your report and decided to take action`;
            
            const sysPost = await Post.create({
              content,
              author: {
                id: orpheus.id,
                name: orpheus.name,
                image: orpheus.image,
                slackId: orpheus.slackId,
                verificationStatus: orpheus.verificationStatus,
                tags: orpheus.tags || ['bot'],
                equippedTag: orpheus.equippedTag || (orpheus.tags && orpheus.tags[0]),
              },
              createdAt: new Date()
            });

            await Notification.create({
              recipient: reporter.id || reporter._id.toString(),
              sender: {
                id: orpheus.id,
                name: orpheus.name,
                image: orpheus.image,
              },
              type: 'mention',
              post: sysPost._id,
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
