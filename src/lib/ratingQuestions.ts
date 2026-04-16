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
 * Convert a 0–10 avgScore to a 0–5 star rating (supports half stars).
 * Each question = 2 points, 5 questions = 10 total.
 *
 * ≥9   → 5     | ≥8   → 4.5  | ≥6.5 → 4
 * ≥5.5 → 3.5   | ≥3.5 → 3   | ≥2   → 2
 * ≥0.5 → 1     | <0.5 → 0.5
 */
export function ratingToStars(score: number): number {
  if (score >= 9)   return 5;
  if (score >= 8)   return 4.5;
  if (score >= 6.5) return 4;
  if (score >= 5.5) return 3.5;
  if (score >= 3.5) return 3;
  if (score >= 2)   return 2;
  if (score >= 0.5) return 1;
  return 0.5;
}
