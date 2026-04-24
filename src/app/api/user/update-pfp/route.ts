import dbConnect from "@/lib/db";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageUrl } = await req.json();

  if (!imageUrl) {
    return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
  }

  await dbConnect();

  try {
    const user = await User.findOne({ id: session.user.id });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the user's image in the database
    await User.updateOne({ id: session.user.id }, { $set: { image: imageUrl } });

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    return NextResponse.json({ error: "Failed to update profile picture" }, { status: 500 });
  }
}