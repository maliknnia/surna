import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  const sections = [
    {
      title: "Acceptance of Terms",
      body: "By using SURNA, you agree to these terms and all applicable laws. If you do not agree, do not use the platform.",
    },
    {
      title: "User Accounts",
      body: "You are responsible for keeping your account details accurate and your login credentials secure. You are responsible for activity under your account.",
    },
    {
      title: "Acceptable Use",
      body: "Do not post illegal, abusive, hateful, fraudulent, or misleading content. Do not attempt to disrupt or reverse-engineer SURNA services.",
    },
    {
      title: "Sports Content",
      body: "You are responsible for sports content you upload, including event info, team details, and media. You must have rights to share your content.",
    },
    {
      title: "Payments and Transactions",
      body: "Marketplace and subscription payments are processed by third-party payment providers. Fees, refunds, and disputes are handled under applicable payment rules.",
    },
    {
      title: "Privacy",
      body: "Your use of SURNA is also governed by our Privacy Policy, which explains what data we collect and how we use it.",
    },
    {
      title: "Intellectual Property",
      body: "SURNA branding, software, and design are protected. You retain rights to your content, but grant SURNA a license to host and display it in the app.",
    },
    {
      title: "Termination",
      body: "We may suspend or terminate accounts that violate these terms, harm users, or create legal/security risk. You may stop using SURNA at any time.",
    },
    {
      title: "Contact Information",
      body: "For terms questions, contact support at support@surna.app.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#000000] text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-white/80 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Home
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-white/70 mb-8">Last updated: May 8, 2026</p>
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
              <p className="text-sm text-white/80 leading-6">{section.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/privacy"><Button variant="outline" size="sm">Privacy Policy</Button></Link>
          <Link href="/help"><Button variant="outline" size="sm">Help Center</Button></Link>
          <Link href="/contact"><Button variant="outline" size="sm">Contact</Button></Link>
        </div>
      </div>
    </main>
  );
}
