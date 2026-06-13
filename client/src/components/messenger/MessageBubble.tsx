import { useState, useRef, useCallback } from 'react';
import { Play, Pause, Reply, Copy, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { getMessengerTheme } from './messengerTheme';
import FormationMessageCard from '@/pages/pro/components/FormationMessageCard';
import { parseFormationMessage } from '@/pages/pro/lib/tacticalFormations';
import { BillPaymentCard, parseBillCardBody } from './BillPaymentCard';
import { useAuth } from '@/hooks/useAuth';

interface MessageBubbleProps {
  message: {
    id: string;
    sender_id: string;
    kind: 'text' | 'audio' | 'poll' | 'event_card' | 'image';
    body: string;
    media_id?: string | null;
    created_at: string;
    replyTo?: {
      id: string;
      body: string;
      sender_id: string;
    };
    poll?: {
      question: string;
      options: { id: string; text: string; votes: number }[];
      totalVotes: number;
      userVote?: string;
    };
    eventCard?: {
      title: string;
      time: string;
      location: string;
    };
    reaction?: string;
  };
  isFromMe: boolean;
  showAvatar: boolean;
  userAvatar?: string;
  userName?: string;
  onReply?: (message: any) => void;
  onAction?: (action: string, message: any) => void;
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

function AudioWave({
  isPlaying,
  isFromMe,
  barActive,
  barIdle,
}: {
  isPlaying: boolean;
  isFromMe: boolean;
  barActive: string;
  barIdle: string;
}) {
  const bars = [3, 5, 8, 6, 4, 9, 7, 5, 6, 8, 4, 7, 5, 3, 6, 8, 4, 5, 7, 9, 5, 4, 6, 3, 8, 5, 7, 4];
  return (
    <div className="flex items-center gap-[2px] h-8">
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 2.5,
            height: isPlaying ? h * 1.6 : h * 1.2,
            borderRadius: 2,
            background: isPlaying && i < 12 ? barActive : barIdle,
            transition: 'height 80ms ease, background 200ms ease',
          }}
        />
      ))}
    </div>
  );
}

