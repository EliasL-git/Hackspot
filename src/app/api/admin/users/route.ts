import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import mongoose from "mongoose";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  
  const userId = session.user.id;
  const query: any[] = [{ id: userId }];
  if (mongoose.Types.ObjectId.isValid(userId)) {
    query.push({ _id: userId });
  }

  const adminUser = await User.findOne({ $or: query });
  if (!adminUser?.tags?.includes('admin') && !adminUser?.tags?.includes('owner')) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
