import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle, Send } from "lucide-react";

export default function Contact() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    category: "general"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent! 📧",
      description: "We'll get back to you within 24 hours. Thanks for reaching out!",
    });
    setFormData({ name: "", email: "", subject: "", message: "", category: "general" });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-token-text">Contact Us</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Contact Info */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-token-text">Get In Touch</h2>
          <p className="text-token-text text-sm">
            Have questions, feedback, or need support? We're here to help make your SURNA experience amazing!
          </p>
        </div>

        {/* Quick Contact Options */}
        <div className="grid grid-cols-1 gap-3">
          <a
            href="mailto:support@surna.com"
            className="flex items-center gap-3 p-4 bg-transparent border border-border rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
              <Mail className="h-5 w-5 text-token-text" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Email Support</p>
              <p className="text-xs text-foreground">support@surna.com</p>
            </div>
          </a>

          <div className="flex items-center gap-3 p-4 bg-transparent border border-border rounded-lg">
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-token-text" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Live Chat</p>
              <p className="text-xs text-token-text">Available Mon-Fri, 9am-6pm EST</p>
            </div>
            <Button
              type="button"
              size="sm"
              className="bg-background hover:bg-transparent border border-border text-token-text"
              onClick={() => setLocation("/messages")}
            >
              Chat Now
            </Button>
          </div>

          <div className="flex items-center gap-3 p-4 bg-transparent border border-border rounded-lg">
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
              <Phone className="h-5 w-5 text-token-text" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Phone Support</p>
              <p className="text-xs text-token-text">1-800-SURNA-GO (786-7246)</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="bg-background rounded-lg p-4 space-y-4">
          <h3 className="font-bold text-lg">Send us a Message</h3>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">What can we help you with?</label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-token-accent"
            >
              <option value="general">General Question</option>
              <option value="technical">Technical Support</option>
              <option value="billing">Billing & Subscriptions</option>
              <option value="coaching">Coaching Services</option>
              <option value="teams">Team Management</option>
              <option value="feedback">Feedback & Suggestions</option>
              <option value="partnership">Partnership Opportunities</option>
              <option value="press">Press & Media</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input
              required
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Your full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium mb-1">Subject *</label>
            <Input
              required
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              placeholder="Brief description of your message"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-1">Message *</label>
            <Textarea
              required
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              placeholder="Tell us more about your question or feedback..."
              rows={5}
            />
          </div>

          <Button type="submit" className="w-full bg-transparent border border-border text-token-text hover:bg-background">
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </form>

        {/* FAQ Quick Links */}
        <div className="bg-transparent border border-border rounded-lg p-4">
          <h3 className="font-bold text-lg mb-3">Quick Help</h3>
          <div className="space-y-2">
            <Link href="/help">
              <Button variant="ghost" className="w-full justify-start text-left">
                <span className="text-sm">📚 View FAQ & Help Center</span>
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start text-left">
              <span className="text-sm">🎯 How to Join Games</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-left">
              <span className="text-sm">👥 Team Management Guide</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-left">
              <span className="text-sm">🏆 Coaching Services Info</span>
            </Button>
          </div>
        </div>

        {/* Office Info */}
        <div className="bg-background rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-token-text" />
            <h3 className="font-bold">Our Office</h3>
          </div>
          <p className="text-sm text-token-text mb-2">
            123 Sports Avenue<br />
            Athletic District, NY 10001<br />
            United States
          </p>
          <p className="text-xs text-token-text">
            Office Hours: Monday - Friday, 9:00 AM - 6:00 PM EST
          </p>
        </div>

        {/* Response Time */}
        <div className="bg-transparent border border-border rounded-lg p-4 text-center">
          <p className="text-sm text-token-text">
            ⚡ <strong>Fast Response Promise:</strong> We typically respond to all inquiries within 4 hours during business hours!
          </p>
        </div>
      </div>
    </div>
  );
}