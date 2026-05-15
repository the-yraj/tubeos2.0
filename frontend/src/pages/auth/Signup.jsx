// src/pages/auth/Signup.jsx
import { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, Gift, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/auth.api'
import { Input } from '../../components/ui/Input'
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

// ==================== OTP SCREEN ====================
const OtpScreen = ({ email, userId, onBack }) => {
  const navigate = useNavigate()
  const { setUserFromVerify } = useAuthStore()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleVerify = async () => {
    if (otp.length !== 6) { toast.error('Enter complete 6-digit OTP'); return }
    setLoading(true)
    try {
      const res = await authApi.verifyEmail(null, { otp, userId })
      const { accessToken, refreshToken, user } = res.data.data

      localStorage.setItem('accessToken', accessToken)
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
      localStorage.removeItem('pendingUserId')
      localStorage.removeItem('pendingEmail')

      setUserFromVerify(user, accessToken)
      toast.success('Email verified! Welcome to TubeOS 🚀')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await authApi.resendOTP(email)
      toast.success('New OTP sent to your email!')
      setCountdown(60)
      setCanResend(false)
      setOtp('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setResending(false)
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-brand/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldCheck size={28} className="text-brand" />
        </div>
        <h1 className="font-display font-bold text-white text-2xl mb-2">Verify your email</h1>
        <p className="text-gray-400 text-sm">
          We sent a 6-digit code to{' '}
          <span className="text-white font-medium">{email}</span>
        </p>
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
            onClick={onBack}
            className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
          >
            ← Wrong email? Go back
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== SIGNUP FORM ====================
export const Signup = () => {
  const { register, isLoading } = useAuthStore()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref') || ''

  const [form, setForm] = useState({
    name: '', email: '', password: '', referralCode: refCode,
  })
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})
  const [otpScreen, setOtpScreen] = useState(false)
  const [pendingUserId, setPendingUserId] = useState(null)

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.name.trim() || form.name.length < 2) errs.name = 'Name must be at least 2 characters'
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email required'
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      errs.password = 'Password needs uppercase, lowercase and a number'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const result = await register(form)
    if (result.success) {
      if (result.requiresVerification) {
        localStorage.setItem('pendingUserId', result.userId)
        localStorage.setItem('pendingEmail', form.email)
        setPendingUserId(result.userId)
        setOtpScreen(true)
      }
      // If requiresVerification false → user already verified (no BREVO key), authStore handles redirect
    } else {
      toast.error(result.message || 'Registration failed')
      if (result.message?.toLowerCase().includes('email')) {
        setErrors({ email: 'Email already registered' })
      }
    }
  }

  if (otpScreen) {
    return (
      <OtpScreen
        email={form.email}
        userId={pendingUserId}
        onBack={() => setOtpScreen(false)}
      />
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl mb-2">Create account</h1>
        <p className="text-gray-500 text-sm">
          Join TubeOS and grow your YouTube channel with AI
        </p>
      </div>

      <div className="mb-6 p-3 glass rounded-xl border border-brand/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Founders spots (Creator plan)</span>
          <span className="text-xs font-bold text-brand">88 left</span>
        </div>
        <div className="h-1.5 bg-base-500 rounded-full overflow-hidden">
          <div className="h-full bg-brand-gradient rounded-full" style={{ width: '82%' }} />
        </div>
        <p className="text-2xs text-gray-600 mt-1.5">412/500 spots taken — ₹199/mo locked forever</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          name="name"
          placeholder="Rahul Sharma"
          value={form.name}
          onChange={set('name')}
          icon={User}
          error={errors.name}
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
          icon={Mail}
          error={errors.email}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Password <span className="text-rose">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
              <Lock size={16} />
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Min 8 chars, uppercase + number"
              value={form.password}
              onChange={set('password')}
              className={`input-field pl-10 pr-10 ${errors.password ? 'border-rose/50' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-rose text-xs">{errors.password}</p>}
        </div>

        <Input
          label="Referral Code (Optional)"
          name="referralCode"
          placeholder="e.g. RAHUL4291"
          value={form.referralCode}
          onChange={set('referralCode')}
          icon={Gift}
          hint={form.referralCode ? '🎉 Referral code applied!' : ''}
        />

        <Button type="submit" fullWidth loading={isLoading} size="lg">
          Create Account
        </Button>
      </form>

      <p className="text-gray-600 text-xs text-center mt-4">
        By signing up you agree to our Terms of Service and Privacy Policy.
      </p>

      <div className="mt-6 text-center">
        <p className="text-gray-500 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-brand hover:text-brand-light font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
