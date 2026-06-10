import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Camera,
  FileText,
  Globe,
  Lock,
  Shield,
  Trophy,
  Target,
  Zap,
  Plus,
  X,
  Upload,
  Link2,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Team, User } from "@shared/schema";

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  sport: z.string().min(1, "Please select a sport"),
  eventType: z.string().min(1, "Please select an event type"),
  eventDate: z.string().min(1, "Please select a date"),
  eventTime: z.string().min(1, "Please select a time"),
  location: z.string().min(1, "Please enter a location"),
  maxParticipants: z.number().min(1, "Must allow at least 1 participant").optional(),
  registrationFee: z.number().min(0, "Fee cannot be negative").optional(),
  skillLevel: z.string().min(1, "Please select a skill level"),
  visibility: z.enum(["public", "private", "team_only"]),
  requiresApproval: z.boolean(),
  allowWaitlist: z.boolean(),
  teamId: z.string().optional(),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed"),
  equipmentProvided: z.array(z.string()),
  equipmentRequired: z.array(z.string()),
  rules: z.string().optional(),
  prizes: z.string().optional(),
  sponsorshipLevel: z.enum(["none", "bronze", "silver", "gold"]).optional(),
  livestreamUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  recordingAllowed: z.boolean(),
  photoPermission: z.boolean(),
});

type EventFormData = z.infer<typeof eventSchema>;

const SPORTS_LIST = [
  "Basketball", "Soccer", "Tennis", "Volleyball", "Baseball", "Softball",
  "Football", "Track & Field", "Swimming", "Golf", "Hockey", "Lacrosse",
  "Wrestling", "Boxing", "MMA", "Cycling", "Running", "CrossFit", "Yoga"
];

const EVENT_TYPES = [
  { value: "practice", label: "Practice Session" },
  { value: "scrimmage", label: "Scrimmage/Friendly" },
  { value: "tournament", label: "Tournament" },
  { value: "league", label: "League Game" },
  { value: "championship", label: "Championship" },
  { value: "clinic", label: "Training Clinic" },
  { value: "workshop", label: "Workshop" },
  { value: "camp", label: "Sports Camp" },
  { value: "social", label: "Social Event" },
  { value: "fundraiser", label: "Fundraiser" },
];

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "all", label: "All Levels" },
  { value: "competitive", label: "Competitive Only" },
];

