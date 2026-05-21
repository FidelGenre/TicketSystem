export const SOCIAL_MATCH_INTERESTS = [
  { id: 'professional_networking', es: 'Networking profesional', en: 'Professional networking' },
  { id: 'make_friends', es: 'Hacer amigos', en: 'Make friends' },
  { id: 'music_party', es: 'Música y fiesta', en: 'Music and party' },
  { id: 'business', es: 'Negocios', en: 'Business' },
  { id: 'collaborations', es: 'Colaboraciones', en: 'Collaborations' },
  { id: 'singles', es: 'Solteros', en: 'Singles' },
  { id: 'vip_experience', es: 'VIP Experience', en: 'VIP Experience' },
  { id: 'other', es: 'Otros', en: 'Other' },
];

export const getSocialInterestLabel = (id: string, lang: 'es' | 'en') => {
  const item = SOCIAL_MATCH_INTERESTS.find((interest) => interest.id === id);
  return item ? item[lang] : id;
};
