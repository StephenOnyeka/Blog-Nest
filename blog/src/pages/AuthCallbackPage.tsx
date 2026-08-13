import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = params.get('token');
    if (token) {
      loginWithToken(token);
      navigate('/', { replace: true });
    } else {
      navigate('/?error=auth_failed', { replace: true });
    }
  }, [params, loginWithToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-neutral-500">
      Signing you in…
    </div>
  );
}
