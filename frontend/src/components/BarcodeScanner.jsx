// Camera barcode scanner (owner: Jonathan).
//
//   <BarcodeScanner active onDetected={(code) => ...} onError={(msg) => ...} />
//
// Uses ZXing (@zxing/browser), which works in Chrome, Safari (incl. iPhone)
// and Firefox. Reads grocery barcodes only: EAN-13, EAN-8, UPC-A, UPC-E.
// Stops the camera after the first read; set `active` back to true (or
// remount) to scan again.
//
// Camera access needs a secure page: http://localhost or any https:// URL.
// Opening the dev server from a phone at http://192.168.x.x will NOT get the
// camera; test on the deployed https site or use a tunnel.
//
// npm install @zxing/browser @zxing/library

import { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import './BarcodeScanner.css';

const HINTS = new Map([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E],
  ],
]);

const CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' }, // back camera on phones
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

function cameraErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera permission was denied. Allow camera access, or add the item by name.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera found on this device. Add the item by name instead.';
    case 'NotReadableError':
      return 'The camera is being used by another app. Close it and try again.';
    default:
      return 'Could not start the camera. Add the item by name instead.';
  }
}

export default function BarcodeScanner({ active = true, onDetected, onError }) {
  const containerRef = useRef(null);
  // Keep the latest callbacks without restarting the camera on every render.
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  onDetectedRef.current = onDetected;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!active) return undefined;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      onErrorRef.current?.('The camera only works on a secure (https) page. Add the item by name instead.');
      return undefined;
    }

    let cancelled = false;
    let detected = false;
    let controls = null;

    // A fresh <video> per camera session, so a session that is still shutting
    // down (React StrictMode mounts twice in dev) can't blank the new one.
    const video = document.createElement('video');
    video.className = 'barcode-scanner__video';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    containerRef.current.prepend(video);

    const reader = new BrowserMultiFormatReader(HINTS, { delayBetweenScanAttempts: 150 });

    reader
      .decodeFromConstraints(CONSTRAINTS, video, (result, _err, ctrl) => {
        // `_err` fires on every frame without a barcode; that's normal.
        if (!result || detected || cancelled) return;
        detected = true;
        ctrl.stop();
        onDetectedRef.current?.(result.getText());
      })
      .then((ctrl) => {
        controls = ctrl;
        if (cancelled || detected) ctrl.stop();
      })
      .catch((err) => {
        if (!cancelled) onErrorRef.current?.(cameraErrorMessage(err));
      });

    return () => {
      cancelled = true;
      controls?.stop();
      video.remove();
    };
  }, [active]);

  return (
    <div className="barcode-scanner" ref={containerRef}>
      <div className="barcode-scanner__guide" aria-hidden="true" />
    </div>
  );
}
