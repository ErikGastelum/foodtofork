import AuthForm from '../components/AuthForm.jsx'
import PageHeader from '../components/PageHeader.jsx'
import '../styles/account.css'

// >>> MAIKA: skeleton only (Jonathan). The form itself is components/AuthForm.jsx.
export default function Login() {
  return (
    <>
      <PageHeader title="Sign in" subtitle="Welcome back" />
      <div className="page account-page">
        <AuthForm mode="login" />
      </div>
    </>
  )
}
