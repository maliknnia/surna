export const DEMO_DM_CONVERSATIONS = [
  {
    id: 'demo-dm-1',
    user_a: 'demo',
    user_b: 'demo-sarah',
    last_message_at: new Date(Date.now() - 2 * 60000).toISOString(),
    other_user: {
      id: 'demo-sarah',
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah@surna.com',
      profileImageUrl: '',
    },
    last_message: {
      body: 'See you at practice tomorrow! 🏀',
      created_at: new Date(Date.now() - 2 * 60000).toISOString(),
      sender_id: 'demo-sarah',
      kind: 'text' as const,
    },
    unread_count: 2,
  },
  {
    id: 'demo-dm-2',
    user_a: 'demo',
    user_b: 'demo-marcus',
    last_message_at: new Date(Date.now() - 15 * 60000).toISOString(),
    other_user: {
      id: 'demo-marcus',
      firstName: 'Marcus',
      lastName: 'Johnson',
      email: 'marcus@surna.com',
      profileImageUrl: '',
    },
    last_message: {
      body: '🎵 Voice message',
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
      sender_id: 'demo-marcus',
      kind: 'audio' as const,
    },
    unread_count: 1,
  },
  {
    id: 'demo-dm-3',
    user_a: 'demo',
    user_b: 'demo-coach',
    last_message_at: new Date(Date.now() - 45 * 60000).toISOString(),
    other_user: {
      id: 'demo-coach',
      firstName: 'Coach',
      lastName: 'Rodriguez',
      email: 'coach@surna.com',
      profileImageUrl: '',
    },
    last_message: {
      body: 'Great job on the drills today, keep pushing!',
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      sender_id: 'demo-coach',
      kind: 'text' as const,
    },
    unread_count: 0,
  },
  {
    id: 'demo-dm-4',
    user_a: 'demo',
    user_b: 'demo-alex',
    last_message_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    other_user: {
      id: 'demo-alex',
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'alex@surna.com',
      profileImageUrl: '',
    },
    last_message: {
      body: 'You: Just sent the game highlights 📸',
      created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
      sender_id: 'me',
      kind: 'text' as const,
    },
    unread_count: 0,
  },
  {
    id: 'demo-dm-5',
    user_a: 'demo',
    user_b: 'demo-jordan',
    last_message_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    other_user: {
      id: 'demo-jordan',
      firstName: 'Jordan',
      lastName: 'Williams',
      email: 'jordan@surna.com',
      profileImageUrl: '',
    },
    last_message: {
      body: 'Challenge accepted! See you Saturday 💪',
      created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
      sender_id: 'demo-jordan',
      kind: 'text' as const,
    },
    unread_count: 0,
  },
];

export const DEMO_GROUP_CONVERSATIONS = [
  {
    id: 'demo-group-1',
    name: 'Lakers Pickup Crew',
    description: 'Weekend basketball games at LA Fitness',
    owner_id: 'demo-sarah',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    member_count: 12,
    last_message: {
      body: 'Game on Saturday at 3pm confirmed!',
      created_at: new Date(Date.now() - 30 * 60000).toISOString(),
      sender_id: 'demo-sarah',
      kind: 'text' as const,
    },
    unread_count: 5,
    role: 'member',
  },
  {
    id: 'demo-group-2',
    name: 'Morning Run Club',
    description: '5K daily grind. No excuses.',
    owner_id: 'demo-coach',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    member_count: 28,
    last_message: {
      body: 'New PB! 21:32 on the 5K 🔥',
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      sender_id: 'demo-alex',
      kind: 'text' as const,
    },
    unread_count: 3,
    role: 'admin',
  },
  {
    id: 'demo-group-3',
    name: 'Team Thunder',
    description: 'Official team chat',
    owner_id: 'me',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    member_count: 8,
    last_message: {
      body: '🎵 Voice message',
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
      sender_id: 'demo-marcus',
      kind: 'audio' as const,
    },
    unread_count: 0,
    role: 'owner',
  },
];

