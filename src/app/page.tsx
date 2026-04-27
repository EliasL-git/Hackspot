"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { LogIn, LogOut, Send, User, UserCircle } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MD5 } from "crypto-js";
import { UserTag } from "@/components/UserTag";
import { renderContent } from "@/lib/renderContent";

interface PollOption {
  _id?: string;
  text: string;
  votes: string[];
}

interface Poll {
  question: string;
  options: PollOption[];
  endDate?: string;
}

interface Post {
  _id: string;
  content: string;
  author: {
    id: string;
    name: string;
    image?: string;
    slackId?: string;
    verificationStatus?: string;
    equippedTag?: string;
    tags?: string[];
    githubStats?: {
      totalLines: number;
    };
  };
  media?: { url: string; type: string }[];
  poll?: Poll;
  ogData?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
  };
  likes: string[];
  reposts: string[];
  reports?: string[];
  viewCount?: number;
  createdAt: string;
}

function HomePage() {
  const { data: session, isPending } = authClient.useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trends, setTrends] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAutoFill, setShowAutoFill] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const [mediaFiles, setMediaFiles] = useState<{url: string, type: string}[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll state
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Confirm",
    isDanger: false
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  // Track which posts have been viewed in this session to avoid spamming the API
  const viewedPosts = useRef<Set<string>>(new Set());

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
      
      if (postsData.posts) {
        setPosts(postsData.posts);
        setNextCursor(postsData.nextCursor);
      } else if (Array.isArray(postsData)) {
        setPosts(postsData);
      }
      
      if (Array.isArray(trendsData)) setTrends(trendsData);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/posts?cursor=${nextCursor}`);
      const data = await res.json();
      if (data.posts) {
        setPosts(prev => [...prev, ...data.posts]);
        setNextCursor(data.nextCursor);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  // Intersection Observer to track post views
  const observer = useRef<IntersectionObserver | null>(null);
  
  const postRef = useCallback((node: HTMLElement | null, postId: string) => {
    if (!node) return;
    
    if (!observer.current) {
      observer.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-post-id');
            if (id && !viewedPosts.current.has(id)) {
              viewedPosts.current.add(id);
              // Fire and forget view tracking
              fetch(`/api/posts/${id}/view`, { method: 'POST' }).catch(() => {});
            }
          }
        });
      }, { threshold: 0.5 }); // Trigger when 50% of the post is visible
    }
    
    node.setAttribute('data-post-id', postId);
    observer.current.observe(node);
  }, []);

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
      setModalConfig({
        isOpen: true,
        title: "Sign In Required",
        message: "You must be logged in to like posts!",
        onConfirm: closeModal,
        confirmText: "Got it"
      });
      return;
    }
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (res.ok) {
        // Optimistically update
        setPosts(prev => prev.map(p => {
          if (p._id === postId) {
            const hasLiked = p.likes?.includes(session.user.id);
            return {
              ...p,
              likes: hasLiked 
                ? p.likes.filter(id => id !== session.user.id)
                : [...(p.likes || []), session.user.id]
            };
          }
          return p;
        }));
      } else {
        const errorData = await res.json();
        setModalConfig({
          isOpen: true,
          title: "Error",
          message: `Failed to like: ${errorData.error || "Unknown error"}`,
          onConfirm: closeModal,
          confirmText: "Close",
          isDanger: true
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReport = (postId: string) => {
    if (!session) {
      setModalConfig({
        isOpen: true,
        title: "Sign In Required",
        message: "You must be logged in to report posts!",
        onConfirm: closeModal,
        confirmText: "Got it"
      });
      return;
    }
    
    setModalConfig({
      isOpen: true,
      title: "Report Post",
      message: "Are you sure you want to report this post to the admins?",
      confirmText: "Report",
      isDanger: true,
      onConfirm: async () => {
        closeModal();
        try {
          const res = await fetch(`/api/posts/${postId}/report`, { method: "POST" });
          if (res.ok) {
            setModalConfig({
              isOpen: true,
              title: "Post Reported",
              message: "Post reported successfully. Thank you for keeping Hackspot safe.",
              onConfirm: closeModal,
              confirmText: "Close"
            });
            // Optimistically update
            setPosts(prev => prev.map(p => {
              if (p._id === postId) {
                return {
                  ...p,
                  reports: [...(p.reports || []), session.user.id]
                };
              }
              return p;
            }));
          } else {
            setModalConfig({
              isOpen: true,
              title: "Error",
              message: "Failed to report post.",
              onConfirm: closeModal,
              confirmText: "Close",
              isDanger: true
            });
          }
        } catch (error) {
          console.error(error);
        }
      }
    });
  };

  const handleDelete = (postId: string) => {
    if (!session) return;
    
    setModalConfig({
      isOpen: true,
      title: "Delete Post",
      message: "Are you sure you want to delete this post? This action cannot be undone.",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        closeModal();
        try {
          const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
          if (res.ok) {
            setPosts(prev => prev.filter(p => p._id !== postId));
          }
        } catch (error) {
          console.error(error);
        }
      }
    });
  };

  const handleVote = async (postId: string, optionIndex: number) => {
    if (!session) {
      setModalConfig({
        isOpen: true,
        title: "Sign In Required",
        message: "You must be logged in to vote on polls!",
        onConfirm: closeModal,
        confirmText: "Got it"
      });
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex })
      });

      if (res.ok) {
        const { poll } = await res.json();
        setPosts(prev => prev.map(p => {
          if (p._id === postId) {
            return { ...p, poll };
          }
          return p;
        }));
      }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      const { signedUrl, fileUrl } = await res.json();
      
      await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      
      setMediaFiles(prev => [...prev, { url: fileUrl, type: file.type.startsWith('video/') ? 'video' : file.type === 'image/gif' ? 'gif' : 'image' }]);
    } catch (err) {
      setModalConfig({
        isOpen: true,
        title: "Upload Failed",
        message: "Failed to upload media. Please try again.",
        onConfirm: closeModal,
        confirmText: "Close",
        isDanger: true
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let pollData = undefined;
    if (showPollCreator && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2) {
      pollData = {
        question: pollQuestion.trim(),
        options: pollOptions.filter(o => o.trim()).map(text => ({ text, votes: [] }))
      };
    }

    if ((!newPost.trim() && mediaFiles.length === 0 && !pollData) || !session) return;

    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: newPost, 
          media: mediaFiles,
          poll: pollData
        }),
      });
      if (res.ok) {
        setNewPost("");
        setMediaFiles([]);
        setShowPollCreator(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
        fetchData();
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (user: any) => {
    if (user?.image) return user.image;
    if (user?.email) {
      return `https://www.gravatar.com/avatar/${MD5(user.email.toLowerCase().trim()).toString()}?d=identicon&s=112`;
    }
    return `https://www.gravatar.com/avatar/?d=identicon&s=112`;
  };

  if (isPending) return null;

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      {/* Custom Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-high w-full max-w-sm rounded-[24px] overflow-hidden border border-outline-variant/30 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-headline font-black mb-2">{modalConfig.title}</h3>
              <p className="text-on-surface-variant font-body leading-relaxed">{modalConfig.message}</p>
            </div>
            <div className="p-4 bg-surface-container-highest/50 flex justify-end gap-3 border-t border-outline-variant/10">
              {modalConfig.confirmText !== "Got it" && modalConfig.confirmText !== "Close" && (
                <button 
                  onClick={closeModal}
                  className="px-5 py-2 rounded-full font-headline font-bold hover:bg-surface-container-highest transition-colors"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={modalConfig.onConfirm}
                className={`px-5 py-2 rounded-full font-headline font-bold text-white shadow-md transition-all active:scale-95 ${
                  modalConfig.isDanger 
                    ? "bg-error hover:brightness-110 shadow-error/20" 
                    : "bg-primary hover:brightness-110 shadow-primary/20"
                }`}
              >
                {modalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <Link
                  className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg active:scale-[0.98]"
                  href="/settings"
                >
                  <span className="material-symbols-outlined">settings</span>
                  <span>Settings</span>
                </Link>
                {/* Admin Link if user has admin/owner tag */}
                {(session.user as any)?.tags?.some((t: string) => ['admin', 'owner'].includes(t)) && (
                  <Link
                    className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg active:scale-[0.98]"
                    href="/admin"
                  >
                    <span className="material-symbols-outlined">admin_panel_settings</span>
                    <span>Admin</span>
                  </Link>
                )}
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
                src={getAvatarUrl(session.user)} 
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

              {mediaFiles.length > 0 && (
                <div className="flex gap-2 p-2 overflow-x-auto">
                  {mediaFiles.map((m, i) => {
                    const src = m.url.startsWith('http') ? m.url : `https://${m.url}`;
                    return (
                      <div key={i} className="relative w-20 h-20 flex-shrink-0">
                        <img src={src} alt="upload preview" className="w-full h-full object-cover rounded-md" />
                        <button type="button" onClick={() => setMediaFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {showPollCreator && (
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/15 mt-2">
                  <input
                    type="text"
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full bg-transparent border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-lg font-bold mb-4 pb-2"
                  />
                  <div className="space-y-2">
                    {pollOptions.map((option, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder={`Option ${i + 1}`}
                          value={option}
                          onChange={(e) => handlePollOptionChange(i, e.target.value)}
                          className="flex-1 bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary"
                        />
                        {pollOptions.length > 2 && (
                          <button type="button" onClick={() => handleRemovePollOption(i)} className="text-on-surface-variant hover:text-error">
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {pollOptions.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddPollOption}
                      className="mt-3 text-primary font-bold text-sm hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> Add Option
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-outline-variant/15 mt-2">
                <div className="flex gap-2 text-primary">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 hover:bg-primary/10 rounded-full transition-colors active:scale-95">
                    <span className="material-symbols-outlined text-[24px]">image</span>
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 hover:bg-primary/10 rounded-full transition-colors active:scale-95">
                    <span className="material-symbols-outlined text-[24px]">gif_box</span>
                  </button>
                  <button type="button" onClick={() => setShowPollCreator(!showPollCreator)} className={`p-2.5 rounded-full transition-colors active:scale-95 ${showPollCreator ? 'bg-primary/20' : 'hover:bg-primary/10'}`}>
                    <span className="material-symbols-outlined text-[24px]">poll</span>
                  </button>
                  <button type="button" className="p-2.5 hover:bg-primary/10 rounded-full transition-colors active:scale-95">
                    <span className="material-symbols-outlined text-[24px]">sentiment_satisfied</span>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading || uploading || ((!newPost.trim() && mediaFiles.length === 0) && (!showPollCreator || !pollQuestion.trim()))}
                  className="bg-primary hover:brightness-110 text-on-primary-fixed px-10 py-3 rounded-full font-headline font-bold text-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50 active:scale-95"
                >
                  {loading || uploading ? "Posting..." : "Post"}
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
            <article 
              key={post._id} 
              ref={(node) => postRef(node, post._id)}
              className="p-6 flex gap-4 hover:bg-surface-container-low/50 transition-colors cursor-pointer group border-b border-outline-variant/10"
            >
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center overflow-hidden ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                <img src={getAvatarUrl(post.author)} alt={post.author.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold font-headline text-lg group-hover:text-primary transition-colors">{post.author.name}</span>
                  {/* User tags */}
                  {Array.isArray(post.author.tags) && (post.author.equippedTag || post.author.tags[0]) && (
                    <UserTag tag={post.author.equippedTag || post.author.tags[0]} />
                  )}
                  {post.author.verificationStatus === "verified" && (
                    <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} title="Verified notable member">verified</span>
                  )}
                  {post.author.slackId && (
                    <span className="text-on-surface-variant/60 font-body text-sm truncate" title="Username">@{post.author.slackId}</span>
                  )}
                  <span className="text-on-surface-variant/40 font-body text-sm">· {new Date(post.createdAt).toLocaleDateString()}</span>
                  <div className="flex-1"></div>
                  
                  {/* Post Actions Dropdown / Icons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {session?.user.id !== post.author.id && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleReport(post._id); }}
                        className="text-on-surface-variant/40 hover:text-warning transition-colors p-2 hover:bg-warning/10 rounded-full"
                        title="Report Post"
                      >
                        <span className="material-symbols-outlined text-[20px]">flag</span>
                      </button>
                    )}
                    {session?.user.id === post.author.id && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(post._id); }}
                        className="text-on-surface-variant/40 hover:text-error transition-colors p-2 hover:bg-error/10 rounded-full"
                        title="Delete Post"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-on-surface text-lg font-body mb-4 leading-relaxed whitespace-pre-wrap">{renderContent(post.content, post.author)}</div>
                
                {/* Media */}
                {post.media && post.media.length > 0 && (
                  <div className="mt-3 grid gap-2 grid-cols-2 mb-4">
                    {post.media.map((m, i) => {
                      const src = m.url.startsWith('http') ? m.url : `https://${m.url}`;
                      return <img key={i} src={src} alt="Post media" className="rounded-xl max-h-96 object-cover w-full" />
                    })}
                  </div>
                )}

                {/* Poll */}
                {post.poll && (
                  <div className="mt-4 mb-4 bg-surface-container-low rounded-xl border border-outline-variant/15 p-4">
                    <h4 className="font-bold font-headline mb-3 text-lg">{post.poll.question}</h4>
                    <div className="space-y-2">
                      {post.poll.options.map((option, index) => {
                        const totalVotes = post.poll!.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                        const percentage = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
                        const hasVoted = session && option.votes.includes(session.user.id);
                        
                        return (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVote(post._id, index);
                            }}
                            className={`w-full relative overflow-hidden rounded-lg border transition-all ${
                              hasVoted 
                                ? 'border-primary bg-primary/5' 
                                : 'border-outline-variant/30 hover:bg-surface-container-high'
                            }`}
                          >
                            <div 
                              className={`absolute top-0 left-0 bottom-0 ${hasVoted ? 'bg-primary/20' : 'bg-surface-container-highest/50'} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                            <div className="relative flex justify-between items-center px-4 py-3 z-10">
                              <span className={`font-bold ${hasVoted ? 'text-primary' : 'text-on-surface'}`}>
                                {option.text}
                              </span>
                              <span className="text-sm font-medium text-on-surface-variant">
                                {percentage}%
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-xs text-on-surface-variant/60 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">how_to_vote</span>
                      {post.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0)} votes
                    </div>
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
                    onClick={(e) => { e.stopPropagation(); handleLike(post._id); }}
                    className={`flex items-center gap-2 group/btn transition-all ${post.likes?.includes(session?.user.id || '') ? 'text-[#ec3750]' : 'hover:text-[#ec3750]'}`}
                  >
                    <span className={`material-symbols-outlined text-[20px] p-2.5 group-hover/btn:bg-[#ec3750]/10 rounded-full ${post.likes?.includes(session?.user.id || '') ? 'font-fill' : ''}`}>favorite</span>
                    <span className="text-sm font-label">{post.likes?.length || 0}</span>
                  </button>
                  
                  <div className="flex items-center gap-2 group/btn transition-all cursor-default">
                    <span className="material-symbols-outlined text-[20px] p-2.5 rounded-full">bar_chart</span>
                    <span className="text-sm font-label">{post.viewCount || 0}</span>
                  </div>
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

          {nextCursor && (
            <div className="p-6 text-center border-t border-outline-variant/15">
              <button 
                onClick={loadMore} 
                disabled={loadingMore}
                className="px-6 py-2 bg-surface-container-high hover:bg-surface-container-highest rounded-full text-primary font-bold transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
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