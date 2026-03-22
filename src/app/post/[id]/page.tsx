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
            {Array.isArray(authorUser?.tags) && (authorUser.equippedTag || authorUser.tags[0]) && (
              (() => {
                const displayTag = authorUser.equippedTag || authorUser.tags[0];
                const tagMetadata: Record<string, { icon: string, label: string, color: string, desc: string }> = {
                  bot: { icon: 'smart_toy', label: 'Bot', color: 'bg-blue-900 text-blue-300 border-blue-400', desc: 'This is an official Hackspot bot account.' },
                  owner: { icon: 'workspace_premium', label: 'Owner', color: 'bg-yellow-900 text-yellow-300 border-yellow-400', desc: 'This user is the owner of Hackspot.' },
                  hackclubstaff: { icon: 'badge', label: 'Staff', color: 'bg-red-900 text-red-300 border-red-400', desc: 'This user is a member of the Hack Club staff team. They do not have any control over Hackspot.' },
                  contributor: { icon: 'terminal', label: 'Contributor', color: 'bg-green-900 text-green-300 border-green-400', desc: 'This user has contributed to the Hackspot codebase.' },
                  notable: { icon: 'star', label: 'Notable', color: 'bg-purple-900 text-purple-300 border-purple-400', desc: 'A recognized member of the community.' },
                  verified: { icon: 'verified', label: 'Verified', color: 'bg-primary/20 text-primary border-primary/30', desc: 'Identity verified by Hackspot.' }
                };
                const meta = tagMetadata[displayTag] || { icon: 'label', label: displayTag.charAt(0).toUpperCase() + displayTag.slice(1), color: 'bg-surface-container-highest text-on-surface-variant/60 border-outline-variant/20', desc: `Tag: ${displayTag}` };
                
                return (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold mt-1 border ${meta.color}`}
                    title={meta.desc}
                  >
                    <span className="material-symbols-outlined text-[16px] align-middle">{meta.icon}</span>
                    {meta.label}
                  </span>
                );
              })()
            )}
          </div>
        </div>
        <div className="whitespace-pre-wrap text-base mb-4">{post.content}</div>
        <div className="text-sm text-on-surface-variant">Posted on {new Date(post.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
}
