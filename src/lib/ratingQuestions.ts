export const STAY_QUESTIONS = [
  "Overall cleanliness of the property",
  "Accuracy of the listing description",
  "Location and surroundings",
  "Value for money",
  "Host communication and responsiveness",
  "Check-in experience",
  "Comfort of beds and sleeping areas",
  "Kitchen and bathroom facilities",
  "Amenities provided (WiFi, AC, etc.)",
  "Would you recommend this property?",
];

export const TRANSPORT_QUESTIONS = [
  "Overall cleanliness of the vehicle",
  "Driver professionalism and behaviour",
  "Punctuality and time management",
  "Value for money",
  "Vehicle comfort and condition",
  "Air conditioning and in-car amenities",
  "Knowledge of routes and local areas",
  "Communication before and during the trip",
  "Safety and driving standards",
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
