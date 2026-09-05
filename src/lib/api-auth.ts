import { NextRequest } from "next/server";
import { getEnv, isProduction } from "@/lib/env";

export class ApiAuthError extends Error {
  status = 401;
}

export function getTenantId(request?: NextRequest) {
  return request?.headers.get("x-tenant-id")?.trim() || getEnv().DEFAULT_TENANT_ID;
}

export function assertApiAccess(request: NextRequest) {
  const configuredKey = getEnv().APP_API_KEY;
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  const suppliedKey = request.headers.get("x-api-key")?.trim() || bearer;

  if (configuredKey && suppliedKey === configuredKey) return;
  if (!isProduction() && !configuredKey) return;

  throw new ApiAuthError("Valid API credentials are required.");
}