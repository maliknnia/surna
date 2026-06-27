import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ROUTES } from "@/navigation";
import { invalidateMyHubQueries } from "@/lib/hubQueries";
import { createHubPath } from "@/lib/createHub";
import { Building2, MapPin, Clock, CheckCircle2, Sparkles } from "lucide-react";
import type { InsertPlace } from "@shared/schema";
import {
  CreateMediaSection,
  type CreateMediaValue,
} from "@/components/create/CreateMediaSection";
import {
  CreateFlowShell,
  FlowFooterButton,
  type CreateFlowStep,
} from "@/components/create/CreateFlowShell";
import { CreateSection, CreateFieldGroup } from "@/components/create/CreateSection";
import {
  VenueAddressPicker,
  EMPTY_VENUE_ADDRESS,
  type VenueGeocode,
} from "@/components/create/VenueAddressPicker";
import { useHydrateCreateDraft } from "@/hooks/useHydrateCreateDraft";
import {
  formatVenueAddress,
  formatVenueAddressShort,
  isVenueAddressComplete,
  type VenueAddress,
} from "@shared/venueAddress";

const STEPS: CreateFlowStep[] = [
  { id: 1, label: "Photos & info", icon: Sparkles },
  { id: 2, label: "Where", icon: MapPin },
  { id: 3, label: "Hours & amenities", icon: Clock },
  { id: 4, label: "Publish", icon: CheckCircle2 },
];

const SPORTS = [
  "Basketball", "Soccer", "Tennis", "Volleyball", "Swimming", "Baseball",
  "Football", "Golf", "Boxing", "MMA", "Yoga", "CrossFit", "Pilates",
  "Running", "Cycling", "Climbing", "Badminton", "Squash",
];

const CATEGORIES = [
  { value: "gym", label: "Gym" },
  { value: "court", label: "Court" },
  { value: "field", label: "Field" },
  { value: "gaa-pitch", label: "GAA Pitch" },
  { value: "rugby-pitch", label: "Rugby Pitch" },
  { value: "cricket-pitch", label: "Cricket Pitch" },
  { value: "studio", label: "Studio" },
  { value: "pool", label: "Pool" },
  { value: "track", label: "Track" },
  { value: "other", label: "Other" },
];

