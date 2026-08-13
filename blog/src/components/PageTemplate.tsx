import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface PageTemplateProps {
  children: ReactNode;
  showFooter?: boolean;
}

export default function PageTemplate({
  children,
  showFooter = true,
}: PageTemplateProps) {
  return (
    <>
      <Navbar />

      <main className="flex-1">
        {children}
      </main>

      {showFooter && <Footer />}
    </>
  );
}
