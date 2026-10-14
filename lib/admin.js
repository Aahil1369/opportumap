// Admin / verified checks by auth user id. The id is already public (it is the
// user_id on the admin's community posts); no email address belongs in this repo.
// If the admin account is ever recreated, update this id.
export const ADMIN_USER_ID = '3c60e96c-18e0-4990-91b4-834acd70579e';

export const VERIFIED_USER_IDS = new Set([ADMIN_USER_ID]);

export function isAdminUser(user) {
  return !!user && typeof user.id === 'string' && user.id === ADMIN_USER_ID;
}

export function isVerifiedUserId(id) {
  return typeof id === 'string' && VERIFIED_USER_IDS.has(id);
}
