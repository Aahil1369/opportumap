// Pure helpers for StartupChat's message list.

// A Realtime INSERT belongs in the open thread only if the other person sent it
// to me about this startup. My own sends come back from POST /api/messages, so
// their Realtime echo is ignored (that echo is what used to show messages twice).
export function acceptIncoming(msg, { currentUserId, otherUserId, startupId }) {
  if (!msg || typeof msg !== 'object') return false;
  return msg.startup_id === startupId
    && msg.sender_id === otherUserId
    && msg.receiver_id === currentUserId;
}

export function appendUnique(list, msg) {
  if (!msg || list.some((m) => m.id === msg.id)) return list;
  return [...list, msg];
}

// Swap the optimistic row for the server row (or drop it when the send failed).
export function replaceTemp(list, tempId, serverRow) {
  const without = list.filter((m) => m.id !== tempId);
  if (!serverRow) return without;
  if (without.some((m) => m.id === serverRow.id)) return without;
  const at = list.findIndex((m) => m.id === tempId);
  if (at === -1) return [...without, serverRow];
  return [...list.slice(0, at), serverRow, ...list.slice(at + 1)];
}
