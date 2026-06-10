import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Pencil,
  Eye,
  ChevronRight,
  Megaphone,
  CalendarCheck,
  FileText,
  Image as ImageIcon,
  Power,
  CalendarRange,
  Repeat,
  DollarSign,
  Clock4,
  BarChart3,
  Megaphone as PromoIcon,
  Star as PriorityIcon,
  Inbox,
  Users,
  Building2,
  MessageSquare,
} from "lucide-react";
import { LockedAction } from "./LockedAction";
import { StatusPill } from "./StatusPill";

export interface MyHubPlace {
  id: string;
  name: string;
  category?: string | null;
  sports?: string[] | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  isActive?: boolean | null;
  isVerified?: boolean | null;
  followersCount?: number | null;
  reviewsCount?: number | null;
  bookingsCount?: number | null;
  viewsCount?: number | null;
  averageRating?: string | null;
  pendingBookingsCount?: number;
  upcomingBookingsCount?: number;
  photosCount?: number;
}

interface Props {
  place: MyHubPlace;
  onEdit: (place: MyHubPlace) => void;
  onPostUpdate: (place: MyHubPlace) => void;
  onUpdatePhoto: (place: MyHubPlace) => void;
  onUpdateDescription: (place: MyHubPlace) => void;
}

export function MyHubPlaceCard({
  place,
  onEdit,
  onPostUpdate,
  onUpdatePhoto,
  onUpdateDescription,
}: Props) {
  const [proOpen, setProOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pending = place.pendingBookingsCount ?? 0;
  const upcoming = place.upcomingBookingsCount ?? 0;
  const isActive = place.isActive !== false;
  const cityLine = [place.city, place.state].filter(Boolean).join(", ");

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/places/${place.id}/status`, {
        isActive: !isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isActive ? "Marked closed" : "Marked open",
        description: isActive
          ? "Members will see this place as closed."
          : "Members can now book this place again.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/places/me/owned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/places", place.id] });
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't update status",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surna-elevated)",
        border: "1px solid var(--surna-border)",
      }}
      data-testid={`my-hub-place-${place.id}`}
    >
      {/* Top row */}
      <div className="p-4 flex gap-3">
        <div
          className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: "var(--surna-bg-highlight)" }}
        >
          {place.profileImageUrl || place.coverImageUrl ? (
            <img
              src={place.profileImageUrl ?? place.coverImageUrl ?? ""}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Building2 className="w-6 h-6" style={{ color: "var(--surna-text-secondary)" }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-sm font-semibold leading-snug line-clamp-2"
              style={{ color: "var(--surna-text)" }}
            >
              {place.name}
            </h3>
            <div className="flex-shrink-0 flex items-center gap-1.5">
              {pending > 0 && <StatusPill count={pending} label="pending" tone="alert" />}
              <StatusPill
                label={isActive ? "Open" : "Closed"}
                tone={isActive ? undefined : "alert"}
              />
            </div>
          </div>
          {place.category && (
            <div
              className="flex items-center gap-1 mt-1 text-[11px] capitalize"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              <Building2 className="w-3 h-3" />
              <span className="truncate">{place.category}</span>
              {cityLine ? (
                <>
                  <span>·</span>
                  <MapPin className="w-3 h-3" />
                  <span className="truncate normal-case">{cityLine}</span>
                </>
              ) : null}
            </div>
          )}
          <div
            className="flex items-center gap-2 mt-0.5 text-[11px]"
            style={{ color: "var(--surna-text-muted)" }}
          >
            <span>{place.followersCount ?? 0} followers</span>
            <span>·</span>
            <span>{upcoming} upcoming</span>
            <span>·</span>
            <span>{place.photosCount ?? 0} photos</span>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div
        className="px-3 py-2 flex items-center gap-1 overflow-x-auto"
        style={{ borderTop: "0.5px solid var(--surna-border)" }}
      >
        <Link href={`/places/${place.id}`}>
          <ActionChip icon={Eye} label="Open" testId={`place-open-${place.id}`} />
        </Link>
        <ActionChip
          icon={Pencil}
          label="Edit"
          onClick={() => onEdit(place)}
          testId={`place-edit-${place.id}`}
        />
        <ActionChip
          icon={FileText}
          label="Description"
          onClick={() => onUpdateDescription(place)}
          testId={`place-description-${place.id}`}
        />
        <ActionChip
          icon={ImageIcon}
          label="Photos"
          onClick={() => onUpdatePhoto(place)}
          testId={`place-photos-${place.id}`}
        />
        <Link href={`/messages?context=place&placeId=${place.id}`}>
          <ActionChip
            icon={MessageSquare}
            label="Messages"
            testId={`place-messages-${place.id}`}
          />
        </Link>
        <ActionChip
          icon={Megaphone}
          label="Post"
          onClick={() => onPostUpdate(place)}
          testId={`place-post-${place.id}`}
        />
        <ActionChip
          icon={Power}
          label={isActive ? "Mark closed" : "Reopen"}
          onClick={() => toggleStatus.mutate()}
          testId={`place-toggle-${place.id}`}
        />
      </div>

      {/* Pro tools */}
      <div className="px-4 py-3" style={{ borderTop: "0.5px solid var(--surna-border)" }}>
        <button
          onClick={() => setProOpen((v) => !v)}
          className="w-full flex items-center justify-between text-[12px] font-semibold"
          style={{ color: "var(--surna-text-secondary)" }}
          data-testid={`place-pro-toggle-${place.id}`}
        >
          <span>Pro tools</span>
          <ChevronRight
            className="w-4 h-4 transition-transform"
            style={{ transform: proOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          />
        </button>
        {proOpen && (
          <div className="mt-3 space-y-2" data-testid={`place-pro-actions-${place.id}`}>
            <LockedAction
              icon={CalendarCheck}
              label={pending > 0 ? `Bookings · ${pending} pending` : "Bookings"}
              description="Triage requests, confirm or decline"
              featureKey="places.bookings"
              fromSurface="my-hub-places"
              testId={`place-locked-bookings-${place.id}`}
            />
            <LockedAction
              icon={CalendarRange}
              label="Booking calendar"
              description="Visual calendar with conflict detection"
              featureKey="places.bookingCalendar"
              fromSurface="my-hub-places"
              testId={`place-locked-calendar-${place.id}`}
            />
            <LockedAction
              icon={Repeat}
              label="Recurring schedules"
              description="Weekly classes, sessions and blocks"
              featureKey="places.recurring"
              fromSurface="my-hub-places"
              testId={`place-locked-recurring-${place.id}`}
            />
            <LockedAction
              icon={Clock4}
              label="Time-slot manager"
              description="Per-court, per-room, per-trainer slots"
              featureKey="places.slots"
              fromSurface="my-hub-places"
              testId={`place-locked-slots-${place.id}`}
            />
            <LockedAction
              icon={DollarSign}
              label="Pricing tiers"
              description="Memberships, drop-ins, packages"
              featureKey="places.pricing"
              fromSurface="my-hub-places"
              testId={`place-locked-pricing-${place.id}`}
            />
            <LockedAction
              icon={BarChart3}
              label="Place analytics"
              description="Views, conversion, revenue trends"
              featureKey="places.analytics"
              fromSurface="my-hub-places"
              testId={`place-locked-analytics-${place.id}`}
            />
            <LockedAction
              icon={PromoIcon}
              label="Promotions & offers"
              description="Discount codes, bundles, flash deals"
              featureKey="places.promotions"
              fromSurface="my-hub-places"
              testId={`place-locked-promos-${place.id}`}
            />
            <LockedAction
              icon={PriorityIcon}
              label="Priority placement"
              description="Featured ranking on map and search"
              featureKey="places.priority"
              fromSurface="my-hub-places"
              testId={`place-locked-priority-${place.id}`}
            />
            <LockedAction
              icon={Inbox}
              label="Lead & inquiry pipeline"
              description="Triage, assignment, follow-ups"
              featureKey="places.leads"
              fromSurface="my-hub-places"
              testId={`place-locked-leads-${place.id}`}
            />
            <LockedAction
              icon={Users}
              label="Staff & roles"
              description="Trainers, front-desk, scoped permissions"
              featureKey="places.staff"
              fromSurface="my-hub-places"
              testId={`place-locked-staff-${place.id}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionChip({
  icon: Icon,
  label,
  onClick,
  tone,
  testId,
}: {
  icon: typeof Eye;
  label: string;
  onClick?: () => void;
  tone?: "danger";
  testId?: string;
}) {
  const isDanger = tone === "danger";
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95"
      style={{
        background: isDanger ? "var(--surna-text)" : "var(--surna-bg-highlight)",
        color: isDanger ? "var(--surna-bg)" : "var(--surna-text)",
      }}
      data-testid={testId}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
