import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

const URI = MONGODB_URI || 'mongodb://localhost:27017/hackspost';

if (!MONGODB_URI) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Warning: MONGODB_URI is not defined in production. This might cause runtime errors if not during build phase.');
  } else {
    console.warn('Warning: MONGODB_URI is not defined. Using fallback mongodb://localhost:27017/hackspost. This is only suitable for local dev.');
  }
}


let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: 'hackspost'
    };

    cached.promise = mongoose.connect(URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
