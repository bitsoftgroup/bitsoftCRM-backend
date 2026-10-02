/** Last 9 digits only, so "+992 90 123 4567" and "901234567" compare equal. */
export const normalizePhone = (phone: unknown) => String(phone ?? '').replace(/\D/g, '').slice(-9)
