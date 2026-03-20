import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  content: string;
  author: {
    id: string;
    name: string;
    image?: string;
    slackId?: string;
    verificationStatus?: string;
  };
  hashtags: string[];
  likes: string[];
  reposts: string[];
  isRepost: boolean;
  originalPost?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PostSchema: Schema = new Schema({
  content: { type: String, required: true },
  author: {
    id: String,
    name: { type: String, required: true },
    image: { type: String },
    slackId: { type: String },
    verificationStatus: { type: String },
    tags: [{ type: String }],
  },
  hashtags: [{ type: String }],
  likes: [{ type: String, default: [] }],
  reposts: [{ type: String, default: [] }],
  isRepost: { type: Boolean, default: false },
  originalPost: { type: Schema.Types.ObjectId, ref: 'Post' },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'posts' });

// Middleware to extract hashtags
PostSchema.pre('save', function(this: any) {
  if (this.content) {
    const tags = this.content.match(/#[\w\d]+/g);
    this.hashtags = tags ? Array.from(new Set(tags.map((t: string) => t.replace("#", "").toLowerCase()))) : [];
  }
});

PostSchema.pre('validate', function(this: any) {
  if (this.content) {
    const tags = this.content.match(/#[\w\d]+/g);
    this.hashtags = tags ? Array.from(new Set(tags.map((t: string) => t.replace("#", "").toLowerCase()))) : [];
  }
});

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);
