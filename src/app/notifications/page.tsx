"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { X, Heart, MessageCircle, Repeat2, AtSign } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MD5 } from "crypto-js";

function NotificationsPageContent() {
  const { data: session, isPending } = authClient.useSession();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PUT" });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (session) {
      fetchNotifications();
      markAllAsRead();
    }
  }, [session]);

  if (isPending || (session && isLoading)) {
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
          <p className="text-on-surface-variant mb-6">Please sign in to view your notifications.</p>
          <button
            onClick={() => authClient.signIn.oauth2({ providerId: "hackclub", callbackURL: "/notifications" })}
            className="w-full bg-primary text-on-primary-fixed px-6 py-3 rounded-full font-headline font-bold hover:bg-primary-dim transition"
          >
            Sign in with Hack Club
          </button>
        </div>
      </div>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention': return <div className="p-2 bg-blue-500/10 rounded-full text-blue-500"><AtSign className="w-5 h-5" /></div>;
      case 'like': return <div className="p-2 bg-pink-500/10 rounded-full text-pink-500"><Heart className="w-5 h-5 fill-current" /></div>;
      case 'repost': return <div className="p-2 bg-green-500/10 rounded-full text-green-500"><Repeat2 className="w-5 h-5" /></div>;
      default: return <div className="p-2 bg-surface-container rounded-full text-on-surface-variant"><MessageCircle className="w-5 h-5" /></div>;
    }
  };

  const getAvatarUrl = (user: any) => {
    if (user?.image) return user.image;
    if (user?.email) {
      return `https://www.gravatar.com/avatar/${MD5(user.email.toLowerCase().trim()).toString()}?d=identicon&s=112`;
    }
    if (user?.name) {
      return `https://www.gravatar.com/avatar/${MD5(user.name.toLowerCase().trim()).toString()}?d=identicon&s=112`;
    }
    return `https://www.gravatar.com/avatar/?d=identicon&s=112`;
  };

  return (
    <div className="flex min-h-screen max-w-[1440px] mx-auto bg-background text-on-surface">
      {/* Sidebar (Desktop) */}
      <aside className="flex flex-col h-screen sticky top-0 p-6 space-y-2 bg-surface w-72 border-r border-outline-variant/15">
        <Link href="/" className="text-[#ec3750] font-black text-3xl mb-8 font-headline">Hackspot</Link>
        <nav className="flex-1 space-y-1">
          <Link href="/" className="text-slate-300 flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-[#ec3750]/10 hover:text-[#ec3750] transition-all font-headline font-medium text-lg">
            <span className="material-symbols-outlined">home</span>
            <span>Home</span>
          </Link>
          <Link href="/notifications" className="text-primary font-bold flex items-center gap-4 py-3 px-4 rounded-lg bg-white/5 font-headline text-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
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

      {/* Main Content Area */}
      <main className="flex-1 px-8 py-6 border-r border-outline-variant/15 min-w-0 lg:min-w-[900px]">
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-4 py-2 border-b border-outline-variant/10">
          <div className="flex items-center gap-8 h-12">
            <Link href="/" className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-headline font-black text-xl tracking-tight">Notifications</h1>
          </div>
        </header>

        <div className="divide-y divide-outline-variant/10">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              <div className="flex justify-center mb-4">
                <span className="material-symbols-outlined text-6xl opacity-20">notifications_off</span>
              </div>
              <p className="font-headline text-lg">Nothing to see here yet!</p>
              <p className="text-sm">When people @mention you, it'll show up here.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <Link 
                key={notif._id} 
                href={`/post/${notif.post}`}
                className={`flex gap-4 p-4 hover:bg-surface-container-low transition-colors ${!notif.read ? 'bg-primary/5' : ''}`}
              >
                <div className="flex flex-col items-center gap-2">
                   {getNotificationIcon(notif.type)}
                   <div className="w-0.5 flex-1 bg-outline-variant/20 rounded-full"></div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <img 
                      src={getAvatarUrl(notif.sender)} 
                      alt="" 
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="font-bold">{notif.sender.name}</span>
                    <span className="text-on-surface-variant text-sm">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-on-surface">
                    {notif.type === 'mention' && "mentioned you in a post"}
                    {notif.type === 'like' && "liked your post"}
                    {notif.type === 'repost' && "reposted your activity"}
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-primary self-center"></div>
                )}
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(NotificationsPageContent), { ssr: false });