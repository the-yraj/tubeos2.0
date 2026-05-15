// src/pages/auth/VerifyEmail.jsx
// Ye page ab OTP-based verification handle karta hai
// /verify-email?token=xxx wala old link flow bhi support karta hai (backward compat)

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, ShieldCheck } from 'lucide-react'
import { authApi } from '../../api/auth.api'
import { useAuthStore } from '../../store/authStore'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

// ==================== OTP INPUT BOXES ====================
const OtpInput = ({ value, onChange }) => {
  const inputs = useRef([])
  const digits = value.split('')

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) return
    const next = digits.slice()
    next[i] = val[val.length - 1]
    onChange(next.join(''))
    if (i < 5 && next[i]) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = digits.slice()
        next[i] = ''
        onChange(next.join(''))
      } else if (i > 0) {
        inputs.current[i - 1]?.focus()
      }
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      onChange(pasted.padEnd(6, '').slice(0, 6))
      inputs.current[Math.min(pasted.length, 5)]?.focus()
    }
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-xl font-bold input-field px-0"
          autoFocus={i === 0}
        />
      ))}
    </div>
  )
}

// ==================== MAIN PAGE ====================
export const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUserFromVerify } = useAuthStore()

  const linkToken = searchParams.get('token')

  // Recover state from localStorage (set during signup)
  const savedUserId = localStorage.getItem('pendingUserId')
  const savedEmail  = localStorage.getItem('pendingEmail')

  const [status, setStatus]     = useState(linkToken ? 'verifying-link' : 'otp-input')
  const [otp, setOtp]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // Countdown timer for resend
  useEffect(() => {
    if (status !== 'otp-input') return
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, status])

  // If link token in URL → auto-verify (backward compat for old emails)
  useEffect(() => {
    if (!linkToken) return
    const verifyLink = async () => {
      try {
        const res = await authApi.verifyEmail(linkToken)
        const { accessToken, refreshToken, user } = res.data.data
        localStorage.setItem('accessToken', accessToken)
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
        localStorage.removeItem('pendingUserId')
        localStorage.removeItem('pendingEmail')
        setUserFromVerify(user, accessToken)
        setStatus('success')
        setTimeout(() => navigate('/dashboard'), 2000)
      } catch {
        setStatus('link-error')
      }
    }
    verifyLink()
  }, [linkToken])

  const handleVerify = async () => {
    if (otp.length !== 6) { toast.error('Enter complete 6-digit OTP'); return }
    if (!savedUserId) { toast.error('Session expired. Please sign up again.'); navigate('/signup'); return }

    setLoading(true)
    try {
      const res = await authApi.verifyEmail(null, { otp, userId: savedUserId })
      const { accessToken, refreshToken, user } = res.data.data

      localStorage.setItem('accessToken', accessToken)
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
      localStorage.removeItem('pendingUserId')
      localStorage.removeItem('pendingEmail')

      setUserFromVerify(user, accessToken)
      setStatus('success')
      toast.success('Email verified! Welcome to TubeOS 🚀')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!savedEmail) { toast.error('Email not found. Please sign up again.'); navigate('/signup'); return }
    setResending(true)
    try {
      await authApi.resendOTP(savedEmail)
      toast.success('New OTP sent!')
      setCountdown(60)
      setCanResend(false)
      setOtp('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setResending(false)
    }
  }

  // ---- Verifying link (loading) ----
  if (status === 'verifying-link') {
    return (
      <div className="text-center py-16">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-400">Verifying your email...</p>
      </div>
    )
  }

  // ---- Success ----
  if (status === 'success') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-emerald/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={28} className="text-emerald" />
        </div>
        <h2 className="font-display font-bold text-white text-2xl mb-2">Email Verified!</h2>
        <p className="text-gray-400 text-sm mb-3">Taking you to your dashboard...</p>
        <Spinner size="sm" className="mx-auto" />
      </div>
    )
  }

  // ---- Link expired/invalid ----
  if (status === 'link-error') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-rose/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <XCircle size={28} className="text-rose" />
        </div>
        <h2 className="font-display font-bold text-white text-2xl mb-2">Link Expired</h2>
        <p className="text-gray-400 text-sm mb-6">
          This verification link is invalid or has expired.
        </p>
        <Button onClick={() => navigate('/signup')}>Sign up again</Button>
      </div>
    )
  }

  // ---- OTP input (main flow) ----
  return (
    <div>
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-brand/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldCheck size={28} className="text-brand" />
        </div>
        <h1 className="font-display font-bold text-white text-2xl mb-2">Verify your email</h1>
        {savedEmail ? (
          <p className="text-gray-400 text-sm">
            We sent a 6-digit code to{' '}
            <span className="text-white font-medium">{savedEmail}</span>
          </p>
        ) : (
          <p className="text-gray-400 text-sm">Enter the 6-digit code sent to your email</p>
        )}
        <p className="text-gray-600 text-xs mt-1">Check spam folder if not received</p>
      </div>

      <div className="space-y-6">
        <OtpInput value={otp} onChange={setOtp} />

        <Button
          fullWidth
          size="lg"
          loading={loading}
          disabled={otp.length !== 6}
          onClick={handleVerify}
        >
          Verify &amp; Continue
        </Button>
      </div>

      <div className="mt-6 text-center space-y-3">
        {canResend ? (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-brand hover:text-brand-light text-sm font-medium transition-colors"
          >
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        ) : (
          <p className="text-gray-500 text-sm">
            Resend OTP in{' '}
            <span className="text-gray-300 font-medium tabular-nums">{countdown}s</span>
          </p>
        )}

        <div>
          <button
            onClick={() => navigate('/signup')}
            className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
          >
            ← Wrong email? Sign up again
          </button>
        </div>
      </div>
    </div>
  )
}
