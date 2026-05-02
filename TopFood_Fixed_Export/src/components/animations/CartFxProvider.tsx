import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type FlyMode = 'to-cart' | 'to-trash';

type FlyItem = {
    id: string;
    imageSrc?: string;
    emoji?: string;
    start: { x: number; y: number; w: number; h: number };
    end: { x: number; y: number; w: number; h: number };
    mode: FlyMode;
};

type TriggerOptions = {
    sourceEl: HTMLElement | null;
    targetEl?: HTMLElement | null;
    imageSrc?: string;
    emoji?: string;
};

type CartFxContextType = {
    flyToCart: (options: TriggerOptions) => void;
    flyToTrash: (options: TriggerOptions) => Promise<void>;
};

const CartFxContext = createContext<CartFxContextType | null>(null);

const createId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getRectData = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return {
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
    };
};

const getCenter = (rect: { x: number; y: number; w: number; h: number }) => ({
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2,
});

const getBezierPath = (
    start: { x: number; y: number; w: number; h: number },
    end: { x: number; y: number; w: number; h: number },
    mode: FlyMode
) => {
    const s = getCenter(start);
    const e = getCenter(end);

    const curveHeight =
        mode === 'to-cart'
            ? Math.max(120, Math.abs(s.x - e.x) * 0.22)
            : Math.max(70, Math.abs(s.x - e.x) * 0.12);

    const c1x = s.x + (e.x - s.x) * 0.25;
    const c2x = s.x + (e.x - s.x) * 0.78;
    const c1y = mode === 'to-cart' ? s.y - curveHeight : s.y + 10;
    const c2y = mode === 'to-cart' ? e.y - curveHeight * 0.72 : e.y - 8;

    return `M ${s.x} ${s.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${e.x} ${e.y}`;
};