export const DEMO_CHAT_MESSAGES: Record<string, Array<{
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: 'text' | 'audio';
  body: string;
  media_id: string | null;
  created_at: string;
}>> = {
  'demo-dm-1': [
    {
      id: 'msg-1',
      conversation_id: 'demo-dm-1',
      sender_id: 'demo-sarah',
      kind: 'text',
      body: 'Hey! Are you coming to practice tomorrow?',
      media_id: null,
      created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: 'msg-2',
      conversation_id: 'demo-dm-1',
      sender_id: 'me',
      kind: 'text',
      body: 'Definitely! What time does it start?',
      media_id: null,
      created_at: new Date(Date.now() - 28 * 60000).toISOString(),
    },
    {
      id: 'msg-3',
      conversation_id: 'demo-dm-1',
      sender_id: 'demo-sarah',
      kind: 'text',
      body: '6pm sharp. Coach wants us there early for warmups',
      media_id: null,
      created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    },
    {
      id: 'msg-4',
      conversation_id: 'demo-dm-1',
      sender_id: 'me',
      kind: 'text',
      body: 'Perfect. I\'ll bring the new ball too',
      media_id: null,
      created_at: new Date(Date.now() - 20 * 60000).toISOString(),
    },
    {
      id: 'msg-5',
      conversation_id: 'demo-dm-1',
      sender_id: 'demo-sarah',
      kind: 'audio',
      body: '',
      media_id: 'audio-1',
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: 'msg-6',
      conversation_id: 'demo-dm-1',
      sender_id: 'me',
      kind: 'text',
      body: 'Nice voice note! Got it 👍',
      media_id: null,
      created_at: new Date(Date.now() - 10 * 60000).toISOString(),
    },
    {
      id: 'msg-7',
      conversation_id: 'demo-dm-1',
      sender_id: 'demo-sarah',
      kind: 'text',
      body: 'Also check out this photo from last game',
      media_id: 'media-photo-1',
      created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: 'msg-8',
      conversation_id: 'demo-dm-1',
      sender_id: 'demo-sarah',
      kind: 'text',
      body: 'See you at practice tomorrow! 🏀',
      media_id: null,
      created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    },
  ],
  'demo-dm-2': [
    {
      id: 'msg-m1',
      conversation_id: 'demo-dm-2',
      sender_id: 'me',
      kind: 'text',
      body: 'Yo Marcus, sick game yesterday!',
      media_id: null,
      created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    },
    {
      id: 'msg-m2',
      conversation_id: 'demo-dm-2',
      sender_id: 'demo-marcus',
      kind: 'text',
      body: 'Thanks bro! That three-pointer in the 4th quarter was insane 🔥',
      media_id: null,
      created_at: new Date(Date.now() - 55 * 60000).toISOString(),
    },
    {
      id: 'msg-m3',
      conversation_id: 'demo-dm-2',
      sender_id: 'me',
      kind: 'text',
      body: 'For real, the crowd went crazy. You got the highlights?',
      media_id: null,
      created_at: new Date(Date.now() - 50 * 60000).toISOString(),
    },
    {
      id: 'msg-m4',
      conversation_id: 'demo-dm-2',
      sender_id: 'demo-marcus',
      kind: 'text',
      body: 'Yeah sending them now',
      media_id: 'media-video-1',
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      id: 'msg-m5',
      conversation_id: 'demo-dm-2',
      sender_id: 'demo-marcus',
      kind: 'audio',
      body: '',
      media_id: 'audio-2',
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    },
  ],
  'demo-dm-3': [
    {
      id: 'msg-c1',
      conversation_id: 'demo-dm-3',
      sender_id: 'demo-coach',
      kind: 'text',
      body: 'Training schedule for next week is updated on the app',
      media_id: null,
      created_at: new Date(Date.now() - 120 * 60000).toISOString(),
    },
    {
      id: 'msg-c2',
      conversation_id: 'demo-dm-3',
      sender_id: 'me',
      kind: 'text',
      body: 'Got it coach! Question about the conditioning drills',
      media_id: null,
      created_at: new Date(Date.now() - 90 * 60000).toISOString(),
    },
    {
      id: 'msg-c3',
      conversation_id: 'demo-dm-3',
      sender_id: 'demo-coach',
      kind: 'text',
      body: 'Sure, what\'s up?',
      media_id: null,
      created_at: new Date(Date.now() - 85 * 60000).toISOString(),
    },
    {
      id: 'msg-c4',
      conversation_id: 'demo-dm-3',
      sender_id: 'me',
      kind: 'text',
      body: 'Should I do extra sprints on off days or rest completely?',
      media_id: null,
      created_at: new Date(Date.now() - 80 * 60000).toISOString(),
    },
    {
      id: 'msg-c5',
      conversation_id: 'demo-dm-3',
      sender_id: 'demo-coach',
      kind: 'text',
      body: 'Great job on the drills today, keep pushing!',
      media_id: null,
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    },
  ],
};

