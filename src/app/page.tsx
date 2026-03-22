"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { LogIn, LogOut, Send, User, UserCircle } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MD5 } from "crypto-js";

interface Post {
  _id: string;
  content: string;
  author: {
    id: string;
    name: string;
    image?: string;
    slackId?: string;
    verificationStatus?: string;
    tags?: string[];
  };
  likes: string[];
  reposts: string[];
  createdAt: string;
}

function HomePage() {
  const { data: session, isPending } = authClient.useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAutoFill, setShowAutoFill] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchData = async () => {
    try {
      // Trigger welcome notification check
      if (session) {
        fetch("/api/user/welcome")
          .then(res => res.ok && res.json())
          .then(data => {
            if (data?.welcomed) {
              fetchData(); // Reload posts if welcomed
            }
          })
          .catch(console.error);
      }

      const [postsRes, trendsRes] = await Promise.all([
        fetch("/api/posts"),
        fetch("/api/trends")
      ]);
      const postsData = await postsRes.json();
      const trendsData = await trendsRes.json();
      if (Array.isArray(postsData)) setPosts(postsData);
      if (Array.isArray(trendsData)) setTrends(trendsData);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const handleSignIn = async () => {
    await authClient.signIn.oauth2({
      providerId: "hackclub",
      callbackURL: "/",
    });
  };

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  const handleLike = async (postId: string) => {
    if (!session) {
      alert("You must be logged in to like posts!");
      return;
    }
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (res.ok) {
        fetchData();
      } else {
        const errorData = await res.json();
        alert(`Failed to like: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred while liking.");
    }
  };

  const handleDelete = async (postId: string) => {
    if (!session || !confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewPost(value);

    // Get cursor position to find what we're typing
    const cursor = e.target.selectionStart;
    const contentBefore = value.slice(0, cursor);
    const words = contentBefore.split(/\s+/);
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith("$")) {
      const type = currentWord.slice(1).toLowerCase();
      setShowAutoFill("$");
      const commands = ["lines", "repo", "help", "stats", "github"];
      setSuggestions(commands.filter(c => c.startsWith(type)));
    } else if (currentWord.startsWith("#")) {
      const type = currentWord.slice(1).toLowerCase();
      setShowAutoFill("#");
      if (type.length > 0) {
        fetch(`/api/hashtags/search?q=${type}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setSuggestions(data);
            }
          })
          .catch(console.error);
      } else {
        const tags = trends.map(t => t.hashtag);
        setSuggestions(tags);
      }
    } else if (currentWord.startsWith("@")) {
      const type = currentWord.slice(1).toLowerCase();
      setShowAutoFill("@");
      if (type.length > 0) {
        fetch(`/api/users/search?q=${type}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setSuggestions(data.map((u: any) => u.slackId));
            }
          })
          .catch(console.error);
      } else {
        setSuggestions([]);
      }
    } else {
      setShowAutoFill(null);
    }
  };

  const insertSuggestion = (suggestion: string) => {
    const cursor = (document.querySelector('textarea') as any).selectionStart;
    const contentBefore = newPost.slice(0, cursor);
    const contentAfter = newPost.slice(cursor);
    const words = contentBefore.split(/\s+/);
    words[words.length - 1] = (showAutoFill || "") + suggestion + " ";
    setNewPost(words.join(" ") + contentAfter);
    setShowAutoFill(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showAutoFill) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (suggestions[selectedIndex]) insertSuggestion(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowAutoFill(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !session) return;

    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost }),
      });
      if (res.ok) {
        setNewPost("");
        fetchData();
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (isPending) return null;

  const renderContent = (content: string, author: any) => {
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
        const stats = (session?.user as any)?.githubStats;
        const count = stats?.totalLines || 0;
        return (
          <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-mono font-bold text-sm">
            <span className="material-symbols-outlined text-[16px]">code</span>
            {count.toLocaleString()} lines
          </span>
        );
      }

      // $repo command (Simplified regex for URL following $repo)
      // Note: This matches when a part starts with $repo and is followed by content
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
    <div className="flex min-h-screen bg-background text-on-surface">
      {/* SideNavBar Navigation */}
      <aside className="hidden xl:flex flex-col h-screen sticky top-0 p-8 space-y-2 bg-surface w-80 border-r border-outline-variant/15 justify-between flex-shrink-0">
        <div>
          <div className="text-[#ec3750] font-black text-4xl mb-12 font-headline px-4">Hackspot</div>
          <nav className="space-y-1">
            <Link
              className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg active:scale-[0.98]"
              href="/"
            >
              <span className="material-symbols-outlined">home</span>
              <span>Home</span>
            </Link>
            <a
              className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg active:scale-[0.98]"
              href="#"
            >
              <span className="material-symbols-outlined">search</span>
              <span>Explore</span>
            </a>
            <Link
              className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg active:scale-[0.98]"
              href="/notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
              <span>Notifications</span>
            </Link>
            {session ? (
              <>
                <Link
                  className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg active:scale-[0.98]"
                  href="/profile"
                >
                  <span className="material-symbols-outlined">person</span>
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-error/10 hover:text-error transition-all font-headline font-medium text-lg active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined">logout</span>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                className="w-full text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg active:scale-[0.98]"
              >
                <span className="material-symbols-outlined">login</span>
                <span>Sign In</span>
              </button>
            )}
          </nav>
        </div>
        
        {session && (
          <button className="w-full py-5 bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed shadow-lg shadow-primary/20 font-headline font-bold text-2xl rounded-full mb-4 hover:opacity-90 active:scale-95 transition-all">
            Post
          </button>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 border-r border-outline-variant/15 min-w-0 max-w-[800px]">
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-6 py-6 border-b border-outline-variant/15">
          <h1 className="font-headline font-black text-2xl tracking-tight">Home</h1>
        </header>

        {session ? (
          <form onSubmit={handleSubmit} className="p-8 border-b border-outline-variant/15 flex gap-6 hover:bg-white/[0.01] transition-colors">
            <div className="w-14 h-14 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
              <img 
                src={`https://www.gravatar.com/avatar/${MD5(session.user.email.toLowerCase().trim()).toString()}?d=identicon&s=112`} 
                alt={session.user.name} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex-1 flex flex-col gap-4 relative">
              <textarea
                placeholder="What's happening in your branch?"
                className="w-full bg-transparent border-none focus:ring-0 text-2xl font-body resize-none placeholder:text-on-surface-variant/40 min-h-[160px] py-2 leading-relaxed"
                value={newPost}
                onChange={handlePostChange}
                onKeyDown={handleKeyDown}
              />
              {showAutoFill && suggestions.length > 0 && (
                <div className="absolute top-[160px] p-2 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl z-50 w-64 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-1">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={suggestion}
                        onClick={() => insertSuggestion(suggestion)}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold font-headline flex items-center justify-between transition-all ${
                          i === selectedIndex ? "bg-primary text-on-primary" : "hover:bg-primary/10 text-on-surface"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-sm">
                            {showAutoFill === "$" ? "terminal" : showAutoFill === "@" ? "alternate_email" : "tag"}
                          </span>
                          {suggestion}
                        </span>
                        {i === selectedIndex && (
                          <span className="text-[10px] opacity-70 p-1 bg-white/20 rounded">ENTER</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t border-outline-variant/15 mt-2">
                <div className="flex gap-2 text-primary">
                  <button type="button" className="p-2.5 hover:bg-primary/10 rounded-full transition-colors active:scale-95">
                    <span className="material-symbols-outlined text-[24px]">image</span>
                  </button>
                  <button type="button" className="p-2.5 hover:bg-primary/10 rounded-full transition-colors active:scale-95">
                    <span className="material-symbols-outlined text-[24px]">gif_box</span>
                  </button>
                  <button type="button" className="p-2.5 hover:bg-primary/10 rounded-full transition-colors active:scale-95">
                    <span className="material-symbols-outlined text-[24px]">poll</span>
                  </button>
                  <button type="button" className="p-2.5 hover:bg-primary/10 rounded-full transition-colors active:scale-95">
                    <span className="material-symbols-outlined text-[24px]">sentiment_satisfied</span>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading || !newPost.trim()}
                  className="bg-primary hover:brightness-110 text-on-primary-fixed px-10 py-3 rounded-full font-headline font-bold text-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50 active:scale-95"
                >
                  {loading ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-12 text-center border-b border-outline-variant/15 bg-surface-container-low/30">
            <h2 className="font-headline font-bold text-3xl mb-4">Welcome to Hackspot</h2>
            <p className="text-on-surface-variant text-lg mb-8">Sign in with your Hack Club account to start sharing with the community.</p>
            <button
              onClick={handleSignIn}
              className="bg-primary hover:brightness-110 text-on-primary-fixed px-10 py-4 rounded-full font-headline font-bold text-lg transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              Sign in with Hack Club
            </button>
          </div>
        )}

        <div className="divide-y divide-outline-variant/15">
          {posts.map((post) => (
            <article key={post._id} className="p-6 flex gap-4 hover:bg-surface-container-low/50 transition-colors cursor-pointer group border-b border-outline-variant/10">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center overflow-hidden ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                <img src={post.author.image} alt={post.author.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold font-headline text-lg group-hover:text-primary transition-colors">{post.author.name}</span>
                  {/* User tags */}
                  {Array.isArray(post.author.tags) && post.author.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ml-1 ${
                        tag === 'bot' ? 'bg-blue-900 text-blue-300 border border-blue-400' :
                        tag === 'owner' ? 'bg-yellow-900 text-yellow-300 border border-yellow-400' :
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
                  {post.author.verificationStatus === "verified" && (
                    <span className="material-symbols-outlined text-primary text-[18px]" title="Verified notable member">verified</span>
                  )}
                  {post.author.slackId && (
                    <span className="text-on-surface-variant/60 font-body text-sm truncate">@{post.author.slackId}</span>
                  )}
                  <span className="text-on-surface-variant/40 font-body text-sm">· {new Date(post.createdAt).toLocaleDateString()}</span>
                  <div className="flex-1"></div>
                  {session?.user.id === post.author.id && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(post._id); }}
                      className="text-on-surface-variant/40 hover:text-error transition-colors p-2 hover:bg-error/10 rounded-full"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>
                <div className="text-on-surface text-lg font-body mb-4 leading-relaxed whitespace-pre-wrap">{renderContent(post.content, post.author)}</div>
                <div className="flex justify-start text-on-surface-variant/60 max-w-lg">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleLike(post._id); }}
                    className={`flex items-center gap-2 group/btn transition-all ${post.likes?.includes(session?.user.id || '') ? 'text-[#ec3750]' : 'hover:text-[#ec3750]'}`}
                  >
                    <span className={`material-symbols-outlined text-[20px] p-2.5 group-hover/btn:bg-[#ec3750]/10 rounded-full ${post.likes?.includes(session?.user.id || '') ? 'font-fill' : ''}`}>favorite</span>
                    <span className="text-sm font-label">{post.likes?.length || 0}</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
          
          {posts.length === 0 && !isPending && (
            <div className="p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-20">post_add</span>
              <p>No posts yet. Be the first to share something!</p>
            </div>
          )}
        </div>
        <div className="h-24 lg:hidden"></div>
      </main>

      {/* Right Sidebar - Pushed to the edge */}
      <aside className="hidden 2xl:flex flex-col flex-1 p-8 space-y-6 sticky top-0 h-screen overflow-y-auto min-w-[350px]">
        {/* Search Bar */}
        <div className="relative group max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-xl">search</span>
          <input
            className="w-full bg-surface-container-highest/50 backdrop-blur-md border border-outline-variant/10 rounded-full py-3.5 pl-12 pr-6 text-lg font-body focus:ring-2 focus:ring-primary/50 focus:bg-surface transition-all outline-none"
            placeholder="Search Hackspot"
            type="text"
          />
        </div>
        
        <div className="max-w-md space-y-6">
          {/* Trends - Dynamic from real posts */}
          <section className="bg-surface-container-low/30 backdrop-blur-md rounded-3xl overflow-hidden border border-outline-variant/15">
            <h3 className="font-headline font-black text-2xl p-6 pb-2">Trends for you</h3>
            <div className="divide-y divide-outline-variant/10">
              {trends.length > 0 ? (
                trends.map((trend) => (
                  <button key={trend.name} className="w-full p-5 hover:bg-white/5 transition-all text-left group">
                    <div className="flex justify-between text-on-surface-variant/60 text-sm font-medium mb-1">
                      <span>Trending in Hack Club</span>
                      <span className="material-symbols-outlined text-xl group-hover:text-primary transition-colors">more_horiz</span>
                    </div>
                    <div className="font-bold font-headline text-xl text-on-surface group-hover:text-primary transition-colors mb-1">{trend.name}</div>
                    <div className="text-on-surface-variant/60 text-sm italic font-body">{trend.count} {trend.count === 1 ? 'post' : 'posts'}</div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-on-surface-variant/40 italic font-body text-sm">
                  Waiting for things to go viral...
                </div>
              )}
            </div>
            {trends.length > 0 && (
              <button className="w-full p-6 text-primary text-lg font-headline font-bold text-left hover:bg-white/5 transition-colors border-t border-outline-variant/10">
                Show more
              </button>
            )}
          </section>

          {/* Features placeholder */}
          <div className="p-6 text-on-surface-variant/20 italic font-body text-xs text-center border border-dashed border-outline-variant/10 rounded-3xl">
            More features coming soon...
          </div>
        </div>
      </aside>

      {/* BottomNavBar for Mobile */}
      <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] flex justify-around items-center px-4 py-3 bg-surface/60 backdrop-blur-xl border border-outline-variant/15 shadow-2xl z-50 rounded-full">
        <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors" href="/">
          <span className="material-symbols-outlined">home</span>
        </Link>
        <button className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">search</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        {session ? (
          <Link className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors" href="/profile">
            <span className="material-symbols-outlined">person</span>
          </Link>
        ) : (
          <button onClick={handleSignIn} className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">login</span>
          </button>
        )}
      </nav>
    </div>
  );
}

export default dynamic(() => Promise.resolve(HomePage), {
  ssr: false,
});

