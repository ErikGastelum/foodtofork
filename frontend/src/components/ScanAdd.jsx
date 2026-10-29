// Scan-to-add flow (owner: Jonathan): camera -> barcode -> backend -> inventory.
//
//   <ScanAdd
//     onAdd={(product) => addToInventory(product)}        // Product from API_CONTRACT
//     onManualAdd={(barcode) => navigate('/add-manual')}  // unknown barcode or no camera
//   />
//
// Markup is deliberately plain with class names so the UI can be styled to
// match the rest of the app.

import { useState } from 'react';
import { api } from '../api/client';
import BarcodeScanner from './BarcodeScanner';

export default function ScanAdd({ onAdd, onManualAdd }) {
  // scanning | looking-up | added | not-found | error
  const [status, setStatus] = useState('scanning');
  const [product, setProduct] = useState(null);
  const [message, setMessage] = useState('');
  const [barcode, setBarcode] = useState(null);

  const scanAgain = () => {
    setProduct(null);
    setMessage('');
    setBarcode(null);
    setStatus('scanning');
  };

  const handleDetected = async (code) => {
    setBarcode(code);
    setStatus('looking-up');
    try {
      const found = await api.getProductByBarcode(code);
      if (!found) {
        setStatus('not-found');
        setMessage(`We couldn't find barcode ${code}. Add it by name instead.`);
        onManualAdd?.(code);
        return;
      }
      setProduct(found);
      setStatus('added');
      onAdd?.(found);
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  const handleCameraError = (text) => {
    setStatus('error');
    setMessage(text);
  };

  return (
    <section className="scan-add">
      <BarcodeScanner
        active={status === 'scanning'}
        onDetected={handleDetected}
        onError={handleCameraError}
      />

      <div className="scan-add__status" role="status" aria-live="polite">
        {status === 'scanning' && <p>Point the camera at a barcode.</p>}
        {status === 'looking-up' && <p>Looking up {barcode}…</p>}

        {status === 'added' && product && (
          <div className="scan-add__product">
            {product.image && <img src={product.image} alt="" width="64" height="64" />}
            <div>
              <p className="scan-add__name">Added {product.name}</p>
              {product.brand && <p className="scan-add__brand">{product.brand}</p>}
            </div>
          </div>
        )}

        {(status === 'not-found' || status === 'error') && <p className="scan-add__error">{message}</p>}
      </div>

      <div className="scan-add__actions">
        {status !== 'scanning' && status !== 'looking-up' && (
          <button type="button" onClick={scanAgain}>
            {status === 'added' ? 'Scan next item' : 'Try again'}
          </button>
        )}
        {onManualAdd && (status === 'not-found' || status === 'error') && (
          <button type="button" onClick={() => onManualAdd(barcode)}>
            Add by name
          </button>
        )}
      </div>
    </section>
  );
}
