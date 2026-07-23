import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, OgCard } from "@/components/OgCard";
import { getRole, ROLES } from "@/lib/roles";

export const alt = "Open role at Myndstack";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return ROLES.map((role) => ({ slug: role.slug }));
}

export default async function RoleOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const role = getRole((await params).slug);

  return new ImageResponse(
    OgCard({
      eyebrow: role ? `Careers · ${role.team}` : "Careers",
      title: role?.title ?? "Open roles",
      accent: role?.location,
    }),
    size,
  );
}
