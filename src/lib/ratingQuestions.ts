export const STAY_QUESTIONS = [
  "Overall cleanliness of the property and provided amenities",
  "Location and surroundings",
  "Value for money",
  "Host communication and kindness",
  "Would you recommend this property?",
];

export const TRANSPORT_QUESTIONS = [
  "Overall cleanliness of the vehicle and vehicle amenities",
  "Punctuality and time management",
  "Value for money",
  "Safety and Communication",
  "Would you recommend this service?",
];

/**
 * Convert a 0–10 avgScore to a 0–5 star count.
 * 9–10 → 5★  7–9 → 4★  4–7 → 3★  2–4 → 2★  0.5–2 → 1★  <0.5 → 0★
 */
export function ratingToStars(score: number): number {
  if (score >= 9) return 5;
  if (score >= 7) return 4;
  if (score >= 4) return 3;
  if (score >= 2) return 2;
  if (score >= 0.5) return 1;
  return 0;
}
