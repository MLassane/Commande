export type Country = {
  code: string; // code pays ISO (utilisé pour la détection)
  name: string;
  dial: string; // indicatif téléphonique
  digits: number; // nombre de chiffres attendu après l'indicatif
};

export const COUNTRIES: Country[] = [
  { code: "NE", name: "Niger", dial: "+227", digits: 8 },
  { code: "CI", name: "Côte d'Ivoire", dial: "+225", digits: 10 },
  { code: "SN", name: "Sénégal", dial: "+221", digits: 9 },
  { code: "ML", name: "Mali", dial: "+223", digits: 8 },
  { code: "CM", name: "Cameroun", dial: "+237", digits: 9 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Niger
