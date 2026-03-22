import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import md5 from "md5";

export async function GET(req: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const hashtag = searchParams.get("hashtag");
    
    // Normalize hashtag and handle the '#' prefix if it was included in the query string
    const normalizedHashtag = hashtag ? hashtag.replace("#", "").toLowerCase() : null;
    const filter = normalizedHashtag ? { hashtags: normalizedHashtag } : {};
    
    console.log("Fetching posts with filter:", filter);
    
    // Verified users (notable members) get priority in the feed
    const posts = await Post.find(filter)
      .sort({ 
        "author.verificationStatus": -1, // Sort "verified" before empty/null
        createdAt: -1 
      })
      .limit(50)
      .lean();

    // Map posts to include Gravatar URLs safely
    const enrichedPosts = await Promise.all(posts.map(async (post: any) => {
      // Find user to get their email (it's not in the Post model for privacy)
      let user = null;
      try {
        // First try finding by Mongodb _id
        user = await User.findOne({ _id: post.author.id });
      } catch (e) {
        // If author.id isn't a valid ObjectId, try finding by other fields or fallback
      }
      
      const email = user?.email || "hack@club.com";
      const gravatar = `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}?d=identicon&s=100`;
      
      // If the author is Orpheus, prioritize his image from the database
      let authorImage = post.author?.image;
      if (post.author?.slackId === 'orpheus' && user?.image) {
        authorImage = user.image;
      }

      return {
        ...post,
        author: {
          ...post.author,
          image: authorImage || gravatar
        }
      };
    }));

    return NextResponse.json(enrichedPosts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  try {
    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Handle $help command - if present, Orpheus responds and we don't save the human's post
    if (content.trim() === "$help") {
      const orpheus = await User.findOne({ slackId: 'orpheus' });
      if (orpheus) {
        const welcomeContent = `@${(session.user as any).slackId || session.user.name.replace(/\s+/g, '').toLowerCase()}, I'm Orpheus! 🦖 Here's how Hackspot works:\n\n• Type @ to mention friends\n• Use # for hashtags to trend\n• $lines shows your GitHub contributions\n• $repo [url] links your code\n\nNeed anything else? Just ask!`;

        const welcomePost = await Post.create({
          content: welcomeContent,
          author: {
            id: orpheus.id,
            name: orpheus.name,
            image: orpheus.image,
            slackId: orpheus.slackId,
            verificationStatus: orpheus.verificationStatus,
            tags: orpheus.tags || ['bot'],
          },
          createdAt: new Date()
        });

        // Create mention notifications for Orpheus's helper message
        const helpMentions = welcomeContent.match(/@([\w\d]+)/g);
        if (helpMentions) {
          const uniqueHandles = Array.from(new Set(helpMentions.map((m: string) => m.slice(1).toLowerCase())));
          const mentionedUsers = await User.find({ slackId: { $in: uniqueHandles } });

          for (const recipient of mentionedUsers) {
            if (recipient.id === orpheus.id) continue;

            await Notification.create({
              recipient: recipient.id,
              sender: {
                id: orpheus.id,
                name: orpheus.name,
                image: orpheus.image,
              },
              type: 'mention',
              post: welcomePost._id,
            });
          }
        }

        return NextResponse.json(welcomePost, { status: 201 });
      }
    }

    const currentUser = await User.findOne({ id: session.user.id });

    const post = await Post.create({
      content,
      author: {
        id: session.user.id,
        name: session.user.name,
        image: session.user.image,
        slackId: (session.user as any).slackId || "",
        verificationStatus: (session.user as any).verificationStatus || "false",
        tags: currentUser?.tags || [],
      },
    });

    // Handle mentions
    const mentions = content.match(/@([\w\d]+)/g);
    if (mentions) {
      const uniqueHandles = Array.from(new Set(mentions.map((m: string) => m.slice(1).toLowerCase())));
      
      // Find users with these handles specifically
      const mentionedUsers = await User.find({ 
        slackId: { $in: uniqueHandles } 
      });

      for (const recipient of mentionedUsers) {
        if (recipient.id === session.user.id) continue; // Don't notify self
        
        await Notification.create({
          recipient: recipient.id,
          sender: {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image,
          },
          type: 'mention',
          post: post._id,
        });
      }
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/posts Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 500 });
  }
}
