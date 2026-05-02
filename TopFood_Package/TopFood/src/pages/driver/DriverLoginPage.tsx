import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Phone, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useDriverStore } from '../../store/useDriverStore';

const DriverLoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const { driverLogin, isDriverAuthenticated, checkSession } = useDriverStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isDriverAuthenticated) {
      navigate('/driver/dashboard', { replace: true });
    }
  }, [isDriverAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 8) {
      setError('الرجاء إدخال رقم هاتف صحيح');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (pin.length < 4) {
      setError('الرجاء إدخال رمز PIN (4 أرقام)');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    const success = await driverLogin(phone, pin);
    setLoading(false);

    if (success) {
      navigate('/driver/dashboard');
    } else {
      setError('رقم الهاتف أو رمز PIN غير صحيح');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="driver-login-page" dir="rtl">
      <div className="admin-login-bg">
        <div className="admin-login-bg__circle admin-login-bg__circle--1" style={{ background: 'rgba(59,130,246,0.18)' }} />
        <div className="admin-login-bg__circle admin-login-bg__circle--2" style={{ background: 'rgba(139,92,246,0.12)' }} />
        <div className="admin-login-bg__circle admin-login-bg__circle--3" style={{ background: 'rgba(16,185,129,0.08)' }} />
      </div>

      {/* Floating elements */}
      <div className="driver-login-floats">
        <span className="driver-login-float driver-login-float--1">🚚</span>
        <span className="driver-login-float driver-login-float--2">📦</span>
        <span className="driver-login-float driver-login-float--3">🍔</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="admin-login-card driver-login-card"
      >
        <div className="admin-login-card__logo">
          <div className="admin-login-card__logo-icon driver-login-card__logo-icon">
            <Truck size={40} />
          </div>
          <h1 className="admin-login-card__title">صفحة السائق</h1>
          <p className="admin-login-card__subtitle">Top Food — Driver Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-card__form">
          <div className="admin-login-card__input-group">
            <Phone size={20} className="admin-login-card__input-icon" />
            <motion.input
              animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
                placeholder=""
              required
              dir="ltr"
              className="admin-login-card__input driver-login-card__input--phone"
            />
          </div>
          
          <div className="admin-login-card__input-group" style={{ marginTop: '1rem' }}>
            <Lock size={20} className="admin-login-card__input-icon" />
            <motion.input
              animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder=""
              required
              dir="ltr"
              maxLength={6}
              className="admin-login-card__input"
            />
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-login-card__error">
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="admin-login-card__submit driver-login-card__submit"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : (
              <>
                تسجيل دخول
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <a href="/" className="admin-login-card__back">← العودة للموقع</a>
      </motion.div>
    </div>
  );
};

export default DriverLoginPage;
