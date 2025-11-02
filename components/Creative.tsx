"use client"
import React, { useEffect, useState } from 'react';
import AnimatedCtaLabel from './AnimatedCtaLabel';
import SubscribePay from './SubscribePay';
import SubscribePayNE from './SubscribePayNE';

const Creative = () => {
    const [downloadIsReady, setDownloadIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [switchVideoToImg, setSwitchVideoToImg] = useState(false);
    useEffect(() => {
      if (downloadIsReady) {
        const timer = setTimeout(() => {
          setSwitchVideoToImg(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }, [downloadIsReady]);

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
            poster={`/images/download-start.webp`}
          >
            <source src={`/images/download.webm`} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            className="download-animation"
            src={`/images/download-end.webp`}
            alt={`download ready`}
          />
        )}
      </div>
      <AnimatedCtaLabel setDownloadIsReady={setDownloadIsReady} />

      {/* <div
        className={`btn btn-creative start-now-button ${downloadIsReady ? 'fadeIn' : 'hide'}`}
      > */}
        <SubscribePayNE />
      {/* </div> */}
    </div>
  );
};

export default Creative;
