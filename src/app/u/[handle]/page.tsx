"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { User, ShieldCheck, Mail, Slack, X, Calendar, Code, ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MD5 } from "crypto-js";

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
                  {Array.isArray(profile.tags) && profile.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ml-1 ${
                        tag === 'bot' ? 'bg-blue-900 text-blue-300 border border-blue-400' :
                        tag === 'owner' ? 'bg-yellow-900 text-yellow-300 border border-blue-400' :
                        'bg-surface-container-highest text-on-surface-variant/60 border border-outline-variant/20'
                      }`}
                      title={
                         tag === 'bot' ? 'This is an official Hackspot bot account.' :
                         tag === 'owner' ? 'This user is the owner of Hackspot.' :
                         tag === 'hackclubstaff' ? 'This user is a member of the Hack Club staff team. They do not have any control over Hackspot.' :
                         tag === 'contributor' ? 'Has contributed to the Hackspot codebase.' :
                        tag === 'notable' ? 'A recognized member of the community.' :
                        tag === 'verified' ? 'Identity verified by Hackspot.' :
                        `Tag: ${tag}`
                      }
                    >
                      {tag === 'bot' && <span className="material-symbols-outlined text-[16px] align-middle">smart_toy</span>}
                      {tag === 'owner' && <span className="material-symbols-outlined text-[16px] align-middle">workspace_premium</span>}
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </span>
                  ))}
                </h2>
                <p className="text-on-surface-variant font-label text-lg">@{profile.slackId}</p>
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

        <div className="p-12 text-center text-on-surface-variant/40 italic font-body">
          {posts.length === 0 ? "No activity yet." : "Displaying recent activity..."}
        </div>
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(PublicProfileContent), { ssr: false });