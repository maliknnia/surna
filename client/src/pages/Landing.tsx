import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageCircle, ShoppingBag, Trophy, GraduationCap, Star } from "lucide-react";
import SurnaLogo from "@/components/SurnaLogo";
import { FcGoogle } from "react-icons/fc";
import { googleLoginUrl, loginPagePath } from "@/lib/loginUrls";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const features = [
    {
      icon: Users,
      title: "Social Networking",
      description: "Connect with athletes, share your journey, and build your sports community"
    },
    {
      icon: MessageCircle,
      title: "Real-time Messaging",
      description: "Chat with teammates, coaches, and fellow athletes instantly"
    },
    {
      icon: ShoppingBag,
      title: "Sports Marketplace",
      description: "Discover and purchase the latest sports gear and equipment"
    },
    {
      icon: Trophy,
      title: "Team Management",
      description: "Create and manage teams, organize events, and track progress"
    },
    {
      icon: GraduationCap,
      title: "Coach Marketplace",
      description: "Find qualified coaches and trainers for your sport"
    },
    {
      icon: Star,
      title: "Skill Validation",
      description: "Showcase your skills and get verified by our community"
    }
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      {/* Header */}
      <header className="">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <SurnaLogo className="h-8 w-auto" showText={true} />
            <Button
              data-testid="button-login"
              onClick={() => setLocation(loginPagePath())}
              variant="surna"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-token-text mb-6">
            The Ultimate Sports
            <br />
            Social Platform
          </h1>
          <p className="text-xl text-token-text-muted mb-8 max-w-3xl mx-auto">
            Connect with athletes worldwide, find teams and coaches, shop for gear, 
            and showcase your skills on the premier sports social networking platform.
          </p>
          <div className="max-w-xl mx-auto mb-4 flex items-center justify-center gap-2 text-sm text-token-text-muted">
            <input
              id="age-confirmation"
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
            />
            <label htmlFor="age-confirmation">
              I confirm I am 16+ and agree to the{" "}
              <Link href="/terms" className="underline hover:text-token-text">
                platform terms
              </Link>
              .
            </label>
          </div>
          <Button 
              onClick={() => {
                if (!ageConfirmed) return;
                window.location.href = googleLoginUrl();
              }}
              className="bg-white text-black hover:bg-gray-100 border border-gray-300 px-8 py-4 text-lg mr-3"
              disabled={!ageConfirmed}
            >
              <FcGoogle className="mr-2 h-5 w-5" />
              Continue with Google
            </Button>
            <Button
            size="lg"
            onClick={() => {
                if (!ageConfirmed) return;
                setLocation(loginPagePath());
            }}
            className="bg-transparent border border-border text-token-text hover:bg-background px-8 py-4 text-lg"
            disabled={!ageConfirmed}
          >
            Email or phone
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-transparent border border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-token-text mb-4">
              Everything You Need for Your Sports Journey
            </h2>
            <p className="text-xl text-token-text-muted">
              From social networking to skill development, SURNA has it all
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className=" hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 bg-token-accent rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="h-6 w-6 text-foreground" />
                    </div>
                    <CardTitle className="text-token-text">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-token-text-muted">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-token-text mb-6">
            Ready to Join the Community?
          </h2>
          <p className="text-xl text-token-text-muted mb-8">
            Connect with thousands of athletes, coaches, and sports enthusiasts today.
          </p>
          <Button
            size="lg"
            data-testid="button-login"
            onClick={() => {
              if (!ageConfirmed) return;
              setLocation(loginPagePath());
            }}
            className="bg-transparent border border-border text-token-text hover:bg-background px-8 py-4 text-lg"
            disabled={!ageConfirmed}
          >
            Sign Up Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className=" py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-token-text mb-4">SURNA</h3>
            <p className="text-token-text-muted mb-6">
              Building the future of sports social networking
            </p>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-token-text-muted">
              <Link href="/terms" className="hover:text-token-text underline-offset-4 hover:underline">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-token-text underline-offset-4 hover:underline">
                Privacy
              </Link>
              <Link href="/help" className="hover:text-token-text underline-offset-4 hover:underline">
                Help
              </Link>
              <Link href="/contact" className="hover:text-token-text underline-offset-4 hover:underline">
                Contact
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
