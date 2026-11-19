import AuthForm from '../components/AuthForm.jsx'
import PageHeader from '../components/PageHeader.jsx'
import '../styles/account.css'

// >>> MAIKA: skeleton only (Jonathan). The form itself is components/AuthForm.jsx.
export default function Signup() {
  return (
    <>
      <PageHeader title="Create an account" subtitle="Your kitchen, on any device" />
      <div className="page account-page">
        <AuthForm mode="signup" />
      </div>
    </>
  )
}
