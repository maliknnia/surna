import { useQuery } from "@tanstack/react-query";
import {
  AttendeeCircles,
  attendeeEntityPath,
  type AttendeeCirclePerson,
  type AttendeeEntityType,
} from "./AttendeeCircles";
import { demoPeopleForEntity } from "@/lib/activityPeople";

type PreviewResponse = {
  attendees: AttendeeCirclePerson[];
  totalCount: number;
};

export function useAttendeePreview(
  entityType: AttendeeEntityType | undefined,
  entityId: string | undefined,
  fallbackCount?: number,
) {
  return useQuery<PreviewResponse>({
    queryKey: ["/api/attendees", entityType, entityId],
    enabled: Boolean(entityType && entityId),
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch(attendeeEntityPath(entityType!, entityId!), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load attendees");
      return res.json();
    },
    placeholderData:
      fallbackCount != null
        ? {
            attendees: demoPeopleForEntity(entityId!, fallbackCount).slice(0, 4).map((p) => ({
              id: p.id,
              name: p.name,
              profileImageUrl: p.avatarUrl,
              initials: p.name.charAt(0),
            })),
            totalCount: fallbackCount,
          }
        : undefined,
  });
}

type CardAttendeeStripProps = {
  entityType?: AttendeeEntityType;
  entityId?: string;
  fallbackCount?: number;
  compact?: boolean;
  className?: string;
  onPhoto?: boolean;
};

/** Bottom-left attendee circles for activity cards. */
export function CardAttendeeStrip({
  entityType,
  entityId,
  fallbackCount,
  compact = false,
  className = "",
  onPhoto = false,
}: CardAttendeeStripProps) {
  const { data } = useAttendeePreview(entityType, entityId, fallbackCount);
  const attendees = data?.attendees ?? [];
  const totalCount = data?.totalCount ?? fallbackCount ?? 0;

  if (!entityType || !entityId) return null;

  return (
    <AttendeeCircles
      attendees={attendees}
      totalCount={totalCount}
      compact={compact}
      onPhoto={onPhoto}
      className={className}
    />
  );
}
