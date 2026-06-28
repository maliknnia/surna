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
  Navigation,
  Music,
  Swords,
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
  CreateMediaSection,
  type CreateMediaValue,
} from "@/components/create/CreateMediaSection";
import {
  VenueAddressPicker,
  EMPTY_VENUE_ADDRESS,
  type VenueGeocode,
} from "@/components/create/VenueAddressPicker";
import { useHydrateCreateDraft } from "@/hooks/useHydrateCreateDraft";
import {
  formatVenueAddress,
  formatVenueAddressShort,
  type VenueAddress,
} from "@shared/venueAddress";
import {
  EVENT_FORMAT_META,
  EVENT_FORMATS,
  EVENT_SPORT_OPTIONS,
  type EventFormat,
  type EventLineup,
} from "@shared/eventFormats";
import {
  EVENT_RECURRENCE_FREQUENCIES,
  recurrenceSummary,
  type EventRecurrenceFrequency,
} from "@shared/eventRecurrence";

const STEPS: CreateFlowStep[] = [
  { id: 1, label: "Photo & basics", icon: Sparkles },
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
  eventFormat: EventFormat;
  sport: string;
  sideA: string;
  sideB: string;
  sideAWeight: string;
  sideBWeight: string;
  headliner: string;
  supportAct: string;
  distanceKm: string;
  recurrenceFrequency: EventRecurrenceFrequency;
  occurrenceCount: string;
};

const EMPTY_DRAFT: EventDraft = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  visibility: "public",
  capacity: "",
  eventFormat: "open",
  sport: "",
  sideA: "",
  sideB: "",
  sideAWeight: "",
  sideBWeight: "",
  headliner: "",
  supportAct: "",
  distanceKm: "",
  recurrenceFrequency: "once",
  occurrenceCount: "8",
};

const FORMAT_ICONS: Record<EventFormat, typeof Users> = {
  open: Users,
  versus: Swords,
  route: Navigation,
  lineup: Music,
};

function buildEventLineup(form: EventDraft): EventLineup | undefined {
  if (form.eventFormat === "versus") {
    if (!form.sideA.trim() && !form.sideB.trim()) return undefined;
    return {
      sides: [
        {
          label: form.sideA.trim() || "TBD",
          meta: form.sideAWeight.trim() ? { weightClass: form.sideAWeight.trim() } : undefined,
        },
        {
          label: form.sideB.trim() || "TBD",
          meta: form.sideBWeight.trim() ? { weightClass: form.sideBWeight.trim() } : undefined,
        },
      ],
    };
  }
  if (form.eventFormat === "lineup") {
    const acts = form.supportAct.trim() ? [{ name: form.supportAct.trim() }] : [];
    const headliner = form.headliner.trim() || undefined;
    if (!headliner && acts.length === 0) return undefined;
    return { headliner, acts: acts.length ? acts : undefined };
  }
  if (form.eventFormat === "route") {
    const km = form.distanceKm.trim() ? Number(form.distanceKm) : undefined;
    if (!km || Number.isNaN(km)) return undefined;
    return { route: { distanceKm: km } };
  }
  return undefined;
}

