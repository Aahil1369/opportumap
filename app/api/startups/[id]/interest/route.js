import { toggleStartupReaction } from '../../../../../lib/startupToggle.js';

// Toggle the signed-in user's interest. startups.interest_count is kept by a trigger.
export async function POST(request, { params }) {
  return toggleStartupReaction(params, { table: 'startup_interests', countColumn: 'interest_count', flag: 'interested' });
}
