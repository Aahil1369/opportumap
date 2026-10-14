import { toggleStartupReaction } from '../../../../../lib/startupToggle.js';

// Toggle the signed-in user's upvote. startups.upvote_count is kept by a trigger.
export async function POST(request, { params }) {
  return toggleStartupReaction(params, { table: 'startup_upvotes', countColumn: 'upvote_count', flag: 'upvoted' });
}
