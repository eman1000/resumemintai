"use client";
import React, { useEffect, useState } from 'react';
import AnimatedCtaLabel from './AnimatedCtaLabel';
import SubscribePayNE from './SubscribePayNE';

const Creative = () => {
  const [downloadIsReady, setDownloadIsReady] = useState(false);
  const [switchVideoToImg, setSwitchVideoToImg] = useState(false);

  // after we reach the final animated message, wait 2s then swap to image
  useEffect(() => {
    if (!downloadIsReady) return;
    const t = setTimeout(() => setSwitchVideoToImg(true), 2000);
    return () => clearTimeout(t);
  }, [downloadIsReady]);

  // choose which condition counts as "animation is done"
  const showCheckout = downloadIsReady && switchVideoToImg; // or just: const showCheckout = downloadIsReady;

  return (
    <div className="above-fold">
      <div className="download-animation__wrapper">
        {!switchVideoToImg ? (
          <video
            className="download-animation"
            autoPlay
            muted
            playsInline
            preload="metadata"
            poster="/images/download-start.webp"
          >
            <source src="/images/download.webm" type="video/webm" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            className="download-animation"
            src="/images/download-end.webp"
            alt="download ready"
          />
        )}
      </div>

      <AnimatedCtaLabel setDownloadIsReady={setDownloadIsReady} />

      {showCheckout && (
        <div className="fadeIn">
          <SubscribePayNE />
        </div>
      )}
    </div>
  );
};

export default Creative;
