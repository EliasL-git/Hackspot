import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";
import { notFound } from "next/navigation";
import { UserTag } from "@/components/UserTag";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  await dbConnect();
  const post = await Post.findById(resolvedParams.id).lean();
  if (!post) return notFound();

  const authorUser = await User.findOne({ id: post.author.id }).lean();

  return (
    <div className="min-h-screen bg-background p-6 text-on-surface">
      <div className="max-w-3xl mx-auto bg-surface p-6 rounded-3xl shadow-lg border border-outline-variant/20">
        <div className="flex items-center gap-3 mb-4">
          <img src={post.author.image || "https://www.gravatar.com/avatar/?d=identicon&s=80"} alt={post.author.name} className="w-12 h-12 rounded-full" />
          <div>
            <div className="flex items-center gap-1">
              <div className="font-headline font-bold text-lg">{post.author.name}</div>
              {post.author.verificationStatus === "verified" && (
                <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} title="Verified notable member">verified</span>
              )}
            </div>
            <div className="text-sm text-on-surface-variant">@{post.author.slackId || post.author.name.toLowerCase()}</div>
            {Array.isArray(authorUser?.tags) && (authorUser.equippedTag || authorUser.tags[0]) && (
              <UserTag tag={authorUser.equippedTag || authorUser.tags[0]} className="mt-1" />
            )}
          </div>
        </div>
        <div className="whitespace-pre-wrap text-base mb-4">{post.content}</div>
        <div className="text-sm text-on-surface-variant">Posted on {new Date(post.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
}
