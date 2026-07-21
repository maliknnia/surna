import { isMessengerDemosEnabled } from "@/config/demoMode";
import { SHOWCASE_ATHLETES } from "@/lib/demoShowcase";

const [AISHA, ELENA] = SHOWCASE_ATHLETES;

export const DEMO_DM_CONVERSATIONS = [
  {
    id: "demo-dm-aisha",
    user_a: "demo",
    user_b: AISHA.id,
    last_message_at: new Date(Date.now() - 8 * 60000).toISOString(),
    other_user: {
      id: AISHA.id,
      firstName: AISHA.firstName,
      lastName: AISHA.lastName,
      email: `${AISHA.username}@demo.surna.app`,
      profileImageUrl: AISHA.profileImageUrl,
    },
    last_message: {
      body: "Pool lanes booked for 6am — see you there 🏊",
      created_at: new Date(Date.now() - 8 * 60000).toISOString(),
      sender_id: AISHA.id,
      kind: "text" as const,
    },
    unread_count: 1,
  },
  {
    id: "demo-dm-elena",
    user_a: "demo",
    user_b: ELENA.id,
    last_message_at: new Date(Date.now() - 45 * 60000).toISOString(),
    other_user: {
      id: ELENA.id,
      firstName: ELENA.firstName,
      lastName: ELENA.lastName,
      email: `${ELENA.username}@demo.surna.app`,
      profileImageUrl: ELENA.profileImageUrl,
    },
    last_message: {
      body: "Serve clinic spots are open — want the 7pm slot?",
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      sender_id: ELENA.id,
      kind: "text" as const,
    },
    unread_count: 0,
  },
];

export const DEMO_GROUP_CONVERSATIONS: typeof DEMO_DM_CONVERSATIONS = [];

export const DEMO_CHAT_MESSAGES: Record<
  string,
  Array<{
    id: string;
    conversation_id: string;
    sender_id: string;
    kind: string;
    body: string;
    media_id: null;
    created_at: string;
    senderName?: string;
  }>
> = {
  "demo-dm-aisha": [
    {
      id: "demo-aisha-1",
      conversation_id: "demo-dm-aisha",
      sender_id: AISHA.id,
      kind: "text",
      body: "Morning set went well — 2km at race pace.",
      media_id: null,
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      senderName: AISHA.firstName,
    },
    {
      id: "demo-aisha-2",
      conversation_id: "demo-dm-aisha",
      sender_id: "me",
      kind: "text",
      body: "Nice — I'll join tomorrow.",
      media_id: null,
      created_at: new Date(Date.now() - 90 * 60000).toISOString(),
    },
    {
      id: "demo-aisha-3",
      conversation_id: "demo-dm-aisha",
      sender_id: AISHA.id,
      kind: "text",
      body: "Pool lanes booked for 6am — see you there 🏊",
      media_id: null,
      created_at: new Date(Date.now() - 8 * 60000).toISOString(),
      senderName: AISHA.firstName,
    },
  ],
  "demo-dm-elena": [
    {
      id: "demo-elena-1",
      conversation_id: "demo-dm-elena",
      sender_id: ELENA.id,
      kind: "text",
      body: "Your toss height looked much cleaner in today's reps.",
      media_id: null,
      created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
      senderName: ELENA.firstName,
    },
    {
      id: "demo-elena-2",
      conversation_id: "demo-dm-elena",
      sender_id: ELENA.id,
      kind: "text",
      body: "Serve clinic spots are open — want the 7pm slot?",
      media_id: null,
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      senderName: ELENA.firstName,
    },
  ],
};

export const DEMO_GROUP_MESSAGES: Record<string, never> = {};

export function isDemoConversation(id: string): boolean {
  return id.startsWith("demo-");
}

/** Sample threads when inbox is empty — dev only unless VITE_MESSENGER_DEMOS=true. */
export function shouldShowMessengerDemos(realCount: number): boolean {
  return isMessengerDemosEnabled(realCount);
}

export function getDemoMessages(conversationId: string) {
  return DEMO_CHAT_MESSAGES[conversationId] || [];
}

export function getDemoGroupMessages(_groupId: string) {
  return [];
}
