import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  await dbConnect();
  try {
    const { email, secret } = await req.json();
    
    // Ensure the secret is configured and matches
    if (!process.env.ADMIN_SETUP_SECRET || secret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json({ error: "Invalid or missing ADMIN_SETUP_SECRET" }, { status: 403 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newTags = Array.from(new Set([...(user.tags || []), 'admin']));
    await User.updateOne({ email: email.toLowerCase().trim() }, { $set: { tags: newTags } });

    return NextResponse.json({ 
        success: true, 
        message: `User ${user.name} (${user.email}) has been successfully promoted to admin!` 
    });
  } catch (error) {
    console.error("Promotion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
