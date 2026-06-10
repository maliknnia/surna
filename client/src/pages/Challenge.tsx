import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChallengeSystem } from "@/components/ChallengeSystem";

export default function Challenge() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/discover">
              <Button variant="ghost" size="sm" className="p-2 hover:bg-muted/40 rounded-full">
                <ArrowLeft className="h-4 w-4 text-token-text" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-token-text">Challenges</h1>
          </div>
        </div>
      </div>

      {/* Challenge Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ChallengeSystem />
      </div>
    </div>
  );
}