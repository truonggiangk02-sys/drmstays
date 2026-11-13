/**
 * Real guest reviews shown on the home page. The section stays hidden while this list is empty,
 * so nothing invented is ever shown. Add only reviews the guest has agreed to publish.
 */
export type Testimonial = { id: string; quote_vi: string; quote_en: string; name: string; detail_vi: string; detail_en: string };

export const testimonials: Testimonial[] = [];
