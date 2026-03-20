import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { genericOAuth } from "better-auth/plugins";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hackspost";
const client = new MongoClient(MONGODB_URI);
const db = client.db("hackspost");

const hackClubClientId = process.env.HACKCLUB_CLIENT_ID;
const hackClubClientSecret = process.env.HACKCLUB_CLIENT_SECRET;

const oauthPlugins = [];
if (hackClubClientId && hackClubClientSecret) {
  oauthPlugins.push(
    genericOAuth({
      config: [
        {
          providerId: "hackclub",
          discoveryUrl: "https://auth.hackclub.com/.well-known/openid-configuration",
          clientId: hackClubClientId,
          clientSecret: hackClubClientSecret,
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
    })
  );
}

export const auth = betterAuth({
  database: mongodbAdapter(db),
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret",
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
      },
    },
  },
  plugins: oauthPlugins,
});
