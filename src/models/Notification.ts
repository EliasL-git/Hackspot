import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipient: string; // user id
  sender: {
    id: string;
    name: string;
    image?: string;
  };
  type: 'mention' | 'like' | 'repost' | 'report';
  post: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  recipient: { type: String, required: true, index: true },
  sender: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String },
  },
  type: { type: String, enum: ['mention', 'like', 'repost', 'report'], required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  read: { type: Boolean, default: false },
}, { 
  timestamps: true,
  collection: 'notifications' 
});

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
