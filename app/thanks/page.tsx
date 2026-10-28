import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Request received | Doraemon Land", robots: { index: false, follow: false } };

export default function Thanks() { return <main className="thanks"><div className="brand-mark">D</div><span className="eyebrow">REQUEST RECEIVED</span><h1>We’ll be in touch soon.</h1><p>Your stay request has been sent to the team. We’ll check availability and reply by email with the next steps.</p><Link href="/">← Back to the collection</Link></main>; }

