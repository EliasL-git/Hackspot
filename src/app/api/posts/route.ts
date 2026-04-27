import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import md5 from "md5";
import ogs from "open-graph-scraper";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const hashtag = searchParams.get("hashtag");
    const cursor = searchParams.get("cursor");
    
    const normalizedHashtag = hashtag ? hashtag.replace("#", "").toLowerCase() : null;
    const filter: any = normalizedHashtag ? { hashtags: normalizedHashtag } : {};
    
    // Only show posts that are NOT direct messages (we can identify DMs if they have a specific flag or if we just don't create posts for DMs anymore)
    // Wait, the issue says "posts dont show up on the main page only on profiles".
    // Let's check the filter. The filter is empty if there's no hashtag.
    // Wait, the previous code had:
    // const posts = await Post.find(filter).sort({ "author.verificationStatus": -1, createdAt: -1 }).limit(20).lean();
    // This sorts by verificationStatus descending, then createdAt descending.
    // If verificationStatus is a string, "unverified" > "verified" alphabetically!
    // So "unverified" posts would show up FIRST, or maybe it's sorting "verified" (v) before "unverified" (u) if ascending, but descending means "unverified" comes first!
    // Actually, "verified" vs "unverified" - 'v' is after 'u'. So descending (-1) puts 'v' before 'u'.
    // Wait, 'v' (118) > 'u' (117). So descending puts 'v' first. That's correct.
    // BUT what if verificationStatus is undefined or missing for some posts?
    // Let's just sort by createdAt: -1 to see if that fixes the "posts don't show up" issue.
    // Sorting by a string field that might be missing can cause issues in MongoDB.
    
    if (cursor) {
      filter._id = { $lt: cursor };
    }
    
    const posts = await Post.find(filter)
      .sort({ 
        createdAt: -1 
      })
      .limit(20)
      .lean();

    const enrichedPosts = await Promise.all(posts.map(async (post: any) => {
      let user = null;
      try {
        user = await User.findOne({ id: post.author.id }).lean();
      } catch (e) {}
      
      const email = user?.email || "hack@club.com";
      const gravatar = `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}?d=identicon&s=100`;
      
      let authorImage = post.author?.image;
      let authorTags = post.author?.tags || [];
      let authorEquippedTag = post.author?.equippedTag;
      // Use the user's current verification status from the DB, not the one saved on the post
      let authorVerificationStatus = user?.verificationStatus || "unverified";
      let authorGithubStats = user?.githubStats || null;

      if (post.author?.slackId === 'orpheus') {
        const orpheus = await User.findOne({ slackId: 'orpheus' }).lean() as any;
        if (orpheus) {
          authorImage = orpheus.image || authorImage;
          authorTags = orpheus.tags || authorTags;
          authorEquippedTag = orpheus.equippedTag || (orpheus.tags && orpheus.tags[0]);
          authorVerificationStatus = orpheus.verificationStatus || authorVerificationStatus;
          authorGithubStats = orpheus.githubStats || authorGithubStats;
        }
      }

      return {
        ...post,
        author: {
          ...post.author,
          image: authorImage || gravatar,
          tags: authorTags,
          equippedTag: authorEquippedTag,
          verificationStatus: authorVerificationStatus,
          githubStats: authorGithubStats
        }
      };
    }));

    const nextCursor = posts.length === 20 ? posts[posts.length - 1]._id : null;

    return NextResponse.json({ posts: enrichedPosts, nextCursor });
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
    const { content, media, poll } = await req.json();
    if (!content && (!media || media.length === 0) && !poll) {
      return NextResponse.json({ error: "Content, media, or poll is required" }, { status: 400 });
    }

    if (content && content.trim() === "$help") {
      const orpheus = await User.findOne({ slackId: 'orpheus' });
      if (orpheus) {
        const welcomeContent = `@@${(session.user as any).slackId || session.user.name.replace(/\s+/g, '').toLowerCase()}, I'm Orpheus! 🦖 Here's how Hackspot works:\n\n• Type @ to mention friends\n• Use # for hashtags to trend\n• $lines shows your GitHub contributions\n• $repo [url] links your code\n\nNeed anything else? Just ask!`;

        const welcomePost = await Post.create({
          content: welcomeContent,
          author: {
            id: orpheus.id,
            name: orpheus.name,
            image: orpheus.image,
            slackId: orpheus.slackId,
            verificationStatus: orpheus.verificationStatus,
            tags: orpheus.tags || ['bot'],
            equippedTag: orpheus.equippedTag || (orpheus.tags && orpheus.tags[0]),
          },
          createdAt: new Date()
        });

        const helpMentions = welcomeContent.match(/@([\w\d]+)/g);
        if (helpMentions) {
          const uniqueHandles = Array.from(new Set(helpMentions.map((m: string) => m.slice(1).toLowerCase())));
          const mentionedUsers = await User.find({ 
            slackId: { $in: uniqueHandles } 
          });

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

    let ogData = null;
    if (content) {
      const urlMatch = content.match(/(?:https?:\/\/)[^\s]+/i);
      if (urlMatch) {
        try {
          const { result } = await ogs({ url: urlMatch[0] });
          if (result.success) {
            ogData = {
              title: result.ogTitle,
              description: result.ogDescription,
              image: result.ogImage?.[0]?.url,
              url: result.ogUrl || urlMatch[0]
            };
          }
        } catch (e) {
          console.error("OG Fetch failed", e);
        }
      }
    }

    const currentUser = await User.findOne({ id: session.user.id }).lean() as any;

    const post = await Post.create({
      content: content || "",
      media: media || [],
      poll: poll || undefined,
      ogData,
      author: {
        id: session.user.id,
        name: session.user.name,
        image: session.user.image,
        slackId: (session.user as any).slackId || "",
        verificationStatus: currentUser?.verificationStatus || "unverified",
        tags: currentUser?.tags || [],
        equippedTag: currentUser?.equippedTag || (currentUser?.tags && currentUser?.tags[0]),
        githubStats: currentUser?.githubStats || null,
      },
    });

    if (content) {
      const mentions = content.match(/@([\w\d]+)/g);
      if (mentions) {
        const uniqueHandles = Array.from(new Set(mentions.map((m: string) => m.slice(1).toLowerCase())));
        const mentionedUsers = await User.find({ 
          slackId: { $in: uniqueHandles } 
        });

        for (const recipient of mentionedUsers) {
          if (recipient.id === session.user.id) continue;
          
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
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/posts Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 500 });
  }
}
