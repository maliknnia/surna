import { useState } from "react";
import { useLocation } from "wouter";
import {
  CalendarDays,
  MapPin,
  FileText,
  CheckCircle2,
  Sparkles,
  Users,
  Globe,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCreateEvent } from "@/hooks/useEvents";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ROUTES } from "@/navigation";
import { mapPath } from "@/lib/mapNavigation";
import { createHubPath } from "@/lib/createHub";
import { invalidateMyHubQueries } from "@/lib/hubQueries";
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
import {
  formatVenueAddress,
  formatVenueAddressShort,
  type VenueAddress,
} from "@shared/venueAddress";

const STEPS: CreateFlowStep[] = [
  { id: 1, label: "Basics", icon: Sparkles },
  { id: 2, label: "When", icon: CalendarDays },
  { id: 3, label: "Where", icon: MapPin },
  { id: 4, label: "Details", icon: FileText },
  { id: 5, label: "Publish", icon: CheckCircle2 },
];

type EventDraft = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  visibility: "public" | "private" | "unlisted";
  capacity: string;
};

const EMPTY_DRAFT: EventDraft = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  visibility: "public",
  capacity: "",
};

export default function CreateEventWizardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<EventDraft>(EMPTY_DRAFT);
  const [venue, setVenue] = useState<VenueAddress>(EMPTY_VENUE_ADDRESS);
  const [geocode, setGeocode] = useState<VenueGeocode | null>(null);

  const canAdvance = (): boolean => {
    if (step === 1) return form.title.trim().length >= 3;
    if (step === 2) {
      if (!form.startsAt || !form.endsAt) return false;
      return new Date(form.endsAt) > new Date(form.startsAt);
    }
    if (step === 3) return geocode !== null;
    return true;
  };

  const handlePublish = async () => {
    if (!geocode) {
      toast({
        title: "Location required",
        description: "Place your venue on the map before publishing.",
        variant: "destructive",
      });
      setStep(3);
      return;
    }

    const startsAt = new Date(form.startsAt);
    const endsAt = new Date(form.endsAt);

    try {
      const created = await createEvent.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        location: formatVenueAddress(venue),
        lat: geocode.lat,
        lng: geocode.lng,
        locationDetail: venue,
        visibility: form.visibility,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      });

      const eventId = (created as { id?: string })?.id;

      try {
        const creatorId = (user as { id?: string })?.id;
        await apiRequest("POST", "/api/messenger/groups", {
          name: form.title.trim(),
          memberIds: creatorId ? [creatorId] : [],
          eventId,
        });
      } catch {
        /* optional chat */
      }

      toast({
        title: "Event is live",
        description: "Opening the map at your venue.",
      });

      await invalidateMyHubQueries(queryClient);

      if (eventId) {
        navigate(mapPath({ type: "event", id: eventId, lat: geocode.lat, lng: geocode.lng }));
      } else {
        navigate(ROUTES.myHubEvents);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({ title: "Could not create event", description: message, variant: "destructive" });
    }
  };

  const footer =
    step < 5 ? (
      <FlowFooterButton
        label={step === 4 ? "Review" : "Continue"}
        onClick={() => {
          if (!canAdvance()) {
            if (step === 1) {
              toast({ title: "Add a title", description: "Use at least 3 characters.", variant: "destructive" });
            } else if (step === 2) {
              toast({ title: "Check your schedule", description: "End must be after start.", variant: "destructive" });
            } else if (step === 3) {
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
        label={createEvent.isPending ? "Publishing…" : "Publish & open map"}
        onClick={handlePublish}
        loading={createEvent.isPending}
      />
    );

  return (
    <CreateFlowShell
      title="Create event"
      subtitle="A guided setup — your pin lands exactly on the map"
      steps={STEPS}
      currentStep={step}
      onBack={() => (step > 1 ? setStep(step - 1) : navigate(createHubPath("event")))}
      footer={footer}
    >
      {step === 1 ? (
        <CreateSection
          icon={Sparkles}
          title="What's happening?"
          description="Start with a clear name — players and fans will see this everywhere."
        >
          <CreateFieldGroup label="Event title" required>
            <Input
              id="title"
              placeholder="Saturday 5-a-side at the sports complex"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-12 rounded-xl text-base font-medium border-[var(--surna-separator)]"
              data-testid="create-event-title"
            />
          </CreateFieldGroup>
        </CreateSection>
      ) : null}

      {step === 2 ? (
        <CreateSection
          icon={CalendarDays}
          title="When does it run?"
          description="Accurate times help your event show up in feeds, calendars, and the map at the right moment."
        >
          <div className="space-y-4">
            <CreateFieldGroup label="Starts" required>
              <Input
                id="startsAt"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="h-12 rounded-xl border-[var(--surna-separator)]"
                data-testid="create-event-starts-at"
              />
            </CreateFieldGroup>
            <CreateFieldGroup label="Ends" required>
              <Input
                id="endsAt"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="h-12 rounded-xl border-[var(--surna-separator)]"
                data-testid="create-event-ends-at"
              />
            </CreateFieldGroup>
          </div>
        </CreateSection>
      ) : null}

      {step === 3 ? (
        <CreateSection
          icon={MapPin}
          title="Where is it?"
          description="Add the full address through Eircode so SURNA can drop a pin exactly where players should meet."
        >
          <VenueAddressPicker
            value={venue}
            onChange={setVenue}
            geocode={geocode}
            onGeocode={setGeocode}
          />
        </CreateSection>
      ) : null}

      {step === 4 ? (
        <CreateSection
          icon={FileText}
          title="Extra details"
          description="Optional — you can always edit these later from My Hub."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="What should people bring? Skill level? Cost?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-xl border-[var(--surna-separator)] resize-none"
                data-testid="create-event-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="capacity" className="flex items-center gap-1.5">
                  <Users size={14} /> Capacity
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  placeholder="20"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="h-12 rounded-xl border-[var(--surna-separator)]"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe size={14} /> Visibility
                </Label>
                <Select
                  value={form.visibility}
                  onValueChange={(v: EventDraft["visibility"]) => setForm({ ...form, visibility: v })}
                >
                  <SelectTrigger className="h-12 rounded-xl" data-testid="create-event-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Invite only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CreateSection>
      ) : null}

      {step === 5 ? (
        <CreateSection
          icon={CheckCircle2}
          title="Ready to go live?"
          description="Your event will appear on the map at the pin below."
        >
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: "var(--surna-separator)", background: "var(--surna-elevated)" }}
          >
            {geocode ? (
              <div
                className="h-36 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://staticmap.openstreetmap.de/staticmap.php?center=${geocode.lat},${geocode.lng}&zoom=14&size=640x220&markers=${geocode.lat},${geocode.lng},red-pushpin)`,
                }}
              />
            ) : null}
            <div className="p-4 space-y-3">
              <ReviewRow label="Title" value={form.title} />
              <ReviewRow
                label="When"
                value={
                  form.startsAt && form.endsAt
                    ? `${new Date(form.startsAt).toLocaleString()} → ${new Date(form.endsAt).toLocaleString()}`
                    : "—"
                }
              />
              <ReviewRow label="Venue" value={formatVenueAddressShort(venue)} />
              <ReviewRow label="Address" value={formatVenueAddress(venue)} />
              <ReviewRow label="Visibility" value={form.visibility} />
              {form.capacity ? <ReviewRow label="Capacity" value={form.capacity} /> : null}
              {form.description ? <ReviewRow label="About" value={form.description} /> : null}
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
