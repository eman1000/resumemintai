"use client"
import React, { useState, useEffect } from 'react';
import './AnimatedCtaLabel.scss';

const AnimatedCtaLabel = ({setDownloadIsReady}:{setDownloadIsReady: React.Dispatch<React.SetStateAction<boolean>>}) => {
  const messages = [
    { id: 'animatedText1', defaultMessage: 'Initializing...' },
    { id: 'animatedText2', defaultMessage: 'Almost there...' },
    { id: 'animatedText3', defaultMessage: 'Please hold tight for just a moment.' },
    { id: 'animatedText4', defaultMessage: 'Success! You’re all set — let’s continue' }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const isLastMessage = currentIndex === messages.length - 1;

  if (isLastMessage) {
    setDownloadIsReady(true);
  }

  useEffect(() => {
    // Stop updating once the final message is reached.
    if (currentIndex === messages.length - 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex < messages.length - 1 ? prevIndex + 1 : prevIndex));
    }, 2000);

    return () => clearInterval(interval);
  }, [currentIndex, messages.length]);

  return (
    <div className="animated-text-container">
      <h4 key={currentIndex} className={`animated-text ${currentIndex === messages.length - 1 ? 'final' : ''}`}>
        {messages[currentIndex].defaultMessage}
      </h4>
    </div>
  );
};

export default AnimatedCtaLabel;
