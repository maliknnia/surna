import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Users, Trophy, Target, Zap, Globe } from "lucide-react";
import SurnaLogo from "@/components/SurnaLogo";

export default function About() {
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
            <h1 className="text-xl font-bold text-token-text">About SURNA</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Logo & Mission */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <SurnaLogo className="h-10 w-auto" showText={true} />
          </div>
          <h2 className="text-2xl font-bold text-token-text">SURNA Sports</h2>
          <p className="text-token-text text-sm leading-relaxed">
            The ultimate sports social platform connecting athletes worldwide. 
            Find games, build teams, get coached, and elevate your game to the next level.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-transparent border border-border p-6 rounded-xl bg-transparent border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-token-text" />
            <h3 className="font-bold text-lg">Our Mission</h3>
          </div>
          <p className="text-token-text text-sm leading-relaxed">
            To create a global community where every athlete can discover their potential, 
            connect with like-minded players, and access world-class coaching - all in one platform.
          </p>
        </div>

        {/* Key Features */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-token-text">What We Offer</h3>
          
          <div className="space-y-3">
            <Link href="/events" className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 border border-border rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-token-text" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Game Finder</h4>
                <p className="text-xs text-token-text">Discover and join pickup games in your area</p>
              </div>
            </Link>

            <Link href="/teams" className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 border border-border rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="h-4 w-4 text-token-text" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Team Management</h4>
                <p className="text-xs text-token-text">Create and manage teams with advanced tools</p>
              </div>
            </Link>

            <Link href="/coaches" className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 border border-border rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-token-text" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Elite Coaching</h4>
                <p className="text-xs text-token-text">Connect with verified professional coaches</p>
              </div>
            </Link>

            <Link href="/" className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 border border-border rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="h-4 w-4 text-token-text" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Social Feed</h4>
                <p className="text-xs text-token-text">Share your journey and connect with athletes</p>
              </div>
            </Link>

            <Link href="/discover/people" className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 border border-border rounded-full flex items-center justify-center flex-shrink-0">
                <Globe className="h-4 w-4 text-token-text" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Global Community</h4>
                <p className="text-xs text-token-text">Connect with athletes from around the world</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-transparent border border-border text-token-text rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4">Join the Movement</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-token-text">10K+</div>
              <div className="text-xs text-token-text">Active Athletes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-token-text">500+</div>
              <div className="text-xs text-token-text">Elite Coaches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-token-text">25K+</div>
              <div className="text-xs text-token-text">Games Played</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-token-text">50+</div>
              <div className="text-xs text-token-text">Cities</div>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-background rounded-lg bg-transparent border border-border p-4">
          <h3 className="font-bold text-lg mb-3">Company Information</h3>
          <div className="space-y-2 text-sm text-token-text">
            <p><span className="font-medium">Founded:</span> 2024</p>
            <p><span className="font-medium">Location:</span> Global</p>
            <p><span className="font-medium">Team Size:</span> 15+ passionate sports enthusiasts</p>
            <p><span className="font-medium">Version:</span> 1.0.0</p>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center space-y-3">
          <p className="text-sm text-token-text">
            Ready to elevate your game?
          </p>
          <Link href="/contact">
            <Button className="w-full bg-transparent border border-border text-token-text hover:bg-background">
              Get In Touch
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}