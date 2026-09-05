import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISettings extends Document {
  key: string;

  policy: {
    retryLimit: number;
    highValueThreshold: number;
    humanApprovalThreshold: number;
    suspiciousPayments: "manual_review" | "auto_block";
    automaticRetries: boolean;
  };

  notifications: {
    emailOnEscalation: boolean;
    emailOnRecovery: boolean;
  };
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
    },

    policy: {
      retryLimit: { type: Number, default: 3 },
      highValueThreshold: { type: Number, default: 500000 },
      humanApprovalThreshold: { type: Number, default: 500000 },
      suspiciousPayments: {
        type: String,
        enum: ["manual_review", "auto_block"],
        default: "manual_review",
      },
      automaticRetries: { type: Boolean, default: true },
    },

    notifications: {
      emailOnEscalation: { type: Boolean, default: true },
      emailOnRecovery: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

const Settings: Model<ISettings> =
  mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);

export default Settings;