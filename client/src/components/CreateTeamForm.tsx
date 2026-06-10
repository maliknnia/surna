import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { insertTeamSchema, type InsertTeam } from "@shared/schema";
import { 
  Users, 
  Trophy, 
  Target, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  Upload,
  Mail,
  UserPlus,
  Calendar,
  MapPin,
  Clock
} from "lucide-react";

interface CreateTeamFormProps {
  onSuccess?: (team: any) => void;
  onCancel?: () => void;
}

interface ExtendedTeamData {
  name: string;
  description?: string;
  sport: string;
  skillLevel?: string;
  isPrivate?: boolean;
  location?: string;
  goals?: string;
  rules?: string;
  meetingFrequency?: string;
  inviteEmails?: string[];
}

const sports = [
  { name: "Basketball", emoji: "🏀" },
  { name: "Soccer", emoji: "⚽" },
  { name: "Tennis", emoji: "🎾" },
  { name: "Swimming", emoji: "🏊" },
  { name: "Running", emoji: "🏃" },
  { name: "Cycling", emoji: "🚴" },
  { name: "Baseball", emoji: "⚾" },
  { name: "Football", emoji: "🏈" },
  { name: "Volleyball", emoji: "🏐" },
  { name: "Hockey", emoji: "🏒" },
  { name: "Golf", emoji: "⛳" },
  { name: "Boxing", emoji: "🥊" },
];

const skillLevels = [
  { level: "Beginner", description: "Just starting out", color: "bg-transparent border border-border text-token-text" },
  { level: "Intermediate", description: "Some experience", color: "bg-transparent border border-border text-token-text" },
  { level: "Advanced", description: "Very experienced", color: "bg-transparent border border-border text-token-text" },
  { level: "Professional", description: "Competitive level", color: "bg-transparent border border-border text-token-text" },
];

const meetingFrequencies = [
  "Weekly", "Bi-weekly", "Monthly", "As needed", "Daily"
];

const steps = [
  { id: 1, title: "Basic Info", icon: Users, description: "Name and sport" },
  { id: 2, title: "Team Details", icon: Trophy, description: "Description and settings" },
  { id: 3, title: "Goals & Rules", icon: Target, description: "Team objectives" },
  { id: 4, title: "Setup Complete", icon: Check, description: "Review and create" },
];

