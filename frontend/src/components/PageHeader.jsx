// The green rounded header at the top of each phone screen.
// On desktop it turns into a plain page title, or disappears when desktop="hide"
// (for pages that have their own desktop heading, like the Recipes banner).
export default function PageHeader({ title, subtitle, desktop = 'show', children }) {
  return (
    <div className={'page-header' + (desktop === 'hide' ? ' page-header--mobile-only' : '')}>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children && <div className="page-header__extra">{children}</div>}
    </div>
  )
}
