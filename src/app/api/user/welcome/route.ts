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
            // Create a welcome notification from Orpheus
            const welcomeContent = `Welcome to Hackspot, @${user.slackId || user.name.replace(/\s+/g, '').toLowerCase()}! 🦖 So glad to have you here. Try typing @ to mention someone, # for hashtags, or $ for commands!`;
            
            await Notification.create({
              recipient: user.id,
              sender: {
                id: orpheus.id,
                name: orpheus.name,
                image: orpheus.image,
              },
              type: 'welcome',
              message: welcomeContent
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
