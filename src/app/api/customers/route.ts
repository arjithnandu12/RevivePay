import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

import Customer from "@/models/Customer";
import { connectDB } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 20)));
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const query = search
      ? { $or: [
          { customerId: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { plan: { $regex: search, $options: "i" } },
        ] }
      : {};

    const [customers, total] = await Promise.all([
      Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
      Customer.countDocuments(query),
    ]);

    return NextResponse.json({
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(
      "Customers API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch customers",
      },
      {
        status: 500,
      }
    );
  }
}