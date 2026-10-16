/** Who runs the service and how to reach them; set in apps/web/.env before going live. */
export const OPERATOR = import.meta.env.VITE_OPERATOR_NAME || '[operator name]'
export const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || '[contact email]'
