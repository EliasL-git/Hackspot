import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Octokit } from "octokit";
import User from "@/models/User";
import dbConnect from "@/lib/db";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

export async function GET(req: Request) {
  let session = null;
  try {
    // better-auth may throw when headers are empty or missing on internal build-time calls.
    if (!req.headers?.get("cookie")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    session = await auth.api.getSession({ headers: req.headers });
  } catch (err) {
    console.error("Auth getSession failed:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  try {
    await dbConnect();
    
    // Check if we have recent stats (less than 4 hours old)
    const user = await User.findOne({ 
      $or: [{ githubUsername: username }, { email: session.user.email }] 
    });

    if (user?.githubStats?.lastUpdated && 
        (Date.now() - new Date(user.githubStats.lastUpdated).getTime() < 4 * 60 * 60 * 1000) &&
        user?.githubStats?.totalLines > 0) {
      return NextResponse.json({ totalLines: user.githubStats.totalLines, cached: true });
    }

    // If stats are older than 4 hours, CLEAR the current stats from the DB
    // to "delete old data" and start fresh.
    if (user && user.githubStats) {
      console.log(`Clearing stale stats for ${username}...`);
      user.githubStats = {
        totalLines: 0,
        lastUpdated: new Date(0) // Reset to epoch to force immediate refresh
      };
      await user.save();
    }

    console.log(`Lazy fetching GitHub stats for ${username}...`);

    // Fetch from GitHub
    // This is a simplified approach: getting stats from all public repos
    const repos = await octokit.paginate("GET /users/{username}/repos", {
      username,
      per_page: 100,
      type: "owner",
      sort: "updated"
    });

    let totalLines = 0;
    const repoLog: string[] = [];
    const statsPromises = [];

    // Fetch actual contributions/lines by the user specifically
    for (const repo of repos) {
      if (repo.fork) continue;
      
      const promise = (async () => {
        try {
          const { data: stats, status } = await octokit.request("GET /repos/{owner}/{repo}/stats/contributors", {
            owner: username,
            repo: repo.name,
            headers: {
              "If-None-Match": "" // Force bypass of some internal caching if needed
            }
          });
          
          // GitHub returns 202 if stats are calculating.
          if (status === 202) {
            console.log(`GitHub is calculating stats for ${repo.name}...`);
            return 0;
          }

          if (Array.isArray(stats)) {
            const userStats = stats.find(c => 
              c.author?.login?.toLowerCase() === username.toLowerCase()
            );
            
            if (userStats && userStats.weeks) {
              const repoAdditions = userStats.weeks.reduce((acc, week) => acc + (week.a || 0), 0);
              if (repoAdditions > 0) {
                repoLog.push(`${repo.name}: +${repoAdditions}`);
                return repoAdditions;
              }
            }
          }
        } catch (e) {
          console.error(`Error fetching contributor stats for ${repo.name}:`, e);
        }
        return 0;
      })();
      
      statsPromises.push(promise);
      // Optional: limit concurrency if there are too many repos
      if (statsPromises.length > 15) {
        const results = await Promise.all(statsPromises);
        totalLines += results.reduce((a, b) => a + b, 0);
        statsPromises.length = 0;
      }
    }

    const remainingResults = await Promise.all(statsPromises);
    totalLines += remainingResults.reduce((a, b) => a + b, 0);

    console.log(`Calculated ${totalLines} for ${username}. Breakdown:`, repoLog.sort());

    // Update user in DB
    if (user && totalLines > 0) {
      user.githubUsername = username;
      user.githubStats = {
        totalLines,
        lastUpdated: new Date()
      };
      await user.save();
    }

    // Safety check: remove any potential private info from the response
    return NextResponse.json({ 
      totalLines, 
      cached: false,
      username: username // Share the username, but nothing else (email, etc)
    });
  } catch (err: any) {
    console.error("GitHub stats error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
