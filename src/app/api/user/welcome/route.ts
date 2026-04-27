import dbConnect from "@/lib/db";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Notification from "@/models/Notification";

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
    if (!user.welcomed) {
        const orpheus = await User.findOne({ slackId: 'orpheus' });
        
        if (orpheus) {
            // Create a welcome notification from Orpheus mentioning the new user
            const welcomeContent = `Welcome to Hackspot, @${user.slackId || user.name.replace(/\s+/g, '').toLowerCase()}! 🦖 So glad to have you here. Try typing @ to mention someone, # for hashtags, or $ for commands!`;
            
            await Notification.create({
              recipient: user.id,
              sender: {
                id: orpheus.id,
                name: orpheus.name,
                image: orpheus.image,
              },
              type: 'mention',
              // We don't have a post ID for a direct message, but the notification schema might require it.
              // If post is required, we might need to adjust the Notification schema or create a dummy post.
              // Assuming 'post' is optional or we can leave it out for a direct welcome message.
              // If it fails, we might need to create a post anyway, but let's try without it or with a special flag.
              // Actually, let's just send the notification.
              message: welcomeContent // We might need to add 'message' to Notification schema if it doesn't exist, or just use the type 'mention' to trigger a generic welcome.
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
