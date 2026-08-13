import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { SearchNormal1, Edit, Notification, CloseCircle, Eye, EyeSlash } from "iconsax-react";
import { useAuth } from "../context/AuthContext";
import { useAuthGate } from "../context/AuthGateContext";
import { API_BASE_URL } from "../lib/api";
import { useUnreadNotificationCount, useMarkAllNotificationsRead } from "../hooks/queries";

export default function Navbar() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { openAuthModal } = useAuthGate();
  const { data: unreadData } = useUnreadNotificationCount(isLoggedIn);
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = unreadData?.count ?? 0;

  return (
    <nav className="sticky top-0 z-[100] bg-white border-b border-neutral-200 py-3">
      <div className="flex items-center justify-between max-w-[1192px] mx-auto px-6 gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="font-serif text-[26px] font-bold text-neutral-900 tracking-[-0.5px] shrink-0"
        >
          BlogExpress
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-[280px] flex items-center gap-2 bg-neutral-50 rounded-full px-4 py-2 text-neutral-500 text-sm transition-colors hover:bg-neutral-100">
          <SearchNormal1 size={16} variant="Linear" color="currentColor" />
          <input
            className="border-none bg-transparent outline-none text-sm text-neutral-900 w-full font-sans placeholder-neutral-500"
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && navigate(`/search?q=${search}`)
            }
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <Link
                to="/write"
                className="flex items-center gap-1.5 text-neutral-500 text-[15px] font-normal transition-colors py-2 hover:text-neutral-900"
              >
                <Edit size={18} variant="Linear" color="currentColor" />
                <span>Write</span>
              </Link>
              <button
                className="w-9 h-9 rounded-full overflow-hidden cursor-pointer bg-neutral-100 flex items-center justify-center shrink-0 relative"
                aria-label="Notifications"
                onClick={() => markAllRead.mutate()}
              >
                <Notification
                  size={20}
                  className="text-neutral-500"
                  variant="Linear"
                  color="currentColor"
                />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>
              <Link
                to={`/profile/${user?.username}`}
                className="w-9 h-9 rounded-full overflow-hidden cursor-pointer bg-neutral-100 flex items-center justify-center shrink-0"
                aria-label="Profile"
              >
                <img
                  className="w-full h-full object-cover"
                  src={
                    user?.avatar ||
                    "https://api.dicebear.com/9.x/avataaars/svg?seed=me&backgroundColor=ffd5dc"
                  }
                  alt="Your avatar"
                />
              </Link>
            </>
          ) : (
            <>
              <button
                className="flex items-center gap-1.5 text-neutral-500 text-[15px] font-normal transition-colors py-2 hover:text-neutral-900"
                onClick={openAuthModal}
              >
                <Edit size={18} variant="Linear" color="currentColor" />
                <span>Write</span>
              </button>
              <button
                className="text-sm text-neutral-500 font-normal py-2 transition-colors hover:text-neutral-900"
                onClick={openAuthModal}
              >
                Sign in
              </button>
              <button
                className="bg-neutral-900 text-white rounded-full px-5 py-2 text-sm font-medium transition-opacity hover:opacity-85"
                onClick={openAuthModal}
              >
                Get started
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ========== Sign In Modal ========== */
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "signin" | "signup";
  onToggleMode: () => void;
  onSuccess: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  mode,
  onToggleMode,
  onSuccess,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "signin") {
        await login({ email, password });
      } else {
        await register({ name, username, email, password });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-white/95 z-[999] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-10 relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseCircle size={22} variant="Linear" color="currentColor" />
        </button>
        <h2 className="font-serif text-[28px] text-neutral-900 mb-8 mt-2">
          {mode === "signin" ? "Welcome back." : "Join BlogExpress."}
        </h2>

        {error && <div className="text-red-500 mb-2.5">{error}</div>}

        <button
          type="button"
          onClick={() => {
            window.location.href = `${API_BASE_URL}/auth/google`;
          }}
          className="w-full flex items-center justify-center gap-3 border border-neutral-300 rounded-full py-3 text-[15px] font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="w-full flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-neutral-200" />
          <span className="text-xs text-neutral-400">or</span>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          {mode === "signup" && (
            <>
              <input
                className="w-full border-b border-neutral-300 py-2.5 text-[15px] text-neutral-900 mb-6 bg-transparent outline-none focus:border-neutral-900 focus:border-b-2 transition-colors"
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                className="w-full border-b border-neutral-300 py-2.5 text-[15px] text-neutral-900 mb-6 bg-transparent outline-none focus:border-neutral-900 focus:border-b-2 transition-colors"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </>
          )}
          <input
            className="w-full border-b border-neutral-300 py-2.5 text-[15px] text-neutral-900 mb-6 bg-transparent outline-none focus:border-neutral-900 focus:border-b-2 transition-colors"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative mb-6">
            <input
              className="w-full border-b border-neutral-300 py-2.5 pr-9 text-[15px] text-neutral-900 bg-transparent outline-none focus:border-neutral-900 focus:border-b-2 transition-colors"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeSlash size={18} variant="Linear" color="currentColor" />
              ) : (
                <Eye size={18} variant="Linear" color="currentColor" />
              )}
            </button>
          </div>
          <button
            className="w-full bg-neutral-900 text-white rounded-full py-3 mt-4 text-[15px] font-medium transition-opacity hover:opacity-85"
            type="submit"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-sm text-neutral-500">
          {mode === "signin"
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            type="button"
            className="text-neutral-900 font-medium cursor-pointer"
            onClick={onToggleMode}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