function PollCard({ poll, isFromMe }: { poll: NonNullable<MessageBubbleProps['message']['poll']>; isFromMe: boolean }) {
  const { isDark } = useTheme();
  const [voted, setVoted] = useState(poll.userVote);
  const [localVotes, setLocalVotes] = useState(poll.options.map(o => o.votes));
  const [totalVotes, setTotalVotes] = useState(poll.totalVotes);

  const handleVote = (optId: string, idx: number) => {
    if (voted) return;
    setVoted(optId);
    const next = [...localVotes];
    next[idx]++;
    setLocalVotes(next);
    setTotalVotes((t) => t + 1);
  };

  const baseClr = isFromMe ? 'rgba(255,255,255,0.92)' : (isDark ? 'rgba(255,255,255,0.9)' : 'var(--surna-text)');
  const subClr  = isFromMe ? 'rgba(255,255,255,0.55)' : (isDark ? 'rgba(255,255,255,0.5)' : 'var(--surna-text-secondary)');
  const optBg   = isFromMe ? 'rgba(255,255,255,0.1)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)');
  const fillClr = isFromMe ? 'rgba(255,255,255,0.22)' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)');
  const votedFill = isFromMe ? 'rgba(255,255,255,0.38)' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)');

  return (
    <div style={{ minWidth: 220, maxWidth: 260 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: baseClr, marginBottom: 10, lineHeight: '1.3' }}>
        {poll.question}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {poll.options.map((opt, idx) => {
          const pct = totalVotes > 0 ? Math.round((localVotes[idx] / totalVotes) * 100) : 0;
          const isVoted = voted === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id, idx)}
              disabled={!!voted}
              style={{
                position: 'relative',
                height: 38,
                borderRadius: 10,
                background: optBg,
                border: isVoted ? `1.5px solid ${isFromMe ? 'rgba(255,255,255,0.55)' : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)')}` : '1.5px solid transparent',
                overflow: 'hidden',
                cursor: voted ? 'default' : 'pointer',
                textAlign: 'left',
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Fill bar */}
              {voted && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${pct}%`,
                    background: isVoted ? votedFill : fillClr,
                    borderRadius: 10,
                    transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              )}
              <span style={{ fontSize: 13, fontWeight: 500, color: baseClr, position: 'relative', zIndex: 1 }}>
                {opt.text}
              </span>
              {voted && (
                <span style={{ fontSize: 12, fontWeight: 600, color: subClr, position: 'relative', zIndex: 1 }}>
                  {pct}%
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: subClr, marginTop: 8 }}>
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        {!voted && ' · Tap to vote'}
      </p>
    </div>
  );
}

function EventCardMsg({ ev, isFromMe }: { ev: NonNullable<MessageBubbleProps['message']['eventCard']>; isFromMe: boolean }) {
  const { isDark } = useTheme();
  const baseClr = isFromMe ? 'rgba(255,255,255,0.92)' : (isDark ? 'rgba(255,255,255,0.9)' : 'var(--surna-text)');
  const subClr  = isFromMe ? 'rgba(255,255,255,0.55)' : (isDark ? 'rgba(255,255,255,0.5)' : 'var(--surna-text-secondary)');
  const btnBg   = isFromMe ? 'rgba(255,255,255,0.18)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)');
  const btnClr  = isFromMe ? '#ffffff' : (isDark ? 'rgba(255,255,255,0.9)' : 'var(--surna-text)');

  return (
    <div style={{ minWidth: 220 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: subClr, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
        Event Invite
      </p>
      <p style={{ fontSize: 15, fontWeight: 700, color: baseClr, marginBottom: 4, lineHeight: '1.25' }}>{ev.title}</p>
      <p style={{ fontSize: 12, color: subClr, marginBottom: 2 }}>{ev.time}</p>
      <p style={{ fontSize: 12, color: subClr, marginBottom: 12 }}>📍 {ev.location}</p>
      <button
        style={{
          width: '100%',
          height: 34,
          borderRadius: 10,
          background: btnBg,
          border: 'none',
          color: btnClr,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Join Event
      </button>
    </div>
  );
}

export default function MessageBubble({
  message,
  isFromMe,
  showAvatar,
  userAvatar,
  userName,
  onReply,
  onAction,
}: MessageBubbleProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSec, setPlaybackSec] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);
  const [attachedReaction, setAttachedReaction] = useState<string | null>(message.reaction || null);
  const [attachedReactionCount, setAttachedReactionCount] = useState<number>(message.reaction ? 1 : 0);
  const holdTimer = useRef<NodeJS.Timeout>();

  const formatTime = (ds: string) => {
    const d = new Date(ds);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handlePressStart = () => {
    holdTimer.current = setTimeout(() => {
      setShowQuickReactions(true);
      setShowLongPressMenu(true);
    }, 500);
  };
  const handlePressEnd = () => {
    clearTimeout(holdTimer.current);
  };

  const handleReact = (emoji: string) => {
    if (attachedReaction === emoji) {
      setAttachedReaction(null);
      setAttachedReactionCount(0);
    } else {
      setAttachedReaction(emoji);
      setAttachedReactionCount(1);
    }
    setShowQuickReactions(false);
  };

  const handleCopy = useCallback(() => {
    if (message.body) navigator.clipboard.writeText(message.body);
    setShowQuickReactions(false);
    setShowLongPressMenu(false);
  }, [message.body]);

  const t = getMessengerTheme(isDark);
  const sentBg = t.sentBg;
  const sentText = t.sentText;
  const sentShadow = t.sentShadow;
  const recvBg = t.recvBg;
  const recvBorder = t.recvBorder;
  const recvText = t.recvText;
  const recvShadow = t.recvShadow;
  const replyBarClr = t.replyAccent;
  const replyBg = t.replyBg;
  const replyText = t.replyText;
  const timeClr = t.iconMuted;
  const audioActive = isFromMe ? 'rgba(255,255,255,0.9)' : (isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)');
  const audioIdle = isFromMe ? 'rgba(255,255,255,0.4)' : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)');
  const formationPayload = message.body ? parseFormationMessage(message.body.split('\n__SURNA_PLAYER_NOTE__')[0]) : null;
  const billPayload = message.body ? parseBillCardBody(message.body) : null;
  const isPlainText =
    message.kind === "text" &&
    message.body &&
    !formationPayload &&
    !billPayload &&
    !String(message.body).startsWith("__FORWARDED__\n");
  const bubbleRadius = isFromMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px";
  const playerOnlyNote = message.body?.includes('__SURNA_PLAYER_NOTE__')
    ? message.body.split('__SURNA_PLAYER_NOTE__')[1]?.trim()
    : null;

  return (
    <>
      {/* Long-press overlays */}
      {(showQuickReactions || showLongPressMenu) && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => { setShowQuickReactions(false); setShowLongPressMenu(false); }}
        />
      )}

      <div
        className={cn('flex w-full', isFromMe ? 'justify-end' : 'justify-start')}
        style={{ marginBottom: 2 }}
        data-testid={`message-${message.id}`}
      >
        <div
          className={cn('flex items-end', isFromMe ? 'flex-row-reverse' : 'flex-row')}
          style={{ gap: 8, maxWidth: '82%', position: 'relative' }}
        >
          {/* Avatar */}
          {showAvatar && !isFromMe ? (
            <img
              src={userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.sender_id}`}
              alt={userName}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                marginBottom: 4,
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              }}
            />
          ) : !isFromMe ? (
            <div style={{ width: 28, flexShrink: 0 }} />
          ) : null}

          <div style={{ position: 'relative' }}>
            {/* Reaction bubble (floating) */}
            {showQuickReactions && (
              <div
                style={{
                  position: 'absolute',
                  [isFromMe ? 'right' : 'left']: 0,
                  bottom: '110%',
                  display: 'flex',
                  gap: 4,
                  padding: '8px 12px',
                  borderRadius: 28,
                  background: isDark ? 'rgba(28,28,30,0.96)' : 'rgba(255,255,255,0.98)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  zIndex: 51,
                  animation: 'reactionPopIn 120ms cubic-bezier(0.34,1.56,0.64,1)',
                  whiteSpace: 'nowrap',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    style={{
                      fontSize: 22,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 3px',
                      borderRadius: 8,
                      transition: 'transform 100ms ease',
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                  >
                    {emoji}
                  </button>
                ))}
                <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', margin: '0 2px' }} />
                <button
                  onClick={() => { onReply?.(message); setShowQuickReactions(false); setShowLongPressMenu(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  <Reply size={15} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
                </button>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  <Copy size={14} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
                </button>
              </div>
            )}

            {/* Reply quote */}
            {message.replyTo && (
              <div
                style={{
                  borderLeft: `3px solid ${replyBarClr}`,
                  paddingLeft: 8,
                  marginBottom: 5,
                  background: replyBg,
                  borderRadius: '0 8px 8px 0',
                  padding: '4px 8px 4px 8px',
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 600, color: replyBarClr, marginBottom: 1 }}>
                  {message.replyTo.sender_id === 'me' ? 'You' : userName}
                </p>
                <p style={{ fontSize: 12, color: replyText, lineHeight: '1.3' }} className="line-clamp-1">
                  {message.replyTo.body}
                </p>
              </div>
            )}

            {/* Bubble */}
            <div
              onPointerDown={handlePressStart}
              onPointerUp={handlePressEnd}
              onPointerLeave={handlePressEnd}
              style={{
                background: isFromMe ? sentBg : recvBg,
                border: isFromMe ? 'none' : recvBorder,
                boxShadow: isFromMe ? sentShadow : recvShadow,
                borderRadius: bubbleRadius,
                padding: message.kind === 'poll' || message.kind === 'event_card' ? '12px 14px' : '8px 12px 10px',
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              {/* Text */}
              {message.kind === 'text' && formationPayload && (
                <div style={{ margin: '-4px 0' }}>
                  <FormationMessageCard data={formationPayload} viewerUserId={user?.id} />
                  {playerOnlyNote && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: isFromMe ? 'rgba(255,255,255,0.85)' : recvText, fontStyle: 'italic' }}>
                      {playerOnlyNote.replace(/^Your note:\s*/i, '')}
                    </p>
                  )}
                </div>
              )}

              {message.kind === 'text' && billPayload && (
                <BillPaymentCard payload={billPayload} isFromMe={isFromMe} isDark={isDark} />
              )}

              {message.kind === 'text' && message.body && !formationPayload && !billPayload && (
                <>
                  {String(message.body || "").startsWith("__FORWARDED__\n") && (
                    <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 4, color: isFromMe ? sentText : recvText }}>
                      Forwarded
                    </p>
                  )}
                  <p style={{ fontSize: 15, lineHeight: '1.4', color: isFromMe ? sentText : recvText, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, paddingRight: isPlainText ? 52 : 0 }}>
                    {String(message.body || "").replace(/^__FORWARDED__\n/, "")}
                  </p>
                  {isPlainText && (
                    <span
                      style={{
                        float: 'right',
                        marginLeft: 8,
                        marginTop: 4,
                        fontSize: 10,
                        fontWeight: 500,
                        color: isFromMe ? (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.65)') : timeClr,
                        lineHeight: 1,
                      }}
                    >
                      {formatTime(message.created_at)}
                    </span>
                  )}
                </>
              )}

              {/* Audio */}
              {message.kind === 'audio' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: isFromMe ? 'rgba(255,255,255,0.18)' : t.accentSoft,
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {isPlaying
                      ? <Pause size={16} color={isFromMe ? '#fff' : recvText} />
                      : <Play size={16} color={isFromMe ? '#fff' : recvText} />
                    }
                  </button>
                  <AudioWave isPlaying={isPlaying} isFromMe={isFromMe} barActive={audioActive} barIdle={audioIdle} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 11, color: isFromMe ? 'rgba(255,255,255,0.55)' : timeClr, fontFamily: 'monospace' }}>
                      0:15
                    </span>
                    <button
                      onClick={() => setSpeed(s => s === 1 ? 1.5 : s === 1.5 ? 2 : 1)}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: isFromMe ? 'rgba(255,255,255,0.5)' : timeClr,
                        background: isFromMe ? 'rgba(255,255,255,0.1)' : t.accentSoft,
                        border: 'none',
                        borderRadius: 4,
                        padding: '1px 5px',
                        cursor: 'pointer',
                      }}
                    >
                      {speed}×
                    </button>
                  </div>
                </div>
              )}

              {/* Poll */}
              {message.kind === 'poll' && message.poll && (
                <PollCard poll={message.poll} isFromMe={isFromMe} />
              )}

              {/* Event card */}
              {message.kind === 'event_card' && message.eventCard && (
                <EventCardMsg ev={message.eventCard} isFromMe={isFromMe} />
              )}
            </div>

            {/* Attached reaction */}
            {attachedReaction && (
              <div
                style={{
                  position: 'absolute',
                  [isFromMe ? 'left' : 'right']: -6,
                  bottom: -10,
                  background: isDark ? '#1e1e2e' : '#ffffff',
                  borderRadius: 12,
                  padding: '2px 5px',
                  fontSize: 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  lineHeight: 1.4,
                }}
              >
                {attachedReaction} {attachedReactionCount > 0 ? attachedReactionCount : ""}
              </div>
            )}

            {!isPlainText && (
              <div
                style={{
                  marginTop: 3,
                  fontSize: 10,
                  color: timeClr,
                  textAlign: isFromMe ? 'right' : 'left',
                  opacity: 0.85,
                }}
              >
                {formatTime(message.created_at)}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes reactionPopIn {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      {showLongPressMenu && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          onClick={() => { setShowQuickReactions(false); setShowLongPressMenu(false); }}
          style={{ background: 'rgba(0,0,0,0.35)' }}
        >
          <div
            className="w-full rounded-t-3xl p-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? '#121212' : '#ffffff',
              borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
            }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }} />
            {[
              'Reply',
              'Forward',
              'Copy',
              'React',
              'Select',
              'Pin',
              'Report',
              'Delete for me',
              'Delete for everyone',
            ].map((option) => (
              <button
                key={option}
                onClick={() => {
                  if (option === 'Reply') onReply?.(message);
                  if (option === 'Copy') handleCopy();
                  if (option === 'React') setShowQuickReactions(true);
                  if (option !== 'Copy' && option !== 'React' && option !== 'Reply') onAction?.(option, message);
                  setShowLongPressMenu(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 10px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
