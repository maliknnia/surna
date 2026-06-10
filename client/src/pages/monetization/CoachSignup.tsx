import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { applyAsCoach, type CoachApplyPayload } from "@/lib/coachesApi";
import { ROUTES } from "@/navigation";
import { 
  ArrowLeft, 
  Shield,
  TrendingUp,
  Play,
  CheckCircle,
  Camera,
  Loader2,
  Euro,
} from "lucide-react";

export default function CoachSignup() {
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Info
    fullName: "",
    email: "",
    phone: "",
    experience: "",
    certifications: "",
    
    // Sports & Specialization
    primarySports: [] as string[],
    specializations: [] as string[],
    skillLevel: "" as "" | CoachApplyPayload["skillLevel"],
    
    // Coaching Details
    hourlyRate: "",
    availability: [] as string[],
    sessionTypes: [] as string[],
    maxStudents: "",
    
    // Verification
    idDocumentProvided: false,
    certificationDocsProvided: false,
    demoVideoUrl: "",
    
    // Payment Setup
    paymentMethod: "",
    bankAccount: "",
    taxId: "",
    
    // Bio & Marketing
    bio: "",
    achievements: "",
    teachingPhilosophy: "",
    socialMedia: "",
    
    // Agreements
    termsAccepted: false,
    backgroundCheckConsent: false,
    marketingConsent: false
  });

  useEffect(() => {
    if (!user) return;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    setFormData((prev) => ({
      ...prev,
      fullName: prev.fullName || fullName,
      email: prev.email || user.email || "",
    }));
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      window.location.href = "/login?next=/monetization/coach-signup";
    }
  }, [authLoading, isAuthenticated]);

  const sportsOptions = [
    "Basketball", "Soccer", "Tennis", "Baseball", "Volleyball", 
    "Swimming", "Running", "Cycling", "Golf", "Wrestling",
    "Boxing", "Martial Arts", "Yoga", "CrossFit", "Personal Training"
  ];

  const specializationOptions = [
    "Beginner Training", "Youth Development", "Elite Performance", 
    "Injury Recovery", "Strength Training", "Technique Refinement",
    "Mental Conditioning", "Nutrition Guidance", "Team Coaching",
    "Individual Sessions", "Group Classes", "Online Training"
  ];

  const availabilityOptions = [
    "Monday Morning", "Monday Afternoon", "Monday Evening",
    "Tuesday Morning", "Tuesday Afternoon", "Tuesday Evening",
    "Wednesday Morning", "Wednesday Afternoon", "Wednesday Evening",
    "Thursday Morning", "Thursday Afternoon", "Thursday Evening",
    "Friday Morning", "Friday Afternoon", "Friday Evening",
    "Saturday Morning", "Saturday Afternoon", "Saturday Evening",
    "Sunday Morning", "Sunday Afternoon", "Sunday Evening"
  ];

  const earningPotential = {
    beginner: { rate: "€25-45", monthly: "€800-2,000" },
    intermediate: { rate: "€45-75", monthly: "€2,000-5,000" },
    expert: { rate: "€75-150", monthly: "€5,000-15,000" },
    elite: { rate: "€150+", monthly: "€15,000+" }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      return;
    }

    if (!formData.skillLevel) {
      toast({ title: "Missing skill level", description: "Go back and select the skill level you coach.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const payload: CoachApplyPayload = {
        phone: formData.phone.trim(),
        experience: formData.experience.trim(),
        certifications: formData.certifications.trim() || undefined,
        primarySports: formData.primarySports,
        specializations: formData.specializations,
        skillLevel: formData.skillLevel,
        hourlyRate: parseFloat(formData.hourlyRate) || 0,
        availability: formData.availability,
        sessionTypes: formData.sessionTypes.length
          ? formData.sessionTypes
          : ["Individual (1-on-1)"],
        maxStudents: formData.maxStudents ? parseInt(formData.maxStudents, 10) : undefined,
        bio: formData.bio.trim(),
        achievements: formData.achievements.trim() || undefined,
        teachingPhilosophy: formData.teachingPhilosophy.trim() || undefined,
        socialMedia: formData.socialMedia.trim() || undefined,
        backgroundCheckConsent: formData.backgroundCheckConsent,
        marketingConsent: formData.marketingConsent,
        paymentMethod: formData.paymentMethod,
        demoVideoUrl: formData.demoVideoUrl.trim() || undefined,
        idDocumentProvided: formData.idDocumentProvided,
        certificationDocsProvided: formData.certificationDocsProvided,
        verificationNotes: [
          formData.bankAccount.trim() ? `Payout account on file` : "",
          formData.taxId.trim() ? `Tax ID provided` : "",
        ]
          .filter(Boolean)
          .join("; ") || undefined,
      };

      const result = await applyAsCoach(payload);
      toast({
        title: result.verificationStatus === "verified" ? "You're verified!" : "Application submitted",
        description: result.message,
      });
      setTimeout(() => setLocation(ROUTES.coachProfileEdit), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit application";
      toast({ title: "Submission failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
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
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <Input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Years of Experience *</label>
                <Input
                  required
                  value={formData.experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                  placeholder="e.g., 5 years"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Certifications & Qualifications</label>
                <Textarea
                  value={formData.certifications}
                  onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value }))}
                  placeholder="List your coaching certifications, degrees, achievements..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Sports & Specialization</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Primary Sports (select up to 3) *</label>
                <div className="grid grid-cols-2 gap-2">
                  {sportsOptions.map((sport) => (
                    <div key={sport} className="flex items-center space-x-2">
                      <Checkbox
                        id={sport}
                        checked={formData.primarySports.includes(sport)}
                        onCheckedChange={(checked) => {
                          if (checked && formData.primarySports.length < 3) {
                            setFormData(prev => ({ 
                              ...prev, 
                              primarySports: [...prev.primarySports, sport] 
                            }));
                          } else if (!checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              primarySports: prev.primarySports.filter(s => s !== sport) 
                            }));
                          }
                        }}
                      />
                      <label htmlFor={sport} className="text-xs">{sport}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Specializations</label>
                <div className="grid grid-cols-2 gap-2">
                  {specializationOptions.map((spec) => (
                    <div key={spec} className="flex items-center space-x-2">
                      <Checkbox
                        id={spec}
                        checked={formData.specializations.includes(spec)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              specializations: [...prev.specializations, spec] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              specializations: prev.specializations.filter(s => s !== spec) 
                            }));
                          }
                        }}
                      />
                      <label htmlFor={spec} className="text-xs">{spec}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Skill Level You Coach *</label>
                <select
                  required
                  value={formData.skillLevel}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      skillLevel: e.target.value as CoachApplyPayload["skillLevel"],
                    }))
                  }
                  className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select level...</option>
                  <option value="beginner">Beginner (New to sport)</option>
                  <option value="intermediate">Intermediate (Some experience)</option>
                  <option value="advanced">Advanced (Competitive level)</option>
                  <option value="elite">Elite (Professional/Olympic)</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Coaching Details & Pricing</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Hourly Rate (EUR) *</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-token-text" />
                  <Input
                    required
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                    placeholder="75"
                    className="pl-10"
                  />
                </div>
                <div className="mt-2 p-3 bg-card border border-border rounded-lg">
                  <h4 className="text-sm font-medium text-primary mb-2">💡 Pricing Guidelines</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="font-medium">Beginner: {earningPotential.beginner.rate}/hr</div>
                      <div className="text-muted-foreground">~{earningPotential.beginner.monthly}/month</div>
                    </div>
                    <div>
                      <div className="font-medium">Expert: {earningPotential.expert.rate}/hr</div>
                      <div className="text-muted-foreground">~{earningPotential.expert.monthly}/month</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Availability *</label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {availabilityOptions.map((time) => (
                    <div key={time} className="flex items-center space-x-2">
                      <Checkbox
                        id={time}
                        checked={formData.availability.includes(time)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              availability: [...prev.availability, time] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              availability: prev.availability.filter(t => t !== time) 
                            }));
                          }
                        }}
                      />
                      <label htmlFor={time} className="text-sm">{time}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Session Types</label>
                  <div className="space-y-2">
                    {["Individual (1-on-1)", "Small Group (2-5)", "Team Training", "Online Sessions"].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={formData.sessionTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({ 
                                ...prev, 
                                sessionTypes: [...prev.sessionTypes, type] 
                              }));
                            } else {
                              setFormData(prev => ({ 
                                ...prev, 
                                sessionTypes: prev.sessionTypes.filter(t => t !== type) 
                              }));
                            }
                          }}
                        />
                        <label htmlFor={type} className="text-xs">{type}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Students per Session</label>
                  <Input
                    type="number"
                    value={formData.maxStudents}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxStudents: e.target.value }))}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Verification & Recognition</h3>
            <p className="text-sm text-muted-foreground">
              Verification helps athletes trust you — it is optional to get listed, but recommended for the verified badge.
            </p>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Identity & credentials</p>
                    <p className="text-xs text-muted-foreground">
                      Confirm what you will provide for review. Upload full documents from your profile editor after signup.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="id-doc"
                    checked={formData.idDocumentProvided}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, idDocumentProvided: !!checked }))
                    }
                  />
                  <label htmlFor="id-doc" className="text-sm">
                    I will provide a government ID (passport or driver&apos;s license) for verification
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cert-docs"
                    checked={formData.certificationDocsProvided}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, certificationDocsProvided: !!checked }))
                    }
                  />
                  <label htmlFor="cert-docs" className="text-sm">
                    I will provide coaching certification documents (if applicable)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Profile photo</label>
                <div className="border-2 border-dashed border-primary/20 rounded-lg p-4">
                  <div className="text-center">
                    <Camera className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Add a professional headshot after signup in profile settings</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Intro video URL (optional)</label>
                <div className="relative">
                  <Play className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={formData.demoVideoUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, demoVideoUrl: e.target.value }))}
                    placeholder="https://youtube.com/... or Vimeo link"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">2–3 minute introduction — shown on your public profile</p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Payment Setup</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Preferred Payment Method *</label>
                <select
                  required
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select payment method...</option>
                  <option value="bank-transfer">Bank Transfer (ACH)</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe Connect</option>
                  <option value="venmo">Venmo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bank Account Number</label>
                <Input
                  value={formData.bankAccount}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                  placeholder="For direct deposits"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tax ID / SSN (for tax reporting)</label>
                <Input
                  value={formData.taxId}
                  onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                  placeholder="Required for payments over €600/year"
                />
              </div>

              <div className="bg-card border border-border rounded-lg p-3">
                <h4 className="text-sm font-medium text-primary mb-2">💰 Payment Processing</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• SURNA takes 15% commission on completed sessions</li>
                  <li>• You keep 85% of your earnings</li>
                  <li>• Payments processed within 24-48 hours</li>
                  <li>• No setup fees or monthly charges</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Profile & Marketing</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Professional Bio *</label>
                <Textarea
                  required
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell athletes about your background, experience, and coaching style..."
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Key Achievements</label>
                <Textarea
                  value={formData.achievements}
                  onChange={(e) => setFormData(prev => ({ ...prev, achievements: e.target.value }))}
                  placeholder="Notable achievements, awards, athlete successes..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Teaching Philosophy</label>
                <Textarea
                  value={formData.teachingPhilosophy}
                  onChange={(e) => setFormData(prev => ({ ...prev, teachingPhilosophy: e.target.value }))}
                  placeholder="Your approach to coaching and athlete development..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Social Media (optional)</label>
                <Input
                  value={formData.socialMedia}
                  onChange={(e) => setFormData(prev => ({ ...prev, socialMedia: e.target.value }))}
                  placeholder="Instagram, Twitter, YouTube, etc."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, termsAccepted: !!checked }))}
                  />
                  <label htmlFor="terms" className="text-sm">
                    I agree to the <span className="text-primary underline">Terms of Service</span> and <span className="text-primary underline">Coach Agreement</span> *
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="background"
                    checked={formData.backgroundCheckConsent}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, backgroundCheckConsent: !!checked }))}
                  />
                  <label htmlFor="background" className="text-sm">
                    I consent to a background check (required for coach verification) *
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketing"
                    checked={formData.marketingConsent}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, marketingConsent: !!checked }))}
                  />
                  <label htmlFor="marketing" className="text-sm">
                    I'd like to receive marketing tips and success stories
                  </label>
                </div>
              </div>
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
        return formData.fullName && formData.email && formData.phone && formData.experience;
      case 2:
        return formData.primarySports.length > 0 && formData.skillLevel;
      case 3:
        return formData.hourlyRate && formData.availability.length > 0 && formData.sessionTypes.length > 0;
      case 4:
        return true;
      case 5:
        return formData.paymentMethod;
      case 6:
        return formData.bio.length >= 20 && formData.termsAccepted && formData.backgroundCheckConsent;
      default:
        return false;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/join-us">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-primary">Become a Coach</h1>
              <p className="text-xs text-muted-foreground">Step {currentStep} of 6</p>
            </div>
            <Badge variant="outline" className="bg-card text-foreground">
              €{formData.hourlyRate || "50–150"}/hr
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-card h-2">
        <div 
          className="bg-primary h-2 transition-all duration-300"
          style={{ width: `${(currentStep / 6) * 100}%` }}
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
          {currentStep === 3 && formData.hourlyRate && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Your Earning Potential
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">10 hrs/week</div>
                    <div className="text-muted-foreground">€{(parseInt(formData.hourlyRate) * 10 * 4).toLocaleString()}/month</div>
                  </div>
                  <div>
                    <div className="font-medium">20 hrs/week</div>
                    <div className="text-muted-foreground">€{(parseInt(formData.hourlyRate) * 20 * 4).toLocaleString()}/month</div>
                  </div>
                </div>
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
              disabled={!canProceed() || submitting}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {currentStep === 6 ? (
                submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Application
                  </>
                )
              ) : (
                "Continue"
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <div>
              <Link href={ROUTES.coachProfileEdit} className="text-primary font-medium underline underline-offset-2">
                Already a coach? Edit your profile →
              </Link>
            </div>
            <div>Need help? Contact our coach success team at coaches@surna.com</div>
          </div>
        </form>
      </div>
    </div>
  );
}