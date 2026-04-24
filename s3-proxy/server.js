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

    // Remove leading slash and any query parameters to get the exact S3 key
    const key = req.url.substring(1).split('?')[0];
    
    if (!key || key === "") {
        res.writeHead(400);
        return res.end("Missing key");
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

        // Stream the S3 object directly to the client
        response.Body.pipe(res);
    } catch (error) {
        console.error(`S3 GetObject error for key ${key}:`, error.message);
        res.writeHead(error.$metadata?.httpStatusCode || 404);
        res.end("Not found or access denied");
    }
});

server.listen(port, () => {
    console.log(`S3 Proxy listening on port ${port}`);
});
