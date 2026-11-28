// Small message box for form results.  <Banner kind="error">That username is taken.</Banner>
//   kind="error" (red, announced right away)  |  kind="ok" (mint, e.g. "Name saved.")
export default function Banner({ kind = 'error', children }) {
  if (!children) return null
  return (
    <p className={`banner banner--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{kind === 'error' ? '⚠️' : '✓'}</span>
      <span>{children}</span>
    </p>
  )
}
