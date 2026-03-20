import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import User from "../src/models/User";
import mongoose from "mongoose";

async function forceCountAll() {
  const { Octokit } = await import("octokit");
  console.log("🚀 Starting global GitHub stats refresh...");
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not defined in .env");
  await mongoose.connect(MONGODB_URI, { dbName: 'hackspost' });

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  const users = await User.find({ githubUsername: { $exists: true, $ne: "" } });
  console.log(`Found ${users.length} users with GitHub accounts.`);

  for (const user of users) {
    const username = user.githubUsername;
    console.log(`\n📦 Processing ${username}...`);

    try {
      const repos = await octokit.paginate("GET /users/{username}/repos", {
        username,
        per_page: 100,
        type: "owner"
      });

      let totalLines = 0;
      const statsPromises = [];

      for (const repo of repos) {
        if (repo.fork) continue;
        
        const promise = (async () => {
          try {
            const { data: stats } = await octokit.request("GET /repos/{owner}/{repo}/stats/contributors", {
              owner: username,
              repo: repo.name
            });
            
            if (Array.isArray(stats)) {
              const userStats = stats.find(c => 
                c.author?.login?.toLowerCase() === username.toLowerCase()
              );
              
              if (userStats && userStats.weeks) {
                return userStats.weeks.reduce((acc, week) => acc + (week.a || 0), 0);
              }
            }
          } catch (e) {
            // Silently ignore repo errors (e.g. empty repos)
          }
          return 0;
        })();
        
        statsPromises.push(promise);
        if (statsPromises.length > 20) {
          const results = await Promise.all(statsPromises);
          totalLines += results.reduce((a, b) => a + b, 0);
          statsPromises.length = 0;
        }
      }

      const remainingResults = await Promise.all(statsPromises);
      totalLines += remainingResults.reduce((a, b) => a + b, 0);

      user.githubStats = {
        totalLines,
        lastUpdated: new Date()
      };
      await user.save();
      console.log(`✅ ${username}: ${totalLines.toLocaleString()} lines synced.`);
    } catch (err) {
      if (err instanceof Error) {
        console.error(`❌ Failed to sync ${username}:`, err.message);
      } else {
        console.error(`❌ Failed to sync ${username}:`, err);
      }
    }
  }

  console.log("\n✨ All users synced successfully!");
  process.exit(0);
}

forceCountAll().catch(err => {
  console.error(err);
  process.exit(1);
});