export default function EventCreation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Get user's teams for team-only events
  const { data: userTeams } = useQuery<Team[]>({
    queryKey: ["/api/teams/my-teams"],
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      visibility: "public",
      requiresApproval: false,
      allowWaitlist: true,
      tags: [],
      equipmentProvided: [],
      equipmentRequired: [],
      sponsorshipLevel: "none",
      recordingAllowed: true,
      photoPermission: true,
    },
  });

  const createEvent = useMutation({
    mutationFn: async (data: EventFormData) => {
      const formData = new FormData();
      
      // Add form data
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined) {
          formData.append(key, String(value));
        }
      });

      // Add image if uploaded
      if (eventImage) {
        formData.append("eventImage", eventImage);
      }

      return apiRequest("POST", "/api/events", formData);
    },
    onSuccess: () => {
      toast({
        title: "Event Created! 🎉",
        description: "Your event has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setLocation("/events");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEventImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTag = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    if (!currentTags.includes(tag) && currentTags.length < 10) {
      form.setValue("tags", [...currentTags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const addEquipment = (type: "provided" | "required", item: string) => {
    const field = type === "provided" ? "equipmentProvided" : "equipmentRequired";
    const currentItems = form.getValues(field) || [];
    if (!currentItems.includes(item)) {
      form.setValue(field, [...currentItems, item]);
    }
  };

  const removeEquipment = (type: "provided" | "required", itemToRemove: string) => {
    const field = type === "provided" ? "equipmentProvided" : "equipmentRequired";
    const currentItems = form.getValues(field) || [];
    form.setValue(field, currentItems.filter(item => item !== itemToRemove));
  };

  const onSubmit = (data: EventFormData) => {
    createEvent.mutate(data);
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-token-text">Create Event</h1>
            <p className="text-token-text">
              Set up your sports event with all the details
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/events")}
            data-testid="cancel-create-event"
          >
            Cancel
          </Button>
        </div>

        {/* Progress Steps */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {[
                { step: 1, title: "Basic Info", icon: FileText },
                { step: 2, title: "Details", icon: Settings },
                { step: 3, title: "Equipment", icon: Target },
                { step: 4, title: "Settings", icon: Shield },
              ].map(({ step, title, icon: Icon }) => (
                <div key={step} className="flex items-center space-x-2">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= step 
                      ? "bg-transparent border border-border text-token-text" 
                      : "bg-background text-token-text"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm ${
                    currentStep >= step 
                      ? "font-medium text-token-text" 
                      : "text-token-text"
                  }`}>
                    {title}
                  </span>
                  {step < 4 && (
                    <div className={`w-12 h-px mx-4 ${
                      currentStep > step 
                        ? "bg-transparent border border-border" 
                        : "bg-background"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Basic Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Event Title *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Weekly Basketball Scrimmage" 
                              {...field} 
                              data-testid="event-title-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sport *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="sport-select">
                                <SelectValue placeholder="Select a sport" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SPORTS_LIST.map((sport) => (
                                <SelectItem key={sport} value={sport.toLowerCase()}>
                                  {sport}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="event-type-select">
                                <SelectValue placeholder="Select event type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EVENT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="eventDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              data-testid="event-date-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="eventTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time *</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field} 
                              data-testid="event-time-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Location *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Central Park Basketball Courts" 
                              {...field} 
                              data-testid="event-location-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your event, what to expect, and any important details..."
                            className="min-h-[120px]"
                            {...field}
                            data-testid="event-description-textarea"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Event Image Upload */}
                  <div>
                    <Label>Event Image</Label>
                    <div className="mt-2 bg-transparent border border-border rounded-lg p-6">
                      {imagePreview ? (
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Event preview" 
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setEventImage(null);
                              setImagePreview(null);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Camera className="mx-auto h-12 w-12 text-token-text" />
                          <div className="mt-2">
                            <Button type="button" variant="outline" asChild>
                              <label htmlFor="event-image">
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Image
                              </label>
                            </Button>
                            <input
                              id="event-image"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              data-testid="event-image-upload"
                            />
                          </div>
                          <p className="mt-1 text-sm text-token-text">
                            PNG, JPG, GIF up to 10MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Event Details */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>Event Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="skillLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skill Level *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select skill level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SKILL_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxParticipants"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Participants</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Leave empty for unlimited"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="registrationFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Fee ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormDescription>
                            Leave empty for free events
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Associated Team</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a team (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No team association</SelectItem>
                              {userTeams?.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <Label>Event Tags</Label>
                    <div className="space-y-3">
                      <Input 
                        placeholder="Type a tag and press Enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const target = e.target as HTMLInputElement;
                            if (target.value.trim()) {
                              addTag(target.value.trim());
                              target.value = "";
                            }
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {form.watch("tags")?.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="pr-1">
                            {tag}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-1 h-auto p-0.5"
                              onClick={() => removeTag(tag)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Competition Details */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5 text-token-text" />
                      <Label className="text-base font-medium">Competition Details</Label>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="rules"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rules & Guidelines</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the rules, format, and any special guidelines..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="prizes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prizes & Awards</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe prizes, trophies, or recognition for participants..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Equipment & Requirements */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>Equipment & Requirements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Equipment Provided */}
                  <div>
                    <Label>Equipment Provided</Label>
                    <p className="text-sm text-foreground mb-3">
                      Equipment that will be available at the event
                    </p>
                    <div className="space-y-3">
                      <Input 
                        placeholder="Type equipment item and press Enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const target = e.target as HTMLInputElement;
                            if (target.value.trim()) {
                              addEquipment("provided", target.value.trim());
                              target.value = "";
                            }
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {form.watch("equipmentProvided")?.map((item, index) => (
                          <Badge key={index} variant="secondary" className="pr-1">
                            {item}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-1 h-auto p-0.5"
                              onClick={() => removeEquipment("provided", item)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Equipment Required */}
                  <div>
                    <Label>Equipment Required</Label>
                    <p className="text-sm text-foreground mb-3">
                      Equipment that participants must bring
                    </p>
                    <div className="space-y-3">
                      <Input 
                        placeholder="Type required equipment and press Enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const target = e.target as HTMLInputElement;
                            if (target.value.trim()) {
                              addEquipment("required", target.value.trim());
                              target.value = "";
                            }
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {form.watch("equipmentRequired")?.map((item, index) => (
                          <Badge key={index} variant="outline" className="pr-1">
                            {item}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-1 h-auto p-0.5"
                              onClick={() => removeEquipment("required", item)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Event Settings */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Event Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Visibility & Access */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-token-text" />
                      <Label className="text-base font-medium">Visibility & Access</Label>
                    </div>

                    <FormField
                      control={form.control}
                      name="visibility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Visibility</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-1 gap-4"
                            >
                              <div className="flex items-center space-x-3 rounded-lg p-4">
                                <RadioGroupItem value="public" id="public" />
                                <div className="flex-1">
                                  <Label htmlFor="public" className="font-medium">Public Event</Label>
                                  <p className="text-sm text-foreground">Anyone can see and join this event</p>
                                </div>
                                <Globe className="w-5 h-5 text-token-text" />
                              </div>
                              <div className="flex items-center space-x-3 rounded-lg p-4">
                                <RadioGroupItem value="private" id="private" />
                                <div className="flex-1">
                                  <Label htmlFor="private" className="font-medium">Private Event</Label>
                                  <p className="text-sm text-foreground">Only invited users can see and join</p>
                                </div>
                                <Lock className="w-5 h-5 text-token-text" />
                              </div>
                              <div className="flex items-center space-x-3 rounded-lg p-4">
                                <RadioGroupItem value="team_only" id="team_only" />
                                <div className="flex-1">
                                  <Label htmlFor="team_only" className="font-medium">Team Only</Label>
                                  <p className="text-sm text-foreground">Only team members can see and join</p>
                                </div>
                                <Users className="w-5 h-5 text-token-text" />
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="requiresApproval"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Require Approval</FormLabel>
                              <FormDescription>
                                Manually approve participants
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="allowWaitlist"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Allow Waitlist</FormLabel>
                              <FormDescription>
                                Enable waitlist when full
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Media & Recording */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-5 h-5 text-token-text" />
                      <Label className="text-base font-medium">Media & Recording</Label>
                    </div>

                    <FormField
                      control={form.control}
                      name="livestreamUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Livestream URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://youtube.com/live/..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional link to live stream the event
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recordingAllowed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Recording Allowed</FormLabel>
                              <FormDescription>
                                Allow video recording
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="photoPermission"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Photo Permission</FormLabel>
                              <FormDescription>
                                Allow photography
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                data-testid="prev-step-button"
              >
                Previous
              </Button>

              <div className="flex space-x-2">
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    data-testid="next-step-button"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createEvent.isPending}
                    className="bg-gradient-to-r from-black to-neutral-700 hover:opacity-90 text-foreground"
                    data-testid="create-event-submit"
                  >
                    {createEvent.isPending ? "Creating..." : "Create Event"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}