export default function CreateEventWizardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<EventDraft>(EMPTY_DRAFT);
  const [venue, setVenue] = useState<VenueAddress>(EMPTY_VENUE_ADDRESS);
  const [geocode, setGeocode] = useState<VenueGeocode | null>(null);
  const [coverMedia, setCoverMedia] = useState<CreateMediaValue>(null);

  useHydrateCreateDraft({
    onCover: setCoverMedia,
    onTitle: (title) => setForm((f) => ({ ...f, title })),
  });

  const canAdvance = (): boolean => {
    if (step === 1) return form.title.trim().length >= 3 && form.sport.trim().length > 0;
    if (step === 2) {
      if (!form.startsAt || !form.endsAt) return false;
      if (new Date(form.endsAt) <= new Date(form.startsAt)) return false;
      if (form.recurrenceFrequency !== "once") {
        const n = Number(form.occurrenceCount);
        return Number.isInteger(n) && n >= 2 && n <= 52;
      }
      return true;
    }
    if (step === 3) return geocode !== null;
    if (step === 4 && form.eventFormat === "versus") {
      return form.sideA.trim().length > 0 && form.sideB.trim().length > 0;
    }
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

    const recurrenceRule =
      form.recurrenceFrequency === "once"
        ? { frequency: "once" as const, occurrenceCount: 1 }
        : {
            frequency: form.recurrenceFrequency,
            occurrenceCount: Number(form.occurrenceCount) || 8,
          };

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
        coverMediaId: coverMedia?.mediaId,
        eventFormat: form.eventFormat,
        sport: form.sport.trim(),
        eventLineup: buildEventLineup(form),
        recurrenceRule,
      });

      const eventId = (created as { id?: string })?.id;
      const occurrenceCount = (created as { occurrenceCount?: number })?.occurrenceCount ?? 1;

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
        title: occurrenceCount > 1 ? `${occurrenceCount} sessions are live` : "Event is live",
        description:
          occurrenceCount > 1
            ? "Your recurring series is on the map — first session selected."
            : "Opening the map at your venue.",
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
              toast({
                title: "Complete basics",
                description: "Add a title (3+ chars) and pick a sport or category.",
                variant: "destructive",
              });
            } else if (step === 2) {
              toast({
                title: "Check your schedule",
                description: "End must be after start. For repeats, pick at least 2 sessions.",
                variant: "destructive",
              });
            } else if (step === 3) {
              toast({
                title: "Pin your venue",
                description: "Complete the address through Eircode and tap Place on map.",
                variant: "destructive",
              });
            } else if (step === 4 && form.eventFormat === "versus") {
              toast({
                title: "Name both sides",
                description: "Versus events need Side A and Side B.",
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
          description="Add a cover photo and name — this is what people see on the map and in feeds."
        >
          <CreateMediaSection
            cover={coverMedia}
            onCoverChange={setCoverMedia}
            coverLabel="Event cover"
            coverHint="Shows on event cards, map pins, and when people share your event."
            className="mb-2"
          />
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

          <CreateFieldGroup label="Format" required>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_FORMATS.map((fmt) => {
                const Icon = FORMAT_ICONS[fmt];
                const meta = EVENT_FORMAT_META[fmt];
                const selected = form.eventFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        eventFormat: fmt,
                        sport:
                          fmt === "lineup" && !f.sport
                            ? "Entertainment"
                            : f.sport,
                      }))
                    }
                    className="rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
                    style={{
                      borderColor: selected ? "var(--surna-accent)" : "var(--surna-separator)",
                      background: selected ? "var(--surna-accent-soft, rgba(99,102,241,0.08))" : "var(--surna-elevated)",
                    }}
                    data-testid={`create-event-format-${fmt}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} style={{ color: selected ? "var(--surna-accent)" : "var(--surna-text-muted)" }} />
                      <span className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
                        {meta.shortLabel}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color: "var(--surna-text-muted)" }}>
                      {meta.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </CreateFieldGroup>

          <CreateFieldGroup label="Sport or category" required>
            <Select
              value={form.sport || undefined}
              onValueChange={(sport) => setForm({ ...form, sport })}
            >
              <SelectTrigger className="h-12 rounded-xl" data-testid="create-event-sport">
                <SelectValue placeholder="Pick a sport or Entertainment" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_SPORT_OPTIONS.map((sport) => (
                  <SelectItem key={sport} value={sport}>
                    {sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

            <CreateFieldGroup label="Repeats" required>
              <div className="grid grid-cols-3 gap-2">
                {EVENT_RECURRENCE_FREQUENCIES.map((freq) => {
                  const selected = form.recurrenceFrequency === freq;
                  const label =
                    freq === "once" ? "Once" : freq === "daily" ? "Daily" : "Weekly";
                  return (
                    <button
                      key={freq}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          recurrenceFrequency: freq,
                          occurrenceCount: freq === "once" ? "1" : f.occurrenceCount || "8",
                        }))
                      }
                      className="h-11 rounded-xl border text-sm font-semibold transition-all active:scale-[0.98]"
                      style={{
                        borderColor: selected ? "var(--surna-accent)" : "var(--surna-separator)",
                        background: selected ? "var(--surna-accent-soft, rgba(99,102,241,0.08))" : "var(--surna-elevated)",
                        color: selected ? "var(--surna-accent)" : "var(--surna-text)",
                      }}
                      data-testid={`create-event-recurrence-${freq}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </CreateFieldGroup>

            {form.recurrenceFrequency !== "once" ? (
              <CreateFieldGroup
                label={`How many ${form.recurrenceFrequency === "daily" ? "days" : "weeks"}?`}
                required
              >
                <Select
                  value={form.occurrenceCount}
                  onValueChange={(occurrenceCount) => setForm({ ...form, occurrenceCount })}
                >
                  <SelectTrigger className="h-12 rounded-xl" data-testid="create-event-occurrence-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12, 16, 26, 52].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} sessions
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[12px] mt-2" style={{ color: "var(--surna-text-muted)" }}>
                  Same time and venue each {form.recurrenceFrequency === "daily" ? "day" : "week"} — each session gets its own listing and RSVPs.
                </p>
              </CreateFieldGroup>
            ) : null}
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
            {form.eventFormat === "versus" ? (
              <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--surna-separator)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
                  Matchup
                </p>
                <CreateFieldGroup label="Side A" required>
                  <Input
                    placeholder="Home team or fighter"
                    value={form.sideA}
                    onChange={(e) => setForm({ ...form, sideA: e.target.value })}
                    className="h-12 rounded-xl border-[var(--surna-separator)]"
                    data-testid="create-event-side-a"
                  />
                </CreateFieldGroup>
                <CreateFieldGroup label="Weight / note (optional)">
                  <Input
                    placeholder="Welterweight"
                    value={form.sideAWeight}
                    onChange={(e) => setForm({ ...form, sideAWeight: e.target.value })}
                    className="h-12 rounded-xl border-[var(--surna-separator)]"
                  />
                </CreateFieldGroup>
                <CreateFieldGroup label="Side B" required>
                  <Input
                    placeholder="Away team or fighter"
                    value={form.sideB}
                    onChange={(e) => setForm({ ...form, sideB: e.target.value })}
                    className="h-12 rounded-xl border-[var(--surna-separator)]"
                    data-testid="create-event-side-b"
                  />
                </CreateFieldGroup>
                <CreateFieldGroup label="Weight / note (optional)">
                  <Input
                    placeholder="Welterweight"
                    value={form.sideBWeight}
                    onChange={(e) => setForm({ ...form, sideBWeight: e.target.value })}
                    className="h-12 rounded-xl border-[var(--surna-separator)]"
                  />
                </CreateFieldGroup>
              </div>
            ) : null}

            {form.eventFormat === "lineup" ? (
              <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--surna-separator)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
                  Lineup
                </p>
                <CreateFieldGroup label="Headliner">
                  <Input
                    placeholder="Main act or main event"
                    value={form.headliner}
                    onChange={(e) => setForm({ ...form, headliner: e.target.value })}
                    className="h-12 rounded-xl border-[var(--surna-separator)]"
                    data-testid="create-event-headliner"
                  />
                </CreateFieldGroup>
                <CreateFieldGroup label="Support act (optional)">
                  <Input
                    placeholder="Opening act or co-main"
                    value={form.supportAct}
                    onChange={(e) => setForm({ ...form, supportAct: e.target.value })}
                    className="h-12 rounded-xl border-[var(--surna-separator)]"
                  />
                </CreateFieldGroup>
              </div>
            ) : null}

            {form.eventFormat === "route" ? (
              <CreateFieldGroup label="Distance (km)">
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  placeholder="10"
                  value={form.distanceKm}
                  onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                  className="h-12 rounded-xl border-[var(--surna-separator)]"
                  data-testid="create-event-distance"
                />
              </CreateFieldGroup>
            ) : null}

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
              <ReviewRow label="Title" value={form.title} />
              <ReviewRow label="Format" value={EVENT_FORMAT_META[form.eventFormat].label} />
              <ReviewRow label="Sport" value={form.sport || "—"} />
              {form.eventFormat === "versus" && form.sideA && form.sideB ? (
                <ReviewRow label="Matchup" value={`${form.sideA} vs ${form.sideB}`} />
              ) : null}
              {form.eventFormat === "lineup" && (form.headliner || form.supportAct) ? (
                <ReviewRow
                  label="Lineup"
                  value={[form.headliner, form.supportAct].filter(Boolean).join(" · ")}
                />
              ) : null}
              {form.eventFormat === "route" && form.distanceKm ? (
                <ReviewRow label="Distance" value={`${form.distanceKm} km`} />
              ) : null}
              <ReviewRow
                label="When"
                value={
                  form.startsAt && form.endsAt
                    ? `${new Date(form.startsAt).toLocaleString()} → ${new Date(form.endsAt).toLocaleString()}`
                    : "—"
                }
              />
              <ReviewRow
                label="Repeats"
                value={recurrenceSummary({
                  frequency: form.recurrenceFrequency,
                  occurrenceCount:
                    form.recurrenceFrequency === "once"
                      ? 1
                      : Number(form.occurrenceCount) || 8,
                })}
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
