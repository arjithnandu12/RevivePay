import { POST as executeAction } from "../../actions/route";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const body = await request.json();
  const forwardedRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ ...body, paymentId: caseId }),
  });

  return executeAction(forwardedRequest);
}