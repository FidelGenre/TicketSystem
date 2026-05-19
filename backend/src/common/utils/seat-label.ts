type TicketSeatLabelInput = {
  sectionName?: string | null;
  rowLabel?: string | null;
  seatNumber?: number | string | null;
};

const isTableName = (value?: string | null) =>
  /\b(mesa|table)\b/i.test(String(value || ''));

export function formatTicketSeatLabel(
  ticket: TicketSeatLabelInput,
  lang: 'es' | 'en' = 'es',
) {
  const sectionName = String(ticket.sectionName || '').trim();
  const rowLabel = String(ticket.rowLabel || '').trim();
  const seatNumber = ticket.seatNumber ?? '';

  if (isTableName(rowLabel)) {
    const tableWord = lang === 'en' ? 'Table' : 'Mesa';
    const chairWord = lang === 'en' ? 'Chair' : 'Silla';
    const tableLabel = sectionName
      ? isTableName(sectionName)
        ? sectionName
        : `${tableWord} ${sectionName}`
      : tableWord;

    return `${tableLabel} - ${chairWord} ${seatNumber}`.trim();
  }

  if (!rowLabel || rowLabel === 'GA') {
    return sectionName || (lang === 'en' ? 'General Admission' : 'Entrada General');
  }

  const rowWord = lang === 'en' ? 'Row' : 'Fila';
  const seatWord = lang === 'en' ? 'Seat' : 'Asiento';
  const seatLabel = `${rowWord} ${rowLabel}, ${seatWord} ${seatNumber}`;

  return sectionName ? `${sectionName} - ${seatLabel}` : seatLabel;
}
