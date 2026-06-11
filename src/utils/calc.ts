import {
  Gender,
  ActivityLevel,
  Formula,
  Goal,
  MacroRatio,
  MacroType,
  UserBioProfile,
  DailyLog,
  UnitSystem
} from '../types';

// Multipliers for Activity Levels
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

// Goals calorie adjustments
export const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  cut_aggressive: -1000,
  cut_moderate: -500,
  cut_slow: -250,
  maintain: 0,
  bulk_slow: 250,
  bulk_moderate: 500,
};

// Default macro ratios (Protein / Carbs / Fat) in percentages
export const DEFAULT_MACRO_RATIOS: Record<Exclude<MacroType, 'custom'>, MacroRatio> = {
  balanced: { protein: 30, carb: 40, fat: 30 },
  high_protein: { protein: 40, carb: 35, fat: 25 },
  low_fat: { protein: 25, carb: 55, fat: 20 },
  keto: { protein: 25, carb: 5, fat: 70 },
};

// Unit conversion functions
export const lbsToKg = (lbs: number): number => lbs * 0.45359237;
export const kgToLbs = (kg: number): number => kg / 0.45359237;
export const inToCm = (inches: number): number => inches * 2.54;
export const cmToIn = (cm: number): number => cm / 2.54;

/**
 * Calculates BMR in kcal/day using specified inputs (all metric)
 */
export function calculateBMR(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
  formula: Formula,
  bodyFat?: number
): number {
  if (formula === 'katch' && bodyFat !== undefined && bodyFat > 0) {
    // Katch-McArdle: 370 + 21.6 * LBM(kg)
    const leanBodyMassKg = weightKg * (1 - bodyFat / 100);
    return 370 + 21.6 * leanBodyMassKg;
  }

  if (formula === 'harris') {
    // Revised Harris-Benedict
    if (gender === 'male') {
      return 13.397 * weightKg + 4.799 * heightCm - 5.677 * age + 88.362;
    } else {
      return 9.247 * weightKg + 3.098 * heightCm - 4.33 * age + 447.593;
    }
  }

  // Default Mifflin-St Jeor
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
}

/**
 * Calculates theoretical TDEE
 */
export function calculateTheoreticalTDEE(profile: UserBioProfile): number {
  // Convert physical properties to metric
  let weightKg = profile.weight;
  if (profile.unitSystem === 'imperial') {
    weightKg = lbsToKg(profile.weight);
  }

  let heightCm = profile.height;
  if (profile.unitSystem === 'imperial') {
    const totalInches = (profile.heightFt || 0) * 12 + (profile.heightIn || 0);
    heightCm = inToCm(totalInches);
  }

  const bmr = calculateBMR(
    profile.gender,
    weightKg,
    heightCm,
    profile.age,
    profile.formula,
    profile.bodyFat
  );

  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  return Math.round(bmr * multiplier);
}

/**
 * Calculates BMI and Ideal Weight range
 * BMI = weight (kg) / height (m)^2
 */
export interface BmiAnalytics {
  bmi: number;
  category: 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  color: string;
  idealWeightMin: number; // in current unit system
  idealWeightMax: number; // in current unit system
}

export function analyzeBMI(profile: UserBioProfile): BmiAnalytics {
  let weightKg = profile.weight;
  let heightInches = profile.height;

  if (profile.unitSystem === 'imperial') {
    weightKg = lbsToKg(profile.weight);
    heightInches = (profile.heightFt || 0) * 12 + (profile.heightIn || 0);
  } else {
    heightInches = cmToIn(profile.height);
  }

  const heightMeters = (heightInches * 2.54) / 100;
  const bmi = weightKg / (heightMeters * heightMeters);

  let category: BmiAnalytics['category'] = 'Normal';
  let color = 'text-green-500 bg-green-50 border-green-200';

  if (bmi < 18.5) {
    category = 'Underweight';
    color = 'text-amber-500 bg-amber-50 border-amber-200';
  } else if (bmi >= 18.5 && bmi < 25) {
    category = 'Normal';
    color = 'text-green-500 bg-green-50 border-green-200';
  } else if (bmi >= 25 && bmi < 30) {
    category = 'Overweight';
    color = 'text-orange-500 bg-orange-50 border-orange-200';
  } else {
    category = 'Obese';
    color = 'text-rose-500 bg-rose-50 border-rose-200';
  }

  // Ideal weight ranges (BMI 18.5 - 24.9)
  const minKg = 18.5 * (heightMeters * heightMeters);
  const maxKg = 24.9 * (heightMeters * heightMeters);

  const idealWeightMin = profile.unitSystem === 'imperial' ? kgToLbs(minKg) : minKg;
  const idealWeightMax = profile.unitSystem === 'imperial' ? kgToLbs(maxKg) : maxKg;

  return {
    bmi: parseFloat(bmi.toFixed(1)),
    category,
    color,
    idealWeightMin: Math.round(idealWeightMin),
    idealWeightMax: Math.round(idealWeightMax),
  };
}

