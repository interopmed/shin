export interface DutyPathologist {
  id?: number | string;
  name: string;
  qualifications: string;
  designation: string;
  slmcRegNo: string;
}

export interface ReportingTechnician {
  name: string;
  designation: string;
  regNo: string;
  staffId?: string | number;
}

export const DEFAULT_DUTY_PATHOLOGIST: DutyPathologist = {
  name: 'Dr. C. S. Fernando',
  qualifications: 'MBBS, MD, FRCPath',
  designation: 'Consultant Clinical Pathologist',
  slmcRegNo: 'SLMC Reg No 19284',
};

const STORAGE_KEY = 'shin_lab_duty_pathologist';

/**
 * Retrieve the active duty pathologist for the current lab session.
 * Checks localStorage first, then falls back to default pathologist configuration.
 */
export function getDutyPathologist(): DutyPathologist {
  if (typeof window === 'undefined') {
    return DEFAULT_DUTY_PATHOLOGIST;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.name) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored duty pathologist:', err);
  }

  return DEFAULT_DUTY_PATHOLOGIST;
}

/**
 * Assign a duty pathologist for the lab session.
 */
export function setDutyPathologist(pathologist: DutyPathologist): void {
  if (typeof window === 'undefined') return;

  try {
    const payload = JSON.stringify(pathologist);
    localStorage.setItem(STORAGE_KEY, payload);
    sessionStorage.setItem(STORAGE_KEY, payload);

    // Notify listeners in other components
    window.dispatchEvent(new CustomEvent('lab_duty_pathologist_updated', { detail: pathologist }));
  } catch (err) {
    console.error('Failed to save duty pathologist to session storage:', err);
  }
}

/**
 * Resolve reporting technician details dynamically from active user context.
 */
export function getReportingTechnician(user: any): ReportingTechnician {
  let rawName =
    user?.displayName ||
    user?.display_name ||
    user?.full_name ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '') ||
    user?.name ||
    user?.username ||
    'Medical Laboratory Technologist';

  // If name is an email (e.g. lisa.brooks32@shin.local), convert to clean title (e.g. Lisa Brooks)
  if (typeof rawName === 'string' && rawName.includes('@')) {
    const localPart = rawName.split('@')[0];
    const cleaned = localPart.replace(/\d+/g, '').replace(/[._-]+/g, ' ').trim();
    if (cleaned) {
      rawName = cleaned
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  const displayName = rawName;

  const designation =
    user?.job_title ||
    user?.jobTitle ||
    (user?.role?.toLowerCase().includes('lab') ? 'Medical Laboratory Technologist' : 'Medical Laboratory Technologist');

  const regNo =
    user?.employee_number ||
    user?.employeeNumber ||
    (user?.id ? `Staff ID: ${user.id}` : 'SLMC Reg No 2312');

  return {
    name: displayName,
    designation: designation,
    regNo: regNo,
    staffId: user?.id,
  };
}
