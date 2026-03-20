"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import dynamic from "next/dynamic";

interface Post {
  _id: string;
  content: string;
  author: {
    name: string;
    image?: string;
    slackId?: string;
    verificationStatus?: string;
  };
  createdAt: string;
}

function HashtagPage() {
  const [hashtag, setHashtag] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    // Read the hashtag from the URL hash (e.g., /hashtags#test)
    const updateHashtag = () => {
      const hash = decodeURIComponent(window.location.hash.replace("#", ""));
      setHashtag(hash);
    };

    updateHashtag();
    window.addEventListener("hashchange", updateHashtag);
    return () => window.removeEventListener("hashchange", updateHashtag);
  }, []);

  useEffect(() => {
    if (!hashtag) return;

    const fetchHashtagPosts = async () => {
      setLoading(true);
      try {
        // Encode hashtag to handle special characters or multiple words
        const res = await fetch(`/api/posts?hashtag=${encodeURIComponent(hashtag.toLowerCase())}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setPosts(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHashtagPosts();
  }, [hashtag]);

  if (isPending) return null;

  const renderContent = (content: string) => {
    return content.split(/(\s+)/).map((part, i) => {
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
      return part;
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      {/* Sidebar (Simple version) */}
      <aside className="hidden xl:flex flex-col h-screen sticky top-0 p-8 space-y-2 bg-surface w-80 border-r border-outline-variant/15 justify-between flex-shrink-0">
        <div>
          <Link href="/" className="text-[#ec3750] font-black text-4xl mb-12 font-headline px-4 block">Hackspot</Link>
          <nav className="space-y-1">
            <Link className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg" href="/">
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Back to Home</span>
            </Link>
          </nav>
        </div>
      </aside>

      <main className="flex-1 border-r border-outline-variant/15 min-w-0 max-w-[800px]">
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-6 py-6 border-b border-outline-variant/15">
          <div className="flex items-center gap-4">
            <h1 className="font-headline font-black text-3xl tracking-tight text-primary">#{hashtag}</h1>
          </div>
        </header>

        {loading ? (
          <div className="p-12 text-center text-on-surface-variant italic">Searching for #{hashtag}...</div>
        ) : (
          <div className="divide-y divide-outline-variant/15">
            {posts.length > 0 ? (
              posts.map((post) => (
                <article key={post._id} className="p-6 flex gap-4 hover:bg-surface-container-low/50 transition-colors border-b border-outline-variant/10">
                  <div className="w-12 h-12 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center overflow-hidden ring-2 ring-primary/10 transition-all">
                    <img src={post.author.image} alt={post.author.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold font-headline text-lg text-on-surface">{post.author.name}</span>
                      {post.author.verificationStatus === "verified" && (
                        <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                      )}
                      <span className="text-on-surface-variant/40 font-body text-sm">· {new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-on-surface text-lg font-body mb-4 leading-relaxed whitespace-pre-wrap">{renderContent(post.content)}</div>
                  </div>
                </article>
              ))
            ) : (
              <div className="p-20 text-center">
                <span className="material-symbols-outlined text-7xl mb-4 opacity-20 text-on-surface-variant">search_off</span>
                <h3 className="text-2xl font-headline font-bold mb-2">No posts found</h3>
                <p className="text-on-surface-variant">Be the first to use the <span className="text-primary font-bold">#{hashtag}</span> tag!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(HashtagPage), { ssr: false });
