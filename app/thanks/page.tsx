import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Request received", robots: { index: false, follow: false } };
export default function Thanks() { return <main className="thanks"><div className="brand-mark">D</div><span className="eyebrow">DRM STAYS · REQUEST RECEIVED</span><h1>Thank you for reaching out.</h1><p>Your request has been saved. Our team will contact you to confirm details.</p><Link href="/">← Back to DRM Stays</Link></main>; }

