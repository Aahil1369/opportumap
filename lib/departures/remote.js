// "Remote", "Anywhere", "Worldwide" in a location: the role has no fixed city (board code ANY,
// status ANY GATE). Its own module so jobStatus does not pull in the city table.
const REMOTE = /(?:^|[^a-z])(?:remote|anywhere|worldwide)(?:[^a-z]|$)/;

export const isRemotePlace = (location) => REMOTE.test(String(location ?? '').toLowerCase());
