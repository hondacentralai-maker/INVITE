import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Phone, RotateCcw, User } from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from './ToastProvider';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, onSuccess }) => {
  const { isAr } = useI18n();
  const { signIn, signUpWithPhone, recoverPasswordWithPin } = useAuth();
  const { notify } = useToast();

  const [mode, setMode] = useState<'login' | 'signup' | 'recover'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const switchMode = (next: 'login' | 'signup' | 'recover') => {
    setMode(next);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    let res: { error: string | null };
    if (mode === 'login') {
      res = await signIn(identifier, password);
    } else if (mode === 'signup') {
      res = await signUpWithPhone({
        phone: identifier,
        password,
        pin,
        fullName,
      });
    } else {
      res = await recoverPasswordWithPin({
        phone: identifier,
        pin,
        newPassword: password,
      });
    }

    setSubmitting(false);

    if (res.error) {
      setFormError(res.error);
      return;
    }

    notify(
      mode === 'login'
        ? isAr
          ? 'تم تسجيل الدخول بنجاح'
          : 'Signed in successfully'
        : mode === 'signup'
          ? isAr
            ? 'تم إنشاء حسابك برقم الهاتف وحفظ رمز PIN بنجاح'
            : 'Phone account created & recovery PIN saved'
          : isAr
            ? 'تمت استعادة كلمة المرور وتسجيل الدخول بنجاح'
            : 'Password reset via PIN & signed in',
      'success',
    );
    setPassword('');
    setPin('');
    onClose();
    onSuccess?.();
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title={
        mode === 'login'
          ? isAr
            ? 'تسجيل الدخول إلى استوديو مراسم'
            : 'Sign In to Marasim'
          : mode === 'signup'
            ? isAr
              ? 'إنشاء حساب برقم الهاتف'
              : 'Create Account with Phone'
            : isAr
              ? 'استرجاع كلمة المرور برمز PIN'
              : 'Recover Password with PIN'
      }
      maxWidthClass="max-w-md"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 rounded-xl bg-[#EFE7D6] p-1 gap-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'login' ? 'bg-[#151412] text-[#FAF6EE]' : 'text-[#524b40]'
              }`}
          >
            {isAr ? 'دخول' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'signup' ? 'bg-[#151412] text-[#FAF6EE]' : 'text-[#524b40]'
              }`}
          >
            {isAr ? 'حساب جديد' : 'Register'}
          </button>
          <button
            type="button"
            onClick={() => switchMode('recover')}
            className={`py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'recover' ? 'bg-[#151412] text-[#FAF6EE]' : 'text-[#524b40]'
              }`}
          >
            {isAr ? 'استرجاع PIN' : 'Recover PIN'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-fullname" className="block text-sm font-semibold mb-1.5">
                {isAr ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7C5F21] absolute top-3.5 start-3.5" aria-hidden="true" />
                <input
                  id="auth-fullname"
                  name="fullName"
                  type="text"
                  required
                  minLength={2}
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isAr ? 'مثال: مصطفى أحمد' : 'e.g. Mustafa Ahmed'}
                  className="w-full min-h-12 ps-10 pe-3 rounded-xl border border-[#B89246]/35 bg-white text-base"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-sm font-semibold mb-1.5">
              {mode === 'login'
                ? isAr
                  ? 'رقم الهاتف (أو البريد الإلكتروني)'
                  : 'Phone Number (or Email)'
                : isAr
                  ? 'رقم الهاتف (أي رقم)'
                  : 'Phone Number'}
            </label>
            <span id="phone-hint" className="block text-[11px] text-[#524b40] mb-1">
              {isAr
                ? 'يمكنك التسجيل بأي رقم هاتف مباشرة (مثال: 01012345678 أو 0501234567)'
                : 'Enter any phone number (6+ digits), e.g. 01012345678'}
            </span>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#7C5F21] absolute top-3.5 start-3.5" aria-hidden="true" />
              <input
                id="auth-email"
                name="identifier"
                type="text"
                inputMode={mode === 'login' ? 'text' : 'tel'}
                required
                minLength={5}
                dir="ltr"
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="phone-hint"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={mode === 'login' ? '01012345678 / email' : '01012345678'}
                className="w-full min-h-12 ps-10 pe-3 rounded-xl border border-[#B89246]/35 bg-white text-base"
              />
            </div>
          </div>

          {(mode === 'signup' || mode === 'recover') && (
            <div>
              <label htmlFor="auth-pin" className="block text-sm font-semibold mb-1.5">
                {isAr ? 'رمز الاسترجاع السري (PIN)' : 'Recovery PIN (4–8 digits)'}
              </label>
              <span id="pin-hint" className="block text-[11px] text-[#524b40] mb-1">
                {mode === 'signup'
                  ? isAr
                    ? 'اختر من 4 إلى 8 أرقام تُستخدم لاسترجاع كلمة المرور عند نسيانها'
                    : 'Choose 4–8 digits used to reset your password if forgotten'
                  : isAr
                    ? 'أدخل رمز الـ PIN المسجل لحسابك (4–8 أرقام)'
                    : 'Enter your saved 4–8 digit recovery PIN'}
              </span>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#7C5F21] absolute top-3.5 start-3.5" aria-hidden="true" />
                <input
                  id="auth-pin"
                  name="pin"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  required
                  minLength={4}
                  maxLength={8}
                  pattern="[0-9٠-٩۰-۹]{4,8}"
                  aria-describedby="pin-hint"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  className="w-full min-h-12 ps-10 pe-3 rounded-xl border border-[#B89246]/35 bg-white text-base tracking-widest font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-password" className="block text-sm font-semibold mb-1.5">
              {mode === 'recover'
                ? isAr
                  ? 'كلمة المرور الجديدة'
                  : 'New Password'
                : isAr
                  ? 'كلمة المرور'
                  : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#7C5F21] absolute top-3.5 start-3.5" aria-hidden="true" />
              <input
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-12 ps-10 pe-12 rounded-xl border border-[#B89246]/35 bg-white text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={
                  showPassword
                    ? isAr
                      ? 'إخفاء كلمة المرور'
                      : 'Hide password'
                    : isAr
                      ? 'إظهار كلمة المرور'
                      : 'Show password'
                }
                className="absolute top-2 end-2 w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#524b40] hover:bg-black/5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchMode('recover')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C5F21] hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isAr ? 'نسيت كلمة المرور؟ استرجعها برمز PIN' : 'Forgot password? Recover with PIN'}</span>
              </button>
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
            >
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-12 rounded-xl bg-[#151412] text-[#FAF6EE] font-bold hover:bg-[#2a2723] disabled:opacity-60 transition-colors"
          >
            {submitting
              ? isAr
                ? 'جارٍ التحقق...'
                : 'Please wait...'
              : mode === 'login'
                ? isAr
                  ? 'تسجيل الدخول'
                  : 'Sign In'
                : mode === 'signup'
                  ? isAr
                    ? 'إنشاء الحساب برقم الهاتف'
                    : 'Create Phone Account'
                  : isAr
                    ? 'تعيين كلمة المرور الجديدة والدخول'
                    : 'Reset Password & Sign In'}
          </button>
        </form>
      </div>
    </ModalDialog>
  );
};
