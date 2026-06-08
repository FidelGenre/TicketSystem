import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../theme/colors';
import { useLanguage } from '../i18n/LanguageContext';
import { MobileEvent } from '../types/event';
import { AuthUser } from '../services/api';
import { getEventSections, MobileSection } from '../services/events';
import { createCheckout } from '../services/orders';

type Props = {
  event: MobileEvent;
  user?: AuthUser | null;
  onBack: () => void;
  onPaid: () => void;
};

export function PurchaseScreen({ event, user, onBack, onPaid }: Props) {
  const { t } = useLanguage();
  const [sections, setSections] = useState<MobileSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  // Only general-admission (standing) areas are buyable by quantity here.
  // Seated/table sections need per-seat selection (use the web for those).
  const buyable = useMemo(
    () => sections.filter((s) => s.type === 'standing' && s.available > 0),
    [sections],
  );
  const selected = buyable.find((s) => s.id === selectedId) || buyable[0];

  useEffect(() => {
    let mounted = true;
    getEventSections(event.id)
      .then((items) => {
        if (!mounted) return;
        setSections(items);
        const firstGa = items.find((s) => s.type === 'standing' && s.available > 0);
        if (firstGa) setSelectedId(firstGa.id);
      })
      .catch(() => mounted && setSections([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [event.id]);

  const maxQty = Math.min(selected?.available ?? 1, 10);
  const price = selected?.price ?? 0;
  const subtotal = price * qty;
  const service = subtotal * 0.08 + 1.5;
  const total = subtotal + service;

  const pay = async () => {
    if (!selected) return;
    setError('');
    setPaying(true);
    try {
      const { url } = await createCheckout({
        eventId: event.id,
        sectionId: selected.id,
        quantity: qty,
        buyerEmail: user?.email,
        buyerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || undefined,
      });
      await WebBrowser.openBrowserAsync(url);
      // The browser closed — send the buyer to their tickets, which reflects
      // the real order once Stripe confirms it.
      onPaid();
    } catch (err: any) {
      setError(err?.message || t('No pudimos iniciar el pago.', 'We could not start the payment.'));
    } finally {
      setPaying(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>‹ {t('Evento', 'Event')}</Text>
      </TouchableOpacity>

      <Text style={styles.eyebrow}>{t('CHECKOUT', 'CHECKOUT')}</Text>
      <Text style={styles.title}>{t('Selecciona tus tickets', 'Select your tickets')}</Text>
      <Text style={styles.subtitle}>{event.title}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.orange} />
        </View>
      ) : buyable.length === 0 ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {t(
              'Este evento usa asientos numerados. Por ahora la selección de asientos se hace desde la web.',
              'This event uses numbered seats. Seat selection is available on the web for now.',
            )}
          </Text>
        </View>
      ) : (
        <>
          {buyable.map((s) => {
            const active = s.id === selected?.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => { setSelectedId(s.id); setQty(1); }}
                style={[styles.ticketType, active && styles.ticketTypeActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.typeLabel}>{t('ACCESO GENERAL', 'GENERAL ACCESS')}</Text>
                  <Text style={styles.typeName}>{s.name}</Text>
                  <Text style={styles.typeMeta}>{s.available} {t('disponibles', 'available')}</Text>
                </View>
                <Text style={styles.typePrice}>${s.price.toFixed(2)}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.qtyCard}>
            <Text style={styles.qtyLabel}>{t('Cantidad', 'Quantity')}</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity style={styles.qtyButton} onPress={() => setQty(Math.max(1, qty - 1))}>
                <Text style={styles.qtyButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity style={styles.qtyButton} onPress={() => setQty(Math.min(maxQty, qty + 1))}>
                <Text style={styles.qtyButtonText}>＋</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>{t('Resumen de orden', 'Order summary')}</Text>
            <View style={styles.row}><Text style={styles.rowLabel}>{t('Tickets', 'Tickets')} ({qty})</Text><Text style={styles.rowValue}>${subtotal.toFixed(2)}</Text></View>
            <View style={styles.row}><Text style={styles.rowLabel}>{t('Cargo de servicio', 'Service fee')}</Text><Text style={styles.rowValue}>${service.toFixed(2)}</Text></View>
            <View style={styles.divider} />
            <View style={styles.row}><Text style={styles.totalLabel}>{t('Total', 'Total')}</Text><Text style={styles.totalValue}>${total.toFixed(2)}</Text></View>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={[styles.continueButton, paying && { opacity: 0.6 }]} onPress={pay} disabled={paying}>
            <Text style={styles.continueText}>{paying ? t('ABRIENDO PAGO...', 'OPENING PAYMENT...') : t('PAGAR CON TARJETA', 'PAY WITH CARD')}</Text>
          </TouchableOpacity>
          <Text style={styles.secureNote}>{t('Pago seguro procesado por Stripe.', 'Secure payment processed by Stripe.')}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingTop: 78, paddingBottom: 140 },
  center: { paddingVertical: 60, alignItems: 'center' },
  notice: { marginTop: 18, backgroundColor: 'rgba(249,115,22,0.10)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: 16, padding: 16 },
  noticeText: { color: '#FDBA74', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  backButton: { alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.border },
  backText: { color: colors.navy, fontWeight: '800', fontSize: 14 },
  eyebrow: { color: colors.orange, fontSize: 12, letterSpacing: 4, fontWeight: '800', marginTop: 22 },
  title: { color: colors.navy, fontSize: 32, lineHeight: 36, fontWeight: '800', marginTop: 12 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, fontWeight: '400', marginTop: 8, marginBottom: 22 },
  ticketType: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18, flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 12, alignItems: 'center' },
  ticketTypeActive: { borderColor: colors.orange, borderWidth: 2 },
  typeLabel: { color: colors.orange, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  typeName: { color: colors.navy, fontSize: 19, fontWeight: '800', marginTop: 8 },
  typeMeta: { color: colors.muted, fontSize: 13, fontWeight: '400', marginTop: 6 },
  typePrice: { color: colors.navy, fontSize: 20, fontWeight: '800' },
  qtyCard: { marginTop: 4, backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { color: colors.navy, fontSize: 17, fontWeight: '800' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  qtyButtonText: { color: colors.navy, fontSize: 22, fontWeight: '800' },
  qtyValue: { color: colors.navy, fontSize: 22, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  summary: { marginTop: 16, backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18 },
  summaryTitle: { color: colors.navy, fontSize: 19, fontWeight: '800', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rowLabel: { color: colors.muted, fontSize: 15, fontWeight: '400' },
  rowValue: { color: colors.navy, fontSize: 15, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  totalLabel: { color: colors.navy, fontSize: 18, fontWeight: '800' },
  totalValue: { color: colors.orange, fontSize: 22, fontWeight: '800' },
  error: { color: '#DC2626', fontSize: 13, marginTop: 14, fontWeight: '600' },
  continueButton: { marginTop: 18, height: 56, borderRadius: 8, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  continueText: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: 2.6 },
  secureNote: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 10, fontWeight: '500' },
});
