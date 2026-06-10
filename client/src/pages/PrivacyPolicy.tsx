import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "What Data We Collect",
      body: "We collect account details, profile content, messages and interactions, usage analytics, device/browser data, and transaction metadata when you use SURNA.",
    },
    {
      title: "How We Use Data",
      body: "We use data to provide app features, personalize recommendations, secure accounts, prevent abuse, process payments, and improve product performance.",
    },
    {
      title: "Location Data",
      body: "Location data is used for nearby teams, events, places, and marketplace distance features. You can control location permissions in your device settings.",
    },
    {
      title: "Who We Share Data With",
      body: "We share data with trusted processors such as hosting, analytics, messaging, and payment providers. We do not sell personal data.",
    },
    {
      title: "Your GDPR Rights",
      body: "If you are in the EEA/UK, you can request access, correction, portability, restriction, objection, or deletion of your personal data.",
    },
    {
      title: "Deleting Your Account and Data",
      body: "You can request account deletion from settings or by contacting privacy@surna.app. We delete or anonymize data unless legally required to retain it.",
    },
    {
      title: "Cookies",
      body: "We use cookies and similar technologies for authentication, security, preferences, and analytics. You can manage cookie choices in app/browser settings.",
    },
    {
      title: "Privacy Contact",
      body: "For privacy questions or requests, contact privacy@surna.app.",
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
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
          <Link href="/terms"><Button variant="outline" size="sm">Terms of Service</Button></Link>
          <Link href="/help"><Button variant="outline" size="sm">Help Center</Button></Link>
          <Link href="/contact"><Button variant="outline" size="sm">Contact</Button></Link>
        </div>
      </div>
    </main>
  );
}
