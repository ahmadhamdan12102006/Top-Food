import React, { useEffect, useRef, useState } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { auth } from '../../services/firebase';
import { getUser, getUserByPhone, migrateLegacyPhoneUser } from '../../services/userService';
import { ensureAuthUserDocument, useAuthStore } from '../../store/useAuthStore';
import type { User } from '../../types';
import Button from '../common/Button';
import {
  buildFullPhoneNumber,
  normalizePhoneDigits,
} from '../../utils/phone';

type AuthStep = 'phone' | 'otp';

const SUPPORTED_COUNTRY_CODES = ['+970', '+972'] as const;

const buildFallbackUser = ({
  userId,
  name,
  phone,
  countryCode,
  role = 'customer',
}: {
  userId: string;
  name: string;
  phone: string;
  countryCode: string;
  role?: User['role'];
}): User => ({
  id: userId,
  name: name.trim() || 'مستخدم جديد',
  phone,
  countryCode,
  role,
  profileImage: null,
  loyaltyPoints: 0,
  addresses: [],
});

const getErrorCode = (error: unknown) =>
  typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: string }).code)
    : undefined;

const getPhoneAuthErrorMessage = (code?: string) => {
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'رقم الهاتف غير صحيح';
    case 'auth/missing-phone-number':
      return 'رقم الهاتف مطلوب';
    case 'auth/invalid-verification-code':
      return 'رمز التحقق غير صحيح';
    case 'auth/code-expired':
      return 'انتهت صلاحية الرمز، حاول مجددًا';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة جدًا. انتظر قليلًا';
    case 'auth/captcha-check-failed':
      return 'فشل التحقق الأمني. أعد المحاولة';
    case 'auth/network-request-failed':
      return 'هناك مشكلة اتصال بالإنترنت';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بالهاتف غير مفعّل في Firebase';
    case 'auth/app-not-authorized':
      return 'هذا الدومين غير مصرح له';
    default:
      return 'حدث خطأ أثناء المتابعة';
  }
};

