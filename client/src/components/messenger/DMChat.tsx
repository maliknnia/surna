import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Phone, Video, MoreVertical, X, BarChart2, Calendar, MapPin, Trophy,
  Users, FileText, Target, Image as ImageIcon, ChevronRight,
  Navigation, CheckCircle, Trash2, Search, ChevronUp, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import MessageBubble from './MessageBubble';
import ChatComposer from './ChatComposer';
import VoiceRecorder from './VoiceRecorder';
import MediaPicker from './MediaPicker';
import ConversationSettings from './ConversationSettings';
import { isDemoConversation, getDemoMessages } from './demoData';
import { apiRequest, queryClient as qc, getQueryFn } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { getMessengerTheme } from './messengerTheme';
import { useSurnaCamera } from '@/features/camera';

interface DMChatProps {
  peerId: string;
  userData?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    profileImageUrl?: string;
    other_user?: any;
  };
  onBack: () => void;
}

interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: 'text' | 'audio' | 'poll' | 'event_card' | 'image';
  body: string;
  media_id: string | null;
  created_at: string;
  replyTo?: { id: string; body: string; sender_id: string };
  poll?: any;
  eventCard?: any;
  reaction?: string;
}

const PLUS_OPTIONS = [
  { icon: BarChart2,  label: 'Create Poll',     action: 'poll'      },
  { icon: Calendar,   label: 'Plan Event',       action: 'event'     },
  { icon: MapPin,     label: 'Share Location',   action: 'location'  },
  { icon: Trophy,     label: 'Challenge',        action: 'challenge' },
  { icon: Users,      label: 'Add People',       action: 'people'    },
  { icon: FileText,   label: 'Shared Notes',     action: 'notes'     },
  { icon: Target,     label: 'Create Match',     action: 'match'     },
  { icon: ImageIcon,  label: 'Media',            action: 'media'     },
];

const SMART_PLACEHOLDERS = ['Message…', 'Plan something…', 'Create a poll…', 'Invite to event…'];

/* ─── PlusBottomSheet: icon-only grid with Lucide icons ─── */
function PlusBottomSheet({
  isDark,
  onSelect,
  onClose,
}: {
  isDark: boolean;
  onSelect: (action: string) => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 12);
    return () => clearTimeout(t);
  }, []);

  const close = () => { setVisible(false); setTimeout(onClose, 260); };
  const pick  = (action: string) => { setVisible(false); setTimeout(() => onSelect(action), 260); };

  const sheetBg  = isDark ? '#121212' : '#ffffff';
  const handleBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const titleClr = isDark ? '#ffffff' : 'var(--surna-text)';
  const itemBg   = isDark ? 'rgba(255,255,255,0.06)' : 'var(--surna-elevated)';
  const itemBgHover = isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.15)';
  const iconClr  = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)';
  const labelClr = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(30,10,60,0.75)';

  return (
    <div
      className="fixed inset-0 z-[60]"
      style={{ background: `rgba(0,0,0,${visible ? 0.45 : 0})`, transition: 'background 260ms ease' }}
      onClick={close}
    >
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: sheetBg,
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
          transform: `translateY(${visible ? 0 : 100}%)`,
          transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 18 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: handleBg }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: titleClr }}>Add to Chat</p>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: '50%', background: handleBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '0 16px' }}>
          {PLUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.action}
                onClick={() => pick(opt.action)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '16px 8px 14px',
                  borderRadius: 18,
                  background: itemBg,
                  border: 'none', cursor: 'pointer',
                  transition: 'transform 120ms ease, background 150ms ease',
                }}
                onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.background = itemBgHover; (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)'; }}
                onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.background = itemBg; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.background = itemBg; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 13, background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={iconClr} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: labelClr, textAlign: 'center', lineHeight: '1.2' }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Poll Creator Modal ─── */
