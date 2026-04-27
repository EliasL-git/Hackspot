const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const http = require("http");

const s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.AWS_ENDPOINT_URL_S3 || undefined,
    forcePathStyle: process.env.AWS_FORCE_PATH_STYLE === "true",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const bucket = process.env.AWS_S3_BUCKET_NAME || "hackspot-uploads";
const port = process.env.PORT || 4556;

const server = http.createServer(async (req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    if (req.method !== 'GET') {
        res.writeHead(405);
        return res.end("Method not allowed");
    }

    // Clean up the URL (remove query params, handle double slashes)
    let cleanPath = req.url.split('?')[0].replace(/\/+/g, '/');
    
    // Health check / root path
    if (cleanPath === '/' || cleanPath === "") {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end("Hackspot S3 Proxy is running. Request a valid file path to view media.");
    }

    // Remove leading slash
    let key = cleanPath.substring(1);

    // Decode URI components in the key since S3 keys might have spaces or special characters encoded in the URL
    try {
        key = decodeURIComponent(key);
    } catch (e) {
        console.error("Error decoding URI component:", e);
    }

    // If the path accidentally includes the bucket name (e.g. from forcePathStyle URLs), strip it
    if (key.startsWith(`${bucket}/`)) {
        key = key.substring(bucket.length + 1);
    }

    // Security & Bot filtering: Only serve files from the uploads/ directory
    if (!key.startsWith('uploads/')) {
        res.writeHead(404);
        return res.end("Not found");
    }

    try {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        const response = await s3.send(command);
        
        res.writeHead(200, {
            'Content-Type': response.ContentType || 'application/octet-stream',
            'Content-Length': response.ContentLength,
            'Cache-Control': 'public, max-age=31536000, immutable'
        });

        console.log(`[Proxy] Successfully served: ${key}`);

        // Stream the S3 object directly to the client
        response.Body.pipe(res);
    } catch (error) {
        // Don't log 404s as errors to keep logs clean
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            res.writeHead(404);
            return res.end("Not found");
        }
        
        console.error(`[Proxy] S3 GetObject error for key ${key}:`, error.name, error.message);
        res.writeHead(error.$metadata?.httpStatusCode || 500);
        res.end("Internal Server Error or Access Denied");
    }
});

server.listen(port, () => {
    console.log(`S3 Proxy listening on port ${port}`);
});