const AMENITIES = [
  "Parking", "Showers", "Lockers", "WiFi", "Equipment Rental",
  "Pro Shop", "Café", "Air Conditioning", "Towel Service", "Personal Training",
];

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function CreatePlace() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<InsertPlace & { sports: string[] }>>({
    name: "",
    category: "gym",
    sports: [],
    bio: "",
    description: "",
    email: "",
    phone: "",
    website: "",
    country: "Ireland",
    amenities: [],
    pricing: {},
  });
  const [hours, setHours] = useState<Record<string, string>>(
    DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: "9:00 AM - 5:00 PM" }), {}),
  );
  const [coverMedia, setCoverMedia] = useState<CreateMediaValue>(null);
  const [profileMedia, setProfileMedia] = useState<CreateMediaValue>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [venue, setVenue] = useState<VenueAddress>(EMPTY_VENUE_ADDRESS);
  const [geocode, setGeocode] = useState<VenueGeocode | null>(null);

  useHydrateCreateDraft({
    onCover: setCoverMedia,
    onLogo: setProfileMedia,
    onTitle: (title) => setFormData((f) => ({ ...f, name: title })),
    onGallery: setGalleryUrls,
  });

  useEffect(() => {
    if (formData.name && !venue.venueName) {
      setVenue((v) => ({ ...v, venueName: formData.name ?? "" }));
    }
  }, [formData.name, venue.venueName]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await apiRequest("POST", "/api/places", data);
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Venue is live",
        description: "Manage it anytime from My Hub.",
      });
      await invalidateMyHubQueries(queryClient);
      setLocation(ROUTES.myHubPlaces);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not create venue",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const canAdvance = (): boolean => {
    if (step === 1) {
      return Boolean(formData.name?.trim()) && Boolean(formData.category) && (formData.sports?.length ?? 0) > 0;
    }
    if (step === 2) {
      return geocode !== null && isVenueAddressComplete(venue);
    }
    return true;
  };

  const handlePublish = () => {
    if (!geocode || !isVenueAddressComplete(venue)) {
      toast({
        title: "Location required",
        description: "Complete the address and place your venue on the map.",
        variant: "destructive",
      });
      setStep(2);
      return;
    }

    createMutation.mutate({
      ...formData,
      name: formData.name?.trim(),
      profileImageUrl: profileMedia?.publicUrl || formData.profileImageUrl,
      coverImageUrl: coverMedia?.publicUrl || formData.coverImageUrl,
      address: [venue.addressLine1, venue.addressLine2].filter(Boolean).join(", "),
      city: venue.townCity,
      state: venue.county,
      zipCode: venue.eircode.replace(/\s+/g, " ").trim(),
      country: venue.country || "Ireland",
      latitude: geocode.lat,
      longitude: geocode.lng,
      hours,
    });
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

  const footer =
    step < 4 ? (
      <FlowFooterButton
        label={step === 3 ? "Review" : "Continue"}
        onClick={() => {
          if (!canAdvance()) {
            if (step === 1) {
              toast({
                title: "Complete basics",
                description: "Add a name, category, and at least one sport.",
                variant: "destructive",
              });
            } else if (step === 2) {
              toast({
                title: "Pin your venue",
                description: "Complete the address through Eircode and tap Place on map.",
                variant: "destructive",
              });
            }
            return;
          }
          setStep((s) => s + 1);
        }}
        disabled={!canAdvance()}
      />
    ) : (
      <FlowFooterButton
        label={createMutation.isPending ? "Publishing…" : "Publish venue"}
        onClick={handlePublish}
        loading={createMutation.isPending}
      />
    );

  return (
    <CreateFlowShell
      title="Create venue"
      subtitle="List your gym, pitch, or studio — athletes find you on the map"
      steps={STEPS}
      currentStep={step}
      onBack={() => (step > 1 ? setStep(step - 1) : setLocation(createHubPath("place")))}
      footer={footer}
    >
      {step === 1 ? (
        <CreateSection
          icon={Building2}
          title="What's your venue?"
          description="Photos and basics — this is what athletes see when they browse venues."
        >
          <CreateMediaSection
            cover={coverMedia}
            onCoverChange={setCoverMedia}
            logo={profileMedia}
            onLogoChange={setProfileMedia}
            gallery={galleryUrls}
            onGalleryChange={setGalleryUrls}
            maxGallery={6}
            coverLabel="Venue cover"
            coverHint="Shows on the map and in venue discovery."
            className="mb-2"
          />
          <CreateFieldGroup label="Venue name" required>
            <Input
              id="name"
              placeholder="Elite Fitness Centre"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-12 rounded-xl border-[var(--surna-separator)]"
              data-testid="input-name"
            />
          </CreateFieldGroup>
          <CreateFieldGroup label="Category" required>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="h-12 rounded-xl" data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CreateFieldGroup>
          <CreateFieldGroup label="Sports offered" required>
            <div className="grid grid-cols-2 gap-2">
              {SPORTS.map((sport) => (
                <label key={sport} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={formData.sports?.includes(sport)}
                    onCheckedChange={() => handleSportToggle(sport)}
                    data-testid={`checkbox-sport-${sport}`}
                  />
                  {sport}
                </label>
              ))}
            </div>
          </CreateFieldGroup>
          <CreateFieldGroup label="Bio">
            <Textarea
              rows={3}
              placeholder="Brief tagline for your venue…"
              value={formData.bio || ""}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="rounded-xl border-[var(--surna-separator)] resize-none"
              data-testid="textarea-bio"
            />
          </CreateFieldGroup>
        </CreateSection>
      ) : null}

      {step === 2 ? (
        <CreateSection
          icon={MapPin}
          title="Where is it?"
          description="Full address through Eircode so SURNA can pin your venue on the map."
        >
          <VenueAddressPicker
            value={{ ...venue, venueName: venue.venueName || formData.name || "" }}
            onChange={setVenue}
            geocode={geocode}
            onGeocode={setGeocode}
          />
          <div className="grid grid-cols-1 gap-3 mt-4">
            <CreateFieldGroup label="Email (optional)">
              <Input
                type="email"
                placeholder="contact@venue.ie"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 rounded-xl border-[var(--surna-separator)]"
                data-testid="input-email"
              />
            </CreateFieldGroup>
            <CreateFieldGroup label="Phone (optional)">
              <Input
                type="tel"
                placeholder="+353 …"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-12 rounded-xl border-[var(--surna-separator)]"
                data-testid="input-phone"
              />
            </CreateFieldGroup>
            <CreateFieldGroup label="Website (optional)">
              <Input
                type="url"
                placeholder="https://…"
                value={formData.website || ""}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="h-12 rounded-xl border-[var(--surna-separator)]"
                data-testid="input-website"
              />
            </CreateFieldGroup>
          </div>
        </CreateSection>
      ) : null}

      {step === 3 ? (
        <CreateSection
          icon={Clock}
          title="Hours & amenities"
          description="Optional — you can edit these later from My Hub."
        >
          <div className="space-y-3">
            <Label>Operating hours</Label>
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-24 text-sm capitalize shrink-0" style={{ color: "var(--surna-text-muted)" }}>
                  {day}
                </span>
                <Input
                  placeholder="9:00 AM - 9:00 PM or Closed"
                  value={hours[day] || ""}
                  onChange={(e) => setHours({ ...hours, [day]: e.target.value })}
                  className="h-11 rounded-xl border-[var(--surna-separator)]"
                  data-testid={`input-hours-${day}`}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2 mt-6">
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-2">
              {AMENITIES.map((amenity) => (
                <label key={amenity} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={formData.amenities?.includes(amenity)}
                    onCheckedChange={() => handleAmenityToggle(amenity)}
                    data-testid={`checkbox-amenity-${amenity}`}
                  />
                  {amenity}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <CreateFieldGroup label="Pricing notes (optional)">
              <Textarea
                rows={3}
                placeholder="e.g. €50/month membership, €15 day pass"
                onChange={(e) => setFormData({ ...formData, pricing: { notes: e.target.value } })}
                className="rounded-xl border-[var(--surna-separator)] resize-none"
                data-testid="textarea-pricing"
              />
            </CreateFieldGroup>
          </div>
        </CreateSection>
      ) : null}

      {step === 4 ? (
        <CreateSection
          icon={CheckCircle2}
          title="Ready to go live?"
          description="Your venue will appear on the map at the pin below."
        >
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: "var(--surna-separator)", background: "var(--surna-elevated)" }}
          >
            {coverMedia?.publicUrl ? (
              <img src={coverMedia.publicUrl} alt="" className="w-full h-36 object-cover" />
            ) : geocode ? (
              <div
                className="h-36 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://staticmap.openstreetmap.de/staticmap.php?center=${geocode.lat},${geocode.lng}&zoom=14&size=640x220&markers=${geocode.lat},${geocode.lng},red-pushpin)`,
                }}
              />
            ) : null}
            <div className="p-4 space-y-3">
              <ReviewRow label="Name" value={formData.name || "—"} />
              <ReviewRow label="Category" value={CATEGORIES.find((c) => c.value === formData.category)?.label || "—"} />
              <ReviewRow label="Sports" value={(formData.sports || []).join(", ") || "—"} />
              <ReviewRow label="Venue" value={formatVenueAddressShort(venue)} />
              <ReviewRow label="Address" value={formatVenueAddress(venue)} />
              {formData.bio ? <ReviewRow label="Bio" value={formData.bio} /> : null}
            </div>
          </div>
        </CreateSection>
      ) : null}
    </CreateFlowShell>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-wider"
        style={{ color: "var(--surna-text-muted)" }}
      >
        {label}
      </p>
      <p className="text-sm font-medium mt-0.5 leading-snug" style={{ color: "var(--surna-text)" }}>
        {value}
      </p>
    </div>
  );
}
