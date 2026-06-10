import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Briefcase, 
  Users, 
  Heart, 
  Zap, 
  Trophy, 
  Globe, 
  Send,
  DollarSign,
  Star,
  Rocket
} from "lucide-react";

export default function WorkWithUs() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState("");
  const [applicationData, setApplicationData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    experience: "",
    message: "",
    resumeFile: null as File | null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Application Submitted! 🎉",
      description: "We'll review your application and get back to you within 3-5 business days.",
    });
    setApplicationData({
      name: "",
      email: "",
      phone: "",
      position: "",
      experience: "",
      message: "",
      resumeFile: null
    });
  };

  const openPositions = [
    {
      title: "Senior Full Stack Developer",
      department: "Engineering",
      type: "Full-time",
      location: "Remote / NYC",
      description: "Join our core engineering team to build scalable features that connect millions of athletes worldwide.",
      requirements: ["5+ years full-stack experience", "React, Node.js, PostgreSQL", "Mobile development experience", "Passion for sports"],
      salary: "€120K - €180K"
    },
    {
      title: "Sports Community Manager",
      department: "Community",
      type: "Full-time", 
      location: "Remote",
      description: "Foster amazing communities and help athletes connect through engaging content and programs.",
      requirements: ["3+ years community management", "Sports industry experience", "Social media expertise", "Event planning skills"],
      salary: "€70K - €95K"
    },
    {
      title: "UX/UI Designer",
      department: "Design",
      type: "Full-time",
      location: "Remote / NYC",
      description: "Design beautiful, intuitive experiences that make sports accessible to everyone.",
      requirements: ["3+ years product design", "Mobile-first design", "Figma expertise", "Sports app experience preferred"],
      salary: "€90K - €130K"
    },
    {
      title: "Business Development Manager",
      department: "Partnerships",
      type: "Full-time",
      location: "NYC / LA",
      description: "Build strategic partnerships with sports organizations, venues, and brands to expand our reach.",
      requirements: ["5+ years business development", "Sports industry connections", "B2B partnership experience", "Strong negotiation skills"],
      salary: "€100K - €140K + Commission"
    },
    {
      title: "Content Creator & Video Editor",
      department: "Marketing",
      type: "Contract",
      location: "Remote",
      description: "Create engaging video content and tutorials that inspire athletes to join our community.",
      requirements: ["Professional video editing", "Social media content creation", "Sports knowledge", "Creative storytelling"],
      salary: "€40-80/hour"
    }
  ];

  const benefits = [
    {
      icon: DollarSign,
      title: "Competitive Salary",
      description: "Market-leading compensation with equity options"
    },
    {
      icon: Heart,
      title: "Health & Wellness",
      description: "Full health coverage + gym membership + mental health support"
    },
    {
      icon: Globe,
      title: "Remote-First",
      description: "Work from anywhere with flexible hours and home office setup"
    },
    {
      icon: Star,
      title: "Learning Budget",
      description: "€2,000 annually for courses, conferences, and skill development"
    },
    {
      icon: Trophy,
      title: "Sports Perks",
      description: "Free SURNA Pro + access to exclusive sporting events"
    },
    {
      icon: Rocket,
      title: "Growth Opportunities", 
      description: "Fast-track career advancement in a rapidly growing company"
    }
  ];

  const companyValues = [
    {
      icon: "🚀",
      title: "Innovation First",
      description: "We're always pushing boundaries to create better experiences for athletes"
    },
    {
      icon: "🤝",
      title: "Team Spirit",
      description: "We win together, support each other, and celebrate collective success"
    },
    {
      icon: "💪",
      title: "Excellence",
      description: "We strive for excellence in everything we do, from code to customer service"
    },
    {
      icon: "🌍",
      title: "Global Impact",
      description: "We're building something that connects and empowers athletes worldwide"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background  sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-token-text">Join Us</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-transparent border border-border rounded-full flex items-center justify-center mx-auto">
            <Briefcase className="h-8 w-8 text-token-text" />
          </div>
          <h2 className="text-2xl font-bold text-token-text">Monetize Your Skills</h2>
          <p className="text-token-text text-sm leading-relaxed">
            Help us revolutionize how athletes connect, compete, and grow. 
            We're building the future of sports community - come build it with us!
          </p>
        </div>

        {/* Why SURNA Section */}
        <div className="bg-transparent border border-border text-token-text rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Why Join SURNA?
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-token-text mt-1">✓</span>
              <span>Be part of a mission to connect 1 billion athletes worldwide</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-token-text mt-1">✓</span>
              <span>Work with passionate, world-class talent from top companies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-token-text mt-1">✓</span>
              <span>Shape the future of sports technology and community</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-token-text mt-1">✓</span>
              <span>Rapid growth, learning opportunities, and meaningful impact</span>
            </li>
          </ul>
        </div>

        {/* Company Values */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Our Values</h3>
          <div className="grid grid-cols-1 gap-3">
            {companyValues.map((value, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-transparent border border-border rounded-lg">
                <span className="text-2xl">{value.icon}</span>
                <div>
                  <h4 className="font-medium text-sm">{value.title}</h4>
                  <p className="text-xs text-token-text">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Benefits & Perks</h3>
          <div className="grid grid-cols-1 gap-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="flex items-start gap-3 p-3 bg-transparent border border-border bg-transparent border border-border rounded-lg">
                  <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-token-text" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{benefit.title}</h4>
                    <p className="text-xs text-token-text">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Open Positions */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Open Positions</h3>
          
          {openPositions.map((position, index) => (
            <div key={index} className="bg-transparent border border-border bg-transparent border border-border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm">{position.title}</h4>
                  <p className="text-xs text-token-text">{position.department} • {position.type}</p>
                  <p className="text-xs text-token-text">{position.location}</p>
                </div>
                <span className="text-xs bg-transparent border border-border text-token-text px-2 py-1 rounded">
                  {position.salary}
                </span>
              </div>
              
              <p className="text-sm text-token-text">{position.description}</p>
              
              <div>
                <p className="text-xs font-medium mb-1">Key Requirements:</p>
                <ul className="text-xs text-token-text space-y-1">
                  {position.requirements.map((req, reqIndex) => (
                    <li key={reqIndex} className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-token-text rounded-full"></span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button 
                size="sm" 
                className="w-full bg-transparent border border-border text-token-text"
                onClick={() => {
                  setSelectedRole(position.title);
                  setApplicationData(prev => ({ ...prev, position: position.title }));
                  document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Apply Now
              </Button>
            </div>
          ))}
        </div>

        {/* Application Form */}
        <div id="application-form" className="bg-transparent border border-border rounded-lg bg-transparent border border-border p-4 space-y-4">
          <h3 className="font-bold text-lg">Apply Today</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Position */}
            <div>
              <label className="block text-sm font-medium mb-1">Position of Interest *</label>
              <select
                required
                value={applicationData.position}
                onChange={(e) => setApplicationData(prev => ({ ...prev, position: e.target.value }))}
                className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a position...</option>
                {openPositions.map((pos, index) => (
                  <option key={index} value={pos.title}>{pos.title}</option>
                ))}
                <option value="other">Other / General Application</option>
              </select>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <Input
                  required
                  value={applicationData.name}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={applicationData.phone}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input
                type="email"
                required
                value={applicationData.email}
                onChange={(e) => setApplicationData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your@email.com"
              />
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium mb-1">Relevant Experience *</label>
              <Textarea
                required
                value={applicationData.experience}
                onChange={(e) => setApplicationData(prev => ({ ...prev, experience: e.target.value }))}
                placeholder="Tell us about your relevant experience, skills, and what makes you a great fit..."
                rows={4}
              />
            </div>

            {/* Cover Message */}
            <div>
              <label className="block text-sm font-medium mb-1">Why SURNA?</label>
              <Textarea
                value={applicationData.message}
                onChange={(e) => setApplicationData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="What excites you about working with SURNA? What would you bring to our team?"
                rows={3}
              />
            </div>

            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-medium mb-1">Resume/CV</label>
              <div className="   rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setApplicationData(prev => ({ ...prev, resumeFile: file }));
                  }}
                  className="hidden"
                  id="resume-upload"
                />
                <label
                  htmlFor="resume-upload"
                  className="cursor-pointer text-sm text-token-text"
                >
                  Click to upload or drag and drop<br />
                  PDF, DOC, or DOCX (max 5MB)
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full bg-transparent border border-border text-token-text">
              <Send className="h-4 w-4 mr-2" />
              Submit Application
            </Button>
          </form>
        </div>

        {/* Contact Info */}
        <div className="bg-transparent border border-border rounded-lg p-4 text-center">
          <p className="text-sm text-token-text mb-2">
            Questions about working at SURNA?
          </p>
          <p className="text-sm font-medium">careers@surna.com</p>
          <p className="text-xs text-token-text mt-2">
            We're an equal opportunity employer committed to diversity and inclusion.
          </p>
        </div>
      </div>
    </div>
  );
}