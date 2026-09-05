import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IWebhookEvent extends Document {
  eventId: string;
  event: string;
  paymentId?: string;

  status: "processing" | "processed" | "failed";

  receivedAt: Date;
  processingStartedAt?: Date;
  processedAt?: Date;

  lastError?: string;
}

const WebhookEventSchema =
  new Schema<IWebhookEvent>(
    {
      eventId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },

      event: {
        type: String,
        required: true,
        index: true,
      },

      paymentId: {
        type: String,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "processing",
          "processed",
          "failed",
        ],
        default: "processing",
        required: true,
      },

      receivedAt: {
        type: Date,
        default: Date.now,
      },

      processingStartedAt: {
        type: Date,
      },

      processedAt: {
        type: Date,
      },

      lastError: {
        type: String,
      },
    },
    {
      timestamps: true,
    }
  );

const WebhookEvent: Model<IWebhookEvent> =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>(
    "WebhookEvent",
    WebhookEventSchema
  );

export default WebhookEvent;