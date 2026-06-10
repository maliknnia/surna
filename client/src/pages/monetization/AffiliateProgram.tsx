import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Link2,
  Share2,
  Trophy,
  CheckCircle,
  Copy,
  BarChart3,
  Gift
} from "lucide-react";

export default function AffiliateProgram() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Info
    fullName: "",
    email: "",
    phone: "",
    
    // Platform Info
    platforms: [] as string[],
    followers: "",
    engagementRate: "",
    niche: "",
    
    // Experience
    affiliateExperience: "",
    sportsBackground: "",
    
    // Marketing Strategy
    promotionStrategy: "",
    contentTypes: [] as string[],
    targetAudience: "",
    
    // Payment Info
    paymentMethod: "",
    paypalEmail: "",
    venmoUsername: "",
    
    // Agreements
    termsAccepted: false,
    brandGuidelinesAccepted: false,
    exclusivityAgreement: false
  });

  const platformOptions = [
    "Instagram", "TikTok", "YouTube", "Facebook", "Twitter",
    "LinkedIn", "Snapchat", "Pinterest", "Blog/Website", "Podcast"
  ];

  const contentTypeOptions = [
    "Product Reviews", "Tutorial Videos", "Lifestyle Posts", 
    "Stories & Reels", "Live Streams", "Blog Articles",
    "Email Newsletter", "Podcast Episodes"
  ];

  const commissionTiers = [
    { tier: "Bronze", referrals: "1-25", commission: "5%", bonus: "€0" },
    { tier: "Silver", referrals: "26-100", commission: "7%", bonus: "€100" },
    { tier: "Gold", referrals: "101-250", commission: "10%", bonus: "€500" },
    { tier: "Platinum", referrals: "251+", commission: "15%", bonus: "€1500" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      toast({
        title: "Affiliate Application Approved! 🎉",
        description: "Welcome to the SURNA Affiliate Program! Your unique link and dashboard are ready.",
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Personal Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <Input
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Platforms (select all that apply) *</label>
                <div className="grid grid-cols-2 gap-2">
                  {platformOptions.map((platform) => (
                    <div key={platform} className="flex items-center space-x-2">
                      <Checkbox
                        id={platform}
                        checked={formData.platforms.includes(platform)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              platforms: [...prev.platforms, platform] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              platforms: prev.platforms.filter(p => p !== platform) 
                            }));
                          }
                        }}
                      />
                      <label htmlFor={platform} className="text-sm">{platform}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Followers/Subscribers</label>
                  <Input
                    type="number"
                    value={formData.followers}
                    onChange={(e) => setFormData(prev => ({ ...prev, followers: e.target.value }))}
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Engagement Rate (%)</label>
                  <Input
                    type="number"
                    value={formData.engagementRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, engagementRate: e.target.value }))}
                    placeholder="5.2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Your Niche/Focus Area</label>
                <Input
                  value={formData.niche}
                  onChange={(e) => setFormData(prev => ({ ...prev, niche: e.target.value }))}
                  placeholder="e.g., Fitness, Basketball, Running, Yoga"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Experience & Background</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Affiliate Marketing Experience</label>
                <select
                  value={formData.affiliateExperience}
                  onChange={(e) => setFormData(prev => ({ ...prev, affiliateExperience: e.target.value }))}
                  className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select experience level...</option>
                  <option value="beginner">Beginner (0-1 years)</option>
                  <option value="intermediate">Intermediate (1-3 years)</option>
                  <option value="advanced">Advanced (3-5 years)</option>
                  <option value="expert">Expert (5+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sports Background & Credibility</label>
                <Textarea
                  value={formData.sportsBackground}
                  onChange={(e) => setFormData(prev => ({ ...prev, sportsBackground: e.target.value }))}
                  placeholder="Tell us about your sports experience, achievements, coaching background..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content Types You Create</label>
                <div className="grid grid-cols-2 gap-2">
                  {contentTypeOptions.map((content) => (
                    <div key={content} className="flex items-center space-x-2">
                      <Checkbox
                        id={content}
                        checked={formData.contentTypes.includes(content)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              contentTypes: [...prev.contentTypes, content] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              contentTypes: prev.contentTypes.filter(c => c !== content) 
                            }));
                          }
                        }}
                      />
                      <label htmlFor={content} className="text-xs">{content}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Audience Description</label>
                <Textarea
                  value={formData.targetAudience}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="Describe your audience demographics, interests, and engagement..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Promotion Strategy & Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">How Will You Promote SURNA? *</label>
                <Textarea
                  required
                  value={formData.promotionStrategy}
                  onChange={(e) => setFormData(prev => ({ ...prev, promotionStrategy: e.target.value }))}
                  placeholder="Describe your promotion strategy, posting frequency, integration approach..."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Preferred Payment Method *</label>
                <select
                  required
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select payment method...</option>
                  <option value="paypal">PayPal</option>
                  <option value="venmo">Venmo</option>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                </select>
              </div>

              {formData.paymentMethod === "paypal" && (
                <div>
                  <label className="block text-sm font-medium mb-1">PayPal Email</label>
                  <Input
                    type="email"
                    value={formData.paypalEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, paypalEmail: e.target.value }))}
                    placeholder="paypal@email.com"
                  />
                </div>
              )}

              {formData.paymentMethod === "venmo" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Venmo Username</label>
                  <Input
                    value={formData.venmoUsername}
                    onChange={(e) => setFormData(prev => ({ ...prev, venmoUsername: e.target.value }))}
                    placeholder="@yourusername"
                  />
                </div>
              )}

              <div className="bg-transparent border border-border bg-transparent border border-border rounded-lg p-4">
                <h4 className="font-bold text-token-text mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Commission Structure
                </h4>
                <div className="space-y-2">
                  {commissionTiers.map((tier) => (
                    <div key={tier.tier} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-background text-token-text"
                        >
                          {tier.tier}
                        </Badge>
                        <span className="text-token-text">{tier.referrals} referrals</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-token-text">{tier.commission}</div>
                        <div className="text-xs text-token-text">{tier.bonus} bonus</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Agreement & Launch</h3>
            <div className="space-y-4">
              <div className="bg-transparent border border-border bg-transparent border border-border rounded-lg p-4">
                <h4 className="font-bold text-token-text mb-2">🎯 Your Affiliate Benefits</h4>
                <ul className="text-sm text-token-text space-y-1">
                  <li>• Unique tracking links for all referrals</li>
                  <li>• Real-time dashboard with analytics</li>
                  <li>• Marketing materials and creative assets</li>
                  <li>• Monthly bonus opportunities</li>
                  <li>• Exclusive early access to new features</li>
                  <li>• Dedicated affiliate manager support</li>
                </ul>
              </div>

              <div className="bg-transparent border border-border bg-transparent border border-border rounded-lg p-4">
                <h4 className="font-bold text-token-text mb-2">💡 Success Tips</h4>
                <ul className="text-sm text-token-text space-y-1">
                  <li>• Authentic recommendations perform 3x better</li>
                  <li>• Share your personal SURNA experiences</li>
                  <li>• Use video content when possible</li>
                  <li>• Engage with comments and questions</li>
                  <li>• Post consistently for best results</li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, termsAccepted: !!checked }))}
                  />
                  <label htmlFor="terms" className="text-sm">
                    I agree to the <span className="text-token-text underline">Affiliate Program Terms</span> *
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="guidelines"
                    checked={formData.brandGuidelinesAccepted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, brandGuidelinesAccepted: !!checked }))}
                  />
                  <label htmlFor="guidelines" className="text-sm">
                    I will follow SURNA <span className="text-token-text underline">Brand Guidelines</span> *
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exclusivity"
                    checked={formData.exclusivityAgreement}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, exclusivityAgreement: !!checked }))}
                  />
                  <label htmlFor="exclusivity" className="text-sm">
                    I agree to promote SURNA exclusively in the sports platform category (optional, +2% commission)
                  </label>
                </div>
              </div>

              {currentStep === 4 && formData.termsAccepted && (
                <div className="bg-transparent border border-border text-token-text rounded-lg p-4">
                  <h4 className="font-bold mb-2">🎉 Welcome to the SURNA Affiliate Family!</h4>
                  <p className="text-sm text-token-text">
                    Your affiliate dashboard and unique links will be ready immediately after approval.
                    Start earning today!
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.fullName && formData.email && formData.platforms.length > 0;
      case 2:
        return true; // Experience details are optional
      case 3:
        return formData.promotionStrategy && formData.paymentMethod;
      case 4:
        return formData.termsAccepted && formData.brandGuidelinesAccepted;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background  sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/join-us">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-token-text">Affiliate Program</h1>
              <p className="text-xs text-token-text">Step {currentStep} of 4</p>
            </div>
            <Badge variant="outline" className="bg-background text-token-text">
              Up to 15%
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-transparent border border-border h-2">
        <div 
          className="bg-token-text h-2 transition-all duration-300"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Step Content */}
          <Card>
            <CardContent className="p-6">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Earning Potential Preview */}
          {currentStep === 1 && formData.followers && (
            <Card className="bg-transparent border border-border ">
              <CardContent className="p-4">
                <h4 className="font-bold text-token-text mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Your Earning Potential
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">1% Conversion Rate</div>
                    <div className="text-token-text">€{(parseInt(formData.followers) * 0.01 * 25 * 0.05).toLocaleString()}/month</div>
                  </div>
                  <div>
                    <div className="font-medium">3% Conversion Rate</div>
                    <div className="text-token-text">€{(parseInt(formData.followers) * 0.03 * 25 * 0.05).toLocaleString()}/month</div>
                  </div>
                </div>
                <p className="text-xs text-token-text mt-2">*Based on €25 average referral value and 5% commission</p>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                Previous
              </Button>
            )}
            <Button
              type="submit"
              disabled={!canProceed()}
              className="flex-1 bg-token-accent hover:bg-token-accent"
            >
              {currentStep === 4 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Join Affiliate Program
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-xs text-token-text">
            Questions about our affiliate program? Contact affiliates@surna.com
          </div>
        </form>
      </div>
    </div>
  );
}