/**
 * Calculates Daily Macronutrient Target breakdown based on total cal and bio profile
 */
export interface MacroTargets {
  calories: number;
  proteinGrams: number;
  proteinCalories: number;
  carbGrams: number;
  carbCalories: number;
  fatGrams: number;
  fatCalories: number;
  ratio: MacroRatio;
}

export function calculateMacroTargets(calories: number, profile: UserBioProfile): MacroTargets {
  const ratio =
    profile.macroType === 'custom' && profile.customMacros
      ? profile.customMacros
      : DEFAULT_MACRO_RATIOS[profile.macroType as Exclude<MacroType, 'custom'>] ||
        DEFAULT_MACRO_RATIOS.balanced;

  const proteinCalories = Math.round(calories * (ratio.protein / 100));
  const carbCalories = Math.round(calories * (ratio.carb / 100));
  const fatCalories = Math.round(calories * (ratio.fat / 100));

  const proteinGrams = Math.round(proteinCalories / 4);
  const carbGrams = Math.round(carbCalories / 4);
  const fatGrams = Math.round(fatCalories / 9);

  return {
    calories,
    proteinGrams,
    proteinCalories,
    carbGrams,
    carbCalories,
    fatGrams,
    fatCalories,
    ratio,
  };
}

/**
 * Core Algorithm for calculating Adaptive TDEE
 * Formula: TDEE = CalorieIntake - WeightChange(kg) * 7700 / Days
 * We sort daily logs chronologically, and calculate adaptive TDEE.
 * Standard calculates over the entire logs array, and we also generate
 * a rolling adaptive TDEE array for interactive graphs.
 */
export interface AdaptiveTdeeResult {
  currentTdee: number;
  hasEnoughData: boolean;
  daysAnalyzed: number;
  overallWeightChange: number; // kg or lbs depending on units
  averageWeight: number;
  averageCalorieIntake: number;
  reliabilityScore: number; // 0 to 100 representing data coverage
  tdeeHistory: Array<{ date: string; tdee: number; weight: number; cal: number; rawWeight: number }>;
}

