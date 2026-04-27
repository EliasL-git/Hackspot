"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { UserTag } from "@/components/UserTag";
import { MD5 } from "crypto-js";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 KB';
  
  if (bytes < 1024) {
    return `${(bytes / 1024).toFixed(decimals)} KB`;
  }
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k)) - 1;
  
  if (i < 0) return `${(bytes / 1024).toFixed(dm)} KB`;
  
  return `${parseFloat((bytes / Math.pow(k, i + 1)).toFixed(dm))} ${sizes[i]}`;
}

function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ users: 0, posts: 0, reportedPosts: 0, storageBytes: 0 });
  
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminPosts, setAdminPosts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

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

  const getAvatarUrl = (user: any) => {
    if (user?.image) return user.image;
    if (user?.email) {
      return `https://www.gravatar.com/avatar/${MD5(user.email.toLowerCase().trim()).toString()}?d=identicon&s=112`;
    }
    return `https://www.gravatar.com/avatar/?d=identicon&s=112`;
  };

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

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'users' && adminUsers.length === 0) fetchUsers();
      if (activeTab === 'posts' && adminPosts.length === 0) fetchPosts();
      if (activeTab === 'audit' && auditLogs.length === 0) fetchAuditLogs();
    }
  }, [activeTab, isAdmin]);

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

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setAdminUsers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/admin/posts');
      if (res.ok) setAdminPosts(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit');
      if (res.ok) setAuditLogs(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTags = async (userId: string, currentTags: string[]) => {
    const input = window.prompt("Enter tags separated by commas (e.g. admin,notable,bot):", currentTags?.join(", ") || "");
    if (input === null) return; // cancelled
    
    const newTags = input.split(",").map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags })
      });
      
      if (res.ok) {
        setAdminUsers(prev => prev.map(u => u._id === userId ? { ...u, tags: newTags } : u));
      } else {
        setModalConfig({
          isOpen: true,
          title: "Error",
          message: "Failed to update tags.",
          onConfirm: closeModal,
          confirmText: "Close",
          isDanger: true
        });
      }
    } catch (e) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        title: "Error",
        message: "An error occurred while updating tags.",
        onConfirm: closeModal,
        confirmText: "Close",
        isDanger: true
      });
    }
  };

  const handleVerifyUser = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus: newStatus })
      });
      
      if (res.ok) {
        setAdminUsers(prev => prev.map(u => {
          if (u._id === userId) {
            const newTags = newStatus === 'verified' 
              ? Array.from(new Set([...(u.tags || []), 'verified']))
              : (u.tags || []).filter((t: string) => t !== 'verified');
            return { ...u, verificationStatus: newStatus, tags: newTags };
          }
          return u;
        }));
      } else {
        setModalConfig({
          isOpen: true,
          title: "Error",
          message: "Failed to update verification status.",
          onConfirm: closeModal,
          confirmText: "Close",
          isDanger: true
        });
      }
    } catch (e) {
      console.error(e);
      setModalConfig({
        isOpen: true,
        title: "Error",
        message: "An error occurred while updating verification status.",
        onConfirm: closeModal,
        confirmText: "Close",
        isDanger: true
      });
    }
  };

  const handleDismissReport = (postId: string) => {
    setModalConfig({
      isOpen: true,
      title: "Dismiss Report",
      message: "Are you sure you want to dismiss the reports for this post? This will clear the reports and notify the reporters.",
      confirmText: "Dismiss",
      isDanger: false,
      onConfirm: async () => {
        closeModal();
        try {
          const res = await fetch(`/api/admin/posts/${postId}/dismiss`, { method: 'POST' });
          if (res.ok) {
            setAdminPosts(prev => prev.map(p => p._id === postId ? { ...p, reports: [] } : p));
            setStats(prev => ({ ...prev, reportedPosts: Math.max(0, prev.reportedPosts - 1) }));
          } else {
            setModalConfig({
              isOpen: true,
              title: "Error",
              message: "Failed to dismiss report.",
              onConfirm: closeModal,
              confirmText: "Close",
              isDanger: true
            });
          }
        } catch (e) {
          console.error(e);
          setModalConfig({
            isOpen: true,
            title: "Error",
            message: "An error occurred while dismissing the report.",
            onConfirm: closeModal,
            confirmText: "Close",
            isDanger: true
          });
        }
      }
    });
  };

  const handleDeletePost = (postId: string) => {
    setModalConfig({
      isOpen: true,
      title: "Delete Post",
      message: "Are you sure you want to permanently delete this post? This action cannot be undone. If there are reports, reporters will be notified.",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        closeModal();
        try {
          const res = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
          if (res.ok) {
            setAdminPosts(prev => prev.filter(p => p._id !== postId));
            setStats(prev => ({ ...prev, posts: prev.posts - 1 }));
          } else {
            setModalConfig({
              isOpen: true,
              title: "Error",
              message: "Failed to delete post.",
              onConfirm: closeModal,
              confirmText: "Close",
              isDanger: true
            });
          }
        } catch (e) {
          console.error(e);
          setModalConfig({
            isOpen: true,
            title: "Error",
            message: "An error occurred while deleting the post.",
            onConfirm: closeModal,
            confirmText: "Close",
            isDanger: true
          });
        }
      }
    });
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                <div className="flex items-center gap-3 text-error mb-2">
                  <span className="material-symbols-outlined">report</span>
                  <h3 className="font-bold">Reported Posts</h3>
                </div>
                <div className="text-4xl font-black text-error">{stats.reportedPosts || 0}</div>
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
                    <p className="text-sm opacity-80">You are viewing this page because your account has the 'admin' or 'owner' tag. You can promote other users using the <code>npm run promote -- email@example.com</code> script in the terminal, or via the Users tab.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'users':
        return (
          <div className="bg-surface-container rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/15 flex justify-between items-center">
              <h2 className="text-xl font-bold font-headline">User Management</h2>
              <button onClick={fetchUsers} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-sm uppercase tracking-wider">
                    <th className="p-4 font-bold">User</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold text-center">Status</th>
                    <th className="p-4 font-bold">Tags</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {adminUsers.map(u => (
                    <tr key={u._id} className="hover:bg-surface-container-high/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={getAvatarUrl(u)} className="w-8 h-8 rounded-full" alt="" />
                          <div>
                            <div className="font-bold">{u.name}</div>
                            <div className="text-xs text-on-surface-variant">@{u.slackId || u.id.slice(-6)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-on-surface-variant">{u.email}</td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleVerifyUser(u._id, u.verificationStatus)}
                          className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold transition-colors ${
                            u.verificationStatus === 'verified' 
                              ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                              : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-highest/80'
                          }`}
                        >
                          {u.verificationStatus === 'verified' ? 'Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {u.tags?.map((t: string) => <UserTag key={t} tag={t} />)}
                          {(!u.tags || u.tags.length === 0) && <span className="text-xs text-on-surface-variant italic">none</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleUpdateTags(u._id, u.tags || [])}
                          className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-bold transition-colors"
                        >
                          Edit Tags
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'posts':
        return (
          <div className="bg-surface-container rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/15 flex justify-between items-center">
              <h2 className="text-xl font-bold font-headline">Content Moderation</h2>
              <button onClick={fetchPosts} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-sm uppercase tracking-wider">
                    <th className="p-4 font-bold">Author</th>
                    <th className="p-4 font-bold">Content Excerpt</th>
                    <th className="p-4 font-bold text-center">Reports</th>
                    <th className="p-4 font-bold">Date</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {adminPosts.sort((a, b) => (b.reports?.length || 0) - (a.reports?.length || 0)).map(p => (
                    <tr key={p._id} className={`transition-colors ${p.reports?.length > 0 ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-surface-container-high/50'}`}>
                      <td className="p-4">
                        <div className="font-bold">{p.author?.name || 'Unknown'}</div>
                        <div className="text-xs text-on-surface-variant">@{p.author?.slackId || 'unknown'}</div>
                      </td>
                      <td className="p-4 text-sm max-w-md truncate">
                        {p.content || <span className="italic text-on-surface-variant">[Media only]</span>}
                      </td>
                      <td className="p-4 text-center">
                        {p.reports?.length > 0 ? (
                          <span className="inline-flex items-center justify-center bg-error text-white text-xs font-bold px-2 py-1 rounded-full">
                            {p.reports.length}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/40">-</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-on-surface-variant">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {(p.reports?.length > 0) && (
                            <button 
                              onClick={() => handleDismissReport(p._id)}
                              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-bold transition-colors"
                            >
                              Dismiss
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeletePost(p._id)}
                            className="px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 rounded-lg text-sm font-bold transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'audit':
        return (
          <div className="bg-surface-container rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/15 flex justify-between items-center">
              <h2 className="text-xl font-bold font-headline">Audit Logs</h2>
              <button onClick={fetchAuditLogs} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-sm uppercase tracking-wider">
                    <th className="p-4 font-bold">Date</th>
                    <th className="p-4 font-bold">Admin</th>
                    <th className="p-4 font-bold">Action</th>
                    <th className="p-4 font-bold">Target</th>
                    <th className="p-4 font-bold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {auditLogs.map(log => (
                    <tr key={log._id} className="hover:bg-surface-container-high/50 transition-colors">
                      <td className="p-4 text-sm text-on-surface-variant">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="font-bold">{log.adminName}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-highest text-on-surface">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        {log.targetType}: <span className="font-mono text-xs">{log.targetId.slice(-6)}</span>
                      </td>
                      <td className="p-4 text-sm max-w-xs truncate text-on-surface-variant">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-on-surface-variant italic">
                        No audit logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
            {stats.reportedPosts > 0 && (
              <span className="ml-auto bg-error text-white text-xs px-2 py-0.5 rounded-full">{stats.reportedPosts}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'audit' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <span className="material-symbols-outlined">history</span>
            Audit Logs
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
      <main className="flex-1 p-8 overflow-x-hidden">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-headline font-black capitalize">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-bold">{session.user.name}</div>
              <div className="text-xs text-primary uppercase tracking-wider font-bold">Administrator</div>
            </div>
            <img src={getAvatarUrl(session.user)} alt="Admin" className="w-10 h-10 rounded-full border-2 border-primary" />
          </div>
        </header>

        {renderTabContent()}
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AdminPage), { ssr: false });
