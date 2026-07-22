import { handleFormSubmission } from "@/lib/form-route";
import { contactSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleFormSubmission(request, contactSchema, (data) => ({
    subject: `New enquiry — ${data.name}${data.company ? ` (${data.company})` : ""}`,
    replyTo: data.email,
    fields: [
      ["Name", data.name],
      ["Email", data.email],
      ["Company", data.company || "—"],
      ["Budget", data.budget || "—"],
      ["Heard via", data.source || "—"],
      ["Message", data.message],
    ],
  }));
}
