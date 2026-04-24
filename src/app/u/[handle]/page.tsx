"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { User, ShieldCheck, Mail, Slack, X, Calendar, Code, ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MD5 } from "crypto-js";
import { UserTag } from "@/components/UserTag";

function PublicProfileContent() {
  const params = useParams();
  const handle = params.handle as string;
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (handle) {
      fetch(`/api/users/profile/${handle}`)
        .then(res => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then(data => {
          setProfile(data.user);
          setPosts(data.posts);
        })
        .catch(err => {
          console.error(err);
          setError(true);
        })
        .finally(() => setIsLoading(false));
    }
  }, [handle]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-black font-headline mb-4">User Not Found</h1>
        <p className="text-on-surface-variant mb-8 text-lg">We couldn't find a hacker with the handle @{handle}.</p>
        <Link href="/" className="bg-primary text-on-primary-fixed px-8 py-3 rounded-full font-headline font-bold">
          Go Home
        </Link>
      </div>
    );
  }

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
            onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => e.stopPropagation()}
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

      // $help command
      if (part === "$help") {
        return (
          <div key={i} className="my-2 p-3 bg-card-light rounded-lg border-2 border-primary/20 text-sm">
            <h4 className="font-bold flex items-center gap-2 mb-2 text-primary">
              <span className="material-symbols-outlined text-[18px]">help</span>
              Hackspot Commands
            </h4>
            <ul className="space-y-1 text-muted-foreground font-mono">
              <li><span className="text-primary font-bold">$lines</span> — Show your GitHub code count</li>
              <li><span className="text-primary font-bold">$repo [url]</span> — Link a GitHub repository</li>
              <li><span className="text-primary font-bold">$github</span> — Show your GitHub username and stats</li>
              <li><span className="text-primary font-bold">#hashtag</span> — Tag your posts to trend</li>
              <li><span className="text-primary font-bold">@handle</span> — Mention other Hack Clubbers</li>
            </ul>
            <div className="mt-3 text-xs text-muted-foreground">
              <b>$github</b> will show your GitHub username and a summary of your public stats, including your total lines of code, as synced by Hackspot. If you haven't connected your GitHub, it will prompt you to do so.
            </div>
          </div>
        );
      }

      return part;
    });
  };

  return (
    <div className="flex min-h-screen max-w-[1440px] mx-auto bg-background text-on-surface">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 p-6 space-y-2 bg-surface w-72 border-r border-outline-variant/15">
        <Link href="/" className="text-[#ec3750] font-black text-3xl mb-8 font-headline">Hackspot</Link>
        <nav className="flex-1 space-y-1">
          <Link href="/" className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg">
            <span className="material-symbols-outlined">home</span>
            <span>Home</span>
          </Link>
          <Link href="/notifications" className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg">
            <span className="material-symbols-outlined">notifications</span>
            <span>Notifications</span>
          </Link>
          <Link href="/profile" className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg">
            <span className="material-symbols-outlined">person</span>
            <span>Profile</span>
          </Link>
          <Link href="/settings" className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg">
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </Link>
        </nav>
      </aside>

      <main className="flex-1 border-r border-outline-variant/15 min-w-0">
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-4 py-2 flex items-center gap-8 border-b border-outline-variant/10">
          <Link href="/" className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="font-headline font-black text-xl tracking-tight">{profile.name}</h1>
            <p className="text-on-surface-variant text-sm font-label">{posts.length} Posts</p>
          </div>
        </header>

        <section className="relative">
          {/* Banner */}
          <div className="h-48 md:h-64 bg-gradient-to-br from-primary/10 to-secondary/10 w-full" />

          <div className="px-4 pb-6">
            <div className="flex justify-between items-start">
              <div className="relative -mt-16 md:-mt-20">
                <div className="p-1 bg-background rounded-full">
                  <img 
                    src={profile.image} 
                    alt={profile.name} 
                    className="w-24 h-24 md:w-36 md:h-36 rounded-full border-4 border-background object-cover bg-surface-container shadow-xl" 
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <h2 className="font-headline font-black text-3xl flex items-center gap-1 group">
                  {profile.name}
                  {profile.verificationStatus === "verified" && (
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }} title="Verified notable member">verified</span>
                  )}
                  {Array.isArray(profile.tags) && (profile.equippedTag || profile.tags[0]) && (
                    <UserTag tag={profile.equippedTag || profile.tags[0]} />
                  )}
                </h2>
                <p className="text-on-surface-variant font-label text-lg" title="Username">@{profile.slackId}</p>
              </div>

              <p className="text-on-surface max-w-xl text-lg font-body leading-relaxed opacity-80">
                Hack Clubber. Building awesome things.
              </p>

              <div className="flex flex-wrap gap-y-2 gap-x-4 text-on-surface-variant font-label text-sm pt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined March 2026</span>
                </div>
                {profile.githubStats?.totalLines > 0 && (
                  <div className="flex items-center gap-1 text-primary">
                    <Code className="w-4 h-4" />
                    <span>{profile.githubStats.totalLines.toLocaleString()} Lines Written</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <nav className="flex border-b border-outline-variant/15 font-headline font-bold sticky top-[60px] bg-surface/80 backdrop-blur-md z-30">
          <button className="flex-1 py-4 text-center hover:bg-white/5 transition-colors relative">
            Posts
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full"></div>
          </button>
          <button className="flex-1 py-4 text-center text-on-surface-variant hover:bg-white/5 transition-colors">Media</button>
          <button className="flex-1 py-4 text-center text-on-surface-variant hover:bg-white/5 transition-colors">Likes</button>
        </nav>

        <div className="divide-y divide-outline-variant/15">
          {posts.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant/40 italic font-body">
              No activity yet.
            </div>
          ) : (
            posts.map((post) => (
              <article 
                key={post._id} 
                className="p-6 flex gap-4 hover:bg-surface-container-low/50 transition-colors cursor-pointer group border-b border-outline-variant/10"
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center overflow-hidden ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                  <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold font-headline text-lg group-hover:text-primary transition-colors">{profile.name}</span>
                    {Array.isArray(profile.tags) && (profile.equippedTag || profile.tags[0]) && (
                      <UserTag tag={profile.equippedTag || profile.tags[0]} />
                    )}
                    {profile.verificationStatus === "verified" && (
                      <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} title="Verified notable member">verified</span>
                    )}
                    <span className="text-on-surface-variant/60 font-body text-sm truncate" title="Username">@{profile.slackId}</span>
                    <span className="text-on-surface-variant/40 font-body text-sm">· {new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-on-surface text-lg font-body mb-4 leading-relaxed whitespace-pre-wrap">{renderContent(post.content, profile)}</div>
                  
                  {/* Media */}
                  {post.media && post.media.length > 0 && (
                    <div className="mt-3 grid gap-2 grid-cols-2 mb-4">
                      {post.media.map((m: any, i: number) => {
                        const src = m.url.startsWith('http') ? m.url : `https://${m.url}`;
                        return <img key={i} src={src} alt="Post media" className="rounded-xl max-h-96 object-cover w-full" />
                      })}
                    </div>
                  )}

                  {/* OpenGraph Card */}
                  {post.ogData && (
                    <a href={post.ogData.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mb-4 block border border-outline-variant/20 rounded-xl overflow-hidden hover:bg-surface-container-low/50 transition-colors">
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

                  <div className="flex justify-start items-center gap-6 text-on-surface-variant/60 max-w-lg">
                    <button 
                      className="flex items-center gap-2 group/btn transition-all hover:text-[#ec3750]"
                    >
                      <span className="material-symbols-outlined text-[20px] p-2.5 group-hover/btn:bg-[#ec3750]/10 rounded-full">favorite</span>
                      <span className="text-sm font-label">{post.likes?.length || 0}</span>
                    </button>
                    
                    <div className="flex items-center gap-2 group/btn transition-all cursor-default">
                      <span className="material-symbols-outlined text-[20px] p-2.5 rounded-full">bar_chart</span>
                      <span className="text-sm font-label">{post.viewCount || 0}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(PublicProfileContent), { ssr: false });