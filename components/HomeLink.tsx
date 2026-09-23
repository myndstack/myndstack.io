"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import { homeHash } from "@/lib/landing/route";

/**
 * A `next/link` whose `/#section` hrefs stay in-page on a landing page
 * (/ or /preview) and point home from everywhere else. For server components
 * (the footer) that can't read the pathname themselves.
 */
export default function HomeLink({ href, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  return <Link href={homeHash(href, usePathname())} {...rest} />;
}
