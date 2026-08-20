// Shared Motion Primitives-style stagger variants: a parent that delays each
// child's entrance slightly after the previous one — reused wherever a list
// or row of items should animate in together rather than snap into place.
export const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
export const staggerItem = { hidden: { opacity: 0, y: -6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