const ParticleBurst: React.FC<{ x: number; y: number; mode: FlyMode }> = ({
    x,
    y,
    mode,
}) => {
    const particles = Array.from({ length: mode === 'to-cart' ? 8 : 6 });

    return (
        <div className="pointer-events-none fixed inset-0 z-[10000]">
            {particles.map((_, i) => {
                const angle =
                    (Math.PI * 2 * i) / particles.length + (mode === 'to-cart' ? 0 : 0.4);
                const distance = mode === 'to-cart' ? 28 : 22;
                const dx = Math.cos(angle) * distance;
                const dy = Math.sin(angle) * distance;

                return (
                    <motion.span
                        key={i}
                        initial={{
                            opacity: 0.95,
                            scale: 0.9,
                            x,
                            y,
                        }}
                        animate={{
                            opacity: 0,
                            scale: 0.2,
                            x: x + dx,
                            y: y + dy,
                        }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className={`fixed block rounded-full ${mode === 'to-cart' ? 'bg-primary-main' : 'bg-red-500'
                            }`}
                        style={{
                            width: mode === 'to-cart' ? 8 : 6,
                            height: mode === 'to-cart' ? 8 : 6,
                            left: -4,
                            top: -4,
                            boxShadow:
                                mode === 'to-cart'
                                    ? '0 0 12px rgba(255,184,0,0.55)'
                                    : '0 0 10px rgba(239,68,68,0.45)',
                        }}
                    />
                );
            })}
        </div>
    );
};

const FlyingNode: React.FC<{
    item: FlyItem;
    onDone: () => void;
}> = ({ item, onDone }) => {
    const path = getBezierPath(item.start, item.end, item.mode);

    const startCenter = getCenter(item.start);
    const endCenter = getCenter(item.end);

    const startSize = Math.max(Math.min(item.start.w, item.start.h), 44);
    const endSize =
        item.mode === 'to-cart'
            ? Math.max(Math.min(item.end.w, item.end.h), 18)
            : Math.max(Math.min(item.end.w, item.end.h), 12);

    const rotation =
        item.mode === 'to-cart'
            ? [0, -8, 8, 14, 0]
            : [0, -10, 12, -18, 0];

    const scale =
        item.mode === 'to-cart'
            ? [1, 1.08, 0.92, 0.55, 0.22]
            : [1, 0.96, 0.86, 0.46, 0.12];

    const opacity = item.mode === 'to-cart' ? [1, 1, 0.94, 0.6, 0.1] : [1, 0.95, 0.8, 0.35, 0];

    return (
        <>
            <svg className="pointer-events-none fixed inset-0 z-[9998] w-full h-full overflow-visible">
                <defs>
                    <linearGradient
                        id={`trail-${item.id}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                    >
                        <stop
                            offset="0%"
                            stopColor={item.mode === 'to-cart' ? '#f59e0b' : '#ef4444'}
                            stopOpacity="0"
                        />
                        <stop
                            offset="50%"
                            stopColor={item.mode === 'to-cart' ? '#fbbf24' : '#f87171'}
                            stopOpacity="0.55"
                        />
                        <stop
                            offset="100%"
                            stopColor={item.mode === 'to-cart' ? '#fde68a' : '#fecaca'}
                            stopOpacity="0"
                        />
                    </linearGradient>
                </defs>

                <motion.path
                    d={path}
                    fill="none"
                    stroke={`url(#trail-${item.id})`}
                    strokeWidth={item.mode === 'to-cart' ? 8 : 6}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: item.mode === 'to-cart' ? 0.85 : 0.65 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: item.mode === 'to-cart' ? 0.75 : 0.45, ease: 'easeOut' }}
                />
            </svg>

            <motion.div
                className="pointer-events-none fixed z-[9999] overflow-hidden shadow-2xl"
                style={{
                    width: startSize,
                    height: startSize,
                    left: startCenter.x - startSize / 2,
                    top: startCenter.y - startSize / 2,
                    borderRadius: 24,
                    background:
                        item.mode === 'to-cart'
                            ? 'rgba(255,184,0,0.12)'
                            : 'rgba(239,68,68,0.12)',
                    backdropFilter: 'blur(10px)',
                    boxShadow:
                        item.mode === 'to-cart'
                            ? '0 12px 35px rgba(245,158,11,0.28)'
                            : '0 10px 28px rgba(239,68,68,0.22)',
                    border:
                        item.mode === 'to-cart'
                            ? '1px solid rgba(245,158,11,0.25)'
                            : '1px solid rgba(239,68,68,0.22)',
                }}
                initial={{
                    offsetDistance: '0%',
                    rotate: 0,
                    scale: 1,
                    opacity: 1,
                }}
                animate={{
                    offsetDistance: '100%',
                    rotate: rotation,
                    scale,
                    opacity,
                    width: [startSize, startSize * 0.98, startSize * 0.84, endSize + 8, endSize],
                    height: [startSize, startSize * 0.98, startSize * 0.84, endSize + 8, endSize],
                }}
                transition={{
                    duration: item.mode === 'to-cart' ? 0.85 : 0.55,
                    ease: [0.22, 1, 0.36, 1],
                }}
                onAnimationComplete={onDone}
            >
                <motion.div
                    className="w-full h-full"
                    animate={{
                        scale: [1, 1.04, 1],
                    }}
                    transition={{
                        duration: 0.3,
                        repeat: 2,
                        ease: 'easeInOut',
                    }}
                    style={{
                        offsetPath: `path('${path}')`,
                        WebkitOffsetPath: `path('${path}')`,
                    } as any}
                >
                    {item.imageSrc ? (
                        <img
                            src={item.imageSrc}
                            alt=""
                            className="w-full h-full object-cover"
                            draggable={false}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                            {item.emoji || '🍔'}
                        </div>
                    )}
                </motion.div>
            </motion.div>

            <ParticleBurst x={endCenter.x} y={endCenter.y} mode={item.mode} />
        </>
    );
};

export const CartFxProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [items, setItems] = useState<FlyItem[]>([]);
    const timersRef = useRef<number[]>([]);

    const removeById = useCallback((id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const flyToCart = useCallback(
        ({ sourceEl, imageSrc, emoji }: TriggerOptions) => {
            if (!sourceEl) return;

            const cartTarget = document.getElementById('cart-fly-target');
            if (!cartTarget) return;

            const id = createId();

            setItems((prev) => [
                ...prev,
                {
                    id,
                    imageSrc,
                    emoji: emoji || '🍔',
                    start: getRectData(sourceEl),
                    end: getRectData(cartTarget),
                    mode: 'to-cart',
                },
            ]);

            window.dispatchEvent(new CustomEvent('cart-bump'));
        },
        []
    );

    const flyToTrash = useCallback(
        ({ sourceEl, targetEl, imageSrc, emoji }: TriggerOptions) => {
            return new Promise<void>((resolve) => {
                if (!sourceEl || !targetEl) {
                    resolve();
                    return;
                }

                const id = createId();

                setItems((prev) => [
                    ...prev,
                    {
                        id,
                        imageSrc,
                        emoji: emoji || '🗑️',
                        start: getRectData(sourceEl),
                        end: getRectData(targetEl),
                        mode: 'to-trash',
                    },
                ]);

                const resolveTimer = window.setTimeout(() => resolve(), 360);
                timersRef.current.push(resolveTimer);
            });
        },
        []
    );

    React.useEffect(() => {
        return () => {
            timersRef.current.forEach((timer) => window.clearTimeout(timer));
        };
    }, []);

    const value = useMemo(
        () => ({
            flyToCart,
            flyToTrash,
        }),
        [flyToCart, flyToTrash]
    );

    return (
        <CartFxContext.Provider value={value}>
            {children}

            <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
                <AnimatePresence>
                    {items.map((item) => (
                        <FlyingNode
                            key={item.id}
                            item={item}
                            onDone={() => removeById(item.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </CartFxContext.Provider>
    );
};

export const useCartFx = () => {
    const context = useContext(CartFxContext);

    if (!context) {
        throw new Error('useCartFx must be used inside CartFxProvider');
    }

    return context;
};