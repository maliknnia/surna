import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ROUTES } from "@/navigation";
import { invalidateMyHubQueries } from "@/lib/hubQueries";
import { ArrowLeft, ArrowRight, Check, Building2, MapPin, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { InsertPlace } from "@shared/schema";
import {
  CreateMediaSection,
  type CreateMediaValue,
} from "@/components/create/CreateMediaSection";
import { useHydrateCreateDraft } from "@/hooks/useHydrateCreateDraft";

const SPORTS = [
  "Basketball", "Soccer", "Tennis", "Volleyball", "Swimming", "Baseball",
  "Football", "Golf", "Boxing", "MMA", "Yoga", "CrossFit", "Pilates",
  "Running", "Cycling", "Climbing", "Badminton", "Squash"
];

const CATEGORIES = [
  "gym", "court", "field", "studio", "pool", "track", "other"
];

const AMENITIES = [
  "Parking", "Showers", "Lockers", "WiFi", "Equipment Rental",
  "Pro Shop", "Café", "Air Conditioning", "Towel Service", "Personal Training"
];

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function CreatePlace() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [formData, setFormData] = useState<Partial<InsertPlace & { sports: string[] }>>({
    name: "",
    category: "gym",
    sports: [],
    bio: "",
    description: "",
    profileImageUrl: "",
    coverImageUrl: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Ireland",
    hours: {},
    amenities: [],
    pricing: {},
  });

  const [hours, setHours] = useState<Record<string, string>>(
    DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: "9:00 AM - 5:00 PM" }), {})
  );

  const [coverMedia, setCoverMedia] = useState<CreateMediaValue>(null);
  const [profileMedia, setProfileMedia] = useState<CreateMediaValue>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);

  useHydrateCreateDraft({
    onCover: setCoverMedia,
    onLogo: setProfileMedia,
    onTitle: (title) => setFormData((f) => ({ ...f, name: title })),
    onGallery: setGalleryUrls,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/places", data);
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Success!",
        description: "Your place is live. Manage it from My Hub anytime.",
      });
      await invalidateMyHubQueries(queryClient);
      setLocation(ROUTES.myHubPlaces);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create place. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      profileImageUrl: profileMedia?.publicUrl || formData.profileImageUrl,
      coverImageUrl: coverMedia?.publicUrl || formData.coverImageUrl,
      hours,
    };
    createMutation.mutate(submitData);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name && formData.category && (formData.sports?.length ?? 0) > 0;
      case 2:
        return formData.address && formData.city && formData.state;
      case 3:
        return true;
      default:
        return false;
    }
  };
  const handleSportToggle = (sport: string) => {
    const currentSports = formData.sports || [];
    const newSports = currentSports.includes(sport)
      ? currentSports.filter((s) => s !== sport)
      : [...currentSports, sport];
    setFormData({ ...formData, sports: newSports });
  };

  const handleAmenityToggle = (amenity: string) => {
    const currentAmenities = formData.amenities || [];
    const newAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter((a) => a !== amenity)
      : [...currentAmenities, amenity];
    setFormData({ ...formData, amenities: newAmenities });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6" data-testid="step-basic-info">
            <CreateMediaSection
              cover={coverMedia}
              onCoverChange={setCoverMedia}
              logo={profileMedia}
              onLogoChange={setProfileMedia}
              gallery={galleryUrls}
              onGalleryChange={setGalleryUrls}
              maxGallery={6}
              coverLabel="Venue cover"
              coverHint="Shows on the map and when athletes browse places."
            />

            <div className="space-y-2">
              <Label htmlFor="name">Place Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Elite Fitness Center"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category" data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} data-testid={`option-category-${cat}`}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sports Offered * (select at least one)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SPORTS.map((sport) => (
                  <div key={sport} className="flex items-center space-x-2">
                    <Checkbox
                      id={sport}
                      checked={formData.sports?.includes(sport)}
                      onCheckedChange={() => handleSportToggle(sport)}
                      data-testid={`checkbox-sport-${sport}`}
                    />
                    <label
                      htmlFor={sport}
                      className="text-sm cursor-pointer"
                    >
                      {sport}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Brief description of your place..."
                value={formData.bio || ""}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                data-testid="textarea-bio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                placeholder="Full description with details about facilities, services, etc..."
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                data-testid="textarea-description"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6" data-testid="step-contact-location">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website || ""}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                data-testid="input-website"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid="input-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Cork"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  data-testid="input-city"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="NY"
                  value={formData.state || ""}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  data-testid="input-state"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                placeholder="10001"
                value={formData.zipCode || ""}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                data-testid="input-zipcode"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6" data-testid="step-details">
            <div className="space-y-4">
              <Label>Operating Hours</Label>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <Label className="w-24 capitalize">{day}</Label>
                  <Input
                    placeholder="e.g. 9:00 AM - 9:00 PM or Closed"
                    value={hours[day] || ""}
                    onChange={(e) => setHours({ ...hours, [day]: e.target.value })}
                    data-testid={`input-hours-${day}`}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity}
                      checked={formData.amenities?.includes(amenity)}
                      onCheckedChange={() => handleAmenityToggle(amenity)}
                      data-testid={`checkbox-amenity-${amenity}`}
                    />
                    <label htmlFor={amenity} className="text-sm cursor-pointer">
                      {amenity}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricing-notes">Pricing Notes</Label>
              <Textarea
                id="pricing-notes"
                placeholder="e.g. €50/month membership, €15 day pass, Free trial available"
                rows={3}
                onChange={(e) => setFormData({ ...formData, pricing: { notes: e.target.value } })}
                data-testid="textarea-pricing"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepIcons = [Building2, MapPin, Clock];
  const stepTitles = ["Photos & info", "Contact & Location", "Hours & details"];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 bg-background border-b border-surna-outline z-50">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/places")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <h1 className="text-lg font-bold text-token-text">Create Place</h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Progress Indicator */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            {stepTitles.map((title, idx) => {
              const StepIcon = stepIcons[idx];
              const stepNum = idx + 1;
              const isActive = step === stepNum;
              const isComplete = step > stepNum;

              return (
                <div key={stepNum} className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isComplete
                        ? "bg-gradient-to-r from-token-accent to-token-accent text-foreground"
                        : isActive
                        ? "bg-token-accent text-foreground"
                        : "bg-token-text/10 text-token-text-muted"
                    }`}
                    data-testid={`step-indicator-${stepNum}`}
                  >
                    {isComplete ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs text-center hidden md:block text-token-text">
                    {title}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-2" data-testid="progress-bar" />
        </div>

        {/* Step Content */}
        <Card className="bg-background border-token-text/10">
          <CardHeader>
            <CardTitle className="text-token-text">
              {stepTitles[step - 1]}
            </CardTitle>
            <CardDescription className="text-token-text-muted">
              {step === 1 && "Add photos and basic information about your place"}
              {step === 2 && "Provide contact and location details"}
              {step === 3 && "Set operating hours and amenities"}
            </CardDescription>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            data-testid="button-previous"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-token-accent to-token-accent"
              data-testid="button-next"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || createMutation.isPending}
              className="bg-gradient-to-r from-token-accent to-token-accent"
              data-testid="button-submit"
            >
              {createMutation.isPending ? "Creating..." : "Create Place"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
