"use client";
import React, { useEffect, useState } from 'react';
import './AnimatedCtaLabel.scss';

const AnimatedCtaLabel = ({
  setDownloadIsReady,
}: {
  setDownloadIsReady: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const messages = [
    { id: 'animatedText1', defaultMessage: 'Initializing...' },
    { id: 'animatedText2', defaultMessage: 'Almost there...' },
    { id: 'animatedText3', defaultMessage: 'Please hold tight for just a moment.' },
    { id: 'animatedText4', defaultMessage: 'Success! You’re all set — let’s continue' },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const isLast = currentIndex === messages.length - 1;

  // advance messages every 2s until the last one
  useEffect(() => {
    if (isLast) return;
    const id = setInterval(() => {
      setCurrentIndex((i) => (i < messages.length - 1 ? i + 1 : i));
    }, 2000);
    return () => clearInterval(id);
  }, [isLast, messages.length]);

  // notify parent exactly once when we reach the last message
  useEffect(() => {
    if (isLast) setDownloadIsReady(true);
    if (isLast) {
    // This event marks animation completion (Creative also listens to state)
    // It's fine to keep both — this one is the direct signal.
    // If you prefer only one, keep this and remove the Creative listener.
    // (But I like both for robustness.)
    try {
      const { track } = require('@/lib/track'); // avoid SSR import issues
      track({ event: 'animation_done', props: { page: 'landing' } });
    } catch {}
      setDownloadIsReady(true);
    }
  }, [isLast, setDownloadIsReady]);

  return (
    <div className="animated-text-container">
      <h4
        key={currentIndex}
        className={`animated-text ${isLast ? 'final' : ''}`}
      >
        {messages[currentIndex].defaultMessage}
      </h4>
    </div>
  );
};

export default AnimatedCtaLabel;