function PollCreator({ isDark, onSend, onClose }: { isDark: boolean; onSend: (msg: any) => void; onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 12); return () => clearTimeout(t); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 260); };

  const sheetBg = isDark ? '#121212' : '#ffffff';
  const handleBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const titleClr = isDark ? '#ffffff' : 'var(--surna-text)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'var(--surna-elevated)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(109,40,217,0.15)';
  const inputClr = isDark ? '#fff' : 'var(--surna-text)';
  const subClr = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  const addOption = () => { if (options.length < 6) setOptions([...options, '']); };
  const removeOption = (i: number) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)); };
  const updateOption = (i: number, val: string) => { const next = [...options]; next[i] = val; setOptions(next); };

  const handleSend = () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return;
    const validOptions = options.filter(o => o.trim()).map((o, i) => ({ id: `opt${i}`, text: o.trim(), votes: 0 }));
    onSend({
      kind: 'poll',
      body: question,
      poll: { question: question.trim(), options: validOptions, totalVotes: 0 },
    });
    close();
  };

  return (
    <div className="fixed inset-0 z-[61]" style={{ background: `rgba(0,0,0,${visible ? 0.5 : 0})`, transition: 'background 260ms ease' }} onClick={close}>
      <div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: sheetBg, borderRadius: '24px 24px 0 0', paddingBottom: 'max(env(safe-area-inset-bottom),24px)', transform: `translateY(${visible ? 0 : 100}%)`, transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: handleBg }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 16px' }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: titleClr }}>Create Poll</p>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: '50%', background: handleBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color={subClr} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: subClr, marginBottom: 8 }}>Question</p>
          <input
            type="text"
            placeholder="Ask a question…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            style={{ width: '100%', height: 46, borderRadius: 14, background: inputBg, border: `1px solid ${inputBorder}`, padding: '0 14px', fontSize: 14.5, color: inputClr, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
          />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: subClr, marginBottom: 10 }}>Options</p>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                style={{ flex: 1, height: 44, borderRadius: 14, background: inputBg, border: `1px solid ${inputBorder}`, padding: '0 14px', fontSize: 14, color: inputClr, outline: 'none', boxSizing: 'border-box' }}
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <Trash2 size={16} color={subClr} />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button onClick={addOption} style={{ width: '100%', height: 40, borderRadius: 14, border: `1.5px dashed ${inputBorder}`, background: 'none', color: isDark ? 'rgba(167,139,250,0.8)' : 'rgba(0,0,0,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}>
              + Add Option
            </button>
          )}
        </div>
        <div style={{ padding: '12px 20px' }}>
          <button
            onClick={handleSend}
            disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
            style={{ width: '100%', height: 50, borderRadius: 16, background: question.trim() && options.filter(o => o.trim()).length >= 2 ? (isDark ? '#ffffff' : '#000000') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'), border: 'none', color: question.trim() && options.filter(o => o.trim()).length >= 2 ? (isDark ? '#000000' : '#ffffff') : subClr, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 200ms ease' }}
          >
            Send Poll
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Event Card Creator ─── */
function EventCreator({ isDark, onSend, onClose }: { isDark: boolean; onSend: (msg: any) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 12); return () => clearTimeout(t); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 260); };

  const sheetBg = isDark ? '#121212' : '#ffffff';
  const handleBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const titleClr = isDark ? '#ffffff' : 'var(--surna-text)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'var(--surna-elevated)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(109,40,217,0.15)';
  const inputClr = isDark ? '#fff' : 'var(--surna-text)';
  const subClr = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  const handleSend = () => {
    if (!title.trim()) return;
    onSend({
      kind: 'event_card',
      body: title,
      eventCard: { title: title.trim(), time: time || 'TBD', location: location || 'TBD' },
    });
    close();
  };

  const fieldStyle = { width: '100%', height: 46, borderRadius: 14, background: inputBg, border: `1px solid ${inputBorder}`, padding: '0 14px', fontSize: 14.5, color: inputClr, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 12 };

  return (
    <div className="fixed inset-0 z-[61]" style={{ background: `rgba(0,0,0,${visible ? 0.5 : 0})`, transition: 'background 260ms ease' }} onClick={close}>
      <div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: sheetBg, borderRadius: '24px 24px 0 0', paddingBottom: 'max(env(safe-area-inset-bottom),24px)', transform: `translateY(${visible ? 0 : 100}%)`, transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: handleBg }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 16px' }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: titleClr }}>Plan Event</p>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: '50%', background: handleBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color={subClr} />
          </button>
        </div>
        <div style={{ padding: '0 20px 4px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: subClr, marginBottom: 8 }}>Event Name</p>
          <input type="text" placeholder="e.g. Basketball Practice" value={title} onChange={e => setTitle(e.target.value)} style={fieldStyle} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: subClr, marginBottom: 8 }}>Date & Time</p>
          <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} style={{ ...fieldStyle, colorScheme: isDark ? 'dark' : 'light' }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: subClr, marginBottom: 8 }}>Location</p>
          <input type="text" placeholder="e.g. City Park Court 3" value={location} onChange={e => setLocation(e.target.value)} style={fieldStyle} />
          <button
            onClick={handleSend}
            disabled={!title.trim()}
            style={{ width: '100%', height: 50, borderRadius: 16, background: title.trim() ? (isDark ? '#ffffff' : '#000000') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'), border: 'none', color: title.trim() ? (isDark ? '#000000' : '#ffffff') : subClr, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 4 }}
          >
            Share Event
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Challenge Invite Creator ─── */
function ChallengeCreator({ isDark, onSend, onClose }: { isDark: boolean; onSend: (msg: any) => void; onClose: () => void }) {
  const [challengeType, setChallengeType] = useState('1v1 Match');
  const [sport, setSport] = useState('Basketball');
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 12); return () => clearTimeout(t); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 260); };

  const challengeTypes = ['1v1 Match', 'Team Scrimmage', '3-Point Contest', 'Sprint Race', 'Sparring', 'Skills Challenge'];
  const sports = ['Basketball', 'Soccer', 'Tennis', 'Running', 'MMA', 'Swimming', 'CrossFit', 'Volleyball'];

  const sheetBg = isDark ? '#121212' : '#ffffff';
  const handleBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const titleClr = isDark ? '#ffffff' : 'var(--surna-text)';
  const subClr = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const pillBg = (active: boolean) => active ? (isDark ? '#ffffff' : '#000000') : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)');
  const pillClr = (active: boolean) => active ? (isDark ? '#000000' : '#ffffff') : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)');

  const handleSend = () => {
    onSend({
      kind: 'text',
      body: `🏆 Challenge Invite: ${challengeType} — ${sport}\n\nAccept?`,
    });
    close();
  };

  return (
    <div className="fixed inset-0 z-[61]" style={{ background: `rgba(0,0,0,${visible ? 0.5 : 0})`, transition: 'background 260ms ease' }} onClick={close}>
      <div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: sheetBg, borderRadius: '24px 24px 0 0', paddingBottom: 'max(env(safe-area-inset-bottom),24px)', transform: `translateY(${visible ? 0 : 100}%)`, transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: handleBg }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 16px' }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: titleClr }}>Challenge Invite</p>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: '50%', background: handleBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color={subClr} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: subClr, marginBottom: 10 }}>Type</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {challengeTypes.map(t => (
              <button key={t} onClick={() => setChallengeType(t)} style={{ padding: '8px 14px', borderRadius: 99, background: pillBg(challengeType === t), border: 'none', color: pillClr(challengeType === t), fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms ease' }}>{t}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: subClr, marginBottom: 10 }}>Sport</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {sports.map(s => (
              <button key={s} onClick={() => setSport(s)} style={{ padding: '8px 14px', borderRadius: 99, background: pillBg(sport === s), border: 'none', color: pillClr(sport === s), fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms ease' }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: '12px 20px' }}>
          <button onClick={handleSend} style={{ width: '100%', height: 50, borderRadius: 16, background: 'linear-gradient(135deg,#FF2D55,#FF6B9D)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            🏆 Send Challenge
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Match Creator ─── */
function MatchCreator({ isDark, onSend, onClose }: { isDark: boolean; onSend: (msg: any) => void; onClose: () => void }) {
  const [sport, setSport] = useState('Basketball');
  const [format, setFormat] = useState('5v5');
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 12); return () => clearTimeout(t); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 260); };

  const sports = ['Basketball', 'Soccer', 'Tennis', 'Volleyball', 'MMA', 'Running'];
  const formats = ['1v1', '2v2', '3v3', '5v5', '11v11', 'Team'];

  const sheetBg = isDark ? '#121212' : '#ffffff';
  const handleBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const titleClr = isDark ? '#ffffff' : 'var(--surna-text)';
  const subClr = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const pillBg = (active: boolean) => active ? '#000000' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)');
  const pillClr = (active: boolean) => active ? '#fff' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)');

  const handleSend = () => {
    onSend({ kind: 'text', body: `🎯 Match Request: ${format} ${sport}\n\nWant to play?` });
    close();
  };

  return (
    <div className="fixed inset-0 z-[61]" style={{ background: `rgba(0,0,0,${visible ? 0.5 : 0})`, transition: 'background 260ms ease' }} onClick={close}>
      <div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: sheetBg, borderRadius: '24px 24px 0 0', paddingBottom: 'max(env(safe-area-inset-bottom),24px)', transform: `translateY(${visible ? 0 : 100}%)`, transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: handleBg }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 16px' }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: titleClr }}>Create Match</p>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: '50%', background: handleBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color={subClr} />
          </button>
        </div>
        <div style={{ padding: '0 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: subClr, marginBottom: 10 }}>Sport</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {sports.map(s => (
              <button key={s} onClick={() => setSport(s)} style={{ padding: '8px 14px', borderRadius: 99, background: pillBg(sport === s), border: 'none', color: pillClr(sport === s), fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: subClr, marginBottom: 10 }}>Format</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {formats.map(f => (
              <button key={f} onClick={() => setFormat(f)} style={{ flex: 1, padding: '10px 4px', borderRadius: 12, background: pillBg(format === f), border: 'none', color: pillClr(format === f), fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{f}</button>
            ))}
          </div>
          <button onClick={handleSend} style={{ width: '100%', height: 50, borderRadius: 16, background: 'linear-gradient(135deg,#000000,#000000)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 4 }}>
            🎯 Send Match Request
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Location Sender ─── */
function LocationSender({ isDark, onSend, onClose }: { isDark: boolean; onSend: (msg: any) => void; onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'getting' | 'got' | 'error'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 12); return () => clearTimeout(t); }, []);
  const close = () => { setVisible(false); setTimeout(onClose, 260); };

  const getLocation = () => {
    setStatus('getting');
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus('got'); },
      () => setStatus('error'),
    );
  };

  const handleSend = () => {
    if (!coords) return;
    onSend({ kind: 'text', body: `📍 Shared Location\n${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}\nhttps://maps.google.com/?q=${coords.lat},${coords.lng}` });
    close();
  };

  const sheetBg = isDark ? '#121212' : '#ffffff';
  const handleBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const titleClr = isDark ? '#ffffff' : 'var(--surna-text)';
  const subClr = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  return (
    <div className="fixed inset-0 z-[61]" style={{ background: `rgba(0,0,0,${visible ? 0.5 : 0})`, transition: 'background 260ms ease' }} onClick={close}>
      <div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: sheetBg, borderRadius: '24px 24px 0 0', paddingBottom: 'max(env(safe-area-inset-bottom),24px)', transform: `translateY(${visible ? 0 : 100}%)`, transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: handleBg }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 20px' }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: titleClr }}>Share Location</p>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: '50%', background: handleBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color={subClr} />
          </button>
        </div>
        <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Navigation size={30} color="#fff" />
          </div>
          {status === 'idle' && <p style={{ fontSize: 14, color: subClr, marginBottom: 20 }}>Share your current location with this conversation.</p>}
          {status === 'getting' && <p style={{ fontSize: 14, color: subClr, marginBottom: 20 }}>Getting your location…</p>}
          {status === 'got' && coords && <p style={{ fontSize: 13, color: '#000000', fontWeight: 600, marginBottom: 20 }}>📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}
          {status === 'error' && <p style={{ fontSize: 14, color: '#FF3B30', marginBottom: 20 }}>Could not get location. Check permissions.</p>}
          {status !== 'got' ? (
            <button onClick={getLocation} disabled={status === 'getting'} style={{ width: '100%', height: 50, borderRadius: 16, background: '#000000', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {status === 'getting' ? 'Locating…' : 'Get My Location'}
            </button>
          ) : (
            <button onClick={handleSend} style={{ width: '100%', height: 50, borderRadius: 16, background: '#000000', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Send Location
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Typing Dots ─── */
function TypingDots({ isDark }: { isDark: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)', animation: `typingBounce 1.2s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

export default function DMChat({ peerId, userData, onBack }: DMChatProps) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const { openCamera, openGifPicker } = useSurnaCamera();

  const [message, setMessage]           = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording]   = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showPlus, setShowPlus]         = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [replyTo, setReplyTo]           = useState<DMMessage | null>(null);
  const [demoMsgs, setDemoMsgs]         = useState<any[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [activeSearchIdx, setActiveSearchIdx] = useState(0);
  const [linkPreview, setLinkPreview] = useState<any | null>(null);
  const [showConversationSettings, setShowConversationSettings] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [forwardingMessageIds, setForwardingMessageIds] = useState<string[] | null>(null);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const demoConvId = userData?.id?.startsWith('demo-') ? userData.id : peerId;
  const isDemo = isDemoConversation(demoConvId) || isDemoConversation(peerId);

  const { data: conversationSettings, refetch: refetchConversationSettings } = useQuery<any>({
    queryKey: ["/api/messenger/dm/conversations", conversationId, "settings"],
    queryFn: async () => {
      if (!conversationId) return null;
      const res = await fetch(`/api/messenger/dm/conversations/${conversationId}/settings`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!conversationId && !isDemo,
  });

  const { data: dmConversationsData } = useQuery<any>({
    queryKey: ["/api/messenger/dm/conversations", "for-forward"],
    queryFn: async () => {
      const res = await fetch(`/api/messenger/dm/conversations`, { credentials: "include" });
      if (!res.ok) return { conversations: [] };
      return res.json();
    },
    enabled: !isDemo,
  });

  useEffect(() => {
    if (inputFocused || message) return;
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % SMART_PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, [inputFocused, message]);

  const createConversation = useMutation({
    mutationFn: async () => {
      if (isDemo) return { id: demoConvId };
      const response = await fetch('/api/messenger/dm/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ peerId }),
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      return response.json();
    },
    onSuccess: (data) => {
      setConversationId(data.id);
      if (isDemo) setDemoMsgs(getDemoMessages(demoConvId));
    },
  });

  const { data: messagesData, isLoading } = useQuery({
    queryKey: [`/api/messenger/dm/messages`, conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      if (isDemo) return { items: demoMsgs };
      const response = await fetch(`/api/messenger/dm/messages?conversationId=${conversationId}&limit=50`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!conversationId,
  });

  const displayMessages = isDemo ? { items: demoMsgs } : messagesData;

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { body?: string; mediaId?: string }) => {
      const response = await fetch('/api/messenger/dm/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId, ...data }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messenger/dm/messages`, conversationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/messenger/dm/conversations'] });
      setMessage('');
      setReplyTo(null);
    },
  });

  const updateConversationSettingsMutation = useMutation({
    mutationFn: async (disappearing_enabled: boolean) => {
      if (!conversationId) return null;
      const response = await fetch(`/api/messenger/dm/conversations/${conversationId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ disappearing_enabled }),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => refetchConversationSettings(),
  });

  const pinMessageMutation = useMutation({
    mutationFn: async (messageId: string | null) => {
      if (!conversationId) return;
      const response = await fetch(`/api/messenger/dm/conversations/${conversationId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageId }),
      });
      if (!response.ok) throw new Error('Failed to pin message');
    },
    onSuccess: () => refetchConversationSettings(),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (messageIds: string[]) => {
      if (!conversationId) return;
      const response = await fetch('/api/messenger/dm/messages/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId, messageIds }),
      });
      if (!response.ok) throw new Error('Failed to delete messages');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messenger/dm/messages`, conversationId] });
      setSelectedMessageIds(new Set());
    },
  });

  const forwardMessagesMutation = useMutation({
    mutationFn: async ({ sourceMessageIds, targetConversationId }: { sourceMessageIds: string[]; targetConversationId: string }) => {
      const response = await fetch('/api/messenger/dm/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sourceMessageIds, targetConversationId }),
      });
      if (!response.ok) throw new Error('Failed to forward messages');
    },
  });

  useEffect(() => {
    if (isDemo) {
      setConversationId(demoConvId);
      setDemoMsgs(getDemoMessages(demoConvId));
      return;
    }
    const existingConversationId = userData?.other_user ? userData.id : null;
    if (existingConversationId) {
      setConversationId(existingConversationId);
      return;
    }
    createConversation.mutate();
  }, [peerId, userData?.id, userData?.other_user?.id]);

  useEffect(() => {
    if (!conversationId || isDemo) return;
    void apiRequest('POST', '/api/messenger/dm/read', { conversationId }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/messenger/dm/conversations'] });
    }).catch(() => undefined);
  }, [conversationId, isDemo, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages?.items]);

  const addDemoMsg = (overrides: Partial<DMMessage>) => {
    const newMsg: any = {
      id: `demo-new-${Date.now()}`,
      conversation_id: conversationId || peerId,
      sender_id: 'me',
      kind: 'text',
      body: '',
      media_id: null,
      created_at: new Date().toISOString(),
      ...overrides,
    };
    setDemoMsgs((prev) => [...prev, newMsg]);
  };

  const handleSend = () => {
    if (!message.trim() || !conversationId) return;
    if (navigator.vibrate) navigator.vibrate(20);
    localStorage.setItem("surna_meaningful_action_done", "1");
    if (isDemo) {
      addDemoMsg({
        kind: 'text',
        body: message,
        replyTo: replyTo ? { id: replyTo.id, body: replyTo.body, sender_id: replyTo.sender_id } : undefined,
      });
      setMessage('');
      setReplyTo(null);
      return;
    }
    sendMessageMutation.mutate({ body: message });
    setLinkPreview(null);
  };

  useEffect(() => {
    const m = message.match(/https?:\/\/[^\s]+/i);
    if (!m) {
      setLinkPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/messenger/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url: m[0] }),
        });
        if (r.ok) setLinkPreview(await r.json());
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [message]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleMediaSend = (mediaId: string) => {
    if (!conversationId) return;
    sendMessageMutation.mutate({ mediaId });
    setShowMediaPicker(false);
  };

  const handleVoiceRecorded = (audioBlob: Blob) => {
    setIsRecording(false);
  };

  const handlePlusAction = (action: string) => {
    setShowPlus(false);
    if (action === 'media') { setShowMediaPicker(true); return; }
    if (action === 'gif') {
      if (!conversationId && !isDemo) return;
      openGifPicker({
        source: "messenger",
        conversationId: conversationId ?? undefined,
        onGifSelect: (url) => {
          if (isDemo) addDemoMsg({ kind: "text", body: url });
          else sendMessageMutation.mutate({ body: url });
        },
      });
      return;
    }
    setActiveAction(action);
  };

  const handleActionSend = (msgData: any) => {
    setActiveAction(null);
    if (isDemo) {
      addDemoMsg(msgData);
      return;
    }
    if (msgData.kind === 'text') {
      if (!conversationId) return;
      sendMessageMutation.mutate({ body: msgData.body });
    }
  };

  const otherUser = userData?.other_user || userData || { id: peerId, firstName: 'Unknown', lastName: 'User', email: peerId };
  const displayName = otherUser.firstName && otherUser.lastName
    ? `${otherUser.firstName} ${otherUser.lastName}`
    : otherUser.email;

  const t = getMessengerTheme(isDark);
  const pageBg = t.pageBg;
  const headerBg = t.headerBg;
  const msgAreaBg = t.msgAreaBg;
  const inputBg = t.inputBg;
  const inputBorder = t.inputBorder;
  const inputClr = t.inputText;
  const iconClr = t.iconMuted;
  const headerBorder = t.border;
  const nameClr = t.title;
  const statusClr = t.sub;
  const actionBg = t.actionBg;
  const replyBarBg = t.replyBg;
  const replyAccent = t.replyAccent;
  const matchedMessageIds = (displayMessages?.items || [])
    .filter((m: DMMessage) => chatSearch.trim() && (m.body || "").toLowerCase().includes(chatSearch.toLowerCase()))
    .map((m: DMMessage) => m.id);

  const jumpToSearchResult = (index: number) => {
    if (matchedMessageIds.length === 0) return;
    const next = (index + matchedMessageIds.length) % matchedMessageIds.length;
    setActiveSearchIdx(next);
    const id = matchedMessageIds[next];
    messageRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const toggleSelectedMessage = (id: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMessageAction = (action: string, msg: DMMessage) => {
    if (action === "Pin") {
      pinMessageMutation.mutate(msg.id);
      return;
    }
    if (action === "Forward") {
      setForwardingMessageIds([msg.id]);
      return;
    }
    if (action === "Select") {
      setMultiSelectMode(true);
      setSelectedMessageIds(new Set([msg.id]));
      return;
    }
    if (action === "Delete for me") {
      bulkDeleteMutation.mutate([msg.id]);
    }
  };

  const pinnedMessage = displayMessages?.items?.find((m: DMMessage) => m.id === conversationSettings?.pinned_message_id);

  return (
    <div className="h-full flex flex-col" style={{ background: pageBg }} data-testid="dm-chat">
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: headerBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${headerBorder}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: '50%', background: actionBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} data-testid="button-back">
            <ArrowLeft size={17} color={iconClr} />
          </button>
          <div style={{ position: 'relative' }}>
            <img src={otherUser.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.id}`} alt={displayName} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid rgba(109,40,217,0.15)' }} />
            <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: '#34C759', border: `2px solid ${pageBg}` }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: nameClr, lineHeight: '1.2' }}>{displayName}</p>
            <p style={{ fontSize: 11, color: statusClr }}>Online now</p>
          </div>
        </div>
        {chatSearchOpen && (
          <div style={{ position: "absolute", left: 12, right: 12, top: 56, display: "flex", alignItems: "center", gap: 6 }}>
            <input
              value={chatSearch}
              onChange={(e) => { setChatSearch(e.target.value); setActiveSearchIdx(0); }}
              placeholder="Search in chat"
              style={{ flex: 1, height: 34, borderRadius: 999, border: "none", padding: "0 12px", background: inputBg, color: inputClr, outline: "none" }}
            />
            <button onClick={() => jumpToSearchResult(activeSearchIdx - 1)} style={{ width: 30, height: 30, borderRadius: "50%", background: actionBg, border: "none" }}>
              <ChevronUp size={14} color={iconClr} />
            </button>
            <button onClick={() => jumpToSearchResult(activeSearchIdx + 1)} style={{ width: 30, height: 30, borderRadius: "50%", background: actionBg, border: "none" }}>
              <ChevronDown size={14} color={iconClr} />
            </button>
            <span style={{ fontSize: 11, color: statusClr, minWidth: 42, textAlign: "right" }}>
              {matchedMessageIds.length ? `${activeSearchIdx + 1}/${matchedMessageIds.length}` : "0/0"}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { icon: Search, testId: 'button-search-chat', onClick: () => setChatSearchOpen((v) => !v) },
            { icon: Phone, testId: 'button-voice-call' },
            { icon: Video, testId: 'button-video-call' },
            { icon: MoreVertical, testId: 'button-more', onClick: () => setShowConversationSettings(true) },
          ].map(({ icon: Icon, testId, onClick }: any) => (
            <button
              key={testId}
              data-testid={testId}
              onClick={onClick}
              style={{ width: 34, height: 34, borderRadius: '50%', background: actionBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Icon size={17} color={iconClr} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto" style={{ background: msgAreaBg, padding: '10px 14px 6px' }} data-testid="messages-container">
        {isLoading && !isDemo ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 120 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${t.accentSoft}`, borderTopColor: t.iconMuted, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : displayMessages?.items?.length > 0 ? (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {pinnedMessage && (
              <button
                onClick={() => messageRefs.current[pinnedMessage.id]?.scrollIntoView({ behavior: "smooth", block: "center" })}
                style={{
                  width: "100%",
                  textAlign: "left",
                  marginBottom: 10,
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 10px",
                  background: t.accentSoft,
                  color: nameClr,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 2 }}>Pinned message</div>
                <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {String(pinnedMessage.body || "").replace(/^__FORWARDED__\n/, "")}
                </div>
              </button>
            )}
            {displayMessages.items.map((msg: DMMessage, index: number) => (
              <div
                key={msg.id}
                ref={(el) => { messageRefs.current[msg.id] = el; }}
                style={{
                  background:
                    matchedMessageIds.includes(msg.id)
                      ? (matchedMessageIds[activeSearchIdx] === msg.id
                        ? (isDark ? "rgba(255,215,0,0.15)" : "rgba(255,215,0,0.22)")
                        : (isDark ? "rgba(255,215,0,0.08)" : "rgba(255,215,0,0.12)"))
                      : "transparent",
                  borderRadius: 8,
                  marginBottom:
                    index < displayMessages.items.length - 1 &&
                    displayMessages.items[index + 1].sender_id === msg.sender_id
                      ? 1
                      : 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {multiSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedMessageIds.has(msg.id)}
                      onChange={() => toggleSelectedMessage(msg.id)}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <MessageBubble
                      message={msg}
                      isFromMe={msg.sender_id === user?.id || msg.sender_id === 'me'}
                      showAvatar={
                        index === displayMessages.items.length - 1 ||
                        displayMessages.items[index + 1].sender_id !== msg.sender_id
                      }
                      userAvatar={msg.sender_id === user?.id || msg.sender_id === 'me' ? user?.profileImageUrl : otherUser.profileImageUrl}
                      userName={msg.sender_id === user?.id || msg.sender_id === 'me' ? 'You' : displayName}
                      onReply={(m) => setReplyTo(m)}
                      onAction={handleMessageAction}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <img src={otherUser.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.id}`} alt="" style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: 12, opacity: 0.8 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: nameClr, marginBottom: 4 }}>{displayName}</p>
            <p style={{ fontSize: 13, color: statusClr }}>Start the conversation</p>
          </div>
        )}
      </div>

      {/* ── Voice / Media overlays ── */}
      {isRecording && <VoiceRecorder onRecorded={handleVoiceRecorded} onCancel={() => setIsRecording(false)} />}
      {showMediaPicker && <MediaPicker onMediaSelected={handleMediaSend} onClose={() => setShowMediaPicker(false)} />}

      <ChatComposer
        message={message}
        onChange={setMessage}
        onSend={handleSend}
        onPlus={() => setShowPlus(true)}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={SMART_PLACEHOLDERS[placeholderIdx]}
        disabled={multiSelectMode}
        isPending={sendMessageMutation.isPending}
        onVoice={() => setIsRecording(true)}
        onCamera={() => {
          if (!conversationId && !isDemo) return;
          openCamera({
            source: "messenger",
            conversationId: conversationId ?? undefined,
            onMediaSent: () => {
              queryClient.invalidateQueries({ queryKey: [`/api/messenger/dm/messages`, conversationId] });
            },
          });
        }}
        topBar={
          multiSelectMode ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: statusClr }}>{selectedMessageIds.size} selected</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setForwardingMessageIds(Array.from(selectedMessageIds))}
                  disabled={selectedMessageIds.size === 0}
                  style={{ border: "none", borderRadius: 10, padding: "8px 10px", background: actionBg, color: nameClr, fontSize: 12, fontWeight: 600 }}
                >
                  Forward
                </button>
                <button
                  onClick={() => bulkDeleteMutation.mutate(Array.from(selectedMessageIds))}
                  disabled={selectedMessageIds.size === 0}
                  style={{ border: "none", borderRadius: 10, padding: "8px 10px", background: "rgba(255,69,58,0.2)", color: "#ff453a", fontSize: 12, fontWeight: 600 }}
                >
                  Delete
                </button>
                <button
                  onClick={() => { setMultiSelectMode(false); setSelectedMessageIds(new Set()); }}
                  style={{ border: "none", borderRadius: 10, padding: "8px 10px", background: actionBg, color: nameClr, fontSize: 12, fontWeight: 600 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : undefined
        }
        replyBar={
          replyTo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: replyBarBg, borderRadius: 12, padding: '8px 10px', marginBottom: 8 }}>
              <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: replyAccent, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: replyAccent, marginBottom: 2 }}>Replying to {replyTo.sender_id === 'me' ? 'yourself' : displayName}</p>
                <p style={{ fontSize: 12, color: statusClr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{replyTo.body}</p>
              </div>
              <button onClick={() => setReplyTo(null)} type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={14} color={statusClr} />
              </button>
            </div>
          ) : undefined
        }
        linkPreview={
          linkPreview ? (
            <div style={{ marginBottom: 8, borderRadius: 12, background: inputBg, border: `1px solid ${inputBorder}`, padding: '8px 10px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: inputClr }}>{linkPreview.title || "Link preview"}</div>
              <div style={{ fontSize: 11, color: statusClr, marginTop: 2 }}>{linkPreview.description || linkPreview.url}</div>
              <button type="button" onClick={() => setLinkPreview(null)} style={{ marginTop: 4, fontSize: 11, background: "transparent", border: "none", color: statusClr, cursor: "pointer" }}>
                Remove preview
              </button>
            </div>
          ) : undefined
        }
      />

      {/* ── Plus bottom sheet ── */}
      {showPlus && <PlusBottomSheet isDark={isDark} onSelect={handlePlusAction} onClose={() => setShowPlus(false)} />}

      {/* ── Action modals ── */}
      {activeAction === 'poll'      && <PollCreator      isDark={isDark} onSend={handleActionSend} onClose={() => setActiveAction(null)} />}
      {activeAction === 'event'     && <EventCreator     isDark={isDark} onSend={handleActionSend} onClose={() => setActiveAction(null)} />}
      {activeAction === 'location'  && <LocationSender   isDark={isDark} onSend={handleActionSend} onClose={() => setActiveAction(null)} />}
      {activeAction === 'challenge' && <ChallengeCreator isDark={isDark} onSend={handleActionSend} onClose={() => setActiveAction(null)} />}
      {activeAction === 'match'     && <MatchCreator     isDark={isDark} onSend={handleActionSend} onClose={() => setActiveAction(null)} />}
      {activeAction === 'notes'     && (
        <SharedNotesSheet
          isDark={isDark}
          peerId={peerId}
          onClose={() => setActiveAction(null)}
        />
      )}
      {activeAction === 'people'    && (
        <div className="fixed inset-0 z-[61]" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setActiveAction(null)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: isDark ? '#121212' : '#fff', borderRadius: '24px 24px 0 0', padding: '20px', paddingBottom: 'max(env(safe-area-inset-bottom),24px)' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 17, fontWeight: 700, color: isDark ? '#fff' : 'var(--surna-text)', marginBottom: 12 }}>Add People</p>
            <p style={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>Group conversations are available through the Groups tab in Messages.</p>
            <button onClick={() => setActiveAction(null)} style={{ marginTop: 20, width: '100%', height: 48, borderRadius: 14, background: '#000000', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Open Groups</button>
          </div>
        </div>
      )}

      {showConversationSettings && (
        <ConversationSettings
          open={showConversationSettings}
          onClose={() => setShowConversationSettings(false)}
          displayName={displayName}
          avatarUrl={otherUser.profileImageUrl}
          disappearingEnabled={!!conversationSettings?.disappearing_enabled}
          onToggleDisappearing={(enabled) => updateConversationSettingsMutation.mutate(enabled)}
        />
      )}

      {forwardingMessageIds && (
        <div className="fixed inset-0 z-[130]" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setForwardingMessageIds(null)}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              background: isDark ? "#121212" : "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: "14px 14px 22px",
              maxHeight: "60vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: nameClr, marginBottom: 8 }}>Forward to</div>
            {(dmConversationsData?.conversations || []).map((conv: any) => {
              const targetName = conv.other_user?.firstName && conv.other_user?.lastName
                ? `${conv.other_user.firstName} ${conv.other_user.lastName}`
                : conv.other_user?.email || "Unknown";
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    if (!forwardingMessageIds?.length) return;
                    forwardMessagesMutation.mutate(
                      { sourceMessageIds: forwardingMessageIds, targetConversationId: conv.id },
                      {
                        onSuccess: () => {
                          setForwardingMessageIds(null);
                          setMultiSelectMode(false);
                          setSelectedMessageIds(new Set());
                        },
                      }
                    );
                  }}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: nameClr,
                    textAlign: "left",
                    padding: "10px 6px",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{targetName}</div>
                  <div style={{ fontSize: 11, color: statusClr }}>Conversation</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SharedNotesSheet({ isDark, peerId, onClose }: { isDark: boolean; peerId: string; onClose: () => void }) {
  const { user } = useAuth() as any;
  const myId: string | undefined = user?.id;
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);

  const { data: note, isLoading } = useQuery<any>({
    queryKey: ['/api/dm/notes', peerId],
    queryFn: getQueryFn({ on401: 'returnNull' }) as any,
    enabled: !!peerId,
  });

  useEffect(() => {
    if (note && !dirty) setContent(note.content || '');
  }, [note]);

  const save = useMutation({
    mutationFn: async () => {
      const r = await apiRequest('PUT', `/api/dm/notes/${peerId}`, { content });
      return r.json();
    },
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['/api/dm/notes', peerId] });
    },
  });

  const lastEditor =
    note?.updatedById && note.updatedAt
      ? `${note.updatedById === myId ? 'You' : 'Them'} · ${formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}`
      : 'Not edited yet';

  return (
    <div className="fixed inset-0 z-[61]" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: isDark ? '#121212' : '#fff',
          borderRadius: '24px 24px 0 0',
          padding: '20px',
          paddingBottom: 'max(env(safe-area-inset-bottom),24px)',
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid="shared-notes-sheet"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: isDark ? '#fff' : 'var(--surna-text)' }}>Shared Notes</p>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)', marginBottom: 12 }}>
          Both of you can edit this note. Last update: {lastEditor}
        </p>

        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setDirty(true); }}
          disabled={isLoading}
          placeholder="Write something together — match plans, reminders, links…"
          data-testid="textarea-shared-note"
          style={{
            flex: 1, minHeight: 200, resize: 'none',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            color: isDark ? '#fff' : 'var(--surna-text)',
            border: 'none', borderRadius: 14, padding: 14,
            fontSize: 15, lineHeight: 1.5, outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, height: 48, borderRadius: 14,
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              border: 'none', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
            data-testid="button-save-shared-note"
            style={{
              flex: 1, height: 48, borderRadius: 14,
              background: dirty ? (isDark ? '#fff' : '#000') : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
              border: 'none', color: dirty ? (isDark ? '#000' : '#fff') : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
              fontSize: 15, fontWeight: 700,
              cursor: dirty ? 'pointer' : 'not-allowed',
            }}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
