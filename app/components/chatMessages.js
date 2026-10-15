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

// A send that failed stays where it was in the thread, marked, so it can be retried or edited.
export function markFailed(list, id) {
  return patch(list, id, { pending: false, failed: true });
}

// Retrying it: back to "sending".
export function markPending(list, id) {
  return patch(list, id, { pending: true, failed: false });
}

function patch(list, id, fields) {
  const at = list.findIndex((m) => m.id === id);
  if (at === -1) return list;
  const next = list.slice();
  next[at] = { ...list[at], ...fields };
  return next;
}

// Swap the optimistic row for the server row (or drop it: a failed send that is being edited).
export function replaceTemp(list, tempId, serverRow) {
  const without = list.filter((m) => m.id !== tempId);
  if (!serverRow) return without;
  if (without.some((m) => m.id === serverRow.id)) return without;
  const at = list.findIndex((m) => m.id === tempId);
  if (at === -1) return [...without, serverRow];
  return [...list.slice(0, at), serverRow, ...list.slice(at + 1)];
}
