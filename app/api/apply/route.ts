import { handleFormSubmission } from "@/lib/form-route";
import { applicationSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleFormSubmission(request, applicationSchema, (data) => ({
    subject: `Application — ${data.role} — ${data.name}`,
    replyTo: data.email,
    fields: [
      ["Role", data.role],
      ["Name", data.name],
      ["Email", data.email],
      ["Links", data.links],
      ["Note", data.note],
    ],
  }));
}
