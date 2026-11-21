// "Maika Pangilinan" -> "MP". Falls back to the first letters of the username.
export function initialsOf(user) {
  const first = (user?.first_name || '').trim()[0] || ''
  const last = (user?.last_name || '').trim()[0] || ''
  const letters = first + last
  return (letters || (user?.username || '?').slice(0, 2)).toUpperCase()
}
