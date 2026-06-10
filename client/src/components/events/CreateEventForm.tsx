// client/src/components/events/CreateEventForm.tsx
import { useState } from "react";
import { useCreateEvent } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, MapPin, Users, Globe, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function CreateEventForm({ onCancel }: { onCancel?: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const [, setCreatedGroupId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    location: "",
    visibility: "public" as "public" | "private" | "unlisted",
    capacity: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title || !form.startsAt || !form.endsAt) {
      toast({
        title: "Missing required fields",
        description: "Please fill in title, start time, and end time.",
        variant: "destructive",
      });
      return;
    }

    const startsAt = new Date(form.startsAt);
    const endsAt = new Date(form.endsAt);
    
    if (endsAt <= startsAt) {
      toast({
        title: "Invalid dates",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    try {
      const eventData = {
        title: form.title,
        description: form.description || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        location: form.location || undefined,
        visibility: form.visibility,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };

      const createdEvent = await createEvent.mutateAsync(eventData);

      try {
        const creatorId = (user as any)?.id;
        const groupResponse = await apiRequest("POST", "/api/messenger/groups", {
          name: form.title,
          memberIds: creatorId ? [creatorId] : [],
          eventId: (createdEvent as any)?.id,
        });
        const groupData = await groupResponse.json();
        setCreatedGroupId(groupData?.id || null);
      } catch {
        // Non-blocking: event creation succeeds even if chat bootstrap fails.
      }
      
      toast({
        title: "Event created! 🎉",
        description: `"${form.title}" has been successfully created.`,
      });

      // Reset form
      setForm({
        title: "",
        description: "",
        startsAt: "",
        endsAt: "",
        location: "",
        visibility: "public",
        capacity: "",
      });

      onCancel?.();
    } catch (error: any) {
      toast({
        title: "Failed to create event",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <CardTitle className="text-2xl font-bold">Create New Event</CardTitle>
            <p className="text-token-text-secondary mt-1">Bring your community together around sports</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Event Title *
            </Label>
            <Input
              id="title"
              placeholder="e.g., Saturday Morning Basketball"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              data-testid="create-event-title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Tell people about your event..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              data-testid="create-event-description"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startsAt" className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Starts At *
              </Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                required
                data-testid="create-event-starts-at"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endsAt" className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Ends At *
              </Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                required
                data-testid="create-event-ends-at"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </Label>
            <Input
              id="location"
              placeholder="e.g., Central Park Basketball Courts"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              data-testid="create-event-location"
            />
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity" className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Capacity (optional)
              </Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                placeholder="e.g., 20"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                data-testid="create-event-capacity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility" className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Visibility
              </Label>
              <Select
                value={form.visibility}
                onValueChange={(value: "public" | "private" | "unlisted") => 
                  setForm({ ...form, visibility: value })
                }
              >
                <SelectTrigger data-testid="create-event-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Anyone can see</SelectItem>
                  <SelectItem value="unlisted">Unlisted - Only with link</SelectItem>
                  <SelectItem value="private">Private - Invite only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={createEvent.isPending}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-token-text"
              data-testid="create-event-submit"
            >
              {createEvent.isPending ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}