// Pure constants/helpers shared across the chat conversation screen and its
// extracted sub-components. None of these close over component state, so
// they're safe to hoist to module scope (previously recreated on every
// render inside chat-conversation.jsx).

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export const VIEW_ONCE_ERROR_MESSAGES = {
  already_viewed: 'This view-once media has already been opened and can no longer be viewed.',
  sender_cannot_view: "You already sent this — only the recipient can open it, and only once.",
  not_found: 'This media is no longer available.',
  invalid_request: 'Could not open this media. Please try again.',
  server_error: 'Could not open this media. Please try again.',
};

export const CACHE_MAX_MESSAGES = 50; // Cache last 50 messages for fast load

export const REVEAL_THRESHOLD = 30;
export const REVEAL_INTERVAL = 10; // Show prompt every 10 messages after dismissal

// Monotonic message status helper: sent -> delivered -> read
export const statusPriority = {
  sent: 1,
  delivered: 2,
  read: 3,
};

export function mergeStatus(current, next) {
  if (!next) return current || null;
  const c = statusPriority[current] || 0;
  const n = statusPriority[next] || 0;
  return n > c ? next : current;
}

export function deduplicateMessages(messageArray) {
  const seen = new Set();
  return messageArray.filter((msg) => {
    if (!msg.id) return true;
    if (seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });
}
