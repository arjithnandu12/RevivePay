import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface ICustomer extends Document {
  customerId: string;
  name: string;
  email: string;
  plan: string;
  monthlyValue: number;
  lifetimeValue: number;
  successfulPayments: number;
  failedPayments: number;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema =
  new Schema<ICustomer>(
    {
      customerId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },

      plan: {
        type: String,
        required: true,
        trim: true,
      },

      monthlyValue: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      lifetimeValue: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      successfulPayments: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      failedPayments: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      phone: {
  type: String,
  trim: true,
  index: true,
},
    },
    {
      timestamps: true,
    }
  );

const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>(
    "Customer",
    CustomerSchema
  );

export default Customer;