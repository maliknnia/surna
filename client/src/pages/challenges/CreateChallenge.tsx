import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Trophy,
  ArrowLeft,
  User,
  Users,
  Target,
  MapPin,
  Award,
  ChevronRight,
  Eye,
  Lock,
  Mail,
  Zap,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ROUTES } from "@/navigation";
import { invalidateMyHubQueries } from "@/lib/hubQueries";
import { useChallengesTheme } from "./challengesTheme";
import { AccessRulesSummary } from "./ChallengeAccessInfo";
import type { ChallengeTypeKey, VisibilityKey } from "./challengesTheme";
import {
  CreateMediaSection,
  type CreateMediaValue,
} from "@/components/create/CreateMediaSection";
import { useHydrateCreateDraft } from "@/hooks/useHydrateCreateDraft";

const createChallengeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.enum(["solo", "player1v1", "teamVsTeam", "open"]),
  sport: z.string().min(1, "Please select a sport"),
  opponentType: z.enum(["user", "team"]).optional(),
  opponentId: z.string().optional(),
  rules: z.string().optional(),
  visibility: z.enum(["public", "private", "invite"]).default("public"),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  locationLat: z.string().optional(),
  locationLng: z.string().optional(),
  locationAddress: z.string().optional(),
  entryFeeAmount: z.string().optional(),
  entryFeeCurrency: z.enum(["EUR", "USD", "GBP"]).optional(),
  reward: z.enum(["xp", "badge", "cash", "none"]).default("xp"),
  capacity: z.string().optional(),
});

type CreateChallengeFormValues = z.infer<typeof createChallengeSchema>;

const SPORTS = [
  "Basketball",
  "Soccer",
  "Tennis",
  "Volleyball",
  "Baseball",
  "Cricket",
  "Rugby",
  "Golf",
  "Swimming",
  "Running",
  "Cycling",
  "Badminton",
  "Table Tennis",
  "Hockey",
  "Other",
];

const challengeTypes = [
  { value: "solo", label: "Solo", icon: Target, desc: "Personal goal" },
  { value: "player1v1", label: "1v1", icon: User, desc: "Head to head" },
  { value: "teamVsTeam", label: "Teams", icon: Users, desc: "Squad battle" },
  { value: "open", label: "Open", icon: Trophy, desc: "Anyone can join" },
] as const;

const rewardOptions = [
  { value: "xp", label: "XP", icon: Zap },
  { value: "badge", label: "Badge", icon: Award },
  { value: "cash", label: "Cash", icon: Trophy },
  { value: "none", label: "None", icon: Target },
] as const;

const visibilityOptions = [
  { value: "public", label: "Public", icon: Eye, desc: "Shows in Nearby — anyone can discover" },
  { value: "invite", label: "Invite only", icon: Mail, desc: "Only your invitee can accept" },
  { value: "private", label: "Private", icon: Lock, desc: "Hidden from Nearby & feed" },
] as const;

