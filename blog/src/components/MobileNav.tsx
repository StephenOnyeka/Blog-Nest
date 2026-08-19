import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home2,
  Edit,
  SearchNormal1,
  Notification,
  Profile,
  Bookmark2,
  Story,
} from "iconsax-react";
import { useAuth } from "../context/AuthContext";
import { useAuthGate } from "../context/AuthGateContext";
import NotificationsModal from "./NotificationsModal";

interface NavItem {
  label: string;
  icon: typeof Home2;
  to?: string;
  action?: "notifications" | "write" | "profile";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: Home2, to: "/" },
  { label: "Library", icon: Bookmark2, to: "/library" },
  { label: "Stories", icon: Story, to: "/stories" },
  { label: "Write", icon: Edit, action: "write" },
  { label: "Search", icon: SearchNormal1, to: "/search" },
  { label: "Notify", icon: Notification, action: "notifications" },
  { label: "Profile", icon: Profile, action: "profile" },
];

/** Fixed bottom navigation shown only on screens below the lg breakpoint */
export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { openAuthModal } = useAuthGate();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleAction = (item: NavItem) => {
    switch (item.action) {
      case "write":
        if (!isLoggedIn) {
          openAuthModal();
          return;
        }
        navigate("/write");
        return;
      case "notifications":
        if (!isLoggedIn) {
          openAuthModal();
          return;
        }
        setIsNotifOpen(true);
        return;
      case "profile":
        if (!isLoggedIn) {
          openAuthModal();
          return;
        }
        navigate(user?.username ? `/profile/${user.username}` : "/profile/me");
        return;
    }
  };

  const isActive = (item: NavItem) => {
    if (item.action === "profile") {
      return location.pathname.startsWith("/profile");
    }
    if (item.action === "notifications") {
      return isNotifOpen;
    }
    if (item.to) {
      return item.to === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.to);
    }
    return false;
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-[150] lg:hidden bg-white border-t border-neutral-200 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <button
                key={item.label}
                onClick={() =>
                  item.to ? navigate(item.to) : handleAction(item)
                }
                aria-label={item.label}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 cursor-pointer transition-colors ${
                  active
                    ? "text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-700"
                }`}
              >
                <Icon
                  size={20}
                  variant={active ? "Bold" : "Linear"}
                  color="currentColor"
                />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {isLoggedIn && (
        <NotificationsModal
          isOpen={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
        />
      )}
    </>
  );
}
