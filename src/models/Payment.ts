import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IPayment extends Document {
  paymentId: string;
  orderId: string;
  customerId: string;

  amount: number;
  currency: string;

  status:
    | "pending"
    | "success"
    | "failed";

  failureReason?: string | null;
  failureCode?: string | null;
  failureSource?: string | null;
  failureStep?: string | null;

  attempts: number;

  razorpayPaymentId?: string;

  recoveryStatus:
    | "pending"
    | "in_progress"
    | "recovered"
    | "unrecoverable"
    | "refunded";

  recoveryAction?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema =
  new Schema<IPayment>(
    {
      paymentId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      orderId: {
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

      amount: {
        type: Number,
        required: true,
        min: 0,
      },

      currency: {
        type: String,
        required: true,
        default: "INR",
      },

      status: {
        type: String,
        required: true,
        enum: [
          "pending",
          "success",
          "failed",
        ],
        default: "pending",
      },

      failureReason: {
        type: String,
        default: null,
        trim: true,
      },

      failureCode: {
        type: String,
        default: null,
        trim: true,
      },

      failureSource: {
        type: String,
        default: null,
        trim: true,
      },

      failureStep: {
        type: String,
        default: null,
        trim: true,
      },

      attempts: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      razorpayPaymentId: {
        type: String,
        sparse: true,
        index: true,
      },

      recoveryStatus: {
        type: String,
        required: true,
        enum: [
          "pending",
          "in_progress",
          "recovered",
          "unrecoverable",
          "refunded",
        ],
        default: "pending",
      },

      recoveryAction: {
        type: String,
        default: null,
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

const Payment: Model<IPayment> =
  mongoose.models.Payment ??
  mongoose.model<IPayment>(
    "Payment",
    PaymentSchema
  );

export default Payment;