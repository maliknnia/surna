import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import {
  SectionHeader,
  EmptyState,
  UpgradePromptCard,
  ManagePlaceHighlightsSheet,
} from "@/features/my-hub/components";
import { MyHubPlaceCard, type MyHubPlace } from "@/features/my-hub/components/MyHubPlaceCard";
import { EditPlaceSheet } from "@/features/my-hub/components/EditPlaceSheet";
import { PostPlaceUpdateSheet } from "@/features/my-hub/components/PostPlaceUpdateSheet";
import { UpdatePlacePhotoSheet } from "@/features/my-hub/components/UpdatePlacePhotoSheet";
import { UpdatePlaceDescriptionSheet } from "@/features/my-hub/components/UpdatePlaceDescriptionSheet";
import { HubSubpageHeader } from "@/components/create/HubSubpageHeader";
import { createHubPath } from "@/lib/createHub";

interface OwnedPlacesResponse {
  items: MyHubPlace[];
  generatedAt: string;
}

export default function MyHubPlacesPage() {
  const [editTarget, setEditTarget] = useState<MyHubPlace | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [postTarget, setPostTarget] = useState<MyHubPlace | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<MyHubPlace | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [descTarget, setDescTarget] = useState<MyHubPlace | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const [highlightsTarget, setHighlightsTarget] = useState<MyHubPlace | null>(null);
  const [highlightsOpen, setHighlightsOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<OwnedPlacesResponse>({
    queryKey: ["/api/places/me/owned"],
  });

  const items = data?.items ?? [];
  const open = items.filter((p) => p.isActive !== false);
  const closed = items.filter((p) => p.isActive === false);
  const showEmpty = !isLoading && !isError && items.length === 0;

  const handleEdit = (p: MyHubPlace) => {
    setEditTarget(p);
    setEditOpen(true);
  };
  const handlePost = (p: MyHubPlace) => {
    setPostTarget(p);
    setPostOpen(true);
  };
  const handleUpdatePhoto = (p: MyHubPlace) => {
    setPhotoTarget(p);
    setPhotoOpen(true);
  };
  const handleUpdateDescription = (p: MyHubPlace) => {
    setDescTarget(p);
    setDescOpen(true);
  };
  const handleManageHighlights = (p: MyHubPlace) => {
    setHighlightsTarget(p);
    setHighlightsOpen(true);
  };

  return (
    <div
      className="min-h-screen pb-32"
      style={{ background: "var(--surna-void)" }}
      data-testid="my-hub-places-page"
    >
      <HubSubpageHeader title="My Places" createType="place" testId="my-hub-places-title" />

      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">
        {isLoading && (
          <div className="space-y-3" data-testid="places-loading">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{
                  height: 200,
                  background: "var(--surna-elevated)",
                  border: "1px solid var(--surna-border)",
                }}
              />
            ))}
          </div>
        )}

        {isError && (
          <div
            className="rounded-2xl p-4 text-center text-sm"
            style={{
              background: "var(--surna-elevated)",
              border: "1px solid var(--surna-border)",
              color: "var(--surna-text-secondary)",
            }}
            data-testid="places-error"
          >
            Couldn't load your places. Please try again.
          </div>
        )}

        {showEmpty && (
          <EmptyState
            icon={Building2}
            title="You don't manage any places yet"
            description="Add a gym, court, field or studio to start taking bookings."
            ctaLabel="Add one"
            ctaHref={createHubPath("place")}
            testId="places-empty-state"
          />
        )}

        {!isLoading && !isError && items.length > 0 && (
          <>
            {open.length > 0 && (
              <section>
                <SectionHeader
                  title="Open places"
                  subtitle={`${open.length} place${open.length === 1 ? "" : "s"}`}
                />
                <div className="space-y-3">
                  {open.map((p) => (
                    <MyHubPlaceCard
                      key={p.id}
                      place={p}
                      onEdit={handleEdit}
                      onPostUpdate={handlePost}
                      onUpdatePhoto={handleUpdatePhoto}
                      onUpdateDescription={handleUpdateDescription}
                      onManageHighlights={handleManageHighlights}
                    />
                  ))}
                </div>
              </section>
            )}

            {closed.length > 0 && (
              <section>
                <SectionHeader
                  title="Temporarily closed"
                  subtitle={`${closed.length} place${closed.length === 1 ? "" : "s"}`}
                />
                <div className="space-y-3">
                  {closed.map((p) => (
                    <MyHubPlaceCard
                      key={p.id}
                      place={p}
                      onEdit={handleEdit}
                      onPostUpdate={handlePost}
                      onUpdatePhoto={handleUpdatePhoto}
                      onUpdateDescription={handleUpdateDescription}
                      onManageHighlights={handleManageHighlights}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <UpgradePromptCard
          title="Run your venue like a business"
          description="Booking calendar, recurring schedules, pricing tiers, promotions and lead pipeline live in SURNA Pro."
        />

        <div className="h-4" />
      </div>

      <EditPlaceSheet
        place={editTarget}
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditTarget(null);
        }}
      />
      <PostPlaceUpdateSheet
        place={postTarget}
        open={postOpen}
        onOpenChange={(o) => {
          setPostOpen(o);
          if (!o) setPostTarget(null);
        }}
      />
      <UpdatePlacePhotoSheet
        place={photoTarget}
        open={photoOpen}
        onOpenChange={(o) => {
          setPhotoOpen(o);
          if (!o) setPhotoTarget(null);
        }}
      />
      <UpdatePlaceDescriptionSheet
        place={descTarget}
        open={descOpen}
        onOpenChange={(o) => {
          setDescOpen(o);
          if (!o) setDescTarget(null);
        }}
      />
      <ManagePlaceHighlightsSheet
        place={highlightsTarget}
        open={highlightsOpen}
        onOpenChange={(o) => {
          setHighlightsOpen(o);
          if (!o) setHighlightsTarget(null);
        }}
      />
    </div>
  );
}
