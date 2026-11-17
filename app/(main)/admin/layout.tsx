import type { Metadata } from "next";
import { BackToTop } from "@/components/back-to-top";
import { SaveInPlace } from "@/components/save-in-place";

export const metadata: Metadata = { title: "Owner CMS | DRM Stays", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<SaveInPlace /><BackToTop lang="vi" /></>;
}
