export interface TopFoodSeedItem {
  name: string;
  price: number;
  description?: string;
}

export interface TopFoodSeedCategory {
  name: string;
  order: number;
  image: string;
  items: TopFoodSeedItem[];
}

const describe = (categoryName: string, itemName: string) =>
  `${itemName} من قسم ${categoryName} في Top Food`;

export const topFoodMenuSeed: TopFoodSeedCategory[] = [
  {
    name: 'برجر لحمة',
    order: 1,
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    items: [
      { name: 'برجر الكلاسيك', price: 18, description: describe('برجر لحمة', 'برجر الكلاسيك') },
      { name: 'تشييز بومب برجر', price: 24, description: describe('برجر لحمة', 'تشييز بومب برجر') },
      { name: 'تكساس روست برجر', price: 25, description: describe('برجر لحمة', 'تكساس روست برجر') },
      { name: 'روست ماستر برجر', price: 35, description: describe('برجر لحمة', 'روست ماستر برجر') },
      { name: 'لوفا برجر', price: 20, description: describe('برجر لحمة', 'لوفا برجر') },
      { name: 'مانشروم برجر', price: 22, description: describe('برجر لحمة', 'مانشروم برجر') },
      { name: 'وايت صوص برجر', price: 24, description: describe('برجر لحمة', 'وايت صوص برجر') },
      { name: 'دبل برجر', price: 26, description: describe('برجر لحمة', 'دبل برجر') },
    ],
  },
  {
    name: 'شيكن برجر',
    order: 2,
    image:
      'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=1200&q=80',
    items: [
      { name: 'تاكيز بلو هيت برجر', price: 18, description: describe('شيكن برجر', 'تاكيز بلو هيت برجر') },
      { name: 'ستيك برجر', price: 20, description: describe('شيكن برجر', 'ستيك برجر') },
      { name: 'سكوفيل برجر', price: 16, description: describe('شيكن برجر', 'سكوفيل برجر') },
      { name: 'كولسلو شيكن برجر', price: 14, description: describe('شيكن برجر', 'كولسلو شيكن برجر') },
      { name: 'تيريكي برجر', price: 22, description: describe('شيكن برجر', 'تيريكي برجر') },
      { name: 'سموكي برجر', price: 22, description: describe('شيكن برجر', 'سموكي برجر') },
      { name: 'بوكس مني برجر (لحمة-شيكن)', price: 35, description: describe('شيكن برجر', 'بوكس مني برجر (لحمة-شيكن)') },
    ],
  },
  {
    name: 'شاورما',
    order: 3,
    image:
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1200&q=80',
    items: [
      { name: 'شاورما جاج - خبز', price: 15, description: describe('شاورما', 'شاورما جاج - خبز') },
      { name: 'شاورما جاج - عربي', price: 20, description: describe('شاورما', 'شاورما جاج - عربي') },
      { name: 'شاورما جاج - لفة', price: 17, description: describe('شاورما', 'شاورما جاج - لفة') },
      { name: 'شاورما جبش - خبز', price: 18, description: describe('شاورما', 'شاورما جبش - خبز') },
      { name: 'شاورما جبش - عربي', price: 24, description: describe('شاورما', 'شاورما جبش - عربي') },
      { name: 'شاورما جبش - لفة', price: 20, description: describe('شاورما', 'شاورما جبش - لفة') },
    ],
  },
  {
    name: 'الباشكا',
    order: 4,
    image:
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    items: [
      { name: 'باشكا جاج', price: 18, description: describe('الباشكا', 'باشكا جاج') },
      { name: 'باشكا جبش', price: 22, description: describe('الباشكا', 'باشكا جبش') },
      { name: 'باشكا لحمة', price: 30, description: describe('الباشكا', 'باشكا لحمة') },
      { name: 'إضافة بطاطا', price: 5, description: describe('الباشكا', 'إضافة بطاطا') },
      { name: 'جبنة إكسترا', price: 3, description: describe('الباشكا', 'جبنة إكسترا') },
    ],
  },
  {
    name: 'وجبات',
    order: 5,
    image:
      'https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&w=1200&q=80',
    items: [
      { name: 'وجبة تندر', price: 22, description: describe('وجبات', 'وجبة تندر') },
      { name: 'وجبة ستيك', price: 25, description: describe('وجبات', 'وجبة ستيك') },
      { name: 'وجبة شنيتسل', price: 25, description: describe('وجبات', 'وجبة شنيتسل') },
      { name: 'وجبة فاهيتا', price: 25, description: describe('وجبات', 'وجبة فاهيتا') },
    ],
  },
  {
    name: 'الأجنحة',
    order: 6,
    image:
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=1200&q=80',
    items: [
      { name: 'أجنحة 10 قطع', price: 20, description: describe('الأجنحة', 'أجنحة 10 قطع') },
      { name: 'أجنحة 16 قطعة', price: 30, description: describe('الأجنحة', 'أجنحة 16 قطعة') },
      { name: 'أجنحة 50 قطعة', price: 80, description: describe('الأجنحة', 'أجنحة 50 قطعة') },
    ],
  },
  {
    name: 'سناكس بطاطا',
    order: 7,
    image:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=80',
    items: [
      { name: 'بطاطا شيبس - صغير', price: 5, description: describe('سناكس بطاطا', 'بطاطا شيبس - صغير') },
      { name: 'بطاطا شيبس - وسط', price: 10, description: describe('سناكس بطاطا', 'بطاطا شيبس - وسط') },
      { name: 'بطاطا شيبس - كبير', price: 15, description: describe('سناكس بطاطا', 'بطاطا شيبس - كبير') },
      { name: 'بطاطا ريبز', price: 10, description: describe('سناكس بطاطا', 'بطاطا ريبز') },
      { name: 'بطاطا زيج زاج', price: 10, description: describe('سناكس بطاطا', 'بطاطا زيج زاج') },
      { name: 'بطاطا شبايك', price: 10, description: describe('سناكس بطاطا', 'بطاطا شبايك') },
      { name: 'بطاطا كيرلي', price: 10, description: describe('سناكس بطاطا', 'بطاطا كيرلي') },
      { name: 'بطاطا ويرجز', price: 10, description: describe('سناكس بطاطا', 'بطاطا ويرجز') },
      { name: 'أصابع موزريلا', price: 10, description: describe('سناكس بطاطا', 'أصابع موزريلا') },
      { name: 'حلقات بصل', price: 10, description: describe('سناكس بطاطا', 'حلقات بصل') },
      { name: 'كرات بطاطا', price: 10, description: describe('سناكس بطاطا', 'كرات بطاطا') },
      { name: 'مكس - شيز', price: 20, description: describe('سناكس بطاطا', 'مكس - شيز') },
    ],
  },
  {
    name: 'ساندوشات',
    order: 8,
    image:
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80',
    items: [
      { name: 'ساندوش صدر جاج', price: 15, description: describe('ساندوشات', 'ساندوش صدر جاج') },
      { name: 'ساندوش زنجر', price: 15, description: describe('ساندوشات', 'ساندوش زنجر') },
      { name: 'ساندوش فاهيتا', price: 16, description: describe('ساندوشات', 'ساندوش فاهيتا') },
      { name: 'سبايسي تشيكن', price: 15, description: describe('ساندوشات', 'سبايسي تشيكن') },
      { name: 'شنيتسل توب فور', price: 15, description: describe('ساندوشات', 'شنيتسل توب فور') },
      { name: 'مسحب جاج', price: 15, description: describe('ساندوشات', 'مسحب جاج') },
    ],
  },
  {
    name: 'سلطات',
    order: 9,
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    items: [
      { name: 'سلطة روكا (جرجير)', price: 15, description: describe('سلطات', 'سلطة روكا (جرجير)') },
      { name: 'سلطة سيزر', price: 12, description: describe('سلطات', 'سلطة سيزر') },
      { name: 'سلطة سيزر مع جاج', price: 18, description: describe('سلطات', 'سلطة سيزر مع جاج') },
      { name: 'سلطة يونانية', price: 15, description: describe('سلطات', 'سلطة يونانية') },
    ],
  },
  {
    name: 'مشروبات',
    order: 10,
    image:
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80',
    items: [
      { name: 'صودا', price: 3, description: describe('مشروبات', 'صودا') },
      { name: 'عصير كابي', price: 3, description: describe('مشروبات', 'عصير كابي') },
      { name: 'كلوب', price: 2, description: describe('مشروبات', 'كلوب') },
      { name: 'كولا 250 مل', price: 3, description: describe('مشروبات', 'كولا 250 مل') },
      { name: 'مياه صغير', price: 2, description: describe('مشروبات', 'مياه صغير') },
      { name: 'مياه كبير', price: 3, description: describe('مشروبات', 'مياه كبير') },
    ],
  },
];
