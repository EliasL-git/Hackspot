import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Octokit } from "octokit";
import User from "@/models/User";
import dbConnect from "@/lib/db";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hackspost";
const client = new MongoClient(MONGODB_URI);
const db = client.db("hackspost");

export async function GET(req: Request) {
  let session = null;
  try {
    if (!req.headers?.get("cookie")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    session = await auth.api.getSession({ headers: req.headers });
  } catch (err) {
    console.error("Auth getSession failed:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await dbConnect();
    
    // Fetch the GitHub account linked to this user from Better Auth's account collection
    const db = client.db("hackspost");
    const account = await db.collection("account").findOne({ 
      userId: session.user.id, 
      providerId: "github" 
    });

    if (!account || !account.accessToken) {
      return NextResponse.json({ error: "GitHub account not linked" }, { status: 400 });
    }

    const octokit = new Octokit({
      auth: account.accessToken
    });

    // Get the GitHub username from the authenticated token
    const { data: ghUser } = await octokit.request("GET /user");
    const username = ghUser.login;

    const user = await User.findOne({ id: session.user.id });

    if (user?.githubStats?.lastUpdated && 
        (Date.now() - new Date(user.githubStats.lastUpdated).getTime() < 4 * 60 * 60 * 1000) &&
        user?.githubStats?.totalLines > 0) {
      return NextResponse.json({ totalLines: user.githubStats.totalLines, cached: true });
    }

    // If stats are older than 4 hours, CLEAR the current stats from the DB
    if (user && user.githubStats) {
      console.log(`Clearing stale stats for ${username}...`);
      user.githubStats = {
        totalLines: 0,
        lastUpdated: new Date(0)
      };
      await user.save();
    }

    console.log(`Lazy fetching GitHub stats for ${username}...`);

    // Fetch the user's GitHub OAuth token from the database
    const account = await db.collection("account").findOne({ 
      userId: session.user.id, 
      providerId: "github" 
    });

    if (!account || !account.accessToken) {
      return NextResponse.json({ error: "GitHub account not linked. Please connect your GitHub account." }, { status: 403 });
    }

    const octokit = new Octokit({
      auth: account.accessToken
    });

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

    for (const repo of repos) {
      if (repo.fork) continue;
      
      const promise = (async () => {
        try {
          const { data: stats, status } = await octokit.request("GET /repos/{owner}/{repo}/stats/contributors", {
            owner: username,
            repo: repo.name,
            headers: {
              "If-None-Match": ""
            }
          });
          
          if (status === 202) {
            console.log(`GitHub is calculating stats for ${repo.name}...`);
            return 0;
          }

          if (Array.isArray(stats)) {
            const userStats = stats.find(c => 
              c.author?.login?.toLowerCase() === username.toLowerCase()
            );
            
            if (userStats && userStats.weeks) {
              const repoAdditions = userStats.weeks.reduce((acc: any, week: any) => acc + (week.a || 0), 0);
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
      if (statsPromises.length > 15) {
        const results = await Promise.all(statsPromises);
        totalLines += results.reduce((a, b) => a + b, 0);
        statsPromises.length = 0;
      }
    }

    const remainingResults = await Promise.all(statsPromises);
    totalLines += remainingResults.reduce((a, b) => a + b, 0);

    console.log(`Calculated ${totalLines} for ${username}. Breakdown:`, repoLog.sort());

    if (user && totalLines > 0) {
      user.githubUsername = username;
      user.githubStats = {
        totalLines,
        lastUpdated: new Date()
      };
      await user.save();
    }

    return NextResponse.json({ 
      totalLines, 
      cached: false,
      username: username 
    });
  } catch (err: any) {
    console.error("GitHub stats error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
