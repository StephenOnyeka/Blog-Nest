import { useState } from 'react';
import { useSubscribe } from '../hooks/queries';

export default function Footer() {
  const links = [
    'Help', 'Status', 'About', 'Careers', 'Blog',
    'Privacy', 'Terms', 'Text to speech', 'Teams'
  ];

  const [email, setEmail] = useState('');
  const subscribeMutation = useSubscribe();
  const status = subscribeMutation.isPending
    ? 'loading'
    : subscribeMutation.isSuccess
      ? 'done'
      : subscribeMutation.isError
        ? 'error'
        : 'idle';

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribeMutation.mutate(
      { email, newsletter: true },
      { onSuccess: () => setEmail('') },
    );
  };

  return (
    <footer className="border-t border-neutral-200 mt-20 py-8 bg-white">
      <div className="max-w-[1192px] mx-auto px-6 flex flex-col gap-5 items-center justify-center">
        <form
          onSubmit={handleSubscribe}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <span className="text-sm text-neutral-500">
            Get the weekly digest
          </span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); if (status !== 'idle') subscribeMutation.reset(); }}
            required
            className="border border-neutral-200 rounded-full px-4 py-2 text-sm outline-none font-sans min-w-[220px] focus:border-neutral-400"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-neutral-900 text-white rounded-full px-[18px] py-2 text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
          {status === 'done' && (
            <span className="text-[13px] text-green-700">
              Check your inbox to confirm!
            </span>
          )}
          {status === 'error' && (
            <span className="text-[13px] text-red-500">Something went wrong.</span>
          )}
        </form>

        <div className="flex flex-wrap justify-center gap-4">
          {links.map(link => (
            <span key={link} className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer">{link}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
