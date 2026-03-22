"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { User, ShieldCheck, Mail, Slack, X } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MD5 } from "crypto-js";

function ProfilePageContent() {
  const { data: session, isPending } = authClient.useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [githubStats, setGithubStats] = useState<{ totalLines: number; loading: boolean }>({ totalLines: 0, loading: false });
  const [editName, setEditName] = useState("");
  const [editSlackId, setEditSlackId] = useState("");
  const [editGithubUsername, setEditGithubUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Set initial stats from session if available
  useEffect(() => {
    if (session?.user) {
      const u = session.user as any;
      if (u.githubStats?.totalLines) {
        setGithubStats({ totalLines: u.githubStats.totalLines, loading: false });
      }
    }
  }, [session?.user]);

  // Add function to fetch GitHub stats
  const fetchGithubStats = async (username: string) => {
    setGithubStats(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/github/stats?username=${username}`);
      const data = await res.json();
      if (data.totalLines) {
        setGithubStats({ totalLines: data.totalLines, loading: false });
      } else {
        setGithubStats(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      console.error(err);
      setGithubStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (session?.user) {
      const u = session.user as any;
      if (u.githubUsername) {
        fetchGithubStats(u.githubUsername);
      }
    }
  }, [session?.user]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center bg-surface-container p-8 rounded-3xl border border-outline-variant/15 max-w-md w-full">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">lock</span>
          <h1 className="text-2xl font-headline font-bold mb-4">Access Restricted</h1>
          <p className="text-on-surface-variant mb-6">Please sign in with your Hack Club account to view your profile.</p>
          <button
            onClick={() => authClient.signIn.oauth2({ providerId: "hackclub", callbackURL: "/profile" })}
            className="w-full bg-primary text-on-primary-fixed px-6 py-3 rounded-full font-headline font-bold hover:bg-primary-dim transition"
          >
            Sign in with Hack Club
          </button>
        </div>
      </div>
    );
  }

  const user = session.user as any;
  const gravatarUrl = `https://www.gravatar.com/avatar/${MD5(user.email.toLowerCase().trim()).toString()}?d=identicon&s=200`;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Check for handle uniqueness
      if (editSlackId && editSlackId !== user.slackId) {
        const res = await fetch(`/api/user/check-handle?handle=${editSlackId}`);
        const { available } = await res.json();
        if (!available) {
          alert("This handle is already taken! Please choose another one.");
          setIsSaving(false);
          return;
        }
      }

      await (authClient as any).updateUser({
        name: editName,
        slackId: editSlackId,
        githubUsername: editGithubUsername,
      });
      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = () => {
    setEditName(user.name);
    setEditSlackId(user.slackId || "");
    setEditGithubUsername(user.githubUsername || "");
    setIsEditing(true);
  };

  return (
    <div className="flex min-h-screen max-w-[1440px] mx-auto bg-background text-on-surface">
      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-high w-full max-w-md rounded-[32px] overflow-hidden border border-outline-variant/30 shadow-2xl animate-in zoom-in-95 duration-200">
            <header className="flex justify-between items-center p-6 border-b border-outline-variant/10">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-headline font-black">Edit Profile</h2>
              </div>
              <button 
                form="edit-profile-form"
                disabled={isSaving}
                className="bg-primary hover:brightness-110 px-8 py-2 rounded-full font-headline font-bold text-lg text-on-primary shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </header>
            
            <form id="edit-profile-form" onSubmit={handleUpdateProfile} className="p-8 space-y-6">
              <div className="space-y-2 group">
                <label className="text-sm font-label text-primary font-bold uppercase tracking-wider px-1">Nickname</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="The Cool Hacker"
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-2xl p-4 text-xl font-body focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-sm font-label text-primary font-bold uppercase tracking-wider px-1">Handle (@el4s)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xl">@</span>
                  <input 
                    type="text" 
                    value={editSlackId}
                    onChange={(e) => setEditSlackId(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                    placeholder="your_handle"
                    className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-2xl p-4 pl-10 text-xl font-body focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <p className="text-xs text-on-surface-variant px-1 opacity-60">This is how people find you on Hackspot.</p>
              </div>

              <div className="space-y-2 group">
                <label className="text-sm font-label text-primary font-bold uppercase tracking-wider px-1">GitHub Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-xl">/</span>
                  <input 
                    type="text" 
                    value={editGithubUsername}
                    onChange={(e) => setEditGithubUsername(e.target.value)}
                    placeholder="github-user"
                    className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-2xl p-4 pl-10 text-xl font-body focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Layout */}
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
          <Link href="/profile" className="text-primary font-bold flex items-center gap-4 py-3 px-4 rounded-lg bg-white/5 font-headline text-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            <span>Profile</span>
          </Link>
        </nav>
      </aside>

      {/* Main Profile Area */}
      <main className="flex-1 border-r border-outline-variant/15 min-w-0">
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-4 py-2 flex items-center gap-8">
          <Link href="/" className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="font-headline font-black text-xl tracking-tight">{user.name}</h1>
            <p className="text-on-surface-variant text-sm font-label uppercase tracking-widest">Profile Identity</p>
          </div>
        </header>

        <section className="relative">
          {/* Banner */}
          <div className="h-48 md:h-64 bg-surface-container-high w-full overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
               <span className="material-symbols-outlined text-huge opacity-10 font-[100] text-8xl">terminal</span>
            </div>
          </div>

          <div className="px-4 pb-6">
            <div className="flex justify-between items-start">
              <div className="relative -mt-16 md:-mt-20">
                <div className="p-1 bg-background rounded-full">
                  <img src={gravatarUrl} alt={user.name} className="w-24 h-24 md:w-36 md:h-36 rounded-full border-4 border-background object-cover bg-surface-container" />
                </div>
              </div>
              <div className="pt-4">
                <button 
                  onClick={startEditing}
                  className="px-6 py-2 border border-outline-variant font-headline font-bold rounded-full hover:bg-surface-container-high transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <h2 className="font-headline font-black text-3xl flex items-center gap-1 group">
                  {user.name}
                  {user.verificationStatus === "verified" && (
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }} title="Verified notable member">verified</span>
                  )}
                  {Array.isArray(user.tags) && user.tags.map((tag: string) => (
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
                         tag === 'staff' ? 'This user is a member of the Hack Club staff team. They do not have any control over Hackspot.' :
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
                <p className="text-on-surface-variant font-label">@{user.slackId || user.id.slice(-6).toUpperCase()}</p>
              </div>
              
              <p className="text-on-surface max-w-xl text-lg font-body leading-relaxed">
                Building the next generation of makers. Hack Club member.
              </p>

              <div className="flex flex-wrap gap-y-2 gap-x-4 text-on-surface-variant font-label text-sm">
                {user.slackId && (
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">chat</span>
                    <span>Slack: @{user.slackId}</span>
                  </div>
                )}
                {githubStats.totalLines > 0 && !githubStats.loading && (
                  <div className="flex items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-sm">code</span>
                    <span>{githubStats.totalLines.toLocaleString()} Lines of Code</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  <span>Joined March 2026</span>
                </div>
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

        <div className="p-12 text-center text-on-surface-variant">
          <p>No activity yet.</p>
        </div>
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(ProfilePageContent), { ssr: false });
