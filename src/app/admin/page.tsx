"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import dynamic from "next/dynamic";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ users: 0, posts: 0, storageBytes: 0 });

  useEffect(() => {
    if (session?.user) {
      const checkAdmin = async () => {
        try {
          const res = await fetch(`/api/users/profile/${(session.user as any).slackId || session.user.name}`);
          if (res.ok) {
            const data = await res.json();
            if (data.user?.tags?.includes('admin') || data.user?.tags?.includes('owner')) {
              setIsAdmin(true);
              fetchStats();
            } else {
              setLoading(false);
            }
          } else {
             setLoading(false);
          }
        } catch (e) {
          setLoading(false);
        }
      };
      checkAdmin();
    } else if (!isPending) {
      setLoading(false);
    }
  }, [session, isPending]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center bg-surface-container p-8 rounded-3xl border border-outline-variant/15 max-w-md w-full">
          <span className="material-symbols-outlined text-6xl text-error mb-4">gpp_bad</span>
          <h1 className="text-2xl font-headline font-bold mb-4">Access Denied</h1>
          <p className="text-on-surface-variant mb-6">You do not have permission to view this page. Admin access is required.</p>
          <Link href="/" className="bg-primary text-on-primary-fixed px-6 py-3 rounded-full font-headline font-bold hover:bg-primary-dim transition">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/15">
                <div className="flex items-center gap-3 text-on-surface-variant mb-2">
                  <span className="material-symbols-outlined">group</span>
                  <h3 className="font-bold">Total Users</h3>
                </div>
                <div className="text-4xl font-black">{stats.users}</div>
              </div>
              <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/15">
                <div className="flex items-center gap-3 text-on-surface-variant mb-2">
                  <span className="material-symbols-outlined">article</span>
                  <h3 className="font-bold">Total Posts</h3>
                </div>
                <div className="text-4xl font-black">{stats.posts}</div>
              </div>
              <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant/15">
                <div className="flex items-center gap-3 text-on-surface-variant mb-2">
                  <span className="material-symbols-outlined">cloud</span>
                  <h3 className="font-bold">Storage Used</h3>
                </div>
                <div className="text-4xl font-black text-primary">{formatBytes(stats.storageBytes)}</div>
              </div>
            </div>

            <div className="bg-surface-container rounded-2xl border border-outline-variant/15 overflow-hidden">
              <div className="p-6 border-b border-outline-variant/15 flex justify-between items-center">
                <h2 className="text-xl font-bold font-headline">System Status</h2>
              </div>
              <div className="p-6">
                <p className="text-on-surface-variant mb-4">Welcome to the Hackspot Admin Panel. Use the tabs on the left to navigate between different management sections.</p>
                <div className="bg-primary/10 text-primary p-4 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5">info</span>
                  <div>
                    <h4 className="font-bold mb-1">Admin Access Granted</h4>
                    <p className="text-sm opacity-80">You are viewing this page because your account has the 'admin' or 'owner' tag. You can promote other users using the <code>npm run promote -- email@example.com</code> script in the terminal.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'users':
        return (
          <div className="bg-surface-container rounded-2xl border border-outline-variant/15 p-6">
            <h2 className="text-xl font-bold font-headline mb-4">User Management</h2>
            <p className="text-on-surface-variant">User list and moderation tools will appear here in a future update.</p>
          </div>
        );
      case 'posts':
        return (
          <div className="bg-surface-container rounded-2xl border border-outline-variant/15 p-6">
            <h2 className="text-xl font-bold font-headline mb-4">Content Moderation</h2>
            <p className="text-on-surface-variant">Post feed and deletion tools will appear here in a future update.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-surface-container rounded-2xl border border-outline-variant/15 p-6">
            <h2 className="text-xl font-bold font-headline mb-4">System Settings</h2>
            <p className="text-on-surface-variant">Global app configuration will appear here in a future update.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-outline-variant/15 h-screen sticky top-0 p-6 flex flex-col">
        <div className="text-primary font-black text-2xl mb-8 font-headline">Hackspot Admin</div>
        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'users' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined">group</span>
            Users
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'posts' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined">article</span>
            Posts
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'settings' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined">settings</span>
            Settings
          </button>
        </nav>
        <Link href="/" className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container rounded-xl transition mt-auto">
          <span className="material-symbols-outlined">arrow_back</span>
          Exit Admin
        </Link>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-headline font-black capitalize">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-bold">{session.user.name}</div>
              <div className="text-xs text-primary uppercase tracking-wider font-bold">Administrator</div>
            </div>
            <img src={session.user.image || `https://www.gravatar.com/avatar/?d=identicon`} alt="Admin" className="w-10 h-10 rounded-full border-2 border-primary" />
          </div>
        </header>

        {renderTabContent()}
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AdminPage), { ssr: false });
