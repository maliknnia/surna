import rateLimit from 'express-rate-limit';

// Stricter rate limiting for messenger endpoints
export const messengerRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: {
    error: 'Too many messages sent. Please wait before sending more.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests in count, only count fails
  skipSuccessfulRequests: true,
});

// Even stricter for sending messages
export const sendMessageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute  
  max: 20, // 20 messages per minute per IP
  message: {
    error: 'Message rate limit exceeded. Please slow down.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Media upload rate limiting
export const mediaUploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute per IP
  message: {
    error: 'Media upload rate limit exceeded. Please wait before uploading more files.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Voice note specific rate limiting (more lenient)
export const voiceNoteRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 voice notes per minute per IP
  message: {
    error: 'Voice message rate limit exceeded. Please wait before recording more.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});