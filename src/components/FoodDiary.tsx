import React, { useState, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  TrendingUp,
  RotateCcw,
  Search,
  Globe,
  Loader2,
  Check,
  X,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchLocalFoods, searchOpenFoodFacts, FoodDbItem, LOCAL_FOOD_DATABASE } from '../utils/foodDatabase';
import { translations } from '../utils/translations';

interface FoodDiaryProps {
  profile: UserBioProfile;
  foodLogs: FoodItemLog[];
  onAddFoodLog: (item: Omit<FoodItemLog, 'id'>) => void;
  onDeleteFoodLog: (id: string) => void;
  onClearFoodLogsForDate: (dateStr: string) => void;
  adaptiveTdee?: number;
  initialMealSearchTrigger?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  onResetMealSearchTrigger?: () => void;
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
  initialMealSearchTrigger,
  onResetMealSearchTrigger,
}: FoodDiaryProps) {
  const lang = profile.language || 'en';
  const t = translations[lang];
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

  // Custom user product registry state
  const [myProducts, setMyProducts] = useState<FoodDbItem[]>(() => {
    try {
      const stored = localStorage.getItem('my_custom_products');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // State to toggle inline product creator
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdCalories, setNewProdCalories] = useState('');
  const [newProdProtein, setNewProdProtein] = useState('');
  const [newProdCarbs, setNewProdCarbs] = useState('');
  const [newProdFat, setNewProdFat] = useState('');

  // Capture injected search trigger and open modal instantly
  useEffect(() => {
    if (initialMealSearchTrigger) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setCurrentSearchMealType(initialMealSearchTrigger);
      setDbMealType(initialMealSearchTrigger);
      setMealType(initialMealSearchTrigger);
      setIsSearchOpen(true);
      if (onResetMealSearchTrigger) {
        onResetMealSearchTrigger();
      }
    }
  }, [initialMealSearchTrigger]);
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
       let dayOfWeek = d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' });
       dayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
       
       result.push({
         dateStr: str,
         dayNum: d.getDate(),
         dayLabel: dayOfWeek,
         hasFoods: foodLogs.some(f => f.date === str)
       });
    }
    return result;
  }, [selectedDate, foodLogs, lang]);

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

    const parsedCal = parseInt(calories) || 0;
    const parsedProtein = parseInt(protein) || 0;
    const parsedCarbs = parseInt(carbs) || 0;
    const parsedFat = parseInt(fat) || 0;

    const activeTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    onAddFoodLog({
      date: selectedDate,
      name: foodName,
      calories: parsedCal,
      protein: parsedProtein,
      carbs: parsedCarbs,
      fat: parsedFat,
      mealType: currentSearchMealType,
      time: activeTime,
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
    const activeTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    onAddFoodLog({
      date: selectedDate,
      name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
      mealType: currentSearchMealType,
      time: activeTime,
    });
    setIsSearchOpen(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();

    // Map matched custom products first!
    const matchedMyProducts = myProducts.filter(item => {
      const sQuery = query.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(sQuery) || (item.brand && item.brand.toLowerCase().includes(sQuery));
      const regionMatch = searchRegion === 'all' || item.region === searchRegion;
      return nameMatch && regionMatch;
    });

    if (!query) {
      const initial = searchLocalFoods('', searchRegion);
      const matchedMyProdsAll = myProducts.filter(item => searchRegion === 'all' || item.region === searchRegion);
      setDbResults([...matchedMyProdsAll, ...initial]);
      setDbSearchAttempted(false);
      return;
    }

    setDbSearchAttempted(true);
    setSelectedDbItem(null);

    const local = searchLocalFoods(query, searchRegion);
    const localMerged = [...matchedMyProducts, ...local];
    setDbResults(localMerged);

    setIsSearchingOnline(true);
    try {
      const online = await searchOpenFoodFacts(query, searchRegion);
      const merged = [...localMerged];
      const localNames = new Set(localMerged.map(item => item.name.toLowerCase()));

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
      const myProductList = myProducts.filter(f => searchRegion === 'all' || f.region === searchRegion);
      setDbResults([...myProductList, ...initial]);
    }
  }, [searchRegion, myProducts]);

  // Handle saving user created custom product
  const handleCreateCustomProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdCalories.trim()) return;

    const newProduct: FoodDbItem = {
      id: `custom-prod-${Date.now()}`,
      name: newProdName.trim(),
      brand: newProdBrand.trim() || undefined,
      caloriesPer100g: parseInt(newProdCalories) || 0,
      proteinPer100g: parseFloat(newProdProtein) || 0,
      carbsPer100g: parseFloat(newProdCarbs) || 0,
      fatPer100g: parseFloat(newProdFat) || 0,
      region: 'ua', // default region tag as Ukraine/Local
      lang: lang === 'ru' ? 'uk' : 'en',
      tags: [newProdName.trim().toLowerCase(), (newProdBrand || '').trim().toLowerCase()].filter(Boolean)
    };

    const updated = [newProduct, ...myProducts];
    setMyProducts(updated);
    localStorage.setItem('my_custom_products', JSON.stringify(updated));

    // Reset inputs
    setNewProdName('');
    setNewProdBrand('');
    setNewProdCalories('');
    setNewProdProtein('');
    setNewProdCarbs('');
    setNewProdFat('');
    setIsCreatingProduct(false);

    // Auto focus search results on this brand new product
    setSearchQuery(newProduct.name);
    setDbResults(prev => [newProduct, ...prev]);
  };

  // Delete custom product handler
  const handleDeleteCustomProduct = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // block click from selecting the row
    const confirmed = window.confirm(
      lang === 'ru' 
        ? 'Удалить этот продукт из вашей базы "Мои продукты"?' 
        : 'Remove this product from your custom "My Products" database?'
    );
    if (!confirmed) return;

    const updated = myProducts.filter(p => p.id !== id);
    setMyProducts(updated);
    localStorage.setItem('my_custom_products', JSON.stringify(updated));

    // Update results lists
    setDbResults(prev => prev.filter(p => p.id !== id));
  };

  // Handle db logging
  const handleLogDbItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDbItem) return;

    const grams = parseFloat(portionGrams) || 100;
    const factor = grams / 100;
    const activeTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    onAddFoodLog({
      date: selectedDate,
      name: `${selectedDbItem.name} (${grams}g)`,
      calories: Math.round(selectedDbItem.caloriesPer100g * factor),
      protein: Math.round(selectedDbItem.proteinPer100g * factor * 10) / 10,
      carbs: Math.round(selectedDbItem.carbsPer100g * factor * 10) / 10,
      fat: Math.round(selectedDbItem.fatPer100g * factor * 10) / 10,
      mealType: dbMealType,
      time: activeTime,
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
    <div className="w-full flex flex-col gap-2.5 select-none">
      {/* Low-profile single-box Calendar Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col gap-2">
        {/* Sleek Header Row with Selected Date & Native Date Selector Accent */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="p-1 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-900 uppercase tracking-tight">
              {selectedDate === todayStr ? (lang === 'ru' ? 'Сегодня' : 'Today') : new Date(selectedDate).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <div className="relative inline-block ml-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="absolute inset-0 opacity-0 w-5 h-5 cursor-pointer"
                title="Choose Custom Date"
              />
              <Calendar className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 cursor-pointer" />
            </div>
          </div>

          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="p-1 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Low Margin Rolling 7-Day Matrix */}
        <div className="grid grid-cols-7 gap-1 font-mono text-center">
          {rollingDays.map((day) => {
            const isSelected = day.dateStr === selectedDate;
            const isToday = day.dateStr === todayStr;
            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`flex flex-col items-center justify-center py-1 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-600 font-bold'
                    : isToday
                    ? 'border-slate-300 bg-slate-50 text-slate-900 font-extrabold'
                    : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className={`text-[8px] font-bold uppercase ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>
                  {day.dayLabel.slice(0, 1)}
                </span>
                <span className="text-xs font-bold leading-none mt-0.5">
                  {day.dayNum}
                </span>
                
                {day.hasFoods && (
                  <span className={`w-1/2 h-0.5 rounded-full mt-0.5 ${isSelected ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Unified Calories + Macros Panel Card (Extremely low profile, MacroFactor-inspired) */}
      <div className="bg-white border border-slate-200 text-slate-850 rounded-xl p-2.5 flex flex-col gap-2 font-mono">
        <div className="grid grid-cols-4 gap-2 text-center select-none text-[10px] sm:text-xs">
          {/* Calories */}
          <div className="flex flex-col gap-0.5 text-left">
            <div className="flex items-center gap-0.5 text-slate-700 font-sans truncate">
              <span>🔥</span>
              <span className="font-extrabold text-slate-900">{Math.round(totals.calories)}</span>
              <span className="text-slate-400 font-normal">/{Math.round(targetCalories)}</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (totals.calories / targetCalories) * 100)}%` }} />
            </div>
          </div>

          {/* Protein */}
          <div className="flex flex-col gap-0.5 text-left">
            <div className="flex items-center gap-0.5 text-slate-705 font-sans truncate">
              <span className="font-bold text-rose-500">P</span>
              <span className="font-extrabold text-slate-900">{Math.round(totals.protein)}</span>
              <span className="text-slate-400 font-normal">/{Math.round(macroTargets.proteinGrams)}</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (totals.protein / macroTargets.proteinGrams) * 100)}%` }} />
            </div>
          </div>

          {/* Fats */}
          <div className="flex flex-col gap-0.5 text-left">
            <div className="flex items-center gap-0.5 text-slate-705 font-sans truncate">
              <span className="font-bold text-amber-500">F</span>
              <span className="font-extrabold text-slate-900">{Math.round(totals.fat)}</span>
              <span className="text-slate-400 font-normal">/{Math.round(macroTargets.fatGrams)}</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, (totals.fat / macroTargets.fatGrams) * 100)}%` }} />
            </div>
          </div>

          {/* Carbs */}
          <div className="flex flex-col gap-0.5 text-left">
            <div className="flex items-center gap-0.5 text-slate-705 font-sans truncate">
              <span className="font-bold text-emerald-500">C</span>
              <span className="font-extrabold text-slate-900">{Math.round(totals.carbs)}</span>
              <span className="text-slate-400 font-normal">/{Math.round(macroTargets.carbGrams)}</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (totals.carbs / macroTargets.carbGrams) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Mealtimes Vertical List (MacroFactor-style direct layout) */}
      <div className="flex flex-col gap-1.5">
        {/* The 4 main compartments (Breakfast, Lunch, Dinner, Snack) */}
        <div className="flex flex-col gap-1.5">
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
              breakfast: lang === 'ru' ? 'Завтрак' : 'Breakfast',
              lunch: lang === 'ru' ? 'Обед' : 'Lunch',
              dinner: lang === 'ru' ? 'Ужин' : 'Dinner',
              snack: lang === 'ru' ? 'Перекус' : 'Snack'
            };

            const hasItems = group.items.length > 0;

            if (!hasItems) {
              return (
                <button
                  key={groupKey}
                  onClick={() => {
                    setCurrentSearchMealType(groupKey);
                    setDbMealType(groupKey);
                    setMealType(groupKey);
                    setIsSearchOpen(true);
                    setSelectedDbItem(null);
                    setSearchQuery('');
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white py-3.5 sm:py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm select-none"
                >
                  <Plus className="h-4 w-4 stroke-[3.5px] text-white shrink-0" />
                  <span>
                    {lang === 'ru' ? 'Добавить ' : 'Add '}
                    {groupKey === 'breakfast' 
                      ? (lang === 'ru' ? 'Завтрак' : 'Breakfast') 
                      : groupKey === 'lunch' 
                      ? (lang === 'ru' ? 'Обед' : 'Lunch') 
                      : groupKey === 'dinner' 
                      ? (lang === 'ru' ? 'Ужин' : 'Dinner') 
                      : (lang === 'ru' ? 'Перекус' : 'Snack')}
                  </span>
                </button>
              );
            }

            return (
              <div
                key={groupKey}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-all"
              >
                {/* Meal Compartment Header Panel */}
                <div className="bg-slate-50 border-b border-slate-100 px-3 py-1 flex justify-between items-center gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    {group.icon}
                    <span className="tracking-tight">{mealTitles[groupKey]}</span>
                    <span className="font-normal font-mono text-[10px] text-slate-550">({groupTotals.calories} kcal)</span>
                  </div>

                  {/* Subtotal macros summaries and interactive Log action button */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold text-slate-500">
                      <span className="text-rose-500">P:{Math.round(groupTotals.protein)}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-amber-500">C:{Math.round(groupTotals.carbs)}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-sky-500">F:{Math.round(groupTotals.fat)}</span>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentSearchMealType(groupKey);
                        setDbMealType(groupKey);
                        setMealType(groupKey);
                        setIsSearchOpen(true);
                        setSelectedDbItem(null);
                        setSearchQuery('');
                      }}
                      className="flex items-center justify-center bg-slate-900 hover:bg-slate-950 text-white p-1 rounded-full cursor-pointer transition-colors shadow-sm"
                    >
                      <Plus className="h-3 w-3 stroke-[3px] text-white" />
                    </button>
                  </div>
                </div>

                {/* Logged Food Rows list with beautiful timestamps in MacroFactor styling */}
                <div className="divide-y divide-slate-100 bg-white">
                  {group.items.map((food) => (
                    <div
                      key={food.id}
                      className="px-3 py-1 flex justify-between items-center hover:bg-slate-50/40 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 font-sans">
                        {/* Compact micro timestamp tag */}
                        <span className="text-[9px] bg-slate-50 text-slate-400 border border-slate-200 px-1 rounded font-mono shrink-0">
                          {food.time || '12:00'}
                        </span>

                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-850 truncate leading-tight">
                            {food.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold font-mono text-slate-650">
                          {food.calories} kcal
                        </span>
                        <button
                          onClick={() => onDeleteFoodLog(food.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                          title={lang === 'ru' ? 'Удалить' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
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
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 max-w-lg w-full relative flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto"
            >
              {/* Top Row Title and Close Trigger */}
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-3.5">
                <div>
                  <span className="text-[9px] font-black tracking-widest uppercase font-mono text-orange-555 block">
                    {lang === 'ru' ? 'Добавить пищу' : 'Food tracking'}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 uppercase font-mono">
                    {lang === 'ru' ? 'Линейка: ' : 'Target: '} {
                      currentSearchMealType === 'breakfast' ? (lang === 'ru' ? 'Завтрак' : 'Breakfast') :
                      currentSearchMealType === 'lunch' ? (lang === 'ru' ? 'Обед' : 'Lunch') :
                      currentSearchMealType === 'dinner' ? (lang === 'ru' ? 'Ужин' : 'Dinner') : (lang === 'ru' ? 'Перекус' : 'Snack')
                    }
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSelectedDbItem(null);
                  }}
                  className="hover:bg-slate-50 p-1 rounded-lg border border-slate-200 transition-colors cursor-pointer bg-white text-slate-700 flex items-center justify-center"
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
                    className="self-start text-[10px] font-bold uppercase font-mono border border-slate-200 px-3 py-1 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  >
                    &larr; {lang === 'ru' ? 'Назад' : 'Back'}
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
                      {lang === 'ru' ? 'Порции' : 'Portion presets'}
                    </label>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      {[
                        { label: lang === 'ru' ? 'База 100г' : 'Reference 100g', grams: '100', desc: 'Reference Weight' },
                        { label: lang === 'ru' ? 'Порция 150г' : 'Serving 150g', grams: '150', desc: 'Single Serving' },
                        { label: lang === 'ru' ? 'Пачка 200г' : 'Pack 200g', grams: '200', desc: 'Full Pack / Tub' },
                        { label: lang === 'ru' ? 'Двойная 250г' : 'Double 250g', grams: '250', desc: 'Big / Double' },
                        { label: lang === 'ru' ? 'Большая 300г' : 'Large 300g', grams: '300', desc: 'Large Bowl' },
                        { label: lang === 'ru' ? 'Макси 400г' : 'Max 400g', grams: '400', desc: 'Max Meal' },
                      ].map((presetItem) => {
                        const active = portionGrams === presetItem.grams;
                        return (
                          <button
                            key={presetItem.grams}
                            type="button"
                            onClick={() => setPortionGrams(presetItem.grams)}
                            className={`p-2 rounded-xl border text-left transition-colors flex flex-col cursor-pointer ${
                              active
                                ? 'border-blue-500 bg-blue-50 text-blue-600 font-bold'
                                : 'border-slate-150 bg-slate-50 hover:bg-white text-slate-800'
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
                        {lang === 'ru' ? 'Вес (граммы)' : 'Weight (grams)'}
                      </span>
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200 font-mono text-xs font-bold">
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          value={portionGrams}
                          onChange={(e) => setPortionGrams(e.target.value)}
                          className="w-12 bg-transparent text-right outline-none"
                        />
                        <span className="text-slate-500">{lang === 'ru' ? 'г' : 'g'}</span>
                      </div>
                    </div>
                    
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="5"
                      value={parseFloat(portionGrams) || 100}
                      onChange={(e) => setPortionGrams(e.target.value)}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-550"
                    />
                  </div>

                  {/* Destination meal picker */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 font-mono tracking-widest">
                      {lang === 'ru' ? 'Прием пищи' : 'Mealtimes split'}
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
                            className={`py-1.5 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-100 font-bold'
                                : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
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
                  <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col gap-1.5 font-mono mt-1">
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
                    className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold uppercase font-mono tracking-wider cursor-pointer transition-colors mt-1"
                  >
                    <Check className="h-4.5 w-4.5 stroke-[3.5px]" />
                    <span>Внести {portionGrams || '100'}г в Дневник / Confirm Log</span>
                  </button>

                </div>
              ) : (
                /* Step 1: Input Search list or Manual forms */
                <div className="flex flex-col gap-4">
                  {/* Select Entry Mode Sub-tabs navigation */}
                  <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl font-mono">
                    <button
                      type="button"
                      onClick={() => setEntryMode('database')}
                      className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-tight transition-colors cursor-pointer ${
                        entryMode === 'database'
                          ? 'bg-white text-slate-900 border border-slate-200 shadow-none'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Реестр еды / Database
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryMode('manual')}
                      className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-tight transition-colors cursor-pointer ${
                        entryMode === 'manual'
                          ? 'bg-white text-slate-900 border border-slate-200 shadow-none'
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
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          {isSearchingOnline ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
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
                        
                        <div className="max-h-[180px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 p-1 flex flex-col gap-1 pr-1 font-mono">
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
                                  <div className="flex-1 truncate leading-tight flex items-center gap-1.5 min-w-0">
                                    {item.id.startsWith('custom-prod-') && (
                                      <span className="shrink-0 bg-amber-100 border border-amber-200 text-amber-700 text-[8px] font-black uppercase px-1 rounded leading-none flex items-center gap-0.5">
                                        <Sparkles className="h-2 w-2" />
                                        {lang === 'ru' ? 'МОЙ' : 'MY'}
                                      </span>
                                    )}
                                    <span className="font-extrabold text-slate-900 truncate">{item.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {item.brand && (
                                      <span className="text-[8px] font-black tracking-wide font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded leading-none">
                                        {item.brand}
                                      </span>
                                    )}
                                    {item.id.startsWith('custom-prod-') && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteCustomProduct(item.id, e)}
                                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                        title={lang === 'ru' ? 'Удалить продукт из базы' : 'Delete custom product'}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 stroke-[2.5px]" />
                                      </button>
                                    )}
                                  </div>
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

                      {/* Custom User Product Creator / Replacement for Presets */}
                      <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
                        {!isCreatingProduct ? (
                          <button
                            type="button"
                            onClick={() => setIsCreatingProduct(true)}
                            className="w-full flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase font-mono tracking-wider cursor-pointer transition-colors shadow-sm"
                          >
                            <PlusCircle className="h-4 w-4" />
                            <span>{lang === 'ru' ? 'Создать свой продукт в реестр (Мои продукты)' : 'Create Custom Product (My Products)'}</span>
                          </button>
                        ) : (
                          <form onSubmit={handleCreateCustomProduct} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col gap-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider font-mono">
                                {lang === 'ru' ? 'Создание продукта (на 100г)' : 'New Custom Food (per 100g)'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsCreatingProduct(false)}
                                className="text-[9px] font-black text-rose-500 hover:underline font-mono uppercase"
                              >
                                {lang === 'ru' ? 'Отмена' : 'Cancel'}
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-bold text-slate-400 uppercase font-mono">{lang === 'ru' ? 'Название:*' : 'Name:*'}</label>
                                <input
                                  type="text"
                                  required
                                  placeholder={lang === 'ru' ? 'Мороженое Рудь' : 'Rud Ice Cream'}
                                  value={newProdName}
                                  onChange={(e) => setNewProdName(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-semibold focus:outline-none focus:border-orange-550 font-mono"
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-bold text-slate-400 uppercase font-mono">{lang === 'ru' ? 'Производитель (бренд):' : 'Brand (optional):'}</label>
                                <input
                                  type="text"
                                  placeholder={lang === 'ru' ? 'Рудь' : 'Rud'}
                                  value={newProdBrand}
                                  onChange={(e) => setNewProdBrand(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-semibold focus:outline-none focus:border-orange-550 font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-650 uppercase font-mono text-center">Ккал:*</span>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  max="1500"
                                  placeholder="220"
                                  value={newProdCalories}
                                  onChange={(e) => setNewProdCalories(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1 text-xs text-center font-bold font-mono focus:outline-none"
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-rose-500 uppercase font-mono text-center">{lang === 'ru' ? 'Белки' : 'Prot'}</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="4.2"
                                  step="0.1"
                                  value={newProdProtein}
                                  onChange={(e) => setNewProdProtein(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1 text-xs text-center font-semibold font-mono focus:outline-none"
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-amber-500 uppercase font-mono text-center">{lang === 'ru' ? 'Углев' : 'Carb'}</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="24.5"
                                  step="0.1"
                                  value={newProdCarbs}
                                  onChange={(e) => setNewProdCarbs(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1 text-xs text-center font-semibold font-mono focus:outline-none"
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-sky-500 uppercase font-mono text-center">{lang === 'ru' ? 'Жиры' : 'Fat'}</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="11.0"
                                  step="0.1"
                                  value={newProdFat}
                                  onChange={(e) => setNewProdFat(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1 text-xs text-center font-semibold font-mono focus:outline-none"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-black py-2 rounded-xl text-[10px] uppercase font-mono tracking-wider cursor-pointer transition-colors shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5 stroke-[3px]" />
                              <span>{lang === 'ru' ? 'Добавить в "Мои продукты"' : 'Add to Custom Database'}</span>
                            </button>
                          </form>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* Manual Form Panel */
                    <form onSubmit={handleCustomSubmit} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-slate-500 font-mono">{t.foodNameLabel}</label>
                        <input
                          type="text"
                          placeholder={lang === 'ru' ? 'Шашлык, макароны, творог 5%...' : 'Chicken, pasta, cottage cheese 5%...'}
                          value={foodName}
                          onChange={(e) => {
                            setFoodName(e.target.value);
                            setShowMacroWarning(false);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-black text-slate-500 font-mono">{t.foodCategoryLabel}</label>
                          <select
                            value={mealType}
                            onChange={(e) => setMealType(e.target.value as any)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
                          >
                            <option value="breakfast">{lang === 'ru' ? 'Завтрак' : 'Breakfast'}</option>
                            <option value="lunch">{lang === 'ru' ? 'Обед' : 'Lunch'}</option>
                            <option value="dinner">{lang === 'ru' ? 'Ужин' : 'Dinner'}</option>
                            <option value="snack">{lang === 'ru' ? 'Перекус' : 'Snack'}</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-black text-slate-500 font-mono">{t.foodCaloriesLabel}</label>
                          <input
                            type="number"
                            min="0"
                            max="5000"
                            placeholder="320"
                            value={calories}
                            onChange={(e) => {
                              setCalories(e.target.value);
                              setShowMacroWarning(false);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 font-mono focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      {/* Manual Macro grams split */}
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase font-mono tracking-widest mb-2.5 text-center">
                          {t.macrosHeaderOptional}
                        </p>
                        <div className="grid grid-cols-3 gap-2.5 font-mono">
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-rose-500 uppercase font-mono text-center">{lang === 'ru' ? 'Белки' : 'Prot'}</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="25"
                              value={protein}
                              onChange={(e) => {
                                setProtein(e.target.value);
                                setShowMacroWarning(false);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[11px] font-semibold text-center text-slate-900 focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-amber-500 uppercase font-mono text-center">{lang === 'ru' ? 'Углеводы' : 'Carbs'}</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="30"
                              value={carbs}
                              onChange={(e) => {
                                setCarbs(e.target.value);
                                setShowMacroWarning(false);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[11px] font-semibold text-center text-slate-900 focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-sky-500 uppercase font-mono text-center">{lang === 'ru' ? 'Жиры' : 'Fats'}</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="8"
                              value={fat}
                              onChange={(e) => setFat(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[11px] font-semibold text-center text-slate-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dynamic inline Macro Calorie alert confirmation warning */}
                      {(() => {
                        const parsedCal = parseInt(calories) || 0;
                        const parsedP = parseInt(protein) || 0;
                        const parsedC = parseInt(carbs) || 0;
                        const parsedF = parseInt(fat) || 0;
                        const minMacroCals = (parsedP * 4) + (parsedC * 4) + (parsedF * 9);
                        const isOverMacros = minMacroCals > parsedCal && parsedCal > 0;

                        if (!isOverMacros) return null;

                        return (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex flex-col gap-1 font-sans">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-amber-800">
                                  {lang === 'ru' ? 'Вы уверены?' : 'Are you sure?'}
                                </span>
                                <p className="text-slate-600 leading-normal text-[11px]">
                                  {lang === 'ru'
                                    ? `Введённые макроны содержат минимум ${minMacroCals} ккал, превышая общую калорийность (${calories} ккал).`
                                    : `The macros contain at least ${minMacroCals} kcal, which exceeds the total calories (${calories} kcal).`
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                      >
                        <span className="bg-white rounded-full p-0.5 flex items-center justify-center">
                          <Plus className="h-3 w-3 stroke-[3px] text-slate-900" />
                        </span>
                        <span>{t.manualEntryTab}</span>
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
