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
  RotateCcw,
  Search,
  Globe,
  Loader2,
  Check,
  X,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchLocalFoods, searchOpenFoodFacts, FoodDbItem, LOCAL_FOOD_DATABASE } from '../utils/foodDatabase';

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
  
  // Custom manual entry states
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  // Database search state entries
  const [entryMode, setEntryMode] = useState<'database' | 'manual'>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRegion, setSearchRegion] = useState<'all' | 'us' | 'ru' | 'ua'>('all');
  const [dbResults, setDbResults] = useState<FoodDbItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [dbSearchAttempted, setDbSearchAttempted] = useState(false);
  
  const [selectedDbItem, setSelectedDbItem] = useState<FoodDbItem | null>(null);
  const [portionGrams, setPortionGrams] = useState<string>('100');
  const [dbMealType, setDbMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  
  // Modal toggle state for MacroFactor style entry flow
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentSearchMealType, setCurrentSearchMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  // Local helper for relative date highlights
  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const yesterdayStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const dayBeforeYesterdayStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().split('T')[0];
  }, []);

  const tomorrowStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Generate rolling 7-day carousel range centering on selectedDate
  const rollingDays = React.useMemo(() => {
    const center = new Date(selectedDate);
    const result = [];
    for (let i = -3; i <= 3; i++) {
       const d = new Date(center);
       d.setDate(d.getDate() + i);
       const str = d.toISOString().split('T')[0];
       
       // Determine label
       let dayOfWeek = d.toLocaleDateString('ru-RU', { weekday: 'short' });
       dayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
       
       result.push({
         dateStr: str,
         dayNum: d.getDate(),
         dayLabel: dayOfWeek,
         hasFoods: foodLogs.some(f => f.date === str)
       });
    }
    return result;
  }, [selectedDate, foodLogs]);

  const handlePresetClick = (preset: typeof PRESET_FOODS[number], idx: number) => {
    const tempDbItem: FoodDbItem = {
      id: `preset-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      name: preset.name,
      brand: 'Quick Add Preset',
      caloriesPer100g: preset.calories, // treated as 1 serving reference
      proteinPer100g: preset.protein,
      carbsPer100g: preset.carbs,
      fatPer100g: preset.fat,
      region: 'global',
      lang: 'en',
      tags: []
    };
    setSelectedDbItem(tempDbItem);
    setPortionGrams('100'); // Log 100% of standard serving
    setDbMealType(currentSearchMealType);
  };

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
      mealType: currentSearchMealType,
    });

    // Reset fields & close popup dialog
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setIsSearchOpen(false);
  };

  const handleQuickAdd = (preset: typeof PRESET_FOODS[number]) => {
    onAddFoodLog({
      date: selectedDate,
      name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
      mealType: currentSearchMealType,
    });
    setIsSearchOpen(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      const initial = searchLocalFoods('', searchRegion);
      setDbResults(initial);
      setDbSearchAttempted(false);
      return;
    }

    setDbSearchAttempted(true);
    setSelectedDbItem(null);

    const local = searchLocalFoods(query, searchRegion);
    setDbResults(local);

    setIsSearchingOnline(true);
    try {
      const online = await searchOpenFoodFacts(query, searchRegion);
      const merged = [...local];
      const localNames = new Set(local.map(item => item.name.toLowerCase()));

      online.forEach(item => {
        if (!localNames.has(item.name.toLowerCase())) {
          merged.push(item);
        }
      });

      setDbResults(merged);
    } catch (err) {
      console.warn('Online fetch issue', err);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  React.useEffect(() => {
    if (searchQuery.trim()) {
      const e = { preventDefault: () => {} };
      handleSearch(e as any);
    } else {
      const initial = LOCAL_FOOD_DATABASE.filter(f => searchRegion === 'all' || f.region === searchRegion);
      setDbResults(initial);
    }
  }, [searchRegion]);

  // Handle db logging
  const handleLogDbItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDbItem) return;

    const grams = parseFloat(portionGrams) || 100;
    const factor = grams / 100;

    onAddFoodLog({
      date: selectedDate,
      name: `${selectedDbItem.name} (${grams}g)`,
      calories: Math.round(selectedDbItem.caloriesPer100g * factor),
      protein: Math.round(selectedDbItem.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(selectedDbItem.carbsPer100g * factor * 10) / 10,
      fat: Math.round(selectedDbItem.fatPer100g * factor * 10) / 10,
      mealType: dbMealType,
    });

    setSelectedDbItem(null);
    setPortionGrams('100');
    setIsSearchOpen(false);
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
      {/* Custom Timeline Carousel & Day Switcher Panel */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-5">
        
        {/* Upper Row: Fast Relative Jump Actions & Raw Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl border-2 border-slate-900">
              <Calendar className="h-5 w-5 text-orange-450" />
            </div>
            <div>
              <span className="text-[9px] font-black tracking-widest text-slate-400 block font-mono uppercase">CHRONOLOGICAL DATING</span>
              <span className="text-base font-black text-slate-900 uppercase tracking-tight block">Diet & Calories Ledger</span>
            </div>
          </div>

          {/* Quick Relative jump buttons */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono">
            <button
              onClick={() => setSelectedDate(dayBeforeYesterdayStr)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all cursor-pointer ${
                selectedDate === dayBeforeYesterdayStr
                  ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Позавчера
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all cursor-pointer ${
                selectedDate === yesterdayStr
                  ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Вчера
            </button>
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Сегодня
            </button>
            <button
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all cursor-pointer ${
                selectedDate === tomorrowStr
                  ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Завтра
            </button>

            {/* Native calendar date picker wrapper */}
            <div className="relative inline-block ml-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer"
                title="Select alternate date"
              />
              <button className="flex h-8 w-8 items-center justify-center bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 rounded-xl transition-all shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                <Settings className="h-4 w-4 text-slate-800" />
              </button>
            </div>
          </div>
        </div>

        {/* Lower Row: Rolling 7-Day Timeline Carousel */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 font-mono">
          {rollingDays.map((day) => {
            const isSelected = day.dateStr === selectedDate;
            const isToday = day.dateStr === todayStr;
            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all hover:scale-102 cursor-pointer ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-[3px_3px_0px_0px_rgba(249,115,22,1)]'
                    : isToday
                    ? 'border-orange-500 bg-orange-50/40 text-slate-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
                }`}
              >
                <span className={`text-[8px] font-bold tracking-tighter uppercase ${isSelected ? 'text-orange-350' : 'text-slate-400'}`}>
                  {day.dayLabel}
                </span>
                <span className="text-sm font-black mt-0.5 leading-none">
                  {day.dayNum}
                </span>
                
                {/* Indicator dot showing logged items exist */}
                {day.hasFoods && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isSelected ? 'bg-orange-450' : 'bg-orange-550 animate-pulse'}`}></span>
                )}
              </button>
            );
          })}
        </div>
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

      {/* Mealtimes Vertical List (MacroFactor-style direct layout) */}
      <div className="flex flex-col gap-5">
        <div className="flex justify-between items-center bg-white border-2 border-slate-900 rounded-3xl p-4 md:p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <div>
            <span className="text-[9px] tracking-widest uppercase font-black font-mono text-orange-655 block">ДНЕВНИК ПИТАНИЯ • DIET TIMELINE</span>
            <span className="text-sm font-black text-slate-900 uppercase tracking-tight block">Метаболический лог еды / Mealtimes Summary</span>
          </div>

          <button
            onClick={() => {
              if (confirm('Очистить все записи за эту дату? / Clear all logged food items for this date?')) {
                onClearFoodLogsForDate(selectedDate);
              }
            }}
            disabled={todaysFoods.length === 0}
            className="flex items-center gap-1.5 bg-slate-50 border-2 border-slate-900 hover:bg-rose-50 hover:text-rose-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Сбросить день / Clear Day
          </button>
        </div>

        {/* The 4 main compartments (Breakfast, Lunch, Dinner, Snack) */}
        <div className="flex flex-col gap-4">
          {(Object.keys(mealGroups) as Array<keyof typeof mealGroups>).map((groupKey) => {
            const group = mealGroups[groupKey];
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

            const mealTitles: Record<string, string> = {
              breakfast: 'Завтрак / Breakfast',
              lunch: 'Обед / Lunch',
              dinner: 'Ужин / Dinner',
              snack: 'Перекус / Snack'
            };

            return (
              <div
                key={groupKey}
                className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col transition-all"
              >
                {/* Meal Compartment Header Panel */}
                <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-black text-xs uppercase font-mono">
                    {group.icon}
                    <span className="tracking-tight">{mealTitles[groupKey]}</span>
                  </div>

                  {/* Subtotal macros summaries and interactive Log action button */}
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2.5 font-mono text-[9px] font-bold text-slate-350 uppercase">
                      <span className="text-rose-400">P: {Math.round(groupTotals.protein * 10) / 10}g</span>
                      <span>&bull;</span>
                      <span className="text-amber-400">C: {Math.round(groupTotals.carbs * 10) / 10}g</span>
                      <span>&bull;</span>
                      <span className="text-sky-400">F: {Math.round(groupTotals.fat * 10) / 10}g</span>
                    </div>

                    <span className="font-mono text-[10px] font-black bg-white/20 px-2.5 py-0.5 rounded text-orange-200">
                      {groupTotals.calories} kcal
                    </span>

                    <button
                      onClick={() => {
                        setCurrentSearchMealType(groupKey);
                        setDbMealType(groupKey);
                        setMealType(groupKey);
                        setIsSearchOpen(true);
                        setSelectedDbItem(null);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-1 bg-orange-550 hover:bg-orange-600 text-white border border-orange-500 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase font-mono shadow-[1px_1px_0px_0px_rgba(0,0,0,0.25)] cursor-pointer transition-transform hover:scale-102"
                    >
                      <Plus className="h-3 w-3 stroke-[3px]" />
                      <span>+ ЕДА / ADD</span>
                    </button>
                  </div>
                </div>

                {/* Logged Items Rows list */}
                <div className="divide-y divide-slate-100 bg-white">
                  {group.items.length === 0 ? (
                    <div className="p-4 text-center text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-50/40">
                      Нет записей / No logged foods &mdash; кликните + ЕДА
                    </div>
                  ) : (
                    group.items.map((food) => (
                      <div
                        key={food.id}
                        className="p-3.5 flex justify-between items-center hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-3 font-mono">
                          <span className="text-xs font-black text-slate-900 leading-tight block truncate">
                            {food.name}
                          </span>
                          <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest mt-1 flex gap-2">
                            <span>Б: {food.protein}г</span>
                            <span>&bull;</span>
                            <span>У: {food.carbs}г</span>
                            <span>&bull;</span>
                            <span>Ж: {food.fat}г</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-black font-mono text-orange-655 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded">
                            {food.calories} kcal
                          </span>
                          <button
                            onClick={() => onDeleteFoodLog(food.id)}
                            className="bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-100 p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Удалить / Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 stroke-[2.5px]" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Absolute Full Screen Search Dashboard Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border-4 border-slate-900 rounded-3xl p-5 sm:p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] max-w-lg w-full relative flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
            >
              {/* Top Row Title and Close Trigger */}
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-3.5">
                <div>
                  <span className="text-[9px] font-black tracking-widest uppercase font-mono text-orange-555 block">
                    Добавить пищу / Food tracking
                  </span>
                  <h3 className="text-lg font-black text-slate-900 uppercase font-mono">
                    В прием: {
                      currentSearchMealType === 'breakfast' ? 'Завтрак / Breakfast' :
                      currentSearchMealType === 'lunch' ? 'Обед / Lunch' :
                      currentSearchMealType === 'dinner' ? 'Ужин / Dinner' : 'Перекус / Snack'
                    }
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSelectedDbItem(null);
                  }}
                  className="hover:bg-slate-100 p-1.5 rounded-xl border-2 border-slate-900 transition-all cursor-pointer bg-white text-slate-950 flex items-center justify-center"
                >
                  <X className="h-4.5 w-4.5 stroke-[3px]" />
                </button>
              </div>

              {/* Step State machine switcher */}
              {selectedDbItem ? (
                /* Step 2: Configure Portion weight & Log details */
                <div className="flex flex-col gap-4">
                  
                  {/* Back button to search list */}
                  <button
                    type="button"
                    onClick={() => setSelectedDbItem(null)}
                    className="self-start text-[10px] font-black uppercase font-mono border-2 border-slate-900 px-3 py-1 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  >
                    &larr; Назад к поиску / Back
                  </button>

                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] font-black text-orange-555 uppercase tracking-widest font-mono block">
                      {selectedDbItem.brand ? `${selectedDbItem.brand} • Registry` : 'Open Food Database • Registry'}
                    </span>
                    <h4 className="text-base font-black text-slate-900 leading-tight uppercase font-mono">
                      {selectedDbItem.name}
                    </h4>
                  </div>

                  {/* Sizer preset buttons */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-widest">
                      Порции / Portion presets
                    </label>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      {[
                        { label: 'База 100г', grams: '100', desc: 'Reference Weight' },
                        { label: 'Порция 150г', grams: '150', desc: 'Single Serving' },
                        { label: 'Пачка 200г', grams: '200', desc: 'Full Pack / Tub' },
                        { label: 'Двойная 250г', grams: '250', desc: 'Big / Double' },
                        { label: 'Большая 300г', grams: '300', desc: 'Large Bowl' },
                        { label: 'Макси 400г', grams: '400', desc: 'Max Meal' },
                      ].map((presetItem) => {
                        const active = portionGrams === presetItem.grams;
                        return (
                          <button
                            key={presetItem.grams}
                            type="button"
                            onClick={() => setPortionGrams(presetItem.grams)}
                            className={`p-2 rounded-xl border-2 text-left transition-all flex flex-col cursor-pointer ${
                              active
                                ? 'border-slate-900 bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]'
                                : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-800'
                            }`}
                          >
                            <span className="text-[11px] font-black">{presetItem.label}</span>
                            <span className={`text-[8px] font-medium leading-none ${active ? 'text-orange-200' : 'text-slate-400'}`}>
                              {presetItem.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fine slider & manual grams control */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-widest">
                        Вес (граммы) / custom weight
                      </span>
                      <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl border-2 border-slate-900 font-mono text-xs font-black">
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          value={portionGrams}
                          onChange={(e) => setPortionGrams(e.target.value)}
                          className="w-12 bg-transparent text-right outline-none"
                        />
                        <span className="text-slate-500">г</span>
                      </div>
                    </div>
                    
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="5"
                      value={parseFloat(portionGrams) || 100}
                      onChange={(e) => setPortionGrams(e.target.value)}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer border-2 border-slate-900 accent-orange-550"
                    />
                  </div>

                  {/* Destination meal picker */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-widest">
                      Прием пищи / Mealtimes split
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 font-mono">
                      {[
                        { id: 'breakfast', label: 'Завтрак', icon: <Coffee className="h-3.5 w-3.5" /> },
                        { id: 'lunch', label: 'Обед', icon: <Sun className="h-3.5 w-3.5" /> },
                        { id: 'dinner', label: 'Ужин', icon: <Sunset className="h-3.5 w-3.5" /> },
                        { id: 'snack', label: 'Снек', icon: <Soup className="h-3.5 w-3.5" /> },
                      ].map((mealPill) => {
                        const isSelected = dbMealType === mealPill.id;
                        return (
                          <button
                            key={mealPill.id}
                            type="button"
                            onClick={() => {
                              setDbMealType(mealPill.id as any);
                              setMealType(mealPill.id as any); // keep custom manual synced as well
                            }}
                            className={`py-2 px-1 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-slate-900 bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]'
                                : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {mealPill.icon}
                            <span className="text-[9px] font-black uppercase leading-none">{mealPill.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Calorie outputs dynamic live board */}
                  <div className="bg-slate-950 text-white border-2 border-slate-950 p-4 rounded-xl flex flex-col gap-2 font-mono mt-1">
                    <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live Scaled Macros</span>
                      <span className="text-[10px] font-black text-orange-450">{portionGrams || '100'}g portion</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black text-slate-500 uppercase">CALORIES</span>
                        <p className="text-xl font-black text-white leading-none mt-1">
                          {Math.round(selectedDbItem.caloriesPer100g * ((parseFloat(portionGrams) || 100) / 100))} kcal
                        </p>
                      </div>

                      <div className="flex gap-3.5 text-center">
                        <div>
                          <span className="text-[8px] font-black text-rose-400 block">Protein</span>
                          <span className="text-xs font-black text-white leading-none font-mono">
                            {Math.round(selectedDbItem.proteinPer100g * ((parseFloat(portionGrams) || 100) / 100) * 10) / 10}g
                          </span>
                        </div>

                        <div>
                          <span className="text-[8px] font-black text-amber-400 block">Carbs</span>
                          <span className="text-xs font-black text-white leading-none font-mono">
                            {Math.round(selectedDbItem.carbsPer100g * ((parseFloat(portionGrams) || 100) / 100) * 10) / 10}g
                          </span>
                        </div>

                        <div>
                          <span className="text-[8px] font-black text-sky-400 block">Fats</span>
                          <span className="text-xs font-black text-white leading-none font-mono">
                            {Math.round(selectedDbItem.fatPer100g * ((parseFloat(portionGrams) || 100) / 100) * 10) / 10}g
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Log! */}
                  <button
                    type="button"
                    onClick={handleLogDbItem}
                    className="w-full flex items-center justify-center gap-1.5 bg-orange-550 hover:bg-orange-600 text-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] font-black py-3 rounded-xl text-xs uppercase font-mono tracking-wider cursor-pointer transition-all hover:translate-y-[-1px] mt-1"
                  >
                    <Check className="h-4.5 w-4.5 stroke-[3.5px]" />
                    <span>Внести {portionGrams || '100'}г в Дневник / Confirm Log</span>
                  </button>

                </div>
              ) : (
                /* Step 1: Input Search list or Manual forms */
                <div className="flex flex-col gap-4">
                  {/* Select Entry Mode Sub-tabs navigation */}
                  <div className="flex bg-slate-100 border-2 border-slate-900 p-1 rounded-2xl font-mono">
                    <button
                      type="button"
                      onClick={() => setEntryMode('database')}
                      className={`flex-1 text-center py-2 text-[10px] font-black rounded-xl uppercase tracking-tight transition-all cursor-pointer ${
                        entryMode === 'database'
                          ? 'bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)]'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Реестр еды / Database
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryMode('manual')}
                      className={`flex-1 text-center py-2 text-[10px] font-black rounded-xl uppercase tracking-tight transition-all cursor-pointer ${
                        entryMode === 'manual'
                          ? 'bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.25)]'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Свое блюдо / Manual
                    </button>
                  </div>

                  {/* Database Mode Panel */}
                  {entryMode === 'database' ? (
                    <div className="flex flex-col gap-4">
                      {/* Search controls */}
                      <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Наберите Борщ, Сырники, Творог, Банан..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border-2 border-slate-900 rounded-xl pl-9 pr-3 py-2.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-slate-900 text-white border-2 border-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]"
                        >
                          {isSearchingOnline ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin text-orange-450" />
                          ) : (
                            'Поиск / Find'
                          )}
                        </button>
                      </form>

                      {/* Region flags filter toggles */}
                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 border border-slate-200 rounded-xl">
                        <span className="text-[8px] font-black uppercase text-slate-400 font-mono tracking-widest pl-1 mr-1">Регион:</span>
                        {[
                          { id: 'all', label: 'All 🌐' },
                          { id: 'us', label: 'US 🇺🇸' },
                          { id: 'ru', label: 'RU 🇷🇺' },
                          { id: 'ua', label: 'UA 🇺🇦' }
                        ].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSearchRegion(r.id as any)}
                            className={`px-2 py-0.5 text-[9px] font-black font-mono rounded-lg border transition-all cursor-pointer ${
                              searchRegion === r.id
                                ? 'bg-orange-500 border-orange-600 text-white'
                                : 'bg-white border-slate-250 text-slate-755 hover:bg-slate-100'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>

                      {/* Results block */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase font-mono">
                          Результаты поиска ({dbResults.length})
                        </span>
                        
                        <div className="max-h-[200px] overflow-y-auto border-2 border-slate-150 rounded-2xl divide-y divide-slate-100 bg-slate-50 p-1 flex flex-col gap-1 pr-1 font-mono">
                          {dbResults.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-center gap-1.5 bg-white rounded-xl border border-slate-200">
                              <Utensils className="h-6 w-6 text-slate-300 animate-pulse" />
                              <span className="text-[10px] text-slate-400 font-mono uppercase font-black">Ничего не найдено</span>
                              <p className="text-[9px] text-slate-400 font-bold px-4">Введите запрос выше, чтобы начать локальный + глобальный поиск!</p>
                            </div>
                          ) : (
                            dbResults.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setSelectedDbItem(item);
                                  setPortionGrams('100');
                                }}
                                className="w-full text-left p-2 rounded-xl border border-transparent hover:border-slate-200 transition-all flex flex-col gap-0.5 cursor-pointer bg-white hover:bg-slate-50 text-xs"
                              >
                                <div className="flex justify-between items-start w-full gap-2 font-mono">
                                  <span className="font-extrabold text-slate-900 truncate leading-tight flex-1">{item.name}</span>
                                  {item.brand && (
                                    <span className="text-[8px] font-black tracking-wide font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded leading-none">
                                      {item.brand}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex justify-between items-center w-full mt-1.5 font-mono text-xs">
                                  <span className="text-[10px] text-orange-655 font-black">
                                    {item.caloriesPer100g} kcal <span className="text-[8px] text-slate-400">/ 100g</span>
                                  </span>
                                  
                                  <div className="flex gap-2 text-[9px] text-slate-400 font-bold">
                                    <span className="text-rose-500">P: {item.proteinPer100g}g</span>
                                    <span>&bull;</span>
                                    <span className="text-amber-500">C: {item.carbsPer100g}g</span>
                                    <span>&bull;</span>
                                    <span className="text-sky-550">F: {item.fatPer100g}g</span>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Presets List in step 1 embedded cleanly */}
                      <div className="border-t-2 border-slate-100 pt-3">
                        <span className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-widest block mb-1.5">
                          Быстрые шаблоны / Common presets
                        </span>
                        <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                          {PRESET_FOODS.map((preset, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                handlePresetClick(preset, i);
                              }}
                              className="p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-left text-xs font-bold transition-all text-slate-700 hover:border-slate-350 cursor-pointer flex flex-col gap-0.5"
                            >
                              <span className="text-slate-900 font-extrabold text-[11px] block truncate w-full">{preset.name}</span>
                              <span className="text-[8px] font-mono text-slate-400 leading-none">
                                {preset.calories}kcal &bull; P: {preset.protein}g, C: {preset.carbs}g
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* Manual Form Panel */
                    <form onSubmit={handleCustomSubmit} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Название блюда / Description Name</label>
                        <input
                          type="text"
                          placeholder="Шашлык, макароны, творог 5%..."
                          value={foodName}
                          onChange={(e) => setFoodName(e.target.value)}
                          className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Прием пищи / Category</label>
                          <select
                            value={mealType}
                            onChange={(e) => setMealType(e.target.value as any)}
                            className="w-full bg-white border-2 border-slate-900 rounded-xl px-2.5 py-2 text-xs font-black text-slate-900 focus:outline-none"
                          >
                            <option value="breakfast">Завтрак / Breakfast</option>
                            <option value="lunch">Обед / Lunch</option>
                            <option value="dinner">Ужин / Dinner</option>
                            <option value="snack">Перекус / Snack</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Калории (ккал) / Calories</label>
                          <input
                            type="number"
                            min="0"
                            max="5000"
                            placeholder="320"
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                            className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 font-mono focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      {/* Manual Macro grams split */}
                      <div className="bg-slate-50 border-2 border-slate-200 p-3.5 rounded-2xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase font-mono tracking-widest mb-2.5 text-center">
                          Макронутриенты (БЖУ - Опционально!) / Macro Grams
                        </p>
                        <div className="grid grid-cols-3 gap-2.5 font-mono">
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-rose-500 uppercase font-mono text-center">Белки / Prot</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="25"
                              value={protein}
                              onChange={(e) => setProtein(e.target.value)}
                              className="w-full bg-white border-2 border-slate-350 rounded-lg py-1 px-1.5 text-[11px] font-black text-center text-slate-900 focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-amber-500 uppercase font-mono text-center">Углеводы / Carbs</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="30"
                              value={carbs}
                              onChange={(e) => setCarbs(e.target.value)}
                              className="w-full bg-white border-2 border-slate-350 rounded-lg py-1 px-1.5 text-[11px] font-black text-center text-slate-900 focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-sky-500 uppercase font-mono text-center">Жиры / Fats</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="8"
                              value={fat}
                              onChange={(e) => setFat(e.target.value)}
                              className="w-full bg-white border-2 border-slate-350 rounded-lg py-1 px-1.5 text-[11px] font-black text-center text-slate-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)] font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-all"
                      >
                        <Plus className="h-4.5 w-4.5 text-orange-450 stroke-[3px]" /> Log Manual Item
                      </button>
                    </form>
                  )}
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
