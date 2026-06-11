import React, { useState } from 'react';
import { UserBioProfile, FoodItemLog } from '../types';
import { calculateTheoreticalTDEE, calculateMacroTargets, GOAL_ADJUSTMENTS } from '../utils/calc';
import {
  Apple,
  Plus,
  Trash2,
  Sparkles,
  Utensils,
  Coffee,
  Sun,
  Sunset,
  Soup,
  Target,
  Info,
  Calendar,
  Flame,
  ChevronRight,
  PlusCircle,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FoodDiaryProps {
  profile: UserBioProfile;
  foodLogs: FoodItemLog[];
  onAddFoodLog: (item: Omit<FoodItemLog, 'id'>) => void;
  onDeleteFoodLog: (id: string) => void;
  onClearFoodLogsForDate: (dateStr: string) => void;
  adaptiveTdee?: number;
}

// Highly request Food presets for quick tracking
const PRESET_FOODS = [
  { name: 'Oatmeal with whey protein', calories: 380, protein: 32, carbs: 45, fat: 6, category: 'breakfast' },
  { name: 'Pasture eggs scrambled (2)', calories: 150, protein: 12, carbs: 1, fat: 10, category: 'breakfast' },
  { name: 'Chicken breast (150g) and white rice', calories: 420, protein: 42, carbs: 50, fat: 4, category: 'lunch' },
  { name: 'Salmon fillet (155g) with sweet potato', calories: 490, protein: 34, carbs: 38, fat: 18, category: 'dinner' },
  { name: 'Filet mignon steak with asparagus', calories: 380, protein: 36, carbs: 4, fat: 22, category: 'dinner' },
  { name: 'Greek yogurt (0%) with walnuts & honey', calories: 230, protein: 18, carbs: 22, fat: 8, category: 'snack' },
  { name: 'Double scoop isolate whey shake', calories: 240, protein: 50, carbs: 4, fat: 2, category: 'snack' },
  { name: 'Organic banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0, category: 'snack' },
] as const;

export default function FoodDiary({
  profile,
  foodLogs,
  onAddFoodLog,
  onDeleteFoodLog,
  onClearFoodLogsForDate,
  adaptiveTdee,
}: FoodDiaryProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  // Recalculate target calories & macros
  const activeBaseTdee = adaptiveTdee || calculateTheoreticalTDEE(profile);
  const targetCalories = Math.max(1200, activeBaseTdee + GOAL_ADJUSTMENTS[profile.goal]);
  const macroTargets = calculateMacroTargets(targetCalories, profile);

  // Filter food items logged on the chosen date
  const todaysFoods = foodLogs.filter((log) => log.date === selectedDate);

  // Compute actual totals logged
  const totals = todaysFoods.reduce(
    (acc, food) => {
      acc.calories += food.calories;
      acc.protein += food.protein;
      acc.carbs += food.carbs;
      acc.fat += food.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calRemaining = targetCalories - totals.calories;
  const calPercent = Math.min(100, (totals.calories / targetCalories) * 100);
  const proteinPercent = Math.min(100, (totals.protein / macroTargets.proteinGrams) * 100);
  const carbsPercent = Math.min(100, (totals.carbs / macroTargets.carbGrams) * 100);
  const fatPercent = Math.min(100, (totals.fat / macroTargets.fatGrams) * 100);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName || !calories) return;

    onAddFoodLog({
      date: selectedDate,
      name: foodName,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      mealType,
    });

    // Reset fields
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
  };

  const handleQuickAdd = (preset: typeof PRESET_FOODS[number]) => {
    onAddFoodLog({
      date: selectedDate,
      name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
      mealType: preset.category,
    });
  };

  // Group meals
  const mealGroups = {
    breakfast: {
      title: 'Breakfast Morning Fuel',
      icon: <Coffee className="h-4.5 w-4.5 text-amber-500" />,
      items: todaysFoods.filter((f) => f.mealType === 'breakfast'),
      color: 'bg-amber-500/10 border-amber-500/25 text-amber-900',
    },
    lunch: {
      title: 'Lunch Midday Nutrition',
      icon: <Sun className="h-4.5 w-4.5 text-teal-500" />,
      items: todaysFoods.filter((f) => f.mealType === 'lunch'),
      color: 'bg-teal-500/10 border-teal-500/25 text-teal-900',
    },
    dinner: {
      title: 'Dinner Recover Block',
      icon: <Sunset className="h-4.5 w-4.5 text-indigo-500" />,
      items: todaysFoods.filter((f) => f.mealType === 'dinner'),
      color: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-900',
    },
    snack: {
      title: 'Snacks & Intra Energy',
      icon: <Soup className="h-4.5 w-4.5 text-purple-500" />,
      items: todaysFoods.filter((f) => f.mealType === 'snack'),
      color: 'bg-purple-500/10 border-purple-500/25 text-purple-900',
    },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Date Switcher row & Stats overview */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-slate-900 text-white rounded-2xl border-2 border-slate-900">
            <Calendar className="h-5 w-5 text-orange-450" />
          </div>
          <div>
            <span className="text-[9px] font-black tracking-widest text-slate-400 block font-mono uppercase">CHRONOLOGICAL RANGE</span>
            <span className="text-base font-black text-slate-900 uppercase tracking-tight block">Diet diary selected date</span>
          </div>
        </div>

        <input
          type="date"
          value={selectedDate}
          id="diary-date-picker"
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white border-2 border-slate-900 rounded-xl px-4 py-2 font-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer w-full md:w-auto text-center"
        />
      </div>

      {/* Main Calories & Nutrients progress trackers */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Main Calorie Ring Progress Card */}
        <div className="lg:col-span-2 bg-slate-900 border-2 border-slate-900 text-white rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(249,115,22,1)] relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl"></div>
          
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] font-black tracking-widest text-slate-400 font-mono">ENERGY CONJECTURE BOUNDS</span>
            <span className="text-[9px] font-black bg-orange-650 text-white px-2.5 py-1 rounded-full border border-orange-500/30 uppercase font-mono">
              Calorie Budget
            </span>
          </div>

          <div className="my-3 flex items-center justify-between relative z-10 pr-2">
            <div>
              <p className="text-5xl font-mono font-black tracking-tight text-white leading-none">
                {totals.calories.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1">
                KCAL logged out of {targetCalories.toLocaleString()} Target
              </p>
            </div>
            
            <div className="text-right">
              {calRemaining >= 0 ? (
                <>
                  <p className="text-3xl font-mono font-black text-emerald-400">
                    +{calRemaining.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Left to consume</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-mono font-black text-rose-400">
                    {calRemaining.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Calorie Surplus</p>
                </>
              )}
            </div>
          </div>

          <div className="relative z-10 w-full">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400 mb-1">
              <span>PROGRESS SCORE</span>
              <span>{Math.round(calPercent)}%</span>
            </div>
            <div className="h-4 w-full bg-slate-800 rounded-lg border border-slate-700/60 overflow-hidden">
              <motion.div
                className={`h-full rounded-md ${calPercent >= 100 ? 'bg-orange-550' : 'bg-orange-400'}`}
                initial={{ width: 0 }}
                animate={{ width: `${calPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Macros Progress Panels */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Protein */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black tracking-wider text-rose-500 uppercase font-mono">PROTEIN SHIFT</span>
                <span className="text-[10px] font-mono text-slate-400 font-black">{Math.round(proteinPercent)}%</span>
              </div>
              <h4 className="text-lg font-black text-slate-900 font-mono tracking-tight mt-1">
                {totals.protein}g <span className="text-[10px] text-slate-450">/ {macroTargets.proteinGrams}g</span>
              </h4>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wide mt-1">Structure Recover</p>
            </div>
            <div className="mt-4">
              <div className="h-2.5 w-full bg-slate-100 rounded-full border border-slate-350 overflow-hidden">
                <motion.div
                  className="h-full bg-rose-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${proteinPercent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          {/* Carbs */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black tracking-wider text-amber-500 uppercase font-mono">CARBOHYDRATES</span>
                <span className="text-[10px] font-mono text-slate-400 font-black">{Math.round(carbsPercent)}%</span>
              </div>
              <h4 className="text-lg font-black text-slate-900 font-mono tracking-tight mt-1">
                {totals.carbs}g <span className="text-[10px] text-slate-450">/ {macroTargets.carbGrams}g</span>
              </h4>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wide mt-1">Glycogen Reserve</p>
            </div>
            <div className="mt-4">
              <div className="h-2.5 w-full bg-slate-100 rounded-full border border-slate-350 overflow-hidden">
                <motion.div
                  className="h-full bg-amber-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${carbsPercent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          {/* Fat */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black tracking-wider text-sky-500 uppercase font-mono">LIPIDS / FATS</span>
                <span className="text-[10px] font-mono text-slate-400 font-black">{Math.round(fatPercent)}%</span>
              </div>
              <h4 className="text-lg font-black text-slate-900 font-mono tracking-tight mt-1">
                {totals.fat}g <span className="text-[10px] text-slate-450">/ {macroTargets.fatGrams}g</span>
              </h4>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wide mt-1">Hormonal Base</p>
            </div>
            <div className="mt-4">
              <div className="h-2.5 w-full bg-slate-100 rounded-full border border-slate-350 overflow-hidden">
                <motion.div
                  className="h-full bg-sky-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${fatPercent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Add food & Quick Add */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Add custom form */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
            <span className="text-[9px] font-black tracking-widest text-orange-600 uppercase font-mono block">LEDGER INGESTIONS</span>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5 mt-0.5 uppercase tracking-tight">
              <Utensils className="h-5 w-5 text-orange-550" />
              Log Ingested Food Item
            </h3>

            <form onSubmit={handleCustomSubmit} className="flex flex-col gap-4 mt-4" id="add-food-form">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Food Description Name</label>
                <input
                  type="text"
                  placeholder="Seared steak, white rice, avocado, oatmeal, etc..."
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="w-full bg-white border-2 border-slate-900 rounded-xl px-3.5 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5Col">
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Meal Category</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as any)}
                    className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Calories (kcal)</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    placeholder="350"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Advanced grams row */}
              <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl">
                <p className="text-[9px] font-black text-slate-400 uppercase font-mono tracking-widest mb-2.5">
                  Macronutrient Grams (optional)
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-rose-500 uppercase font-mono text-center">Protein (g)</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="25"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      className="w-full bg-white border-2 border-slate-350 rounded-lg py-1 px-2 text-[11px] font-black text-center text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-amber-500 uppercase font-mono text-center">Carbs (g)</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="30"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      className="w-full bg-white border-2 border-slate-355 rounded-lg py-1 px-2 text-[11px] font-black text-center text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-sky-500 uppercase font-mono text-center">Fats (g)</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="8"
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      className="w-full bg-white border-2 border-slate-355 rounded-lg py-1 px-2 text-[11px] font-black text-center text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                id="add-custom-food-btn"
                className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)] font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-all"
              >
                <Plus className="h-4.5 w-4.5 text-orange-450 stroke-[3px]" /> Add to Diary
              </button>
            </form>
          </div>

          {/* Quick Add Presets Panel */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-3">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase font-mono font-bold tracking-tight">Quick Add Presets</h4>
              <p className="text-[10px] text-slate-400 uppercase font-mono font-semibold mt-0.5">Click any common clean building meal to log</p>
            </div>
            <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-2 divide-y divide-slate-100">
              {PRESET_FOODS.map((preset, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2.5 first:pt-0 hover:bg-slate-50 px-2 rounded-xl border border-transparent hover:border-slate-100 transition-all text-xs font-bold text-slate-700"
                >
                  <div className="flex flex-col gap-0.5 max-w-[70%]">
                    <span className="text-slate-900 font-extrabold text-xs">{preset.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {preset.calories} kcal &bull; P: {preset.protein}g, C: {preset.carbs}g, F: {preset.fat}g
                    </span>
                  </div>
                  <button
                    onClick={() => handleQuickAdd(preset)}
                    className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border-2 border-slate-900 bg-orange-50 hover:bg-orange-100 text-slate-900 transition-all cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                    title={`Add ${preset.name}`}
                  >
                    <Plus className="h-4.5 w-4.5 stroke-[3.5px] text-orange-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Logged Meals ledger lists */}
        <div className="lg:col-span-7 flex flex-col gap-5 bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
            <div>
              <span className="text-[9px] tracking-widest uppercase font-black font-mono text-orange-600 block">DAILY LEDGER OUTCOMES</span>
              <span className="text-base font-black text-slate-900 uppercase tracking-wide mt-0.5 block">Logged Food List & Subtotals</span>
            </div>

            <button
              onClick={() => {
                if (confirm('Clear all logged food items for this date?')) {
                  onClearFoodLogsForDate(selectedDate);
                }
              }}
              disabled={todaysFoods.length === 0}
              className="flex items-center gap-1.5 bg-white border-2 border-slate-900 text-slate-750 hover:text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase font-mono transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear Date
            </button>
          </div>

          <div className="flex flex-col gap-5 overflow-y-auto max-h-[580px] p-0.5">
            {todaysFoods.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center gap-3 border-4 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                <Utensils className="h-10 w-10 text-orange-400 animate-bounce" />
                <div>
                  <p className="font-mono font-black text-slate-905 text-sm uppercase tracking-wide">Food Diary is Empty</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed font-semibold">
                    No food logs entered for {selectedDate}. Use the custom form on the left or click any <strong>Quick Add Preset</strong> to start counting calories!
                  </p>
                </div>
              </div>
            ) : (
              (Object.keys(mealGroups) as Array<keyof typeof mealGroups>).map((groupKey) => {
                const group = mealGroups[groupKey];
                if (group.items.length === 0) return null;

                // compute group sum
                const groupTotals = group.items.reduce(
                  (s, item) => {
                    s.calories += item.calories;
                    s.protein += item.protein;
                    s.carbs += item.carbs;
                    s.fat += item.fat;
                    return s;
                  },
                  { calories: 0, protein: 0, carbs: 0, fat: 0 }
                );

                return (
                  <div key={groupKey} className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                    {/* Header */}
                    <div className="bg-slate-900 text-white px-4 py-2.5 flex justify-between items-center">
                      <div className="flex items-center gap-2 font-black text-xs uppercase font-mono">
                        {group.icon}
                        <span>{group.title}</span>
                      </div>
                      <span className="font-mono text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded">
                        {groupTotals.calories} kcal
                      </span>
                    </div>

                    {/* Meal list */}
                    <div className="bg-white divide-y divide-slate-100">
                      {group.items.map((food) => (
                        <div key={food.id} className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col gap-0.5 max-w-[75%]">
                            <span className="text-xs font-black text-slate-900 leading-tight block">{food.name}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex gap-2">
                              <span>P: {food.protein}g</span>
                              <span>&bull;</span>
                              <span>C: {food.carbs}g</span>
                              <span>&bull;</span>
                              <span>F: {food.fat}g</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black font-mono text-orange-650 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded">
                              {food.calories} kcal
                            </span>
                            <button
                              onClick={() => onDeleteFoodLog(food.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete food item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sub totals summary block */}
                    <div className="bg-slate-50 px-4 py-2 border-t-2 border-slate-950 flex justify-between items-center text-[10px] font-mono font-black text-slate-500 uppercase">
                      <span>Meal Subtotals</span>
                      <div className="flex gap-3">
                        <span className="text-rose-650">P: {groupTotals.protein}g</span>
                        <span className="text-amber-650">C: {groupTotals.carbs}g</span>
                        <span className="text-sky-650 font-bold">F: {groupTotals.fat}g</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
