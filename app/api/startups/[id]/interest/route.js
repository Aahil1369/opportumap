import { toggleStartupReaction } from '../../../../../lib/startupToggle.js';

// Set the signed-in user's interest (STANDBY) to the state in the body, { interested: true | false }.
// startups.interest_count is kept by a trigger.
export async function POST(request, { params }) {
  return toggleStartupReaction(request, params, { table: 'startup_interests', countColumn: 'interest_count', flag: 'interested' });
}
