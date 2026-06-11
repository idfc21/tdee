import { useState, useEffect } from 'react';
import { UserBioProfile, Gender, ActivityLevel, Formula } from '../types';
import { calculateTheoreticalTDEE, formatHeight, analyzeBMI, calculateBMR, lbsToKg, inToCm } from '../utils/calc';
import { HelpCircle, Scale, Ruler, Sparkles, AlertCircle, Dumbbell, Flame, Compass } from 'lucide-react';
import { motion } from 'motion/react';

interface BioProfileFormProps {
  profile: UserBioProfile;
  onChange: (updated: UserBioProfile) => void;
}

export default function BioProfileForm({ profile, onChange }: BioProfileFormProps) {
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserBioProfile>(profile);

  // Sync state whenever external profile or unit system changes
  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const updateField = <K extends keyof UserBioProfile>(key: K, value: UserBioProfile[K]) => {
    const updated = { ...localProfile, [key]: value };
    setLocalProfile(updated);
    onChange(updated);
  };

  const handleGenderChange = (gender: Gender) => {
    updateField('gender', gender);
  };

  const bmiAnalytics = analyzeBMI(localProfile);
  const theoreticalTdee = calculateTheoreticalTDEE(localProfile);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Input panel */}
      <div className="lg:col-span-7 bg-white rounded-3xl border-2 border-slate-900 p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase font-mono block">INPUT COORDINATES</span>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mt-0.5 uppercase tracking-tight">
            <Compass className="h-5.5 w-5.5 text-orange-550" />
            Your Body Coordinates
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Configure your physical metrics for accurate expenditure modeling.</p>
        </div>

        {/* Binary Choice Row: Gender */}
        <div className="flex flex-col gap-2.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">Biological Sex</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              id="gender-male"
              onClick={() => handleGenderChange('male')}
              className={`flex items-center justify-center py-3.5 px-4 rounded-xl border-2 text-sm font-black transition-all cursor-pointer ${
                localProfile.gender === 'male'
                  ? 'border-slate-900 bg-orange-100 text-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-orange-150'
                  : 'border-slate-200 hover:border-slate-900 text-slate-500 hover:text-slate-900 hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] bg-white'
              }`}
            >
              🧔 Male
            </button>
            <button
              type="button"
              id="gender-female"
              onClick={() => handleGenderChange('female')}
              className={`flex items-center justify-center py-3.5 px-4 rounded-xl border-2 text-sm font-black transition-all cursor-pointer ${
                localProfile.gender === 'female'
                  ? 'border-slate-900 bg-orange-100 text-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:bg-orange-150'
                  : 'border-slate-200 hover:border-slate-900 text-slate-500 hover:text-slate-900 hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] bg-white'
              }`}
            >
              👩 Female
            </button>
          </div>
        </div>

        {/* Weight & Height Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Weight Input Group */}
          <div className="flex flex-col gap-2 bg-slate-50 p-4 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 font-mono">
                <Scale className="h-4 w-4 text-emerald-600" />
                Weight
              </label>
              <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">
                {localProfile.unitSystem === 'metric' ? 'kg' : 'lbs'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                id="weight-input"
                step="0.1"
                min="20"
                max="600"
                value={localProfile.weight}
                onChange={(e) => updateField('weight', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              <span className="font-mono font-black text-xs text-slate-500 bg-white border-2 border-slate-900 px-3 py-2 rounded-xl shadow-inner uppercase min-w-[50px] text-center">
                {localProfile.unitSystem === 'metric' ? 'kg' : 'lbs'}
              </span>
            </div>
            <input
              type="range"
              min={localProfile.unitSystem === 'metric' ? '30' : '65'}
              max={localProfile.unitSystem === 'metric' ? '200' : '440'}
              step="0.5"
              value={localProfile.weight}
              onChange={(e) => updateField('weight', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 mt-2 border border-slate-300"
            />
          </div>

          {/* Height Input Group */}
          <div className="flex flex-col gap-2 bg-slate-50 p-4 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 font-mono">
                <Ruler className="h-4 w-4 text-sky-600" />
                Height
              </label>
              <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">
                {localProfile.unitSystem === 'metric' ? 'cm' : 'ft / in'}
              </span>
            </div>

            {localProfile.unitSystem === 'metric' ? (
              <>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    id="height-input"
                    min="100"
                    max="250"
                    value={localProfile.height}
                    onChange={(e) => updateField('height', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <span className="font-mono font-black text-xs text-slate-500 bg-white border-2 border-slate-900 px-3 py-2 rounded-xl shadow-inner min-w-[50px] text-center">
                    cm
                  </span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="220"
                  value={localProfile.height}
                  onChange={(e) => updateField('height', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 mt-2 border border-slate-300"
                />
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 mt-1 py-1">
                <div className="flex items-center gap-1.5">
                  <select
                    id="height-ft"
                    value={localProfile.heightFt || 5}
                    onChange={(e) => updateField('heightFt', parseInt(e.target.value))}
                    className="w-full bg-white border-2 border-slate-900 rounded-xl px-2.5 py-2.5 text-xs font-black text-slate-900 focus:outline-none"
                  >
                    {[3, 4, 5, 6, 7, 8].map((ft) => (
                      <option key={ft} value={ft}>
                        {ft} FT
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    id="height-in"
                    value={localProfile.heightIn || 6}
                    onChange={(e) => updateField('heightIn', parseInt(e.target.value))}
                    className="w-full bg-white border-2 border-slate-900 rounded-xl px-2.5 py-2.5 text-xs font-black text-slate-900 focus:outline-none"
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((inch) => (
                      <option key={inch} value={inch}>
                        {inch} IN
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Age & Bodyfat Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Age Group */}
          <div className="flex flex-col gap-2 bg-white p-4 rounded-xl border border-slate-200/80">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">Age (Years)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="15"
                max="95"
                value={localProfile.age}
                onChange={(e) => updateField('age', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <input
                type="number"
                id="age-input"
                min="15"
                max="120"
                value={localProfile.age}
                onChange={(e) => updateField('age', parseInt(e.target.value) || 0)}
                className="w-18 bg-slate-50 border-2 border-slate-900 rounded-xl px-2.5 py-1 text-center text-sm font-black text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Body Fat % */}
          <div className="flex flex-col gap-2 bg-white p-4 rounded-xl border border-slate-200/80">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1 font-mono">
                Body Fat %
                <span className="text-[10px] text-slate-400 capitalize font-medium font-sans">(optional)</span>
              </label>
              {localProfile.formula === 'katch' && (
                <span className="text-[9px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded font-mono border border-orange-200 font-extrabold uppercase">
                  Required
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3"
                max="60"
                value={localProfile.bodyFat || 20}
                disabled={localProfile.formula !== 'katch' && !localProfile.bodyFat}
                onChange={(e) => updateField('bodyFat', parseInt(e.target.value))}
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-orange-505 ${
                  localProfile.formula !== 'katch' && !localProfile.bodyFat ? 'bg-slate-100 cursor-not-allowed opacity-40' : 'bg-slate-200'
                }`}
              />
              <div className="flex items-center gap-1.5">
                {localProfile.bodyFat === undefined ? (
                  <button
                    onClick={() => updateField('bodyFat', 18)}
                    className="text-[10px] font-black text-orange-700 hover:text-white bg-orange-50 hover:bg-slate-900 px-3 py-1.5 rounded-xl border-2 border-slate-950 transition-all uppercase tracking-wider font-mono cursor-pointer"
                  >
                    Enable
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      id="bodyfat-input"
                      min="3"
                      max="70"
                      value={localProfile.bodyFat}
                      onChange={(e) => updateField('bodyFat', parseInt(e.target.value) || 0)}
                      className="w-14 bg-slate-150 border-2 border-slate-900 rounded-xl px-1.5 py-1 text-center text-xs font-black text-slate-900 focus:outline-none"
                    />
                    <button
                      onClick={() => updateField('bodyFat', undefined)}
                      className="text-slate-400 hover:text-rose-500 font-bold p-1 text-sm scale-110"
                      title="Remove percentage"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Energy Multiplier Selectors */}
        <div className="flex flex-col gap-2.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
            <Dumbbell className="h-4 w-4 text-orange-600" />
            Daily Activity Multiplier
          </label>
          <div className="flex flex-col gap-3">
            {(
              [
                {
                  id: 'sedentary',
                  label: 'Sedentary (desk job, low movement)',
                  mult: '1.2x',
                  desc: 'Office work, little to no dedicated intentional physical activity.'
                },
                {
                  id: 'lightly_active',
                  label: 'Lightly Active (active daily routines)',
                  mult: '1.375x',
                  desc: 'Light workout routines or active walking jobs 1–3 times a week.'
                },
                {
                  id: 'moderately_active',
                  label: 'Moderately Active (exercise 3-5 days/week)',
                  mult: '1.55x',
                  desc: 'Regular cardiovascular or weight resistance efforts, sports.'
                },
                {
                  id: 'very_active',
                  label: 'Very Active (strenuous exercise 6-7 days/week)',
                  mult: '1.725x',
                  desc: 'Hard, deliberate training schedules, daily heavy performance work.'
                },
                {
                  id: 'extremely_active',
                  label: 'Extremely Active (twice daily trials / physical job)',
                  mult: '1.9x',
                  desc: 'Professional athletes, heavy manual labor, or double-split training.'
                }
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                id={`activity-${item.id}`}
                onClick={() => updateField('activityLevel', item.id)}
                className={`flex items-start justify-between p-4 rounded-2xl border-2 text-left transition-all text-xs cursor-pointer ${
                  localProfile.activityLevel === item.id
                    ? 'border-slate-900 bg-orange-50 text-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] font-bold'
                    : 'border-slate-200 bg-white hover:border-slate-900 hover:text-slate-900 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-slate-500'
                }`}
              >
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">{item.label}</span>
                  <span className="text-[11px] text-slate-450 leading-relaxed font-normal">{item.desc}</span>
                </div>
                <span className="font-mono font-black text-orange-700 text-[11px] bg-orange-100 px-2.5 py-1 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  {item.mult}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Estimation Formula Dropdown */}
        <div className="border-t-2 border-slate-900 pt-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 flex items-center gap-1.5 uppercase font-mono">
              Formula Math:
              <span className="font-black text-slate-900 uppercase font-mono bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                {localProfile.formula}
              </span>
            </span>
            <button
              onClick={() => setShowFormulaHelp(!showFormulaHelp)}
              className="text-slate-400 hover:text-orange-550 cursor-pointer p-1"
              title="Formula Blueprint Equations"
              type="button"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="flex gap-2.5">
            {(['mifflin', 'harris', 'katch'] as Formula[]).map((f) => (
              <button
                key={f}
                onClick={() => {
                  if (f === 'katch' && !localProfile.bodyFat) {
                    updateField('bodyFat', 18);
                  }
                  updateField('formula', f);
                }}
                className={`px-3.5 py-1.5 text-[10px] font-black font-mono rounded-xl border-2 transition-all cursor-pointer uppercase ${
                  localProfile.formula === f
                    ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]'
                    : 'bg-white hover:bg-slate-50 text-slate-505 border-slate-200 hover:border-slate-900 hover:text-slate-900'
                }`}
              >
                {f === 'mifflin' ? 'MSJ Model' : f === 'harris' ? 'Revised HB' : 'Katch Model'}
              </button>
            ))}
          </div>
        </div>

        {showFormulaHelp && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-orange-50 border-2 border-slate-900 p-4.5 text-xs text-slate-700 flex flex-col gap-2.5 leading-relaxed shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
          >
            <p className="font-black text-slate-900 uppercase font-mono text-[10px] tracking-wider text-orange-950">Equations Explained:</p>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-700 font-medium">
              <li>
                <strong>Mifflin-St Jeor (MSJ):</strong> The industry-standard baseline recommended by global dietetics. Fast, robust, and excels in general metabolic profiling.
              </li>
              <li>
                <strong>Revised Harris-Benedict:</strong> Classic science equation calibrated in 1884 and revised in 1984. Excels in standard non-athletic tracking.
              </li>
              <li>
                <strong>Katch-McArdle:</strong> The premier math equation for bodybuilders and fitness coaches. Tracks pure <em>Lean Body Mass</em> to exclude body fat from active metabolic overhead.
              </li>
            </ul>
          </motion.div>
        )}
      </div>

      {/* Visual Result Gauge Panel */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Prime Card: TDEE Quotient */}
        <div className="bg-white text-slate-900 rounded-3xl border-2 border-slate-900 p-6 sm:p-8 flex flex-col justify-between min-h-[260px] shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] relative overflow-hidden transition-all hover:translate-y-[-2px]">
          <div className="absolute right-0 top-0 -mr-6 -mt-6 h-36 w-36 rounded-full bg-orange-500/5 blur-xl"></div>

          <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] uppercase font-black tracking-widest text-orange-650 flex items-center gap-1.5 font-mono">
              <Flame className="h-4.5 w-4.5 text-orange-500 animate-pulse" />
              Theoretical Base
            </span>
            <span className="text-[10px] uppercase font-mono font-black rounded-full bg-slate-100 text-slate-800 px-3 py-1 border-2 border-slate-900">
              {localProfile.unitSystem === 'metric' ? 'Metric calculation' : 'Imperial calculation'}
            </span>
          </div>

          <div className="relative z-10 my-6">
            <div className="flex items-baseline gap-1" id="tdee-value-display">
              <span className="text-6xl font-black tracking-tight text-slate-900 leading-none">
                {theoreticalTdee.toLocaleString()}
              </span>
              <span className="text-base font-black text-slate-400 font-mono uppercase ml-1.5">kcal/day</span>
            </div>
            <p className="text-xs text-slate-500 mt-4 max-w-[95%] leading-relaxed font-semibold">
              This represents your calculated biological energy budget to strictly maintain your current weight of {localProfile.weight} {localProfile.unitSystem === 'metric' ? 'kg' : 'lbs'}.
            </p>
          </div>

          {/* Sub Row */}
          <div className="border-t-2 border-dashed border-slate-200 pt-4 flex justify-between items-center relative z-10">
            <div>
              <span className="text-[9px] uppercase text-slate-450 font-mono font-black block">BMR QUOTIENT</span>
              <span className="text-base font-black text-slate-950 font-mono">
                {calculateBMR(
                  localProfile.gender,
                  localProfile.unitSystem === 'imperial' ? lbsToKg(localProfile.weight) : localProfile.weight,
                  localProfile.unitSystem === 'imperial'
                    ? inToCm((localProfile.heightFt || 0) * 12 + (localProfile.heightIn || 0))
                    : localProfile.height,
                  localProfile.age,
                  localProfile.formula,
                  localProfile.bodyFat
                ).toFixed(0)}{' '}
                <span className="text-[10px] font-bold text-slate-400">kcal</span>
              </span>
            </div>

            <div className="text-right">
              <span className="text-[9px] uppercase text-slate-450 font-mono font-black block">Stature STAT</span>
              <span className="text-sm font-black text-slate-700 font-mono uppercase">{formatHeight(localProfile)}</span>
            </div>
          </div>
        </div>

        {/* Second Card: BMI Diagnostics Widget */}
        <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-5 transition-all hover:translate-y-[-2px]">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase font-mono tracking-wide">
              <Sparkles className="h-4.5 w-4.5 text-orange-500" />
              Body Mass Index
            </h3>
            <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-full border-2 border-slate-900 uppercase ${
              bmiAnalytics.category === 'Normal' ? 'bg-emerald-100 text-emerald-850' :
              bmiAnalytics.category === 'Underweight' ? 'bg-amber-100 text-amber-900' :
              bmiAnalytics.category === 'Overweight' ? 'bg-orange-100 text-orange-950' : 'bg-rose-100 text-rose-900'
            }`}>
              {bmiAnalytics.category}
            </span>
          </div>

          {/* BMI Gauge bar */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600 font-mono">
              <span className="font-black text-slate-900">BMI score: {bmiAnalytics.bmi}</span>
              <span className="text-slate-400 text-[10px] font-black uppercase">18.5 – 25.0 Ideal</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-300">
              <div className="h-full bg-amber-400" style={{ width: '18%' }}></div>
              <div className="h-full bg-emerald-500" style={{ width: '30%' }}></div>
              <div className="h-full bg-orange-400" style={{ width: '25%' }}></div>
              <div className="h-full bg-rose-500" style={{ width: '27%' }}></div>
            </div>
            {/* Indicator pointer */}
            <div className="relative w-full h-1 mt-0.5">
              <div
                className="absolute w-2.5 h-2.5 -mt-1 bg-slate-900 rotate-45 transform -translate-x-1/2 rounded-sm border border-white"
                style={{
                  left: `${Math.max(
                    3,
                    Math.min(97, ((bmiAnalytics.bmi - 12) / (40 - 12)) * 100)
                  )}%`,
                }}
              ></div>
            </div>
          </div>

          {/* Healthy weight guidelines info */}
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-900 text-xs flex items-start gap-2.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <AlertCircle className="h-4.5 w-4.5 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-extrabold text-slate-900 uppercase font-mono tracking-wide text-[10px]">WHO Ideal Guidance:</span>
              <p className="text-slate-550 leading-relaxed font-semibold mt-0.5">
                Your calculated ideal biological weight range is{' '}
                <span className="font-black text-slate-900 underline decoration-2 decoration-orange-500">
                  {bmiAnalytics.idealWeightMin} - {bmiAnalytics.idealWeightMax}{' '}
                  {localProfile.unitSystem === 'metric' ? 'kg' : 'lbs'}
                </span>{' '}
                based on the WHO height-to-weight correlation algorithm.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
