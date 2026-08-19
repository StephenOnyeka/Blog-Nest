import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Setting2, MessageQuestion } from "iconsax-react";
import { useAuth } from "../context/AuthContext";

interface ProfileMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileMenuDropdown({
  isOpen,
  onClose,
}: ProfileMenuDropdownProps) {
  const { user, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Esc key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  // Mask email address like ej••••••••••@gmail.com
  const maskEmail = (email?: string) => {
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    const prefix = local.slice(0, 2);
    const masked = "•".repeat(Math.max(4, local.length - 2));
    return `${prefix}${masked}@${domain}`;
  };

  const firstLetter = (user.name || user.username || "U")[0].toUpperCase();

  return (
    <div
      ref={dropdownRef}
      className="absolute top-14 right-0 w-72 bg-white rounded-lg shadow-xl border border-neutral-200/80 py-2 z-[200] text-neutral-800 text-[14px] animate-in fade-in zoom-in-95 duration-150"
    >
      {/* User Header */}
      <div className="px-5 py-3 flex items-center gap-3">
        <Link
          to={`/profile/${user.username}`}
          onClick={onClose}
          className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-purple-600 text-white flex items-center justify-center font-semibold text-lg hover:opacity-90 transition-opacity"
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{firstLetter}</span>
          )}
        </Link>
        <div className="min-w-0">
          <Link
            to={`/profile/${user.username}`}
            onClick={onClose}
            className="font-medium text-neutral-900 truncate block hover:underline text-[15px]"
          >
            {user.name || user.username}
          </Link>
          <Link
            to={`/profile/${user.username}`}
            onClick={onClose}
            className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors block"
          >
            View profile
          </Link>
        </div>
      </div>

      <div className="h-px bg-neutral-100 my-1" />

      {/* Primary Links */}
      <div className="py-1">
        <Link
          to={`/profile/${user.username}`}
          onClick={onClose}
          className="px-5 py-2.5 flex items-center gap-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
        >
          <Setting2 size={18} className="text-neutral-500" variant="Linear" />
          <span>Settings</span>
        </Link>
        <button
          onClick={onClose}
          className="w-full px-5 py-2.5 flex items-center gap-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors text-left"
        >
          <MessageQuestion
            size={18}
            className="text-neutral-500"
            variant="Linear"
          />
          <span>Help</span>
        </button>
      </div>

      <div className="h-px bg-neutral-100 my-1" />

      {/* Membership & Partner Program */}
      <div className="py-1">
        <button
          onClick={onClose}
          className="w-full px-5 py-2.5 flex items-center justify-between text-amber-600 hover:text-amber-700 hover:bg-amber-50/50 transition-colors text-left font-medium"
        >
          <span>Become a BlogNest member</span>
          <span className="text-amber-500">✦</span>
        </button>
        <button
          onClick={onClose}
          className="w-full px-5 py-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors text-left"
        >
          Apply to the Partner Program
        </button>
      </div>

      <div className="h-px bg-neutral-100 my-1" />

      {/* Sign Out */}
      <div className="py-2 px-5">
        <button
          onClick={() => {
            onClose();
            logout();
          }}
          className="text-neutral-800 hover:text-neutral-900 font-medium text-left block mb-0.5 transition-colors"
        >
          Sign out
        </button>
        <p className="text-[12px] text-neutral-400 truncate">
          {maskEmail(user.email)}
        </p>
      </div>

      <div className="h-px bg-neutral-100 my-1" />

      {/* Footer Links */}
      <div className="px-5 py-2.5 text-[11px] text-neutral-400 flex flex-wrap gap-x-2 gap-y-1">
        <span className="hover:text-neutral-600 cursor-pointer">About</span>
        <span>·</span>
        <span className="hover:text-neutral-600 cursor-pointer">Blog</span>
        <span>·</span>
        <span className="hover:text-neutral-600 cursor-pointer">Careers</span>
        <span>·</span>
        <span className="hover:text-neutral-600 cursor-pointer">Privacy</span>
        <span>·</span>
        <span className="hover:text-neutral-600 cursor-pointer">Terms</span>
        <span>·</span>
        <span className="hover:text-neutral-600 cursor-pointer">
          Text to speech
        </span>
        <span>·</span>
        <span className="hover:text-neutral-600 cursor-pointer">More</span>
      </div>
    </div>
  );
}
