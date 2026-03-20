import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  image?: string;
  slackId?: string;
  verificationStatus?: string;
  githubUsername?: string;
  githubStats?: {
    totalLines: number;
    lastUpdated: Date;
  };
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  image: { type: String },
  slackId: { type: String },
  verificationStatus: { type: String },
  githubUsername: { type: String },
  githubStats: {
    totalLines: { type: Number, default: 0 },
    lastUpdated: { type: Date },
  },
  tags: [{ type: String }],
}, { 
  timestamps: true,
  collection: 'user',
  strict: false,
  _id: true
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
