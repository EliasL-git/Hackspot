import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";

const s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.AWS_ENDPOINT_URL_S3 || undefined,
    forcePathStyle: process.env.AWS_FORCE_PATH_STYLE === "true",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

export async function POST(req: Request) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { filename, contentType } = await req.json();
        const key = `uploads/${session.user.id}/${crypto.randomUUID()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const bucket = process.env.AWS_S3_BUCKET_NAME || "hackspot-uploads";

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        
        // Construct the public URL
        let fileUrl;
        if (process.env.AWS_S3_PUBLIC_URL && process.env.AWS_S3_PUBLIC_URL.trim() !== "") {
            // Explicit public URL (e.g., CDN or custom endpoint like https://storageperk.s3.fra.databucket.eu)
            let publicUrl = process.env.AWS_S3_PUBLIC_URL.trim().replace(/\/$/, '');
            if (!publicUrl.startsWith('http')) {
                publicUrl = `https://${publicUrl}`;
            }
            fileUrl = `${publicUrl}/${key}`;
        } else if (process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ENDPOINT_URL_S3.trim() !== "") {
            // For custom endpoints (like MinIO, R2, etc.)
            let endpoint = process.env.AWS_ENDPOINT_URL_S3.trim().replace(/\/$/, '');
            if (!endpoint.startsWith('http')) {
                endpoint = `https://${endpoint}`;
            }
            if (process.env.AWS_FORCE_PATH_STYLE === "true") {
                fileUrl = `${endpoint}/${bucket}/${key}`;
            } else {
                const urlObj = new URL(endpoint);
                fileUrl = `${urlObj.protocol}//${bucket}.${urlObj.host}/${key}`;
            }
        } else {
            // Default AWS S3 URL
            fileUrl = `https://${bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
        }

        console.log(`[Upload] Presigned URL generated. File will be available at: ${fileUrl}`);

        return NextResponse.json({ signedUrl, fileUrl });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
}
