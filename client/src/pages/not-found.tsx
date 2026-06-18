import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background" data-testid="not-found-page">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-token-text" />
            <h1 className="text-2xl font-bold text-token-text">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-token-text">
            Did you forget to add the page to the router?
          </p>

          <Link href="/" data-testid="link-home">
            <span className="inline-block mt-6 text-sm font-semibold underline text-token-text">
              Back to home
            </span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
