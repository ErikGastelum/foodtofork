export default function SearchBar({ value, onChange, placeholder, label, className = '' }) {
  return (
    <label className={`search ${className}`}>
      <span aria-hidden="true">🔍</span>
      <span className="visually-hidden">{label || placeholder}</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}
