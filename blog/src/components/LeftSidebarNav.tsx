import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthGate } from "../context/AuthGateContext";
import { useFollowing } from "../hooks/queries";
import { WHO_TO_FOLLOW } from "../data/mockData";
import {
  Home2,
  Bookmark2,
  Profile,
  Story,
  Chart,
  ProfileAdd,
} from "iconsax-react";

const NAV_LINKS = [
  { label: "Home", icon: Home2, to: "/" },
  { label: "Library", icon: Bookmark2, to: "/library" },
  { label: "Profile", icon: Profile, to: "/profile/me" },
  { label: "Stories", icon: Story, to: "/stories" },
  { label: "Stats", icon: Chart, to: "/stats" },
];

export default function LeftSidebarNav() {
  const location = useLocation();
  const { user, isLoggedIn } = useAuth();
  const { openAuthModal } = useAuthGate();
  const { data: followedUsers, isLoading } = useFollowing(user?.id);

  // Resolve profile link to actual username if logged in
  const resolvedLinks = NAV_LINKS.map((link) => {
    if (link.label === "Profile" && isLoggedIn && user?.username) {
      return { ...link, to: `/profile/${user.username}` };
    }
    return link;
  });

  // Display DB-followed users if logged in; fall back to WHO_TO_FOLLOW mock array for guests
  const displayAuthors = isLoggedIn
    ? (followedUsers ?? []).map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        avatar:
          u.avatar ||
          `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.username}`,
      }))
    : WHO_TO_FOLLOW;

  return (
    <nav className="sticky top-20 self-start hidden lg:flex flex-col gap-0 w-[220px] shrink-0 pr-6">
      {/* Primary Navigation */}
      <ul className="flex flex-col gap-0.5 mb-6">
        {resolvedLinks.map(({ label, icon: Icon, to }) => {
          const isActive =
            to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(to);
          const isProfileGuest = label === "Profile" && !isLoggedIn;
          const className = `flex items-center gap-3 px-4 py-2.5 rounded-lg text-[15px] font-normal transition-colors ${
            isActive
              ? "text-neutral-900 font-medium"
              : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
          }`;
          return (
            <li key={label} className="relative">
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-neutral-900" />
              )}
              {isProfileGuest ? (
                <button
                  onClick={openAuthModal}
                  className={`${className} w-full cursor-pointer`}
                >
                  <Icon
                    size={22}
                    variant="Linear"
                    color="currentColor"
                  />
                  <span>{label}</span>
                </button>
              ) : (
                <Link
                  to={to}
                  className={className}
                >
                  <Icon
                    size={22}
                    variant={isActive ? "Bold" : "Linear"}
                    color="currentColor"
                  />
                  <span>{label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="h-px bg-neutral-200 mb-6" />

      {/* Following Section */}
      <div>
        <div className="flex items-center gap-2.5 px-4 mb-3 text-[13px] font-semibold text-neutral-500 uppercase tracking-wide">
          <Profile size={16} variant="Linear" color="currentColor" />
          <span>Following</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-2 text-xs text-neutral-400">
            Loading following...
          </div>
        ) : displayAuthors.length > 0 ? (
          displayAuthors.map((author) => (
            <Link
              key={author.id}
              to={`/profile/${author.username}`}
              className="flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-[14px] text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-neutral-200">
                  <img
                    src={author.avatar}
                    alt={author.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="truncate font-normal group-hover:font-medium transition-all">
                  {author.name}
                </span>
              </div>
              {/* Online status dot */}
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            </Link>
          ))
        ) : (
          <div className="px-4 py-1 text-xs text-neutral-400">
            Not following anyone yet
          </div>
        )}

        {/* Find writers CTA */}
        <div className="px-4 mt-4">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
              <ProfileAdd size={15} variant="Linear" color="#9ca3af" />
            </div>
            <div>
              <p className="text-[13px] text-neutral-500 leading-snug">
                Find writers and publications to follow.
              </p>
              <Link
                to="/"
                className="text-[13px] text-neutral-900 font-medium underline underline-offset-2 hover:opacity-70 transition-opacity mt-0.5 inline-block"
              >
                See suggestions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
