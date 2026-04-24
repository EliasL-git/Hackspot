import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  
  // Verify admin access
  const user = await User.findOne({ id: session.user.id });
  if (!user?.tags?.includes('admin') && !user?.tags?.includes('owner')) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();

    let totalStorageBytes = 0;
    try {
      const s3 = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        endpoint: process.env.AWS_ENDPOINT_URL_S3 || undefined,
        forcePathStyle: process.env.AWS_FORCE_PATH_STYLE === "true",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      });

      let isTruncated = true;
      let continuationToken: string | undefined = undefined;

      while (isTruncated) {
        const command = new ListObjectsV2Command({
          Bucket: process.env.AWS_S3_BUCKET_NAME || "hackspot-uploads",
          ContinuationToken: continuationToken,
        });
        
        const response = await s3.send(command);
        if (response.Contents) {
          totalStorageBytes += response.Contents.reduce((acc, obj) => acc + (obj.Size || 0), 0);
        }
        
        isTruncated = response.IsTruncated ?? false;
        continuationToken = response.NextContinuationToken;
      }
    } catch (s3Error) {
      console.error("Failed to fetch S3 stats:", s3Error);
      // We don't fail the whole request if S3 fails, just return 0
    }

    return NextResponse.json({
      users: userCount,
      posts: postCount,
      storageBytes: totalStorageBytes
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
