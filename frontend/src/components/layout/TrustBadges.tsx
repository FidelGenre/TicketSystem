import { HiOutlineCreditCard, HiOutlineShieldCheck, HiOutlineQrcode, HiOutlineSupport } from 'react-icons/hi';
import { useLang } from '@/context/LanguageContext';

type TrustBadgesProps = {
  compact?: boolean;
};

export default function TrustBadges({ compact = false }: TrustBadgesProps) {
  const { lang } = useLang();

  const badges = [
    {
      icon: HiOutlineCreditCard,
      title: lang === 'es' ? 'Pagos seguros' : 'Secure payments',
      text: lang === 'es' ? 'Procesado por Stripe.' : 'Processed by Stripe',
    },
    {
      icon: HiOutlineShieldCheck,
      title: lang === 'es' ? 'Tickets verificados' : 'Verified tickets',
      text: lang === 'es' ? 'Entrada digital protegida.' : 'Protected digital entry',
    },
    {
      icon: HiOutlineQrcode,
      title: lang === 'es' ? 'QR único' : 'Unique QR',
      text: lang === 'es' ? 'Validación rápida en puerta.' : 'Fast door validation',
    },
    {
      icon: HiOutlineSupport,
      title: lang === 'es' ? 'Soporte disponible' : 'Support available',
      text: lang === 'es' ? 'Antes y después de tu compra.' : 'Before and after purchase',
    },
  ];

  return (
    <div className={compact ? 'trust-badges trust-badges-compact' : 'trust-badges'}>
      {badges.map((badge) => {
        const Icon = badge.icon;

        return (
          <div key={badge.title} className="trust-badge-item">
            <span className="trust-badge-icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="trust-badge-copy">
              <strong>{badge.title}</strong>
              <span>{badge.text}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
