import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Package, Receipt, Truck } from 'lucide-react';

import Button from '../components/common/Button';

const OrderSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const orderId =
    new URLSearchParams(location.search).get('orderId') || location.state?.orderId;
  const isPickup = location.state?.fulfillmentType === 'pickup';

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 shadow-lg dark:bg-green-900/20">
            <CheckCircle2 size={60} className="text-green-600" />
          </div>
        </div>

        <h1 className="mb-3 text-3xl font-black">تم إرسال الطلب بنجاح</h1>

        <p className="mb-6 text-gray-500">
          {isPickup
            ? 'طلبك وصل للمطعم وسيتم تحديث حالته عند التجهيز.'
            : 'طلبك وصل للمطعم ويتم تحضيره الآن.'}
        </p>

        {orderId && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-black">
            <p className="mb-1 text-sm text-gray-500">رقم الطلب</p>
            <p className="text-lg font-black">{orderId}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => navigate(`/track-order?orderId=${orderId}`)}
            className="w-full rounded-2xl py-4 text-lg"
          >
            {isPickup ? <Package size={20} /> : <Truck size={20} />}
            {isPickup ? 'عرض حالة الطلب' : 'تتبع الطلب'}
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate('/menu')}
            className="w-full rounded-2xl py-4"
          >
            <Receipt size={20} />
            طلب جديد
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