export function calculateAdaptiveTDEE(
  logs: DailyLog[],
  theoreticalTdee: number,
  unitSystem: UnitSystem
): AdaptiveTdeeResult {
  // Sort logs chronologically
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sortedLogs.length < 3) {
    return {
      currentTdee: theoreticalTdee,
      hasEnoughData: false,
      daysAnalyzed: sortedLogs.length,
      overallWeightChange: 0,
      averageWeight: sortedLogs.length ? sortedLogs[0].weight : 0,
      averageCalorieIntake: sortedLogs.length
        ? Math.round(sortedLogs.reduce((acc, log) => acc + log.caloriesConsumed, 0) / sortedLogs.length)
        : theoreticalTdee,
      reliabilityScore: Math.round((sortedLogs.length / 14) * 100),
      tdeeHistory: sortedLogs.map((log) => ({
        date: log.date,
        tdee: theoreticalTdee,
        weight: log.weight,
        cal: log.caloriesConsumed,
        rawWeight: log.weight,
      })),
    };
  }

  const startLog = sortedLogs[0];
  const endLog = sortedLogs[sortedLogs.length - 1];

  const startDate = new Date(startLog.date);
  const endDate = new Date(endLog.date);
  const totalMs = endDate.getTime() - startDate.getTime();
  const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));

  const overallWeightChange = endLog.weight - startLog.weight;
  const weightChangeKg = unitSystem === 'imperial' ? lbsToKg(overallWeightChange) : overallWeightChange;

  // Average Calorie intake across all logged days (except standardizing for missing days)
  const totalCalories = sortedLogs.reduce((sum, log) => sum + log.caloriesConsumed, 0);
  const avgCalorieIntake = Math.round(totalCalories / sortedLogs.length);

  // Math: 1kg body fat retention/depletion is roughly 7700 kcal
  const energyFromWeightChange = weightChangeKg * 7700;
  // Exponential / adaptive calculation
  // Total expenditure = Total calories consumed - Calorie value of weight gain
  const totalExpenditure = totalCalories - energyFromWeightChange;
  // Exp per day
  const rawAdaptiveTdee = Math.round(totalExpenditure / sortedLogs.length); // Use log count to align with actual tracked days
  const currentTdee = Math.max(1000, Math.min(6000, isNaN(rawAdaptiveTdee) ? theoreticalTdee : rawAdaptiveTdee));

  const averageWeight = parseFloat(
    (sortedLogs.reduce((acc, log) => acc + log.weight, 0) / sortedLogs.length).toFixed(1)
  );

  // Compute rolling TDEE history for the graph
  // To keep it smooth, we use a 7-day or 14-day rolling window
  const tdeeHistory = sortedLogs.map((log, index) => {
    // If we have at least 3 logs up to index, compute rolling
    if (index >= 2) {
      const startIdx = Math.max(0, index - 13); // rolling up to 14 days
      const windowLogs = sortedLogs.slice(startIdx, index + 1);

      const wStart = windowLogs[0];
      const wEnd = windowLogs[windowLogs.length - 1];

      const dStart = new Date(wStart.date);
      const dEnd = new Date(wEnd.date);
      const days = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)));

      const wtChange = wEnd.weight - wStart.weight;
      const wtChangeKg = unitSystem === 'imperial' ? lbsToKg(wtChange) : wtChange;
      const windowCals = windowLogs.reduce((s, l) => s + l.caloriesConsumed, 0);
      const avgWindowCal = windowCals / windowLogs.length;

      const windowEnergyFromWeight = wtChangeKg * 7700;
      const windowTdeeVal = Math.round((windowCals - windowEnergyFromWeight) / windowLogs.length);

      return {
        date: log.date,
        tdee: isNaN(windowTdeeVal) ? theoreticalTdee : Math.max(1200, Math.min(5000, windowTdeeVal)),
        weight: log.weight,
        cal: log.caloriesConsumed,
        rawWeight: log.weight,
      };
    } else {
      return {
        date: log.date,
        tdee: theoreticalTdee,
        weight: log.weight,
        cal: log.caloriesConsumed,
        rawWeight: log.weight,
      };
    }
  });

  // Reliability Score measures duration & frequency of logs
  // ideally standard tracking is at least 14 days, with logs filled
  const logsDensity = sortedLogs.length / totalDays; // logs per day (max 1.0)
  const durationWeight = Math.min(30, totalDays) / 30; // 0 to 1
  const countWeight = Math.min(14, sortedLogs.length) / 14; // 0 to 1
  const reliabilityScore = Math.round((logsDensity * 0.4 + durationWeight * 0.3 + countWeight * 0.3) * 100);

  return {
    currentTdee,
    hasEnoughData: totalDays >= 7 && sortedLogs.length >= 4,
    daysAnalyzed: totalDays,
    overallWeightChange: parseFloat(overallWeightChange.toFixed(1)),
    averageWeight,
    averageCalorieIntake: avgCalorieIntake,
    reliabilityScore: Math.max(5, Math.min(100, reliabilityScore)),
    tdeeHistory,
  };
}

/**
 * Helper to generate mockup history logs if empty, so users understand the feature
 */
export function generateMockLogs(theoreticalTdee: number, startingWeight: number): DailyLog[] {
  const result: DailyLog[] = [];
  const now = new Date();

  // Generate 15 days of mock logs leading up to today
  // Show a nice slow weight loss with a small calorie deficit
  for (let i = 14; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Day 14 was startingWeight
    // Slow weight loss: lose 0.1 kg (0.22 lbs) every 2 days
    const daysFromStart = 14 - i;
    const lossCoefficient = startingWeight > 120 ? 0.15 : 0.08; // faster loss for heavier weights
    const tempWeight = startingWeight - daysFromStart * lossCoefficient + (Math.sin(daysFromStart) * 0.2); // add minor water fluctuations

    // Target a consistent deficit
    const calorieIntake = theoreticalTdee - 450 + (i % 2 === 0 ? 100 : -120) + (i === 3 ? 400 : 0); // one cheat day

    result.push({
      id: `mock-${i}`,
      date: dateStr,
      weight: parseFloat(tempWeight.toFixed(1)),
      caloriesConsumed: calorieIntake,
      notes: i === 3 ? 'Social dinner' : i === 14 ? 'Start tracking' : 'Consistent diet',
    });
  }

  return result;
}

export function formatHeight(profile: UserBioProfile): string {
  if (profile.unitSystem === 'metric') {
    return `${profile.height} cm`;
  }
  return `${profile.heightFt || 0}′ ${profile.heightIn || 0}″`;
}
