import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { genericOAuth } from "better-auth/plugins";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db("hackspost");

export const auth = betterAuth({
  database: mongodbAdapter(db),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  user: {
    additionalFields: {
      slackId: {
        type: "string",
        required: false,
      },
      verificationStatus: {
        type: "string",
        required: false,
      },
      githubUsername: {
        type: "string",
        required: false,
      }
    }
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "hackclub",
          discoveryUrl: "https://auth.hackclub.com/.well-known/openid-configuration",
          clientId: process.env.HACKCLUB_CLIENT_ID!,
          clientSecret: process.env.HACKCLUB_CLIENT_SECRET!,
          scopes: ["openid", "profile", "email", "verification_status", "slack_id"],
          redirectURI: (process.env.BETTER_AUTH_URL || "http://localhost:3000") + "/api/auth/oauth2/callback/hackclub",
          getUserInfo: async (token) => {
            const res = await fetch("https://auth.hackclub.com/userinfo", {
              headers: { Authorization: `Bearer ${token.accessToken}` },
            });
            const profile = await res.json();
            return {
              id: profile.sub,
              name: profile.name,
              email: profile.email,
              emailVerified: !!profile.email,
              image: profile.picture,
              slackId: profile.slack_id,
              verificationStatus: profile.verification_status,
            };
          },
        },
      ],
    }),
  ],
});
