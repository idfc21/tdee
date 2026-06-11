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
    setDbMealType(preset.category);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      // If empty query, show all region local foods
      const initial = searchLocalFoods('', searchRegion);
      setDbResults(initial);
      setDbSearchAttempted(false);
      return;
    }

    setDbSearchAttempted(true);
    setSelectedDbItem(null);

    // 1. Run local search immediately for high-speed responsiveness
    const local = searchLocalFoods(query, searchRegion);
    setDbResults(local);

    // 2. Trigger async global Open Food Facts API
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

  // Run initial search query results on region change if query exists
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const e = { preventDefault: () => {} };
      handleSearch(e as any);
    } else {
      // Standard local list of this region when nothing searched
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Add food & Quick Add */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Main Ingestion & Database Card with neo-brutalist tabs */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9px] font-black tracking-widest text-orange-600 uppercase font-mono block">DIET LEDGER INGESTIONS</span>
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight block">Log Clean Whole Foods</span>
              </div>
              
              {/* Tabs selector */}
              <div className="flex bg-slate-100 border-2 border-slate-900 p-0.5 rounded-xl">
                <button
                  onClick={() => setEntryMode('database')}
                  className={`px-2.5 py-1 font-mono text-[10px] font-black rounded-lg uppercase tracking-tight transition-all cursor-pointer ${
                    entryMode === 'database'
                      ? 'bg-slate-900 text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,0.25)]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Database
                </button>
                <button
                  onClick={() => setEntryMode('manual')}
                  className={`px-2.5 py-1 font-mono text-[10px] font-black rounded-lg uppercase tracking-tight transition-all cursor-pointer ${
                    entryMode === 'manual'
                      ? 'bg-slate-900 text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,0.25)]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            {/* Render Database Search Mode */}
            {entryMode === 'database' ? (
              <div className="flex flex-col gap-3.5">
                {/* Search Bar / Input */}
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Try Borscht, Syrniki, Chicken, Banana..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 rounded-xl pl-9 pr-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 hover:border-slate-400 transition-all font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-slate-900 text-white border-2 border-slate-900 px-3 py-2 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]"
                  >
                    {isSearchingOnline ? (
                      <Loader2 className="h-4 w-4 animate-spin text-orange-450" />
                    ) : (
                      'Search'
                    )}
                  </button>
                </form>

                {/* Country/Region Filter Switchers — US / RU / UA */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 border border-slate-200 rounded-xl">
                  <span className="text-[8px] font-black uppercase text-slate-400 font-mono tracking-widest pl-1 mr-1">Region:</span>
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

                {/* Search Results Display List */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase font-mono">
                    Matching Products ({dbResults.length})
                  </span>
                  
                  <div className="max-h-[220px] overflow-y-auto border-2 border-slate-150 rounded-2xl divide-y divide-slate-100 bg-slate-50 p-1 flex flex-col gap-1 pr-1">
                    {dbResults.length === 0 ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center gap-1 bg-white rounded-xl border border-slate-200">
                        <Utensils className="h-6 w-6 text-slate-300 animate-pulse" />
                        <span className="text-[10px] text-slate-400 font-mono uppercase font-black">No matching items</span>
                        <p className="text-[9px] text-slate-450 font-semibold px-4">Type a query above to search local + global open registry!</p>
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
                          className={`w-full text-left p-2 rounded-xl border transition-all flex flex-col gap-0.5 cursor-pointer hover:bg-white text-xs ${
                            selectedDbItem?.id === item.id
                              ? 'bg-orange-50/70 border-orange-500 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)] font-mono'
                              : 'bg-white border-transparent hover:border-slate-100 font-mono'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full gap-2 font-mono">
                            <span className="font-extrabold text-slate-900 truncate leading-tight flex-1">{item.name}</span>
                            {item.brand && (
                              <span className="text-[8px] font-black tracking-wide font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded leading-none">
                                {item.brand}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex justify-between items-center w-full mt-1.5">
                            <span className="text-[10px] text-orange-650 font-black font-mono">
                              {item.caloriesPer100g} kcal <span className="text-[8px] text-slate-400">/ 100g</span>
                            </span>
                            
                            <div className="flex gap-2 text-[9px] font-mono text-slate-450 font-bold">
                              <span className="text-rose-500">P: {item.proteinPer100g}g</span>
                              <span>&bull;</span>
                              <span className="text-amber-500">C: {item.carbsPer100g}g</span>
                              <span>&bull;</span>
                              <span className="text-sky-500">F: {item.fatPer100g}g</span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

              </div>
            ) : (
              /* Manual Entry Form */
              <form onSubmit={handleCustomSubmit} className="flex flex-col gap-4 mt-0" id="add-food-form">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Food Description Name</label>
                  <input
                    type="text"
                    placeholder="Seared steak, white rice, avocado, oatmeal, etc..."
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="w-full bg-white border-2 border-slate-900 rounded-xl px-3.5 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Meal Category</label>
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value as any)}
                      className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                      className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>

                {/* Advanced grams row */}
                <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase font-mono tracking-widest mb-2.5">
                    Macronutrient Grams (optional)
                  </p>
                  <div className="grid grid-cols-3 gap-2.5 font-mono">
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
                  <Plus className="h-4.5 w-4.5 text-orange-450 stroke-[3px]" /> Add Manual Item
                </button>
              </form>
            )}
          </div>

          {/* Quick Add Presets Panel */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-3">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase font-mono font-bold tracking-tight">Quick Add Presets</h4>
              <p className="text-[10px] text-slate-400 uppercase font-mono font-semibold mt-0.5">Click text to customize portion, or plus to log instantly</p>
            </div>
            <div className="max-h-[200px] overflow-y-auto pr-1 flex flex-col gap-2 divide-y divide-slate-100">
              {PRESET_FOODS.map((preset, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2.5 first:pt-0 hover:bg-slate-50 px-2 rounded-xl border border-transparent hover:border-slate-100 transition-all text-xs font-bold text-slate-700"
                >
                  <div
                    onClick={() => handlePresetClick(preset, i)} 
                    className="flex flex-col gap-0.5 max-w-[70%] cursor-pointer group flex-1"
                  >
                    <span className="text-slate-900 font-extrabold text-xs group-hover:text-orange-550 transition-colors">{preset.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {preset.calories} kcal &bull; P: {preset.protein}g, C: {preset.carbs}g, F: {preset.fat}g
                    </span>
                  </div>
                  <button
                    onClick={() => handleQuickAdd(preset)}
                    className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border-2 border-slate-900 bg-orange-50 hover:bg-orange-100 text-slate-900 transition-all cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                    title={`Add ${preset.name} instantly`}
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

      {/* Absolute Full Screen Food Item Scaling Dialog Modal Portal */}
      <AnimatePresence>
        {selectedDbItem && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border-4 border-slate-900 rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] max-w-md w-full relative flex flex-col gap-4 overflow-hidden"
            >
              {/* Close Icon Button */}
              <button
                type="button"
                onClick={() => setSelectedDbItem(null)}
                className="absolute right-4 top-4 hover:bg-slate-100 p-2 rounded-xl border-2 border-slate-900 transition-all cursor-pointer bg-white"
              >
                <X className="h-4 w-4 text-slate-950 stroke-[3px]" />
              </button>

              {/* Title Header */}
              <div className="flex flex-col gap-1 pr-10">
                <span className="text-[10px] font-black text-orange-555 uppercase tracking-widest font-mono">
                  {selectedDbItem.brand ? `${selectedDbItem.brand} • Registry` : 'Open Food Database • Registry'}
                </span>
                <h3 className="text-xl font-black text-slate-900 leading-tight uppercase font-mono">
                  {selectedDbItem.name}
                </h3>
              </div>

              {/* Portion Selector Toggle Badges: RU / EN bilingual labels */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-widest">
                  Выбор порции / Portion presets
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
                        className={`p-2.5 rounded-xl border-2 text-left transition-all flex flex-col cursor-pointer ${
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

              {/* Slider & Direct Custom grams Input Selector */}
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-widest">
                    Точный вес (граммы) / custom weight
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
                
                {/* slider */}
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

              {/* Destination Ingestion Category Pill Selection */}
              <div className="flex flex-col gap-2 mt-1">
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
                        onClick={() => setDbMealType(mealPill.id as any)}
                        className={`py-2 px-1 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]'
                            : 'border-slate-250 bg-slate-50 hover:bg-white text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {mealPill.icon}
                        <span className="text-[9px] font-black uppercase leading-none">{mealPill.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Live Calculations readout dashboard display */}
              <div className="bg-slate-950 text-white border-2 border-slate-950 p-4 rounded-2xl flex flex-col gap-2.5 font-mono mt-2">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Scaled Food Nutrition</span>
                  <span className="text-xs font-black text-orange-450">{portionGrams || '100'}g portion</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[8px] font-black text-slate-500 uppercase">CALORIES</span>
                    <p className="text-2xl font-black text-white leading-none mt-1">
                      {Math.round(selectedDbItem.caloriesPer100g * ((parseFloat(portionGrams) || 100) / 100))} kcal
                    </p>
                  </div>

                  <div className="flex gap-4 text-center">
                    <div>
                      <span className="text-[8px] font-black text-rose-455 block">P</span>
                      <span className="text-sm font-black text-rose-400 leading-none">
                        {Math.round(selectedDbItem.proteinPer100g * ((parseFloat(portionGrams) || 100) / 100) * 10) / 10}g
                      </span>
                    </div>

                    <div>
                      <span className="text-[8px] font-black text-amber-455 block">C</span>
                      <span className="text-sm font-black text-amber-400 leading-none">
                        {Math.round(selectedDbItem.carbsPer100g * ((parseFloat(portionGrams) || 100) / 100) * 10) / 10}g
                      </span>
                    </div>

                    <div>
                      <span className="text-[8px] font-black text-sky-455 block">F</span>
                      <span className="text-sm font-black text-sky-400 leading-none">
                        {Math.round(selectedDbItem.fatPer100g * ((parseFloat(portionGrams) || 100) / 100) * 10) / 10}g
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Neo-brutalist Logging Button */}
              <button
                type="button"
                onClick={handleLogDbItem}
                className="w-full flex items-center justify-center gap-2 bg-orange-550 hover:bg-orange-600 text-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] font-black py-4.5 rounded-2xl text-xs uppercase font-mono tracking-wider cursor-pointer hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all mt-1"
              >
                <Check className="h-5 w-5 stroke-[4px]" />
                Внести {portionGrams || '100'}г в дневник! / Log Portion
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
