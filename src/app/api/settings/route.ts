
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Settings from "@/models/settings";
import { settingsSchema, publicError } from "@/lib/validation";

export async function GET() {
  try {
    await connectDB();

    let settings = await Settings.findOne({ key: "global" });

    if (!settings) {
      settings = await Settings.create({ key: "global" });
    }

    return NextResponse.json({
   
      razorpay: {
        connected: Boolean(
          process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
        ),
        accountId: process.env.RAZORPAY_KEY_ID ?? null,
      },

      policy: settings.policy,
      notifications: settings.notifications,
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);

    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid settings payload." },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};

    if (parsed.data.policy) {
      for (const [key, value] of Object.entries(parsed.data.policy)) {
        update[`policy.${key}`] = value;
      }
    }

    if (parsed.data.notifications) {
      for (const [key, value] of Object.entries(parsed.data.notifications)) {
        update[`notifications.${key}`] = value;
      }
    }

    const updated = await Settings.findOneAndUpdate(
      { key: "global" },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      policy: updated.policy,
      notifications: updated.notifications,
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);

    return NextResponse.json(
      { success: false, error: publicError(error, "Failed to save settings.") },
      { status: 500 }
    );
  }
}