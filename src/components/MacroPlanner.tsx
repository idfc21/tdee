import { useState, useEffect } from 'react';
import { UserBioProfile, Goal, MacroType, MacroRatio } from '../types';
import { calculateTheoreticalTDEE, calculateMacroTargets, GOAL_ADJUSTMENTS } from '../utils/calc';
import { Info, Pizza, Zap, Apple, Sparkles, Scale, RefreshCw, Dumbbell } from 'lucide-react';
import { motion } from 'motion/react';

interface MacroPlannerProps {
  profile: UserBioProfile;
  onChange: (updated: UserBioProfile) => void;
  adaptiveTdee?: number; // optionally pass in empirical adaptive TDEE
}

export default function MacroPlanner({ profile, onChange, adaptiveTdee }: MacroPlannerProps) {
  const [localProfile, setLocalProfile] = useState<UserBioProfile>(profile);
  const [customRatio, setCustomRatio] = useState<MacroRatio>({ protein: 30, carb: 40, fat: 30 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocalProfile(profile);
    if (profile.customMacros) {
      setCustomRatio(profile.customMacros);
    }
  }, [profile]);

  // Base TDEE base: use empirical adaptive TDEE if available, otherwise theoretical calculated TDEE
  const activeBaseTdee = adaptiveTdee || calculateTheoreticalTDEE(localProfile);
  const targetCalories = Math.max(1200, activeBaseTdee + GOAL_ADJUSTMENTS[localProfile.goal]);

  const updateProfile = (changes: Partial<UserBioProfile>) => {
    const updated = { ...localProfile, ...changes };
    setLocalProfile(updated);
    onChange(updated);
  };

  const handleGoalChange = (goal: Goal) => {
    updateProfile({ goal });
  };

  const handleMacroTypeChange = (type: MacroType) => {
    if (type === 'custom') {
      updateProfile({ macroType: type, customMacros: customRatio });
    } else {
      updateProfile({ macroType: type });
    }
  };

  const handleCustomMacroChange = (macro: keyof MacroRatio, value: number) => {
    const newRatio = { ...customRatio, [macro]: value };
    const total = newRatio.protein + newRatio.carb + newRatio.fat;

    setCustomRatio(newRatio);

    if (total === 100) {
      setErrorMsg(null);
      updateProfile({ macroType: 'custom', customMacros: newRatio });
    } else {
      setErrorMsg(`Macro ratios must sum up to exactly 100%. Current total is ${total}%.`);
    }
  };

  const macroDetails = calculateMacroTargets(targetCalories, localProfile);

  // Suggested macro guidelines descriptions
  const macroCoachInsights: Record<MacroType, { tag: string; foods: string[]; focus: string }> = {
    balanced: {
      tag: 'Classic Balanced Nutrition',
      foods: ['Brown Rice', 'Sweet Potatoes', 'Chicken Breast', 'Avocado', 'Whole Eggs'],
      focus: 'Outstanding for steady energy reserves, moderate cardio, and consistent strength building.'
    },
    high_protein: {
      tag: 'Body Recomposition & Mass Preservation',
      foods: ['Egg Whites', 'Greek Yogurt', 'White Fish', 'Lean Beef', 'Tuna', 'Quinoa'],
      focus: 'Optimized for high-intensity resistance training, preventing muscle breakdown during fat cut.'
    },
    low_fat: {
      tag: 'High Energy Endurance Split',
      foods: ['Oatmeal', 'Bananas', 'Lean Turkey', 'Potatoes', 'Berries', 'Spinach'],
      focus: 'Exceptional for distance athletes, high-volume weightlifters, and explosive athletic drills.'
    },
    keto: {
      tag: 'Fat Adaptation Ketosis',
      foods: ['Bacon', 'Whole Salmon', 'Macadamia Nuts', 'Olive Oil', 'Heavy Cream', 'Butter'],
      focus: 'Fosters stable glycemic control and efficient lipid burning. Reduce heavy explosive drills.'
    },
    custom: {
      tag: 'Your Unique Metabolic Split',
      foods: ['Tailor made whole foods list representing custom carbohydrate energy requirements.'],
      focus: 'Perfect for micro-managing specialized nutrition blocks based on exact fitness goals.'
    }
  };

  const insight = macroCoachInsights[localProfile.macroType] || macroCoachInsights.balanced;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Target goals and multipliers panel */}
      <div className="lg:col-span-6 bg-white rounded-3xl border border-[#eef1f6] p-6 sm:p-8 flex flex-col gap-5">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#00c08b] uppercase font-mono block">CALORIC ENGINE</span>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-0.5 uppercase tracking-tight">
            <Scale className="h-5.5 w-5.5 text-[#00c08b]" />
            Diet Goal & Caloric Blueprint
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Select your body target. We adjust calorie limits to create the proper budget.</p>
        </div>

        {/* Selected base TDEE notice */}
        {adaptiveTdee && (
          <div className="bg-emerald-50/55 border border-emerald-150 rounded-2xl p-4 text-xs text-slate-900 flex items-center gap-2.5">
            <Sparkles className="h-4.5 w-4.5 text-emerald-600 shrink-0 animate-pulse" />
            <p className="font-semibold leading-relaxed">
              Adaptive TDEE active: Calculations are proxying your logged empirical metabolism (<strong className="underline decoration-2 decoration-[#00c08b]">{Math.round(adaptiveTdee)} kcal</strong>) instead of math formulas!
            </p>
          </div>
        )}

        {/* Goal list Buttons */}
        <div className="flex flex-col gap-2">
          {(
            [
              {
                id: 'cut_aggressive',
                label: 'Fat Loss: Aggressive Deficit',
                adj: '-1,000 kcal (~2 lbs / 1 kg lost per week)',
                desc: 'Recommended only for brief fat-loss blocks. Requires structured high protein.'
              },
              {
                id: 'cut_moderate',
                label: 'Fat Loss: Standard Deficit',
                adj: '-500 kcal (~1 lb / 0.5 kg lost per week)',
                desc: 'Highly sustainable. Excellent rate of fat loss with maximum strength retention.'
              },
              {
                id: 'cut_slow',
                label: 'Fat Loss: Mild Deficit',
                adj: '-250 kcal (~0.5 lb / 0.25 kg lost per week)',
                desc: 'Ideal for long body-recomposition blocks. High muscle preservation.'
              },
              {
                id: 'maintain',
                label: 'Weight Maintenance',
                adj: '±0 kcal',
                desc: 'Keep current weight stable while upgrading body composition slowly.'
              },
              {
                id: 'bulk_slow',
                label: 'Muscle Build: Lean Surplus',
                adj: '+250 kcal (~0.5 lb / 0.25 kg gained per month)',
                desc: 'Increases contractile tissue with very minimal subcutaneous fat gain.'
              },
              {
                id: 'bulk_moderate',
                label: 'Muscle Build: Standard Surplus',
                adj: '+500 kcal (~1 lb / 0.5 kg gained per month)',
                desc: 'Optimized muscle hypertrophy potential. Focus on heavy compound lifts.'
              }
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => handleGoalChange(item.id)}
              className={`flex items-start justify-between p-4 rounded-2xl border text-left transition-all text-xs cursor-pointer ${
                localProfile.goal === item.id
                  ? 'border-[#00c08b] bg-[#00c08b]/5 text-slate-900 font-bold'
                  : 'border-slate-200 bg-white hover:border-slate-350 text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="flex flex-col gap-1 max-w-[70%]">
                <span className="font-bold text-slate-900 text-sm">{item.label}</span>
                <span className="text-[11px] text-slate-400 font-normal leading-relaxed">{item.desc}</span>
              </div>
              <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg border block self-center truncate ${
                item.id.includes('cut')
                  ? 'text-rose-750 bg-rose-50 border-rose-100'
                  : item.id === 'maintain'
                  ? 'text-slate-800 bg-slate-50 border-slate-150'
                  : 'text-emerald-750 bg-emerald-50 border-emerald-100'
              }`}>
                {item.adj}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Macronutrients ratios panel */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        
        {/* Calorics target summary card */}
        <div className="bg-white border border-[#eef1f6] rounded-3xl p-6 sm:p-8 flex flex-col gap-5 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Your Daily Budget</span>
              <span className="text-4xl font-black text-slate-900 font-mono tracking-tight" id="goal-calories-target">
                {targetCalories.toLocaleString()}{' '}
                <span className="text-sm text-slate-400 font-bold uppercase">kcal/day</span>
              </span>
            </div>
            <div className="bg-[#00c08b]/5 border border-[#00c08b]/10 px-3.5 py-1.5 rounded-2xl text-right">
              <span className="text-[9px] uppercase font-bold text-[#00c08b] font-mono block">Active Goal</span>
              <span className="text-xs font-bold text-[#00c08b] uppercase tracking-tight">
                {localProfile.goal.replace(/_/g, ' ')}
              </span>
            </div>          </div>

          {/* Macronutrients Splits grams and percentages */}
          <div className="grid grid-cols-3 gap-3">
            {/* Protein Card */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-1.5 transition-colors">
              <span className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-1 font-mono">
                <Dumbbell className="h-3.5 w-3.5 text-rose-500" />
                protein
              </span>
              <div>
                <span className="text-2xl font-bold text-slate-900 font-mono">{macroDetails.proteinGrams}g</span>
                <span className="text-[10px] text-slate-400 block font-mono font-bold mt-0.5">
                  {macroDetails.proteinCalories} kcal ({macroDetails.ratio.protein}%)
                </span>
              </div>
            </div>

            {/* Carbohydrates Card */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-1.5 transition-colors">
              <span className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1 font-mono">
                <Apple className="h-3.5 w-3.5 text-amber-500" />
                carbs
              </span>
              <div>
                <span className="text-2xl font-bold text-slate-900 font-mono">{macroDetails.carbGrams}g</span>
                <span className="text-[10px] text-slate-400 block font-mono font-bold mt-0.5">
                  {macroDetails.carbCalories} kcal ({macroDetails.ratio.carb}%)
                </span>
              </div>
            </div>

            {/* Fats Card */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-1.5 transition-colors">
              <span className="text-[10px] font-bold text-sky-600 uppercase flex items-center gap-1 font-mono">
                <Pizza className="h-3.5 w-3.5 text-sky-500" />
                fats
              </span>
              <div>
                <span className="text-2xl font-bold text-slate-900 font-mono">{macroDetails.fatGrams}g</span>
                <span className="text-[10px] text-slate-400 block font-mono font-bold mt-0.5">
                  {macroDetails.fatCalories} kcal ({macroDetails.ratio.fat}%)
                </span>
              </div>
            </div>
          </div>

          {/* Graphical Macro Visualizer Stacked Bar */}
          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono font-black uppercase px-0.5">
              <span>Protein: {macroDetails.ratio.protein}%</span>
              <span>Carbs: {macroDetails.ratio.carb}%</span>
              <span>Fat: {macroDetails.ratio.fat}%</span>
            </div>
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
              <div className="h-full bg-rose-500" style={{ width: `${macroDetails.ratio.protein}%` }}></div>
              <div className="h-full bg-amber-400" style={{ width: `${macroDetails.ratio.carb}%` }}></div>
              <div className="h-full bg-sky-450" style={{ width: `${macroDetails.ratio.fat}%` }}></div>
            </div>
          </div>
        </div>

        {/* Dietary Split profile choices */}
        <div className="bg-white border border-[#eef1f6] rounded-3xl p-6 flex flex-col gap-5 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase font-mono">
              <Zap className="h-4.5 w-4.5 text-[#00c08b]" />
              Nutritional Presets
            </h3>

            {/* Preset Selector */}
            <select
              value={localProfile.macroType}
              onChange={(e) => handleMacroTypeChange(e.target.value as MacroType)}
              className="bg-slate-50 cursor-pointer border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00c08b]/30"
            >
              <option value="balanced">Balanced Split (30/40/30)</option>
              <option value="high_protein">High Protein (40/35/25)</option>
              <option value="low_fat">Low Fat / High Carb (25/55/20)</option>
              <option value="keto">Ketogenic (25/5/70)</option>
              <option value="custom">Custom Ratios...</option>
            </select>
          </div>

          {/* Custom mode ratios sliders */}
          {localProfile.macroType === 'custom' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                {/* Protein Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-rose-650 uppercase font-mono text-[10px]">Protein: {customRatio.protein}%</span>
                    <span className="text-slate-500 font-mono text-xs">{(targetCalories * (customRatio.protein / 100) / 4).toFixed(0)}g</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="70"
                    step="5"
                    value={customRatio.protein}
                    onChange={(e) => handleCustomMacroChange('protein', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Carbohydrates Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-amber-650 uppercase font-mono text-[10px]">Carbs: {customRatio.carb}%</span>
                    <span className="text-slate-505 font-mono text-xs">{(targetCalories * (customRatio.carb / 100) / 4).toFixed(0)}g</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="5"
                    value={customRatio.carb}
                    onChange={(e) => handleCustomMacroChange('carb', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Fats Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-sky-650 uppercase font-mono text-[10px]">Fats: {customRatio.fat}%</span>
                    <span className="text-slate-505 font-mono text-xs">{(targetCalories * (customRatio.fat / 100) / 9).toFixed(0)}g</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="5"
                    value={customRatio.fat}
                    onChange={(e) => handleCustomMacroChange('fat', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-sky-500"
                  />
                </div>
              </div>

              {/* Validation alert */}
              {errorMsg ? (
                <div className="bg-rose-50 text-rose-800 border border-slate-200 text-[10px] font-bold p-2.5 rounded-xl flex items-center gap-1.5 font-mono uppercase">
                  <Info className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              ) : (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-bold p-2.5 rounded-xl flex items-center gap-1.5 font-mono uppercase justify-center">
                  <span>Exact 100% split achieved! Saved.</span>
                </div>
              )}
            </div>
          )}

          {/* Dietary Coaching Details info */}
          <div className="border-t border-dashed border-slate-200 pt-4 text-xs text-slate-555 flex flex-col gap-3 mt-1 leading-relaxed">
            <div className="flex items-center gap-1.5">
              <span className="text-[#00c08b] font-bold font-mono tracking-tight uppercase bg-[#00c08b]/5 border border-[#00c08b]/10 text-[9px] px-2.5 py-0.5 rounded-lg">
                Coach Focus
              </span>
              <span className="font-bold text-slate-800">{insight.tag}</span>
            </div>
            <p className="text-slate-500 leading-relaxed font-semibold">{insight.focus}</p>

            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="font-bold text-slate-400 text-[10px] uppercase font-mono mr-1">Recommended Fuels:</span>
              {insight.foods.map((food, i) => (
                <span
                  key={i}
                  className="bg-slate-50 text-slate-800 px-2.5 py-1 rounded-xl text-[10px] font-bold border border-slate-200 uppercase font-mono"
                >
                  {food}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
