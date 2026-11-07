import { toggleStartupReaction } from '../../../../../lib/startupToggle.js';

// Set the signed-in user's upvote (+1 PASSENGER) to the state in the body, { upvoted: true | false }.
// startups.upvote_count is kept by a trigger.
export async function POST(request, { params }) {
  return toggleStartupReaction(request, params, { table: 'startup_upvotes', countColumn: 'upvote_count', flag: 'upvoted' });
}
