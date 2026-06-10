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
  Users, 
  Upload, 
  DollarSign, 
  Trophy, 
  MapPin,
  Star,
  Shield,
  TrendingUp,
  Camera,
  CheckCircle,
  Zap,
  Target,
  Award
} from "lucide-react";

export default function TeamRegistration() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Team Info
    teamName: "",
    sport: "",
    skillLevel: "",
    location: "",
    description: "",
    
    // Team Details
    maxMembers: "",
    currentMembers: "",
    ageRange: "",
    genderType: "",
    competitionLevel: "",
    trainingSchedule: "",
    
    // Contact & Management
    captainName: "",
    captainEmail: "",
    captainPhone: "",
    assistantCoaches: "",
    
    // Visual Assets
    teamLogo: null as File | null,
    teamPhotos: [] as File[],
    uniformPhotos: [] as File[],
    
    // Monetization Settings
    membershipFee: "",
    joinFee: "",
    paidMembership: false,
    sponsorshipOpen: false,
    tournamentParticipation: true,
    
    // Requirements
    equipmentRequired: "",
    skillRequirements: "",
    commitmentLevel: "",
    
    // Social & Marketing
    socialMedia: "",
    achievements: "",
    teamPhilosophy: "",
    
    // Agreements
    termsAccepted: false,
    liabilityAccepted: false,
    marketingConsent: false
  });

  const sportsOptions = [
    "Basketball", "Soccer", "Tennis", "Baseball", "Volleyball", 
    "Swimming", "Running Club", "Cycling", "Golf", "Wrestling",
    "Boxing", "Martial Arts", "CrossFit", "Ultimate Frisbee", "Cricket"
  ];

  const skillLevels = [
    { value: "recreational", label: "Recreational", desc: "For fun and fitness" },
    { value: "intermediate", label: "Intermediate", desc: "Some competitive experience" },
    { value: "competitive", label: "Competitive", desc: "Regular competitions" },
    { value: "elite", label: "Elite", desc: "Professional/Semi-pro level" }
  ];

  const earningPotentials = {
    recreational: { memberFee: "€15-30/month", sponsorship: "€100-500/month" },
    intermediate: { memberFee: "€30-60/month", sponsorship: "€500-2000/month" },
    competitive: { memberFee: "€60-120/month", sponsorship: "€2000-8000/month" },
    elite: { memberFee: "€120+/month", sponsorship: "€8000+/month" }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      toast({
        title: "Team Registration Submitted! 🏆",
        description: "Your team is now live on SURNA! Start recruiting members and earning revenue.",
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Basic Team Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Team Name *</label>
                <Input
                  required
                  value={formData.teamName}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
                  placeholder="e.g., Lightning Basketball Club"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Sport *</label>
                  <select
                    required
                    value={formData.sport}
                    onChange={(e) => setFormData(prev => ({ ...prev, sport: e.target.value }))}
                    className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select sport...</option>
                    {sportsOptions.map(sport => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Skill Level *</label>
                  <select
                    required
                    value={formData.skillLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, skillLevel: e.target.value }))}
                    className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select level...</option>
                    {skillLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Location (City, State) *</label>
                <Input
                  required
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Cork, Ireland"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Team Description *</label>
                <Textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your team's mission, values, and what makes it special..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Team Structure & Requirements</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Max Team Size *</label>
                  <Input
                    required
                    type="number"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: e.target.value }))}
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current Members</label>
                  <Input
                    type="number"
                    value={formData.currentMembers}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentMembers: e.target.value }))}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Age Range</label>
                  <select
                    value={formData.ageRange}
                    onChange={(e) => setFormData(prev => ({ ...prev, ageRange: e.target.value }))}
                    className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Any age</option>
                    <option value="youth">Youth (Under 18)</option>
                    <option value="college">College (18-22)</option>
                    <option value="adult">Adult (23-35)</option>
                    <option value="masters">Masters (35+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Team Type</label>
                  <select
                    value={formData.genderType}
                    onChange={(e) => setFormData(prev => ({ ...prev, genderType: e.target.value }))}
                    className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="mixed">Mixed/Co-ed</option>
                    <option value="male">Male only</option>
                    <option value="female">Female only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Training Schedule</label>
                <Textarea
                  value={formData.trainingSchedule}
                  onChange={(e) => setFormData(prev => ({ ...prev, trainingSchedule: e.target.value }))}
                  placeholder="e.g., Tuesdays & Thursdays 6-8 PM, Saturdays 10 AM-12 PM"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Equipment Required</label>
                <Textarea
                  value={formData.equipmentRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, equipmentRequired: e.target.value }))}
                  placeholder="List required equipment for new members..."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Skill Requirements</label>
                <Textarea
                  value={formData.skillRequirements}
                  onChange={(e) => setFormData(prev => ({ ...prev, skillRequirements: e.target.value }))}
                  placeholder="Minimum skill level, experience requirements..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Team Leadership & Contact</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Team Captain/Manager Name *</label>
                <Input
                  required
                  value={formData.captainName}
                  onChange={(e) => setFormData(prev => ({ ...prev, captainName: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Email *</label>
                  <Input
                    required
                    type="email"
                    value={formData.captainEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, captainEmail: e.target.value }))}
                    placeholder="team@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number *</label>
                  <Input
                    required
                    value={formData.captainPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, captainPhone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Assistant Coaches</label>
                <Textarea
                  value={formData.assistantCoaches}
                  onChange={(e) => setFormData(prev => ({ ...prev, assistantCoaches: e.target.value }))}
                  placeholder="Names and contact info for assistant coaches or co-managers..."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Social Media & Website</label>
                <Input
                  value={formData.socialMedia}
                  onChange={(e) => setFormData(prev => ({ ...prev, socialMedia: e.target.value }))}
                  placeholder="Instagram, Facebook, team website..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Team Philosophy & Goals</label>
                <Textarea
                  value={formData.teamPhilosophy}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamPhilosophy: e.target.value }))}
                  placeholder="What drives your team? Goals for the season, team culture..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notable Achievements</label>
                <Textarea
                  value={formData.achievements}
                  onChange={(e) => setFormData(prev => ({ ...prev, achievements: e.target.value }))}
                  placeholder="Tournament wins, championships, recognition..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Monetization & Pricing</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="paid"
                  checked={formData.paidMembership}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, paidMembership: !!checked }))}
                />
                <label htmlFor="paid" className="text-sm font-medium">
                  Enable paid membership (recommended for serious teams)
                </label>
              </div>

              {formData.paidMembership && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Monthly Fee (USD)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={formData.membershipFee}
                          onChange={(e) => setFormData(prev => ({ ...prev, membershipFee: e.target.value }))}
                          placeholder="50"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">One-time Join Fee</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={formData.joinFee}
                          onChange={(e) => setFormData(prev => ({ ...prev, joinFee: e.target.value }))}
                          placeholder="25"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-3">
                    <h4 className="text-sm font-medium text-foreground mb-2">💰 Estimated Earnings</h4>
                    {formData.membershipFee && formData.maxMembers && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Monthly: ${(parseInt(formData.membershipFee) * parseInt(formData.maxMembers || "0") * 0.85).toLocaleString()} (after 15% SURNA fee)</div>
                        <div>Annually: ${(parseInt(formData.membershipFee) * parseInt(formData.maxMembers || "0") * 12 * 0.85).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sponsorship"
                    checked={formData.sponsorshipOpen}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sponsorshipOpen: !!checked }))}
                  />
                  <label htmlFor="sponsorship" className="text-sm">
                    Open to sponsorship opportunities
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tournaments"
                    checked={formData.tournamentParticipation}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, tournamentParticipation: !!checked }))}
                  />
                  <label htmlFor="tournaments" className="text-sm">
                    Participate in SURNA tournaments and competitions
                  </label>
                </div>
              </div>

              {formData.skillLevel && (
                <div className="bg-card border border-border rounded-lg p-3">
                  <h4 className="text-sm font-medium text-foreground mb-2">📊 Pricing Guidelines for {formData.skillLevel} Teams</h4>
                  <div className="text-xs text-muted-foreground">
                    <div>Typical membership: {earningPotentials[formData.skillLevel as keyof typeof earningPotentials]?.memberFee}</div>
                    <div>Sponsorship potential: {earningPotentials[formData.skillLevel as keyof typeof earningPotentials]?.sponsorship}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Visual Assets & Final Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Team Logo</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <div className="text-center">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload team logo or emblem</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Logo
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Team Photos</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <div className="text-center">
                    <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Team photos, action shots, group photos</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      <Upload className="w-4 h-4 mr-2" />
                      Add Photos
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Commitment Level Expected</label>
                <select
                  value={formData.commitmentLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, commitmentLevel: e.target.value }))}
                  className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="casual">Casual - Show up when you can</option>
                  <option value="regular">Regular - Most practices and games</option>
                  <option value="dedicated">Dedicated - All practices and games</option>
                  <option value="competitive">Competitive - Full commitment required</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, termsAccepted: !!checked }))}
                  />
                  <label htmlFor="terms" className="text-sm">
                    I agree to the <span className="text-primary underline">Team Registration Terms</span> *
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="liability"
                    checked={formData.liabilityAccepted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, liabilityAccepted: !!checked }))}
                  />
                  <label htmlFor="liability" className="text-sm">
                    I accept liability and insurance responsibilities *
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketing"
                    checked={formData.marketingConsent}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, marketingConsent: !!checked }))}
                  />
                  <label htmlFor="marketing" className="text-sm">
                    I'd like to receive team growth tips and success stories
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
        return formData.teamName && formData.sport && formData.skillLevel && formData.location && formData.description;
      case 2:
        return formData.maxMembers;
      case 3:
        return formData.captainName && formData.captainEmail && formData.captainPhone;
      case 4:
        return true;
      case 5:
        return formData.termsAccepted && formData.liabilityAccepted;
      default:
        return false;
    }
  };

  if (previewMode) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-background  sticky top-0 z-40">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setPreviewMode(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold text-token-text">Team Preview</h1>
              <Badge variant="outline" className="bg-primary/10 text-foreground">Live Preview</Badge>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6">
          {/* Team Profile Preview */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{formData.teamName || "Your Team Name"}</h2>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="outline">{formData.sport || "Sport"}</Badge>
                  <Badge variant="outline">{formData.skillLevel || "Level"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {formData.location || "Location"}
                </p>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{formData.description || "Team description will appear here..."}</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-card rounded-lg">
                  <Users className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <div className="text-lg font-bold">{formData.currentMembers || 0}/{formData.maxMembers || 20}</div>
                  <div className="text-xs text-muted-foreground">Members</div>
                </div>
                <div className="text-center p-3 bg-card rounded-lg">
                  <Trophy className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <div className="text-lg font-bold">{formData.skillLevel || "Level"}</div>
                  <div className="text-xs text-muted-foreground">Skill Level</div>
                </div>
              </div>

              {formData.paidMembership && (
                <div className="bg-card border border-border rounded-lg p-3 mb-4">
                  <h4 className="font-medium text-foreground mb-1">💰 Membership Pricing</h4>
                  <div className="text-sm text-muted-foreground">
                    {formData.membershipFee && <div>Monthly: ${formData.membershipFee}</div>}
                    {formData.joinFee && <div>Join Fee: ${formData.joinFee}</div>}
                  </div>
                </div>
              )}

              <Button className="w-full bg-primary hover:bg-primary/90">
                Request to Join Team
              </Button>
            </CardContent>
          </Card>

          <Button onClick={() => setPreviewMode(false)} variant="outline" className="w-full">
            Back to Edit
          </Button>
        </div>
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
              <h1 className="text-xl font-bold text-foreground">Register Your Team</h1>
              <p className="text-xs text-muted-foreground">Step {currentStep} of 5</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPreviewMode(true)}
              className="text-xs"
            >
              Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-muted h-2">
        <div 
          className="bg-primary h-2 transition-all duration-300"
          style={{ width: `${(currentStep / 5) * 100}%` }}
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
          {currentStep === 4 && formData.paidMembership && formData.membershipFee && formData.maxMembers && (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Projected Team Revenue
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">75% Capacity</div>
                    <div className="text-primary">€{(parseInt(formData.membershipFee) * Math.floor(parseInt(formData.maxMembers) * 0.75) * 0.85).toLocaleString()}/month</div>
                  </div>
                  <div>
                    <div className="font-medium">Full Capacity</div>
                    <div className="text-primary">€{(parseInt(formData.membershipFee) * parseInt(formData.maxMembers) * 0.85).toLocaleString()}/month</div>
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
              disabled={!canProceed()}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {currentStep === 5 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Launch Team
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-xs text-muted-foreground">
            Questions about team registration? Contact teams@surna.com
          </div>
        </form>
      </div>
    </div>
  );
}