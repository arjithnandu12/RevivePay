import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubscription extends Document {
  subscriptionId: string;
  customerId: string;
  plan: string;
  amount: number;
  status: "active" | "cancelled" | "paused" | "expired";
  renewalDate: Date;
  createdAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    subscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    customerId: {
      type: String,
      required: true,
      index: true,
    },

    plan: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      required: true,
      enum: ["active", "cancelled", "paused", "expired"],
      default: "active",
    },

    renewalDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);

export default Subscription;