export default function CreateChallenge() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const t = useChallengesTheme();
  const [step, setStep] = useState(1);
  const [coverMedia, setCoverMedia] = useState<CreateMediaValue>(null);

  const form = useForm<CreateChallengeFormValues>({
    resolver: zodResolver(createChallengeSchema),
    defaultValues: {
      title: "",
      type: "player1v1",
      sport: "",
      visibility: "public",
      reward: "xp",
    },
  });

  useHydrateCreateDraft({
    onCover: setCoverMedia,
    onTitle: (title) => form.setValue("title", title),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const opponentId = params.get("opponentId") || params.get("opponent");
    const opponentType = params.get("opponentType") as "user" | "team" | null;
    if (!opponentId) return;
    form.setValue("opponentId", opponentId);
    form.setValue("opponentType", opponentType === "team" ? "team" : "user");
    form.setValue("visibility", "invite");
    form.setValue("type", opponentType === "team" ? "teamVsTeam" : "player1v1");
  }, [form]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateChallengeFormValues) => {
      const payload: Record<string, unknown> = {
        title: data.title,
        type: data.type,
        sport: data.sport,
        rules: data.rules,
        visibility: data.visibility,
        reward: data.reward,
      };
      if (data.opponentId && data.opponentType) {
        payload.opponentId = data.opponentId;
        payload.opponentType = data.opponentType;
      }
      if (data.timeStart) payload.timeStart = data.timeStart;
      if (data.timeEnd) payload.timeEnd = data.timeEnd;
      if (data.locationLat && data.locationLng) {
        payload.location = {
          lat: parseFloat(data.locationLat),
          lng: parseFloat(data.locationLng),
          address: data.locationAddress,
        };
      }
      if (data.entryFeeAmount && data.entryFeeCurrency) {
        payload.entryFee = {
          amount: parseFloat(data.entryFeeAmount),
          currency: data.entryFeeCurrency,
        };
      }
      if (data.capacity) payload.capacity = parseInt(data.capacity, 10);
      const response = await apiRequest("POST", "/api/competitive-challenges", payload);
      return response.json();
    },
    onSuccess: async (data: { id: string }) => {
      await invalidateMyHubQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["challenges-list"] });
      toast({
        title: "Challenge created!",
        description: "Manage all your challenges from the hub.",
      });
      navigate(`${ROUTES.challenges}?tab=mine`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create challenge",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateChallengeFormValues) => createMutation.mutate(data);
  const selectedType = form.watch("type") as ChallengeTypeKey;
  const selectedVisibility = form.watch("visibility") as VisibilityKey;
  const opponentId = form.watch("opponentId");

  const handleNext = async () => {
    const fields =
      step === 1 ? ["title", "type", "sport"] : step === 2 ? ["rules", "timeStart", "locationAddress"] : [];
    const isValid = await form.trigger(fields as (keyof CreateChallengeFormValues)[]);
    if (isValid) setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const labelStyle = { color: t.label };
  const inputStyle = {
    background: t.inputBg,
    borderRadius: 14,
    padding: "14px 16px",
    height: "auto" as const,
    border: `1px solid ${t.cardBorder}`,
    color: t.textPrimary,
  };

  return (
    <div className="min-h-screen" style={{ background: t.pageBg }}>
      <header
        className="sticky top-0 z-10 px-4 pt-3 pb-3"
        style={{
          background: t.headerBg,
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/challenges")}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: t.iconBtnBg }}
          >
            <ArrowLeft size={18} style={{ color: t.iconAccent }} />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold" style={{ color: t.textPrimary }}>
              New Challenge
            </h1>
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Step {step} of 3
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 mt-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex-1 h-0.5 rounded-full"
              style={{ background: s <= step ? t.ctaBg : t.chipBg }}
            />
          ))}
        </div>
      </header>

      <main className="px-4 py-5 pb-28 max-w-lg mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {step === 1 && (
              <div className="space-y-5">
                <CreateMediaSection
                  cover={coverMedia}
                  onCoverChange={setCoverMedia}
                  coverLabel="Challenge cover"
                  coverHint="Shows on challenge cards when athletes browse nearby matches."
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-wider" style={labelStyle}>
                        Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Weekend tennis showdown"
                          {...field}
                          className="border-0 text-[15px] font-medium"
                          style={inputStyle}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-wider" style={labelStyle}>
                        Type
                      </FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {challengeTypes.map((type) => {
                          const isActive = field.value === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => field.onChange(type.value)}
                              className="flex flex-col items-center gap-1 py-4 rounded-2xl transition-all active:scale-95"
                              style={{
                                background: isActive ? t.elevated : t.cardBg,
                                border: `2px solid ${isActive ? t.ctaBg : t.cardBorder}`,
                              }}
                            >
                              <type.icon
                                size={22}
                                style={{ color: isActive ? t.iconAccent : t.iconMuted }}
                              />
                              <span
                                className="text-[13px] font-semibold"
                                style={{ color: isActive ? t.textPrimary : t.textSecondary }}
                              >
                                {type.label}
                              </span>
                              <span className="text-[10px]" style={{ color: t.textMuted }}>
                                {type.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-wider" style={labelStyle}>
                        Sport
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-0 text-[14px]" style={inputStyle}>
                            <SelectValue placeholder="Select a sport" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SPORTS.map((sport) => (
                            <SelectItem key={sport} value={sport}>
                              {sport}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {opponentId && (
                  <p
                    className="text-[12px] px-3 py-2 rounded-xl"
                    style={{ background: t.elevated, color: t.textSecondary }}
                  >
                    Challenging a specific {form.watch("opponentType") === "team" ? "team" : "player"} — invite only.
                  </p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="rules"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-wider" style={labelStyle}>
                        Rules (optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Format, scoring, equipment..."
                          {...field}
                          className="border-0 text-[14px] min-h-[100px]"
                          style={{ ...inputStyle, padding: "14px 16px" }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="timeStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-semibold uppercase tracking-wider" style={labelStyle}>
                          Start
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} className="border-0 text-[13px]" style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-semibold uppercase tracking-wider" style={labelStyle}>
                          End
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} className="border-0 text-[13px]" style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="locationAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-[12px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                        style={labelStyle}
                      >
                        <MapPin size={12} /> Location (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Venue or address"
                          {...field}
                          className="border-0 text-[14px]"
                          style={inputStyle}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="reward"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-wider" style={labelStyle}>
                        Reward
                      </FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {rewardOptions.map((opt) => {
                          const isActive = field.value === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className="flex items-center gap-2.5 py-3 px-4 rounded-2xl transition-all active:scale-95"
                              style={{
                                background: isActive ? t.elevated : t.cardBg,
                                border: `2px solid ${isActive ? t.ctaBg : t.cardBorder}`,
                              }}
                            >
                              <opt.icon
                                size={18}
                                style={{ color: isActive ? t.iconAccent : t.iconMuted }}
                              />
                              <span
                                className="text-[13px] font-semibold"
                                style={{ color: isActive ? t.textPrimary : t.textSecondary }}
                              >
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-wider" style={labelStyle}>
                        Who can see this
                      </FormLabel>
                      <div className="space-y-2">
                        {visibilityOptions.map((opt) => {
                          const isActive = field.value === opt.value;
                          const disabled =
                            selectedType === "solo" && opt.value === "public";
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={disabled}
                              onClick={() => !disabled && field.onChange(opt.value)}
                              className="w-full flex items-center gap-3 py-3 px-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40"
                              style={{
                                background: isActive ? t.elevated : t.cardBg,
                                border: `2px solid ${isActive ? t.ctaBg : t.cardBorder}`,
                              }}
                            >
                              <opt.icon
                                size={18}
                                style={{ color: isActive ? t.iconAccent : t.iconMuted }}
                              />
                              <div className="text-left">
                                <span
                                  className="text-[13px] font-semibold block"
                                  style={{ color: isActive ? t.textPrimary : t.textSecondary }}
                                >
                                  {opt.label}
                                </span>
                                <span className="text-[11px]" style={{ color: t.textMuted }}>
                                  {opt.desc}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <AccessRulesSummary type={selectedType} visibility={selectedVisibility} />

                {selectedType === "open" && (
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-semibold uppercase tracking-wider" style={labelStyle}>
                          Max participants
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 20"
                            {...field}
                            className="border-0 text-[14px]"
                            style={inputStyle}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.97]"
                  style={{ background: t.secondaryBtnBg, color: t.secondaryBtnText }}
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.97]"
                  style={{ background: t.ctaBg, color: t.ctaText }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
                  style={{ background: t.ctaBg, color: t.ctaText }}
                >
                  {createMutation.isPending ? "Creating..." : "Create Challenge"}
                  {!createMutation.isPending && <ChevronRight size={16} />}
                </button>
              )}
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
