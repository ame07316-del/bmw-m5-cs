'use client';

import { useAppointments } from './AppointmentProvider';
import { Drawer } from '@/components/ui/Drawer';
import { formatTimeDisplay, formatDateDisplay } from './utils';
import { formatPrice } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from './types';
import type { EnrichedAppointment } from './types';
import { AppointmentHistory } from './AppointmentHistory';

export function AppointmentDetails() {
  const {
    selectedAppointment,
    setSelectedAppointment,
    setEditingAppointment,
    setReschedulingAppointment,
    setFormOpen,
    cancelAppointment,
    updateStatus,
    services,
  } = useAppointments();

  if (!selectedAppointment) return null;

  const apt = selectedAppointment;
  const colors = STATUS_COLORS[apt.status];
  const service = services.find((s) => s.id === apt.serviceId);

  const handleEdit = () => {
    setEditingAppointment(apt);
    setFormOpen(true);
    setSelectedAppointment(null);
  };

  const handleReschedule = () => {
    setReschedulingAppointment(apt);
    setFormOpen(true);
    setSelectedAppointment(null);
  };

  const handleCancel = () => {
    const reason = prompt('Please provide a cancellation reason:');
    if (reason !== null) {
      cancelAppointment(apt.id, reason);
      setSelectedAppointment(null);
    }
  };

  const handleStatusChange = (status: string) => {
    updateStatus(apt.id, status as any);
  };

  const canEdit = apt.status === 'confirmed' || apt.status === 'pending' || apt.status === 'rescheduled';
  const canReschedule = apt.status === 'confirmed' || apt.status === 'pending';
  const canCancel = apt.status === 'confirmed' || apt.status === 'pending' || apt.status === 'waiting';

  return (
    <Drawer
      open={!!selectedAppointment}
      onClose={() => setSelectedAppointment(null)}
      title="Appointment Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colors.bg} ${colors.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
            {STATUS_LABELS[apt.status]}
          </span>
          <span className="text-xs text-nova-text-muted">ID: {apt.id}</span>
        </div>

        {/* Patient Info */}
        <div className="rounded-lg border border-nova-border p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-nova-text-muted">Patient Information</h4>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nova-primary text-white text-sm font-bold">
              {apt.patientName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-nova-text">{apt.patientName}</p>
              <p className="text-xs text-nova-text-secondary">{apt.patientPhone}</p>
              <p className="text-xs text-nova-text-muted">{apt.patientEmail}</p>
            </div>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="rounded-lg border border-nova-border p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-nova-text-muted">Doctor Information</h4>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nova-accent text-nova-primary-dark text-sm font-bold">
              {apt.dentistName.split(' ').slice(1).map((n) => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-nova-text">{apt.dentistName}</p>
              <p className="text-xs text-nova-text-secondary">{service?.name || apt.serviceName}</p>
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className="rounded-lg border border-nova-border p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-nova-text-muted">Service Information</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-nova-text-muted">Service</p>
              <p className="text-sm font-medium text-nova-text">{apt.serviceName}</p>
            </div>
            <div>
              <p className="text-[10px] text-nova-text-muted">Treatment</p>
              <p className="text-sm font-medium text-nova-text">{apt.treatmentType}</p>
            </div>
            <div>
              <p className="text-[10px] text-nova-text-muted">Duration</p>
              <p className="text-sm font-medium text-nova-text">{formatTimeDisplay(apt.startTime)} - {formatTimeDisplay(apt.endTime)}</p>
            </div>
            <div>
              <p className="text-[10px] text-nova-text-muted">Price</p>
              <p className="text-sm font-medium text-nova-text">{apt.price > 0 ? formatPrice(apt.price, 'EGP', 'en') : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Appointment Time */}
        <div className="rounded-lg border border-nova-border p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-nova-text-muted">Appointment Time</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-nova-text-muted">Date</p>
              <p className="text-sm font-medium text-nova-text">{formatDateDisplay(apt.date)}</p>
            </div>
            <div>
              <p className="text-[10px] text-nova-text-muted">Time</p>
              <p className="text-sm font-medium text-nova-text">{formatTimeDisplay(apt.startTime)} - {formatTimeDisplay(apt.endTime)}</p>
            </div>
          </div>
          {apt.originalDate && apt.originalDate !== apt.date && (
            <div className="mt-3 rounded-md bg-purple-50 p-2 dark:bg-purple-900/20">
              <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">Rescheduled From</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                {formatDateDisplay(apt.originalDate)} at {formatTimeDisplay(apt.originalTime || apt.startTime)}
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        {apt.notes && (
          <div className="rounded-lg border border-nova-border p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase text-nova-text-muted">Notes</h4>
            <p className="text-sm text-nova-text-secondary whitespace-pre-wrap">{apt.notes}</p>
          </div>
        )}

        {/* History */}
        <AppointmentHistory appointmentId={apt.id} />

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-nova-border pt-4">
          {canEdit && (
            <button onClick={handleEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-nova-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-nova-primary-dark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          )}
          {canReschedule && (
            <button onClick={handleReschedule} className="inline-flex items-center gap-1.5 rounded-lg border border-nova-primary bg-nova-surface px-3 py-2 text-xs font-semibold text-nova-primary transition-colors hover:bg-nova-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Reschedule
            </button>
          )}
          {canCancel && (
            <button onClick={handleCancel} className="inline-flex items-center gap-1.5 rounded-lg border border-nova-error px-3 py-2 text-xs font-semibold text-nova-error transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Cancel
            </button>
          )}
          {apt.status === 'confirmed' && (
            <button onClick={() => handleStatusChange('in-progress')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700">
              Start Session
            </button>
          )}
          {apt.status === 'in-progress' && (
            <button onClick={() => handleStatusChange('completed')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700">
              Complete
            </button>
          )}
          {apt.status === 'pending' && (
            <button onClick={() => handleStatusChange('confirmed')} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700">
              Confirm
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
