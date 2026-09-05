import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export type CommunicationChannel =
  | "email"
  | "sms"
  | "call";

export type CommunicationStatus =
  | "pending"
  | "queued"
  | "initiated"
  | "ringing"
  | "answered"
  | "in_progress"
  | "completed"
  | "no_answer"
  | "busy"
  | "failed";

export interface ICallTranscript {
  speaker: "agent" | "customer";
  text: string;
  timestamp: Date;
}

export interface IRecoveryCommunication
  extends Document {
  paymentId: string;
  customerId: string;
  recoveryAttemptId?: string;

  channel: CommunicationChannel;

  status: CommunicationStatus;

  provider:
    | "twilio"
    | "email"
    | "other";

  providerId?: string | null;

  recipient?: string | null;

  message?: string | null;

  transcript: ICallTranscript[];

  customerProblem?: string | null;

  customerIntent?:
    | "payment_problem"
    | "technical_problem"
    | "payment_method_problem"
    | "confused"
    | "wants_to_pay"
    | "pay_later"
    | "human_support"
    | "declined"
    | "other"
    | null;

  requestedHumanSupport: boolean;

  sentiment?:
    | "positive"
    | "neutral"
    | "frustrated"
    | "negative"
    | null;

  resolution?:
    | "payment_link_requested"
    | "human_escalation"
    | "follow_up_required"
    | "recovery_stopped"
    | "problem_resolved"
    | "customer_will_pay"
    | "no_resolution"
    | null;

  followUpRequired: boolean;

  paymentLinkSent: boolean;

  paymentLinkSentAt?: Date | null;

  duration?: number | null;

  startedAt?: Date | null;

  endedAt?: Date | null;

  failureReason?: string | null;

  turnCount: number;

  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

const TranscriptSchema =
  new Schema<ICallTranscript>(
    {
      speaker: {
        type: String,
        enum: ["agent", "customer"],
        required: true,
      },

      text: {
        type: String,
        required: true,
        trim: true,
      },

      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: false,
    }
  );

const RecoveryCommunicationSchema =
  new Schema<IRecoveryCommunication>(
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

      recoveryAttemptId: {
        type: String,
        index: true,
      },

      channel: {
        type: String,
        enum: [
          "email",
          "sms",
          "call",
        ],
        required: true,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "queued",
          "initiated",
          "ringing",
          "answered",
          "in_progress",
          "completed",
          "no_answer",
          "busy",
          "failed",
        ],
        default: "pending",
        required: true,
      },

      provider: {
        type: String,
        enum: [
          "twilio",
          "email",
          "other",
        ],
        required: true,
      },

      providerId: {
        type: String,
        default: null,
        index: true,
      },

      recipient: {
        type: String,
        default: null,
      },

      message: {
        type: String,
        default: null,
      },

      transcript: {
        type: [TranscriptSchema],
        default: [],
      },

      customerProblem: {
        type: String,
        default: null,
      },

      customerIntent: {
        type: String,
        enum: [
          "payment_problem",
          "technical_problem",
          "payment_method_problem",
          "confused",
          "wants_to_pay",
          "pay_later",
          "human_support",
          "declined",
          "other",
        ],
        default: null,
      },

      requestedHumanSupport: {
        type: Boolean,
        default: false,
      },

      sentiment: {
        type: String,
        enum: [
          "positive",
          "neutral",
          "frustrated",
          "negative",
        ],
        default: null,
      },

      resolution: {
        type: String,
        enum: [
          "payment_link_requested",
          "human_escalation",
          "follow_up_required",
          "recovery_stopped",
          "problem_resolved",
          "customer_will_pay",
          "no_resolution",
        ],
        default: null,
      },

      followUpRequired: {
        type: Boolean,
        default: false,
      },

      paymentLinkSent: {
        type: Boolean,
        default: false,
      },

      paymentLinkSentAt: {
        type: Date,
        default: null,
      },

      duration: {
        type: Number,
        default: null,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      endedAt: {
        type: Date,
        default: null,
      },

      failureReason: {
        type: String,
        default: null,
      },

      turnCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      metadata: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    {
      timestamps: true,
    }
  );

const RecoveryCommunication: Model<IRecoveryCommunication> =
  mongoose.models.RecoveryCommunication ||
  mongoose.model<IRecoveryCommunication>(
    "RecoveryCommunication",
    RecoveryCommunicationSchema
  );

export default RecoveryCommunication;