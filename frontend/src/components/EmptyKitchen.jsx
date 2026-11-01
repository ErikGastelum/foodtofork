import { Link } from 'react-router-dom'
import { useKitchen } from '../context/KitchenContext.jsx'

// Shown whenever the inventory is empty: tells the user what to do next.
export default function EmptyKitchen() {
  const { loadSample } = useKitchen()
  return (
    <div className="state-msg">
      <strong>Your kitchen is empty</strong>
      Add what you have and recipes will appear here.
      <div className="empty-actions">
        <Link className="btn btn--primary" to="/add">
          Add an item
        </Link>
        <button className="btn btn--outline" type="button" onClick={loadSample}>
          Load sample kitchen
        </button>
      </div>
    </div>
  )
}
