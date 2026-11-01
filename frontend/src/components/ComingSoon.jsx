import { Link } from 'react-router-dom'
import PageHeader from './PageHeader.jsx'

// Placeholder for pages that aren't built yet, also used as the "not found" page.
export default function ComingSoon({ title = 'Page not found', message = "We couldn't find that page." }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="page">
        <p className="state-msg">{message}</p>
        <Link className="btn btn--primary" to="/">
          Back to my kitchen
        </Link>
      </div>
    </>
  )
}
