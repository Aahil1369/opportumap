// /admin metadata: the owner's dashboard and inbox. Never indexed (the page itself checks the
// signed-in user is the admin, by id; the data behind it is RLS-locked to that user).

export const metadata = {
  title: 'Admin — OpportuMap',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return children;
}
