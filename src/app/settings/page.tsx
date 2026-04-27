"use client";

import { useState, useRef, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Settings, Download, Image as ImageIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MD5 } from "crypto-js";

function SettingsPageContent() {
  const { data: session, isPending } = authClient.useSession();
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userImage, setUserImage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      setUserImage(user.image || `https://www.gravatar.com/avatar/${MD5(user.email.toLowerCase().trim()).toString()}?d=identicon&s=200`);
    }
  }, [session]);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) throw new Error("Failed to export data");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hackspot-export-${(session?.user as any)?.slackId || session?.user?.id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      alert("Failed to export data. Please try again later.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Upload to S3
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      
      if (!uploadRes.ok) throw new Error("Failed to get upload URL");
      
      const { signedUrl, fileUrl } = await uploadRes.json();
      
      await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      // 2. Update user profile in database
      const updateRes = await fetch('/api/user/update-pfp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: fileUrl })
      });

      if (!updateRes.ok) throw new Error("Failed to update profile picture");

      // 3. Update Better-Auth user data
      await (authClient as any).updateUser({
        image: fileUrl
      });

      setUserImage(fileUrl);
      alert("Profile picture updated successfully!");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Failed to update profile picture.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
          <p className="text-on-surface-variant mb-6">Please sign in to view your settings.</p>
          <button
            onClick={() => authClient.signIn.oauth2({ providerId: "hackclub", callbackURL: "/settings" })}
            className="w-full bg-primary text-on-primary-fixed px-6 py-3 rounded-full font-headline font-bold hover:bg-primary-dim transition"
          >
            Sign in with Hack Club
          </button>
        </div>
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
          <Link href="/settings" className="text-primary font-bold flex items-center gap-4 py-3 px-4 rounded-lg bg-white/5 font-headline text-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
            <span>Settings</span>
          </Link>
        </nav>
      </aside>

      <main className="flex-1 border-r border-outline-variant/15 min-w-0 max-w-[800px]">
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-4 py-2 flex items-center gap-8 border-b border-outline-variant/10">
          <Link href="/" className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="font-headline font-black text-xl tracking-tight">Settings</h1>
          </div>
        </header>

        <div className="p-6 space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-headline font-bold">Account Information</h2>
            <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 space-y-4">
              <div>
                <p className="text-sm text-on-surface-variant font-bold uppercase tracking-wider mb-1">Email Address</p>
                <p className="text-lg font-body">{session.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant font-bold uppercase tracking-wider mb-1">Name</p>
                <p className="text-lg font-body">{session.user.name}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-headline font-bold">Profile Picture</h2>
            <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 flex items-center gap-6">
              <img src={userImage || ""} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-background" />
              <div className="space-y-2">
                <p className="text-on-surface-variant text-sm">Upload a new profile picture. Max size 5MB.</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handlePfpUpload} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 bg-surface-container-highest hover:bg-surface-container-highest/80 px-4 py-2 rounded-full font-bold transition-colors disabled:opacity-50"
                >
                  <ImageIcon className="w-4 h-4" />
                  {isUploading ? "Uploading..." : "Change Picture"}
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-headline font-bold">Data & Privacy</h2>
            <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-6 space-y-4">
              <p className="text-on-surface-variant">Download a copy of your data, including your profile information and posts.</p>
              <button 
                onClick={handleExportData}
                disabled={isExporting}
                className="flex items-center gap-2 bg-primary text-on-primary-fixed hover:brightness-110 px-6 py-3 rounded-full font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                {isExporting ? "Exporting..." : "Export My Data"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(SettingsPageContent), { ssr: false });