const isValidLocalPhone = (value: string) => {
  const digits = normalizePhoneDigits(value);
  return digits.length >= 9 && digits.length <= 10;
};

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, setUser } = useAuthStore();

  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [countryCode, setCountryCode] = useState<(typeof SUPPORTED_COUNTRY_CODES)[number]>('+970');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const resetState = () => {
    setStep('phone');
    setPhone('');
    setName('');
    setIsNewUser(null);
    setCountryCode('+970');
    setOtp(['', '', '', '', '', '']);
    setLoading(false);
    setConfirmationResult(null);
  };

  const clearRecaptcha = () => {
    try {
      recaptchaVerifierRef.current?.clear();
    } catch {
      // no-op
    } finally {
      recaptchaVerifierRef.current = null;
      // @ts-ignore
      delete window.recaptchaVerifier;

      const container = document.getElementById('recaptcha-container');
      if (container) {
        container.innerHTML = '';
      }
    }
  };

  useEffect(() => {
    auth.useDeviceLanguage();
  }, []);

  useEffect(() => {
    if (!isAuthModalOpen) {
      resetState();
      clearRecaptcha();
    }
  }, [isAuthModalOpen]);

  const setupRecaptcha = async () => {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    clearRecaptcha();

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => undefined,
    });

    await verifier.render();
    recaptchaVerifierRef.current = verifier;
    // @ts-ignore
    window.recaptchaVerifier = verifier;
    return verifier;
  };

  const handleClose = () => {
    setAuthModalOpen(false);
    resetState();
    clearRecaptcha();
  };

  const handleSendOtp = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();

    if (!isValidLocalPhone(phone)) {
      toast.error('رقم الهاتف غير صحيح');
      return;
    }

    const fullPhone = buildFullPhoneNumber(countryCode, phone);
    if (!fullPhone) {
      toast.error('رقم الهاتف غير صحيح');
      return;
    }

    setLoading(true);

    try {
      // Check if user exists first if we haven't checked yet
      if (isNewUser === null) {
        const existing = await getUserByPhone(phone, countryCode);
        if (!existing) {
          setIsNewUser(true);
          setLoading(false);
          toast('أهلاً بك! يرجى إدخال اسمك ورقم الهاتف للمتابعة في إنشاء حساب جديد', { icon: '👋' });
          return;
        }
        setIsNewUser(false);
      }

      // Strict validation for new user registration
      if (isNewUser) {
        if (!name.trim()) {
          toast.error('يرجى إدخال اسمك الكامل للمتابعة');
          setLoading(false);
          return;
        }
        if (name.trim().length < 3) {
          toast.error('الاسم يجب أن يكون 3 أحرف على الأقل');
          setLoading(false);
          return;
        }
      }

      const verifier = await setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, verifier);
      setConfirmationResult(confirmation);
      setStep('otp');
      toast.success('تم إرسال رمز التحقق');
    } catch (error) {
      console.error('Phone auth error:', error);
      toast.error(getPhoneAuthErrorMessage(getErrorCode(error)));
      clearRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');

    if (code.length !== 6) {
      toast.error('أدخل رمز التحقق كاملًا');
      return;
    }

    if (!confirmationResult) {
      toast.error('أعد إرسال الرمز أولًا');
      return;
    }

    setLoading(true);

    try {
      const result = await confirmationResult.confirm(code);
      const firebaseUser = result.user;
      const formattedPhone = buildFullPhoneNumber(countryCode, phone) || phone;

      let existingUser = await getUser(firebaseUser.uid);

      if (!existingUser) {
        existingUser = await migrateLegacyPhoneUser({
          authUid: firebaseUser.uid,
          phone: formattedPhone,
          countryCode,
        });
      }

      if (existingUser) {
        setUser(existingUser);
        toast.success('تم تسجيل الدخول بنجاح');
      } else {
        const createdUser = await ensureAuthUserDocument(firebaseUser, {
          name: name.trim() || 'مستخدم جديد',
          phone: formattedPhone,
          countryCode,
          role: 'customer',
          profileImage: null,
          loyaltyPoints: 0,
          addresses: [],
        });

        setUser(
          createdUser ||
            buildFallbackUser({
              userId: firebaseUser.uid,
              name: name.trim() || 'مستخدم جديد',
              phone: formattedPhone,
              countryCode,
            })
        );
        toast.success('تم إنشاء حسابك وتسجيل الدخول');
      }

      setAuthModalOpen(false);
      resetState();
      clearRecaptcha();
    } catch (error) {
      console.error('OTP verify error:', error);
      toast.error(getPhoneAuthErrorMessage(getErrorCode(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < otp.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  if (!isAuthModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        <motion.div
          initial={{ y: 48, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-surface-dark"
        >
          <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div>
              <h2 className="text-xl font-black">
                {step === 'phone' ? 'تسجيل الدخول / إنشاء حساب' : 'تأكيد الرمز'}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {step === 'phone'
                  ? 'أدخل رقمك وسنقوم بتسجيل دخولك أو إنشاء حساب تلقائياً'
                  : 'أدخل الرمز المرسل إلى هاتفك'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5">
            {step === 'phone' && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      رقم الهاتف
                    </label>
                    <div className="flex items-center justify-center bg-green-100 rounded-full w-6 h-6 mr-2">
                      <svg viewBox="0 0 24 24" fill="#25D366" width="16" height="16">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex gap-2" dir="ltr">
                    <select
                      value={countryCode}
                      onChange={(event) =>
                        setCountryCode(event.target.value as any)
                      }
                      className="rounded-2xl border border-gray-300 bg-gray-50 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary-main dark:border-gray-700 dark:bg-black"
                    >
                      {SUPPORTED_COUNTRY_CODES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>

                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value);
                        setIsNewUser(null); // Reset when phone changes
                      }}
                      placeholder="رقم الجوال"
                      className="flex-1 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-primary-main dark:border-gray-700 dark:bg-black"
                    />
                  </div>

                  <AnimatePresence>
                    {isNewUser && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2 pt-2"
                      >
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                          الاسم الكامل
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="مثلاً: أحمد جابر"
                          required
                          className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-primary-main dark:border-gray-700 dark:bg-black"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div id="recaptcha-container" />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      جاري الإرسال...
                    </span>
                  ) : (
                    'متابعة'
                  )}
                </Button>
              </form>
            )}

            {step === 'otp' && (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    تم إرسال الرمز إلى
                  </p>
                  <p className="mt-1 text-lg font-black tracking-wider text-primary-dark" dir="ltr">
                    {buildFullPhoneNumber(countryCode, phone)}
                  </p>
                </div>

                <div className="flex justify-center gap-2 md:gap-3" dir="ltr">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="h-14 w-12 rounded-2xl border border-gray-300 bg-gray-50 text-center text-xl font-black shadow-inner transition focus:border-primary-main focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-main/20 dark:border-gray-700 dark:bg-black dark:focus:bg-gray-900"
                    />
                  ))}
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  className="w-full text-lg shadow-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      جاري التحقق...
                    </span>
                  ) : (
                    'تأكيد الدخول'
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setOtp(['', '', '', '', '', '']);
                      clearRecaptcha();
                    }}
                    className="text-sm font-bold text-gray-500 transition hover:text-primary-dark dark:text-gray-400"
                  >
                    تعديل الرقم أو إعادة المحاولة
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default AuthModal;
