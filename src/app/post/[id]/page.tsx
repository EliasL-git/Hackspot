import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";
import { notFound } from "next/navigation";
import { UserTag } from "@/components/UserTag";
import Link from "next/link";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  await dbConnect();
  const post = await Post.findById(resolvedParams.id).lean() as any;
  if (!post) return notFound();

  const authorUser = await User.findOne({ id: post.author.id }).lean() as any;

  const renderContent = (content: string, author: any) => {
    if (!content) return null;
    return content.split(/(\s+)/).map((part, i) => {
      // Hashtags
      if (part.startsWith("#")) {
        const tag = part.slice(1);
        return (
          <Link
            key={i}
            href={`/hashtags#${tag}`}
            className="text-primary hover:underline font-bold decoration-2 underline-offset-4"
          >
            {part}
          </Link>
        );
      }
      
      // Mentions
      if (part.startsWith("@") && part.length > 1) {
        const handle = part.slice(1).replace(/[^\w\d]/g, ""); // Clean the handle
        return (
          <Link
            key={i}
            href={`/u/${handle}`}
            className="text-secondary font-bold hover:underline cursor-pointer"
          >
            {part}
          </Link>
        );
      }

      // $lines command
      if (part === "$lines") {
        if (author?.slackId === 'orpheus') {
          return (
            <span key={i} className="text-primary-dim font-mono font-bold">
              {part}
            </span>
          );
        }
        const count = author?.githubStats?.totalLines || 0;
        return (
          <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-mono font-bold text-sm">
            <span className="material-symbols-outlined text-[16px]">code</span>
            {count.toLocaleString()} lines
          </span>
        );
      }

      // $repo command
      if (part.startsWith("$repo")) {
        return (
          <span key={i} className="text-primary-dim font-mono font-bold">
            {part}
          </span>
        );
      }

      return part;
    });
  };

  return (
    <div className="min-h-screen bg-background p-6 text-on-surface">
      <div className="max-w-3xl mx-auto bg-surface p-6 rounded-3xl shadow-lg border border-outline-variant/20">
        <Link href="/" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-6">
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </Link>
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
        <div className="whitespace-pre-wrap text-base mb-4">{renderContent(post.content, authorUser || post.author)}</div>
        
        {post.media && post.media.length > 0 && (
          <div className="mt-3 grid gap-2 grid-cols-2 mb-4">
            {post.media.map((m: any, i: number) => {
              const src = m.url.startsWith('http') ? m.url : `https://${m.url}`;
              return <img key={i} src={src} alt="Post media" className="rounded-xl max-h-96 object-cover w-full" />
            })}
          </div>
        )}

        {post.ogData && (
          <a href={post.ogData.url} target="_blank" rel="noopener noreferrer" className="mb-4 block border border-outline-variant/20 rounded-xl overflow-hidden hover:bg-surface-container-low/50 transition-colors">
            {post.ogData.image && (
              <img src={post.ogData.image} alt={post.ogData.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-4">
              <h4 className="font-bold text-primary truncate">{post.ogData.title}</h4>
              <p className="text-sm text-on-surface-variant line-clamp-2 mt-1">{post.ogData.description}</p>
              <span className="text-xs text-on-surface-variant/60 mt-2 block truncate">{post.ogData.url}</span>
            </div>
          </a>
        )}

        <div className="text-sm text-on-surface-variant">Posted on {new Date(post.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
}