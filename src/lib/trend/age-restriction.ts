import { Category, LocationType } from './types';
import { RESTRICTION_RULES } from '../../data/trend/restriction-rules';

export interface RestrictionResult {
  restricted: boolean;
  maxScore: number;
  reason: string | null;
}

export function evaluateRestriction(category: Category, locationType: LocationType | LocationType[]): RestrictionResult {
  const types = Array.isArray(locationType) ? locationType : [locationType];
  for (const rule of RESTRICTION_RULES) {
    if (rule.categories.includes(category) && types.some((t) => rule.restrictedLocations.includes(t))) {
      return { restricted: true, maxScore: rule.maxScore, reason: rule.reason };
    }
  }
  return { restricted: false, maxScore: 100, reason: null };
}
