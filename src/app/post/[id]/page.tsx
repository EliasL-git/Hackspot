import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";
import { notFound } from "next/navigation";

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
            <div className="font-bold text-lg">{post.author.name}</div>
            <div className="text-sm text-on-surface-variant">@{post.author.slackId || post.author.name.toLowerCase()}</div>
            {authorUser?.tags?.length > 0 && (
              <div className="flex gap-2 mt-1">{authorUser.tags.map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full border" title={tag === 'bot' ? 'Official system bot account' : tag === 'owner' ? 'Owner account' : ''}>
                  {tag}
                </span>
              ))}</div>
            )}
          </div>
        </div>
        <div className="whitespace-pre-wrap text-base mb-4">{post.content}</div>
        <div className="text-sm text-on-surface-variant">Posted on {new Date(post.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
}
