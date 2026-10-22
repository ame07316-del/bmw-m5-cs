// Supabase database types for NOVA Dental Studio
// These types map to the database schema
// Note: camelCase fields mirror the demo data shape; when wiring to a live
// Supabase project, map snake_case columns to these fields at the API boundary.

export interface Patient {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  nationalId: string | null;
  medicalHistory: string | null;
  allergies: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  avatarUrl?: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface Dentist {
  id: string;
  firstName: string;
  lastName: string;
  /** Optional Arabic full name (UI only). */
  nameAr?: string | null;
  specialty: string;
  /** Optional Arabic label for the specialty (UI only). */
  specialtyAr?: string | null;
  email: string;
  phone: string;
  licenseNumber: string | null;
  rating: number | null;
  patientCount: number | null;
  avatarUrl?: string | null;
  bio?: string | null;
  /** Optional Arabic bio (UI only). */
  bioAr?: string | null;
  qualifications?: string[] | null;
  isActive: boolean;
  schedule?: Record<string, string[]> | null;
  roomNumber?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type AppointmentStatus =
  | 'confirmed'
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'rescheduled'
  | 'waiting'
  | 'delayed';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  dayName: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  treatmentType: string;
  notes: string | null;
  price: number | null;
  currency: string | null;
  isPaid: boolean | null;
  roomNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  nameAr?: string;
  descriptionAr?: string;
  categoryAr?: string;
  price: number;
  currency: string | null;
  durationMinutes: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryImage {
  id: string;
  patientId: string | null;
  dentistId: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  treatmentType: string;
  beforeImageUrl: string | null;
  description: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'appointment'
  | 'payment';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  relatedId: string | null;
  createdAt: string;
}

export interface Billing {
  id: string;
  appointmentId: string;
  patientId: string;
  serviceId: string | null;
  amount: number;
  discount: number | null;
  totalAmount: number;
  currency: string | null;
  status: 'pending' | 'paid' | 'partial' | 'refunded' | 'overdue';
  paymentMethod: string | null;
  invoiceNumber: string | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Schedule {
  id: string;
  dentistId: string;
  date: string;
  dayName: string;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  maxAppointments: number | null;
  isAvailable: boolean;
  createdAt: string;
}

export type DentalSessionStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface DentalSession {
  id: string;
  appointmentId: string;
  patientId: string;
  dentistId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: DentalSessionStatus;
  type: string;
  notes: string | null;
  procedures: string[];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean | null;
  userMetadata: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    role?: 'patient' | 'doctor' | 'secretary' | 'dentist' | 'admin';
  } | null;
  appMetadata: Record<string, unknown> | null;
}

export type Session = DentalSession;