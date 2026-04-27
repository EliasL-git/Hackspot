import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  adminId: string;
  adminName: string;
  action: string;
  targetId: string;
  targetType: string;
  details?: any;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
  adminId: { type: String, required: true },
  adminName: { type: String, required: true },
  action: { type: String, required: true },
  targetId: { type: String, required: true },
  targetType: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'audit_logs' });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);