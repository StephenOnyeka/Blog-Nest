import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'

// Note: StrictMode removed for ReactQuill v2 compatibility with React 19.
// ReactQuill v2 uses findDOMNode internally which is unavailable in StrictMode.
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
