import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { MyHubPlace } from "./MyHubPlaceCard";

interface Props {
  place: MyHubPlace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPlaceSheet({ place, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (place) {
      setName(place.name ?? "");
      setBio(place.bio ?? "");
      setCategory(place.category ?? "");
      setCity(place.city ?? "");
      setAddress(place.address ?? "");
      setPhone("");
    }
  }, [place]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!place) throw new Error("No place");
      const body: Record<string, unknown> = {};
      if (name.trim() && name !== place.name) body.name = name.trim();
      if (bio !== (place.bio ?? "")) body.bio = bio;
      if (category && category !== place.category) body.category = category;
      if (city !== (place.city ?? "")) body.city = city;
      if (address !== (place.address ?? "")) body.address = address;
      if (phone) body.phone = phone;
      const res = await apiRequest("PUT", `/api/places/${place.id}`, body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Place updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/places/me/owned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/places", place?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-hub/summary"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't update place",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surna-border)] max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surna-elevated)" }}
        data-testid="edit-place-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>
            Edit place basics
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-name" style={{ color: "var(--surna-text)" }}>Name</Label>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="edit-place-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-cat" style={{ color: "var(--surna-text)" }}>Category</Label>
            <Input
              id="p-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="gym, court, field, studio…"
              data-testid="edit-place-category"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-city" style={{ color: "var(--surna-text)" }}>City</Label>
            <Input
              id="p-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              data-testid="edit-place-city"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-addr" style={{ color: "var(--surna-text)" }}>Address</Label>
            <Input
              id="p-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              data-testid="edit-place-address"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-phone" style={{ color: "var(--surna-text)" }}>Phone</Label>
            <Input
              id="p-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Leave blank to keep current"
              data-testid="edit-place-phone"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-bio" style={{ color: "var(--surna-text)" }}>Description</Label>
            <Textarea
              id="p-bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              data-testid="edit-place-bio"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
              data-testid="edit-place-cancel"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !name.trim()}
              data-testid="edit-place-save"
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
          <p className="text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
            For pricing, hours, photo galleries and amenities, open the full
            management page from the place profile.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
