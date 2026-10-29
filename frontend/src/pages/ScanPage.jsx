// BARE-BONES scan page (Jonathan). No styling on purpose: Maika, restyle or
// rebuild the layout however you like. The pieces that matter:
//   <BarcodeScanner onDetected={...} />   camera -> barcode string
//   api.getProductByBarcode(code)          barcode -> Product, or null if unknown
//
// Product = { barcode, name, brand, image, category }  (brand/image/category may be null)

import { useState } from 'react';
import BarcodeScanner from '../components/BarcodeScanner';
import { api } from '../api/client';

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState('');
  const [product, setProduct] = useState(null);
  const [message, setMessage] = useState('');

  async function lookUp(barcode) {
    setScanning(false);
    setCode(barcode);
    setProduct(null);
    setMessage(`Looking up ${barcode}...`);
    try {
      const found = await api.getProductByBarcode(barcode);
      if (found) {
        setProduct(found);
        setMessage('');
      } else {
        setMessage(`Not found: ${barcode} (this is where manual add would open)`);
      }
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div>
      <h1>Scan</h1>

      {scanning ? (
        <div>
          <BarcodeScanner
            active
            onDetected={lookUp}
            onError={(text) => {
              setScanning(false);
              setMessage(text);
            }}
          />
          <button type="button" onClick={() => setScanning(false)}>Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setScanning(true)}>Start scanning</button>
      )}

      {/* No camera? Type a barcode instead, e.g. 737628064502 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) lookUp(code.trim());
        }}
      >
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="or type a barcode" />
        <button type="submit">Look up</button>
      </form>

      {message && <p>{message}</p>}

      {product && (
        <div>
          {product.image && <img src={product.image} alt={product.name} width="120" />}
          <p>Name: {product.name}</p>
          <p>Brand: {product.brand ?? '-'}</p>
          <p>Category: {product.category ?? '-'}</p>
          <p>Barcode: {product.barcode}</p>
        </div>
      )}
    </div>
  );
}
