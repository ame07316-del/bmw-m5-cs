/**
 * Arabic labels for data stored in English in the database/demo data.
 * The public site is Arabic-only, so every English enum-ish value
 * (specialty, category, service name) is mapped here instead of being
 * repeated inside components.
 */

export const SPECIALTY_AR: Record<string, string> = {
  Orthodontics: 'تقويم الأسنان',
  'Oral Surgery': 'جراحة الفم والأسنان',
  'Cosmetic Dentistry': 'تجميل الأسنان',
  'General Dentistry': 'طب أسنان عام',
  Preventive: 'طب أسنان وقائي',
  Restorative: 'طب أسنان ترميمي',
  Cosmetic: 'تجميل الأسنان',
  Emergency: 'طوارئ أسنان',
};

export function specialtyAr(specialty: string): string {
  return SPECIALTY_AR[specialty] ?? specialty;
}

type DentistLike = {
  firstName: string;
  lastName: string;
  nameAr?: string | null;
};

/** «د. سارة سميث» — Arabic name when available, English otherwise. */
export function dentistDisplayName(dentist: DentistLike): string {
  return `د. ${dentist.nameAr ?? `${dentist.firstName} ${dentist.lastName}`.trim()}`;
}

type ServiceLike = {
  name: string;
  nameAr?: string | null;
  category?: string | null;
  categoryAr?: string | null;
};

export function serviceNameAr(service: ServiceLike): string {
  return service.nameAr ?? service.name;
}

export function serviceCategoryAr(service: ServiceLike): string {
  return service.categoryAr ?? (service.category ? specialtyAr(service.category) : '');
}
