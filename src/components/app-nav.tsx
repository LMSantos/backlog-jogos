import { getProfile } from "@/lib/auth";
import { NavBar } from "./nav-bar";

// Reads the session, so it renders inside a <Suspense> in the root layout.
// No menu for visitors or for users who haven't picked a username yet.
export async function AppNav() {
  const profile = await getProfile();
  if (!profile) return null;
  return <NavBar username={profile.username} />;
}
