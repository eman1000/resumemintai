"use client";
import React, { useEffect, useState } from 'react';
import AnimatedCtaLabel from './AnimatedCtaLabel';
import SubscribePayNE from './SubscribePayNE';
import { track } from '@/lib/track';
import SubscribePay from './SubscribePay';
import SubscribeAllPay from './SubscribeAllPay';

const Creative = () => {
  const [downloadIsReady, setDownloadIsReady] = useState(false);
  const [switchVideoToImg, setSwitchVideoToImg] = useState(false);
  const [walletReady, setWalletReady] = useState(false); // NEW
const [walletSupportKnown, setWalletSupportKnown] = useState(false);
const [walletSupported, setWalletSupported] = useState(false);

  // after we reach the final animated message, wait 2s then swap to image
  useEffect(() => {
    if (!downloadIsReady) return;
    const t = setTimeout(() => setSwitchVideoToImg(true), 2000);
    return () => clearTimeout(t);
  }, [downloadIsReady]);

    useEffect(() => {
    if (downloadIsReady) {
      track({ event: 'animation_done', props: { page: 'landing' } });
    }
  }, [downloadIsReady]);

  // choose which condition counts as "animation is done"
  const showCheckout = downloadIsReady && switchVideoToImg; // or just: const showCheckout = downloadIsReady;

    useEffect(() => {
    if (showCheckout) {
      track({ event: 'checkout_visible', props: { page: 'landing' } });
    }
  }, [showCheckout]);

  useEffect(() => {
    if (!(downloadIsReady && switchVideoToImg) || walletReady) return;
    const t = setTimeout(() => {
      if (!walletReady) {
        track({ event: 'wallet_wait_timeout', props: { page: 'landing' } });
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [downloadIsReady, switchVideoToImg, walletReady]);

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
        {walletSupportKnown && !walletSupported ? (
          <SubscribeAllPay/>
        ) : (
          // Wallet flow (will tell us when supported/unsupported)
          <SubscribePayNE
            onWalletSupportChange={(supported) => {
              setWalletSupportKnown(true);
              setWalletSupported(!!supported);
            }}
            onWalletReadyChange={setWalletReady} 
          />
        )}
      </div>
    )}
    </div>
  );
};

export default Creative;
