import { subscribe } from "@/lib/audience";
import { handleFormSubmission } from "@/lib/form-route";
import { newsletterSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleFormSubmission(request, newsletterSchema, (data) => ({
    subject: `Newsletter signup — ${data.email}`,
    replyTo: data.email,
    fields: [["Email", data.email]],
  }), [(data) => subscribe(data.email)]);
}