export default function CreateTeamForm({ onSuccess, onCancel }: CreateTeamFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ExtendedTeamData>({
    name: "",
    description: "",
    sport: "",
    skillLevel: "",
    isPrivate: false,
    goals: "",
    rules: "",
    meetingFrequency: "",
    location: "",
    inviteEmails: [],
  });
  const { toast } = useToast();

  const form = useForm<ExtendedTeamData>({
    resolver: zodResolver(insertTeamSchema.extend({
      goals: insertTeamSchema.shape.description.optional(),
      rules: insertTeamSchema.shape.description.optional(),
      meetingFrequency: insertTeamSchema.shape.description.optional(),
      location: insertTeamSchema.shape.description.optional(),
    })),
    defaultValues: formData,
  });

  const progress = (currentStep / steps.length) * 100;

  const nextStep = () => {
    if (currentStep < steps.length) {
      const currentValues = form.getValues();
      setFormData({ ...formData, ...currentValues });
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: ExtendedTeamData) => {
    setLoading(true);
    try {
      // Extract only the fields that exist in the database schema
      const teamData: any = {
        name: data.name,
        description: data.description,
        sport: data.sport,
        location: data.location,
        isPublic: !data.isPrivate,
      };

      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(teamData),
        credentials: "include",
      });

      if (response.ok) {
        const team = await response.json();
        toast({
          title: "Team Created! 🎉",
          description: `${data.name} team has been created successfully.`,
        });
        onSuccess?.(team);
        form.reset();
        setCurrentStep(1);
        setFormData({
          name: "",
          description: "",
          sport: "",
          skillLevel: "",
          isPrivate: false,
          goals: "",
          rules: "",
          meetingFrequency: "",
          location: "",
          inviteEmails: [],
        });
      } else {
        throw new Error("Failed to create team");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Let's Start Your Team</h3>
              <p className="text-token-text">Choose a name and sport to get started</p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">Team Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Thunder Hawks, City Runners, Elite Squad"
                      className="text-lg p-4 h-14"
                      {...field} 
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
                  <FormLabel className="text-lg font-semibold">Sport *</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {sports.map((sport) => (
                        <Button
                          key={sport.name}
                          type="button"
                          variant={field.value === sport.name ? "default" : "outline"}
                          onClick={() => field.onChange(sport.name)}
                          className="h-16 flex flex-col gap-1"
                        >
                          <span className="text-2xl">{sport.emoji}</span>
                          <span className="text-sm">{sport.name}</span>
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skillLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">Skill Level *</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      {skillLevels.map((level) => (
                        <Button
                          key={level.level}
                          type="button"
                          variant={field.value === level.level ? "default" : "outline"}
                          onClick={() => field.onChange(level.level)}
                          className="w-full justify-between h-auto p-4"
                        >
                          <div className="text-left">
                            <div className="font-semibold">{level.level}</div>
                            <div className="text-sm opacity-70">{level.description}</div>
                          </div>
                          <Badge className={level.color}>{level.level}</Badge>
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Team Details</h3>
              <p className="text-token-text">Tell others about your team</p>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">Team Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your team's purpose, what you're looking for in members, and what makes your team special..."
                      className="min-h-32 text-base"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="meetingFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Meeting Frequency
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="How often?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {meetingFrequencies.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Primary Location
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="City or venue name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isPrivate"
              render={({ field }) => (
                <FormItem>
                  <div className="bg-transparent border border-border rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-2">
                        <FormLabel className="text-base font-semibold">
                          Private Team
                        </FormLabel>
                        <p className="text-sm text-token-text">
                          Private teams require approval to join and won't appear in public searches. 
                          Members can only join by invitation.
                        </p>
                      </div>
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Goals & Culture</h3>
              <p className="text-token-text">Set expectations for your team</p>
            </div>

            <FormField
              control={form.control}
              name="goals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Team Goals
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What does your team want to achieve? (e.g., compete in local tournaments, improve fitness, have fun playing together...)"
                      className="min-h-24"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rules"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Team Guidelines
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any rules or expectations for team members? (e.g., commitment level, behavior standards, attendance requirements...)"
                      className="min-h-24"
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="bg-transparent border border-border rounded-lg p-4">
              <h4 className="font-semibold text-token-text mb-2">💡 Pro Tips</h4>
              <ul className="text-sm text-token-text space-y-1">
                <li>• Clear goals help attract the right members</li>
                <li>• Set realistic expectations about time commitment</li>
                <li>• Include both competitive and social aspects</li>
                <li>• Be welcoming to different skill levels within your range</li>
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-transparent border border-border rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-token-text" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Ready to Launch!</h3>
              <p className="text-token-text">Review your team details before creating</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-bold">{form.getValues("name")}</h4>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {sports.find(s => s.name === form.getValues("sport"))?.emoji} {form.getValues("sport")}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-token-text">Skill Level:</span>
                      <p className="font-semibold">{form.getValues("skillLevel")}</p>
                    </div>
                    <div>
                      <span className="text-token-text">Privacy:</span>
                      <p className="font-semibold">{form.getValues("isPrivate") ? "Private" : "Public"}</p>
                    </div>
                  </div>

                  {form.getValues("description") && (
                    <div>
                      <span className="text-token-text text-sm">Description:</span>
                      <p className="text-sm mt-1">{form.getValues("description")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="bg-transparent border border-border rounded-lg p-4">
              <h4 className="font-semibold text-token-text mb-2">🎉 What happens next?</h4>
              <ul className="text-sm text-token-text space-y-1">
                <li>• Your team will be created and you'll be the team owner</li>
                <li>• You can start inviting members immediately</li>
                <li>• Others can discover and join your team (if public)</li>
                <li>• You can schedule events and manage team activities</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold">Create Your Team</h2>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              ✕
            </Button>
          )}
        </div>
        
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex flex-col items-center space-y-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted 
                      ? 'bg-transparent border border-border text-token-text' 
                      : isActive 
                        ? 'bg-transparent border border-border text-token-text' 
                        : 'bg-background text-token-text'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-medium ${isActive ? 'text-token-text' : 'text-token-text'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form content */}
      <Card>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {renderStepContent()}
              
              {/* Navigation buttons */}
              <div className="flex justify-between mt-8 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2"
                    disabled={
                      (currentStep === 1 && (!form.getValues("name") || !form.getValues("sport") || !form.getValues("skillLevel"))) ||
                      (currentStep === 2 && !form.getValues("description"))
                    }
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-transparent border border-border text-token-text hover:bg-background"
                  >
                    {loading ? "Creating..." : "Create Team"}
                    <Trophy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}