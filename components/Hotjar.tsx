// components/Hotjar.tsx
'use client';
import { useEffect } from 'react';

export default function Hotjar() {
// <script src="https://t.contentsquare.net/uxa/c08a1cdfba033.js"></script>
    useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t.contentsquare.net/uxa/c08a1cdfba033.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);
  return null;
}