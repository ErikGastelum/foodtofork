import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client.js'
import BarcodeScanner from '../components/BarcodeScanner.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useKitchen } from '../context/KitchenContext.jsx'
import { emojiFor } from '../utils/foodInfo.js'
import '../styles/scan.css'

const TEST_BARCODE = '737628064502' // the example barcode from docs/API_CONTRACT.md

// Scan screen: Maika's layout around Jonathan's pieces.
//   - <BarcodeScanner>  (components/BarcodeScanner.jsx, Jonathan): camera -> barcode string
//   - api.getProductByBarcode()  (api/client.js, Jonathan): barcode -> Product, or null if unknown
// This page decides what happens next: add the product to the inventory, or send the
// user to manual add when the barcode isn't known (as API_CONTRACT.md says).
//
// >>> JONATHAN: to change how scanning or lookup works, edit your two files above.
// Only the styling in styles/scan.css and the flow below belong to the UI.
export default function Scan() {
  const navigate = useNavigate()
  const { addItem } = useKitchen()
  const [scanning, setScanning] = useState(true) // camera starts when the page opens
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(null) // last product added
  const [message, setMessage] = useState('')

  async function handleDecoded(code) {
    if (busy) return
    setScanning(false) // the scanner stops itself after one read
    setBusy(true)
    setMessage('')
    try {
      const product = await api.getProductByBarcode(code)
      if (!product) {
        navigate('/add') // unknown barcode -> manual add
        return
      }
      addItem(product)
      setAdded(product)
    } catch (e) {
      // ApiError messages from client.js are written to be shown to users.
      setMessage(e instanceof ApiError ? e.message : 'The lookup failed. Try again, or add the item manually.')
    } finally {
      setBusy(false)
    }
  }

  function handleCameraError(text) {
    setScanning(false)
    setMessage(text)
  }

  function scanAgain() {
    setMessage('')
    setScanning(true)
  }

  return (
    <>
      <PageHeader title="Scan a barcode" subtitle="Point your camera at the item" />
      <div className="page scan-page">
        <div className="scanner">
          {scanning ? (
            <>
              <BarcodeScanner active onDetected={handleDecoded} onError={handleCameraError} />
              <p className="scanner__hint">Hold steady…</p>
            </>
          ) : (
            <div className="scanner__idle">
              {busy ? (
                <p>Looking it up…</p>
              ) : (
                <button type="button" className="btn btn--sun" onClick={scanAgain}>
                  {added ? 'Scan next item' : 'Start camera'}
                </button>
              )}
            </div>
          )}
        </div>

        {message && (
          <p className="scan-message" role="alert">
            {message}
          </p>
        )}

        {added && (
          <div className="card scan-result" role="status">
            <span className="item__icon" aria-hidden="true">
              {added.image ? <img src={added.image} alt="" /> : emojiFor(added.name)}
            </span>
            <span className="item__text">
              <span className="item__name">{added.name}</span>
              <span className="item__meta">Found in Open Food Facts</span>
            </span>
            <span className="scan-result__added">✓ Added</span>
          </div>
        )}

        {import.meta.env.DEV && (
          <button type="button" className="btn btn--small btn--outline scan-dev" onClick={() => handleDecoded(TEST_BARCODE)} disabled={busy}>
            Dev only: look up test barcode
          </button>
        )}

        <Link className="btn btn--outline btn--block" to="/add">
          Not found? Add manually
        </Link>
        <Link className="btn btn--primary btn--block" to="/">
          Done
        </Link>
      </div>
    </>
  )
}
