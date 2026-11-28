import { useId, useState } from 'react'

// Password input with a Show / Hide button.
//   <PasswordField label="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
export default function PasswordField({ label, value, onChange, autoComplete, required = true, minLength }) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input id={id} type={shown ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required={required} minLength={minLength} />
        <button type="button" className="password-field__toggle" onClick={() => setShown((s) => !s)} aria-pressed={shown} aria-label={shown ? 'Hide password' : 'Show password'}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  )
}
