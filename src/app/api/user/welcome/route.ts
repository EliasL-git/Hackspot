import dbConnect from "@/lib/db";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Post from "@/models/Post";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  
  try {
    const user = await User.findOne({ id: session.user.id });
    
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has already been welcomed
    // We'll use a virtual flag or check if they have any posts, OR we can add a flag to the user model
    // But for a simple approach: if they have 0 posts and haven't been welcomed, welcome them.
    // However, it's safer to add a flag to the User model so it only happens once.
    // Since we have strict: false, we can just check user.welcomed
    
    if (!user.welcomed) {
        const orpheus = await User.findOne({ slackId: 'orpheus' });
        
        if (orpheus) {
            // Create a welcome post from Orpheus mentioning the new user
            await Post.create({
                content: `Welcome to Hackspot, @${user.slackId || user.name.replace(/\s+/g, '').toLowerCase()}! 🦕 So glad to have you here. Try typing @ to mention someone, # for hashtags, or $ for commands!`,
                author: {
                    id: orpheus.id,
                    name: orpheus.name,
                    image: orpheus.image,
                    slackId: orpheus.slackId,
                    verificationStatus: orpheus.verificationStatus,
                    githubStats: orpheus.githubStats || null,
                },
                createdAt: new Date()
            });

            // Mark user as welcomed
            await User.updateOne({ id: user.id }, { $set: { welcomed: true } });
            
            return NextResponse.json({ welcomed: true });
        }
    }

    return NextResponse.json({ welcomed: false });
  } catch (error) {
    console.error("Welcome error:", error);
    return NextResponse.json({ error: "Failed to process welcome" }, { status: 500 });
  }
}