export const DEMO_GROUP_MESSAGES: Record<string, Array<{
  id: string;
  group_id: string;
  sender_id: string;
  kind: 'text' | 'audio';
  body: string;
  media_id: string | null;
  created_at: string;
  senderName?: string;
}>> = {
  'demo-group-1': [
    {
      id: 'gmsg-1',
      group_id: 'demo-group-1',
      sender_id: 'demo-sarah',
      kind: 'text',
      body: 'Who\'s in for Saturday?',
      media_id: null,
      created_at: new Date(Date.now() - 180 * 60000).toISOString(),
      senderName: 'Sarah Chen',
    },
    {
      id: 'gmsg-2',
      group_id: 'demo-group-1',
      sender_id: 'demo-marcus',
      kind: 'text',
      body: 'Count me in! 🙋‍♂️',
      media_id: null,
      created_at: new Date(Date.now() - 170 * 60000).toISOString(),
      senderName: 'Marcus Johnson',
    },
    {
      id: 'gmsg-3',
      group_id: 'demo-group-1',
      sender_id: 'me',
      kind: 'text',
      body: 'I\'m there! What court are we on?',
      media_id: null,
      created_at: new Date(Date.now() - 160 * 60000).toISOString(),
    },
    {
      id: 'gmsg-4',
      group_id: 'demo-group-1',
      sender_id: 'demo-alex',
      kind: 'text',
      body: 'Court 3 as usual',
      media_id: null,
      created_at: new Date(Date.now() - 150 * 60000).toISOString(),
      senderName: 'Alex Rivera',
    },
    {
      id: 'gmsg-5',
      group_id: 'demo-group-1',
      sender_id: 'demo-jordan',
      kind: 'audio',
      body: '',
      media_id: 'audio-3',
      created_at: new Date(Date.now() - 120 * 60000).toISOString(),
      senderName: 'Jordan Williams',
    },
    {
      id: 'gmsg-6',
      group_id: 'demo-group-1',
      sender_id: 'demo-sarah',
      kind: 'text',
      body: 'Game on Saturday at 3pm confirmed!',
      media_id: null,
      created_at: new Date(Date.now() - 30 * 60000).toISOString(),
      senderName: 'Sarah Chen',
    },
  ],
};

export function isDemoConversation(id: string): boolean {
  return id.startsWith('demo-');
}

/** Show sample threads only when explicitly enabled or in dev with an empty inbox. */
export function shouldShowMessengerDemos(realCount: number): boolean {
  if (import.meta.env.VITE_MESSENGER_DEMOS === 'true') return true;
  if (import.meta.env.VITE_MESSENGER_DEMOS === 'false') return false;
  return import.meta.env.DEV && realCount === 0;
}

export function getDemoMessages(conversationId: string) {
  return DEMO_CHAT_MESSAGES[conversationId] || [];
}

export function getDemoGroupMessages(groupId: string) {
  return DEMO_GROUP_MESSAGES[groupId] || [];
}
