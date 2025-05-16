'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PdfQuizRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/create/pdf');
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Redirecting to the new PDF quiz creator page...</p>
    </div>
  );
}
