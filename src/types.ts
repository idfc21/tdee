export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export type Formula = 'mifflin' | 'harris' | 'katch';

export type UnitSystem = 'metric' | 'imperial';

export type Goal =
  | 'cut_aggressive'   // -1000 kcal (~1kg fat/week)
  | 'cut_moderate'     // -500 kcal (~0.5kg fat/week)
  | 'cut_slow'         // -250 kcal (~0.25kg fat/week)
  | 'maintain'         // +0 kcal
  | 'bulk_slow'        // +250 kcal
  | 'bulk_moderate'    // +500 kcal;

export type MacroRatio = {
  protein: number; // percentage (e.g. 30)
  carb: number;    // percentage (e.g. 40)
  fat: number;     // percentage (e.g. 30)
};

export type MacroType = 'balanced' | 'high_protein' | 'low_fat' | 'keto' | 'custom';

export interface UserBioProfile {
  gender: Gender;
  weight: number; // always stored in standard unit based on current unitSystem, or converted as needed. Let's store actual value directly
  height: number; // standard cm for metric, inches for imperial (or let's store standard metric internally and convert for rendering, or keep user entered values and convert on-the-fly. On-the-fly is much cleaner and avoids rounding floating-point issues!)
  age: number;
  activityLevel: ActivityLevel;
  bodyFat?: number; // optional body fat percentage
  formula: Formula;
  unitSystem: UnitSystem;
  goal: Goal;
  macroType: MacroType;
  customMacros?: MacroRatio;
  heightFt?: number; // for imperial feet input
  heightIn?: number; // for imperial inches input
}

export interface DailyLog {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number; // in current unit system
  caloriesConsumed: number;
  notes?: string;
}

export interface FoodItemLog {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fat: number;     // in grams
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface MealAllocation {
  breakfast: number; // percentage
  lunch: number; // percentage
  dinner: number; // percentage
  snack: number; // percentage
}
