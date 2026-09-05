import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IRecoveryAttempt extends Document {
  paymentId: string;
  customerId: string;
  attemptNumber: number;

  strategy: string;
  aiReason: string;

  paymentUrl?: string | null;
  razorpayPaymentLinkId?: string | null;

  recoveryOrderId?: string | null;
  recoveryRazorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: Date;
  updatedAt: Date;

  status:
    | "pending"
    | "processing"
    | "success"
    | "RevivePay"
    | "failed"
    | "cancelled";

  attemptedAt: Date;
  completedAt?: Date | null;

  RevivePayAmount: number;

  failureReason?: string | null;

  aiConfidence?: number;
  recoveryProbability?: number;
  recommendedDelayMinutes?: number;
  recommendedChannel?: "email" | "sms" | "call" | "none";
  channel?:
  | "email"
  | "sms"
  | "call";

channelReason?: string;

  riskLevel?:
    | "LOW"
    | "MEDIUM"
    | "HIGH";

  suggestedMessage?: string;

  errorMessage?: string;
  emailSent?: boolean;
emailSentAt?: Date | null;
emailMessageId?: string | null;
emailError?: string | null;
}

const RecoveryAttemptSchema =
  new Schema<IRecoveryAttempt>(
    {
      paymentId: {
        type: String,
        required: true,
        index: true,
      },

      customerId: {
        type: String,
        required: true,
        index: true,
      },

      attemptNumber: {
        type: Number,
        required: true,
        min: 1,
        index: true,
      },

      strategy: {
        type: String,
        required: true,
        trim: true,
      },

      aiReason: {
        type: String,
        required: true,
        trim: true,
      },

      paymentUrl: {
        type: String,
        default: null,
      },

      razorpayPaymentLinkId: {
        type: String,
        default: null,
        index: true,
      },

      recoveryOrderId: {
        type: String,
        default: null,
        index: true,
      },

      recoveryRazorpayPaymentId: {
        type: String,
        default: null,
        index: true,
      },

      razorpayOrderId: {
        type: String,
        default: null,
        index: true,
      },

      razorpayPaymentId: {
        type: String,
        default: null,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "processing",
          "success",
          "RevivePay",
          "failed",
          "cancelled",
        ],
        default: "pending",
        required: true,
      },

      attemptedAt: {
        type: Date,
        default: Date.now,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      RevivePayAmount: {
        type: Number,
        default: 0,
        min: 0,
        required: true,
      },

      failureReason: {
        type: String,
        default: null,
        trim: true,
      },

      aiConfidence: {
        type: Number,
        min: 0,
        max: 1,
      },

      recoveryProbability: { type: Number, min: 0, max: 1 },
      recommendedDelayMinutes: { type: Number, min: 0, max: 10080 },
      recommendedChannel: { type: String, enum: ["email", "sms", "call", "none"] },

      riskLevel: {
        type: String,
        enum: [
          "LOW",
          "MEDIUM",
          "HIGH",
        ],
      },

      suggestedMessage: {
        type: String,
      },

      errorMessage: {
        type: String,
      },
      emailSent: {
  type: Boolean,
  default: false,
},

emailSentAt: {
  type: Date,
  default: null,
},

emailMessageId: {
  type: String,
  default: null,
},

emailError: {
  type: String,
  default: null,
},
channel: {
  type: String,
  enum: [
    "email",
    "sms",
    "call",
  ],
},

channelReason: {
  type: String,
},
    },
    {
      timestamps: true,
    }
  );

RecoveryAttemptSchema.index(
  { paymentId: 1 },
  {
    unique: true,
    name: "one_active_recovery_per_payment",
    partialFilterExpression: {
      status: { $in: ["pending", "processing"] },
    },
  }
);

const RecoveryAttempt: Model<IRecoveryAttempt> =
  mongoose.models.RecoveryAttempt ||
  mongoose.model<IRecoveryAttempt>(
    "RecoveryAttempt",
    RecoveryAttemptSchema
  );

export default RecoveryAttempt;