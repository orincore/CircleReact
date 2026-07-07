// Single source of truth for age math on the client. Mirrors
// Circle-Lastest-Backend/src/server/utils/age.ts so validation matches
// exactly between client and server.

export const MIN_AGE = 16;

export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function isValidDateOfBirth(dateOfBirth) {
  if (!dateOfBirth) return false;
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return false;
  if (dob.getTime() > Date.now()) return false;
  const age = calculateAge(dob);
  return age !== null && age >= MIN_AGE;
}

// Latest birthdate someone could pick and still be MIN_AGE today - used as
// the DateTimePicker's maximumDate so under-16 dates can't even be selected.
export function maxDateOfBirthFor(minAge = MIN_AGE) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - minAge);
  return d;
}

export function formatDateOfBirth(dateOfBirth) {
  if (!dateOfBirth) return '';
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return '';
  return dob.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function toDateOfBirthString(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}
