import React, { useState, useEffect } from 'react';
import { UserBioProfile, FoodItemLog } from '../types';
import { calculateTheoreticalTDEE, calculateMacroTargets, GOAL_ADJUSTMENTS } from '../utils/calc';
import {
  Plus,
  Trash2,
  Sparkles,
  Utensils,
  Coffee,
  Sun,
  Sunset,
  Soup,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Loader2,
  Check,
  X,
  Search,
  AlertTriangle,
  Info
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
  const [entryMode, setEntryMode] = useState<'database' | 'manual' | 'ai'>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbResults, setDbResults] = useState<FoodDbItem[]>([]);

  // Gemini AI parser states
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    summary: string;
  } | null>(null);
  const [aiMealType, setAiMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

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
      setAiMealType(initialMealSearchTrigger);
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
  
  // Modal toggle state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentSearchMealType, setCurrentSearchMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  // Generate rolling 7-day calendar centering on selectedDate with elegant labels
  const rollingDays = React.useMemo(() => {
    const center = new Date(selectedDate);
    const result = [];
    for (let i = -3; i <= 3; i++) {
       const d = new Date(center);
       d.setDate(d.getDate() + i);
       const str = d.toISOString().split('T')[0];
       
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
  const isOverBudget = calRemaining < 0;

  // Render SVG stroke calculations for sporty circular progress
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const consumedPercent = Math.min(100, Math.max(0, (totals.calories / targetCalories) * 100));
  const strokeDashoffset = circumference - (consumedPercent / 100) * circumference;

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

    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setIsSearchOpen(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();

    const matchedMyProducts = myProducts.filter(item => {
      const sQuery = query.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(sQuery) || (item.brand && item.brand.toLowerCase().includes(sQuery));
      return nameMatch;
    });

    if (!query) {
      const initial = searchLocalFoods('');
      const matchedMyProdsAll = myProducts;
      setDbResults([...matchedMyProdsAll, ...initial]);
      setDbSearchAttempted(false);
      return;
    }

    setDbSearchAttempted(true);
    setSelectedDbItem(null);

    const local = searchLocalFoods(query);
    const localMerged = [...matchedMyProducts, ...local];
    setDbResults(localMerged);

    setIsSearchingOnline(true);
    try {
      const online = await searchOpenFoodFacts(query);
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
      const initial = LOCAL_FOOD_DATABASE;
      const myProductList = myProducts;
      setDbResults([...myProductList, ...initial]);
    }
  }, [myProducts]);

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
      region: 'ua',
      lang: lang === 'ru' ? 'uk' : 'en',
      tags: [newProdName.trim().toLowerCase(), (newProdBrand || '').trim().toLowerCase()].filter(Boolean)
    };

    const updated = [newProduct, ...myProducts];
    setMyProducts(updated);
    localStorage.setItem('my_custom_products', JSON.stringify(updated));

    setNewProdName('');
    setNewProdBrand('');
    setNewProdCalories('');
    setNewProdProtein('');
    setNewProdCarbs('');
    setNewProdFat('');
    setIsCreatingProduct(false);

    setSearchQuery(newProduct.name);
    setDbResults(prev => [newProduct, ...prev]);
  };

  const handleDeleteCustomProduct = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      lang === 'ru' 
        ? 'Удалить этот продукт из вашей базы "Мои продукты"?' 
        : 'Remove this product from your custom "My Products" database?'
    );
    if (!confirmed) return;

    const updated = myProducts.filter(p => p.id !== id);
    setMyProducts(updated);
    localStorage.setItem('my_custom_products', JSON.stringify(updated));
    setDbResults(prev => prev.filter(p => p.id !== id));
  };

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

  // Samsung Health Inspired Meals structure
  const mealGroups = {
    breakfast: {
      title: lang === 'ru' ? 'Завтрак' : 'Breakfast',
      subtitle: lang === 'ru' ? 'Ориентир: 400 - 600 ккал' : 'Recommended: 400 - 600 kcal',
      icon: <span className="text-xl">🍳</span>,
      items: todaysFoods.filter((f) => f.mealType === 'breakfast'),
      defaultTarget: 500,
    },
    lunch: {
      title: lang === 'ru' ? 'Обед' : 'Lunch',
      subtitle: lang === 'ru' ? 'Ориентир: 600 - 800 ккал' : 'Recommended: 600 - 800 kcal',
      icon: <span className="text-xl">🥗</span>,
      items: todaysFoods.filter((f) => f.mealType === 'lunch'),
      defaultTarget: 700,
    },
    dinner: {
      title: lang === 'ru' ? 'Ужин' : 'Dinner',
      subtitle: lang === 'ru' ? 'Ориентир: 500 - 700 ккал' : 'Recommended: 500 - 700 kcal',
      icon: <span className="text-xl">🥩</span>,
      items: todaysFoods.filter((f) => f.mealType === 'dinner'),
      defaultTarget: 600,
    },
    snack: {
      title: lang === 'ru' ? 'Перекус' : 'Snack',
      subtitle: lang === 'ru' ? 'Ориентир: 100 - 300 ккал' : 'Recommended: 100 - 300 kcal',
      icon: <span className="text-xl">🍨</span>,
      items: todaysFoods.filter((f) => f.mealType === 'snack'),
      defaultTarget: 200,
    },
  };

  return (
    <div className="w-full flex flex-col gap-6 select-none bg-slate-50/20 p-1 rounded-2xl">
      
      {/* 1. Header & Minimal Calendar Matrix (Samsung Health look) */}
      <div className="bg-white border border-[#eef1f6] rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#f4f7fa]">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 tracking-tight">
              {selectedDate === todayStr 
                ? (lang === 'ru' ? 'Сегодня' : 'Today') 
                : new Date(selectedDate).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })
              }
            </span>
            <div className="relative inline-block ml-0.5">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="absolute inset-0 opacity-0 w-6 h-6 cursor-pointer"
                title="Choose Custom Date"
              />
              <Calendar className="h-4 w-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
            </div>
          </div>

          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Minimalist Day Row */}
        <div className="grid grid-cols-7 gap-1 mt-4 text-center">
          {rollingDays.map((day) => {
            const isSelected = day.dateStr === selectedDate;
            const isToday = day.dateStr === todayStr;
            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#00c08b] text-white font-bold shadow-md shadow-[#00c08b]/10'
                    : isToday
                    ? 'bg-slate-100 text-[#00c08b] font-bold'
                    : 'hover:bg-slate-50 text-slate-500'
                }`}
              >
                <span className={`text-[9px] font-semibold uppercase tracking-wider ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                  {day.dayLabel.slice(0, 1)}
                </span>
                <span className="text-xs font-bold leading-none mt-1.5">
                  {day.dayNum}
                </span>
                
                {day.hasFoods && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isSelected ? 'bg-white' : 'bg-[#00c08b]'}`}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Samsung Health Circular Gauge & Nutrition overview breakdown card */}
      <div className="bg-white border border-[#eef1f6] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Top-end SVG circular gauge */}
        <div className="flex flex-col items-center justify-center relative w-44 h-44 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="88"
              cy="88"
              r={radius}
              stroke="#f1f3f6"
              strokeWidth="11"
              fill="transparent"
            />
            {/* Progress Bar */}
            <circle
              cx="88"
              cy="88"
              r={radius}
              stroke={isOverBudget ? '#f43f5e' : '#00c08b'}
              strokeWidth="11"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>

          {/* Centered Texts inside Gauge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {lang === 'ru' ? 'СЪЕДЕНО' : 'CONSUMED'}
            </span>
            <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
              <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {Math.round(totals.calories)}
              </span>
              <span className="text-xs font-semibold text-slate-400">kcal</span>
            </div>
            
            <div className="text-[11px] font-medium text-slate-500 mt-1">
              {isOverBudget ? (
                <span className="text-rose-500 font-bold">
                  +{Math.round(Math.abs(calRemaining))} {lang === 'ru' ? 'лишних' : 'over'}
                </span>
              ) : (
                <span>
                  {Math.round(calRemaining)} {lang === 'ru' ? 'осталось' : 'remaining'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Triple Micro-Slider Nutrition breakdown bars (Carbohydrates, Protein, Fats) */}
        <div className="flex-1 w-full flex flex-col gap-4 font-sans justify-center">
          <div className="border-b border-slate-50 pb-2 mb-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
              {lang === 'ru' ? 'Обзор нутриентов БЖУ' : 'DAILY NUTRIENT BALANCERS'}
            </h3>
          </div>

          {[
            {
              label: lang === 'ru' ? 'Углеводы' : 'Carbohydrates',
              current: totals.carbs,
              target: macroTargets.carbGrams,
              color: 'bg-emerald-400',
              unit: 'g'
            },
            {
              label: lang === 'ru' ? 'Белки' : 'Protein',
              current: totals.protein,
              target: macroTargets.proteinGrams,
              color: 'bg-rose-400',
              unit: 'g'
            },
            {
              label: lang === 'ru' ? 'Жиры' : 'Fats',
              current: totals.fat,
              target: macroTargets.fatGrams,
              color: 'bg-amber-400',
              unit: 'g'
            }
          ].map((macro) => {
            const percent = Math.min(100, (macro.current / macro.target) * 100);
            return (
              <div key={macro.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700 font-bold">{macro.label}</span>
                  <div className="text-slate-500 font-medium">
                    <span className="text-slate-850 font-bold">{Math.round(macro.current)}</span>
                    <span className="text-slate-400 font-normal"> / {Math.round(macro.target)}{macro.unit}</span>
                  </div>
                </div>
                {/* Clean, rounded progress slider track */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${macro.color} rounded-full transition-all duration-300`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* 3. Samsung Health Permanent Meals Container Stack */}
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

          const hasItems = group.items.length > 0;

          return (
            <div
              key={groupKey}
              className="bg-white border border-[#eef1f6] rounded-3xl p-5 shadow-sm hover:border-slate-200 transition-all flex flex-col gap-4"
            >
              {/* Card Header row with info & quick Add button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/30">
                    {group.icon}
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-slate-800 leading-tight">
                      {group.title}
                    </h4>
                    <span className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                      {group.subtitle}
                    </span>
                  </div>
                </div>

                {/* Calorie consumed vs target right node */}
                <div className="flex items-center gap-3.5">
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-[#00c08b]">
                      {Math.round(groupTotals.calories)} <span className="text-[9.5px] text-slate-400 font-normal">kcal</span>
                    </div>
                  </div>

                  {/* Elegant micro plus circle button */}
                  <button
                    onClick={() => {
                      setCurrentSearchMealType(groupKey);
                      setDbMealType(groupKey);
                      setMealType(groupKey);
                      setIsSearchOpen(true);
                      setSelectedDbItem(null);
                      setSearchQuery('');
                    }}
                    className="h-8 w-8 rounded-full bg-slate-50 hover:bg-[#00c08b]/10 text-[#00c08b] p-0 flex items-center justify-center cursor-pointer transition-colors shadow-none hover:shadow-sm"
                  >
                    <Plus className="h-4.5 w-4.5 stroke-[3px]" />
                  </button>
                </div>
              </div>

              {/* Items logging lists inside the compartment */}
              {hasItems ? (
                <div className="border-t border-slate-50 pt-2 flex flex-col divide-y divide-[#f7f8f9]">
                  {group.items.map((food) => (
                    <div
                      key={food.id}
                      className="py-2.5 flex justify-between items-center bg-white transition-colors gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 font-sans">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#00c08b] shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {food.name}
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-medium mt-0.5 font-mono">
                            {food.time || '12:00'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-slate-700">
                          {Math.round(food.calories)} kcal
                        </span>
                        <button
                          onClick={() => onDeleteFoodLog(food.id)}
                          className="text-slate-350 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                          title={lang === 'ru' ? 'Удалить' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add more text action trigger line */}
                  <div className="pt-2 flex justify-start">
                    <button
                      onClick={() => {
                        setCurrentSearchMealType(groupKey);
                        setDbMealType(groupKey);
                        setMealType(groupKey);
                        setIsSearchOpen(true);
                        setSelectedDbItem(null);
                        setSearchQuery('');
                      }}
                      className="text-[11px] font-bold text-[#00c08b] hover:text-[#00a87a] flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3px]" />
                      <span>{lang === 'ru' ? 'Добавить ещё' : 'Add Item'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Pure Samsung Health minimalistic soft instruction block */
                <div 
                  onClick={() => {
                    setCurrentSearchMealType(groupKey);
                    setDbMealType(groupKey);
                    setMealType(groupKey);
                    setIsSearchOpen(true);
                    setSelectedDbItem(null);
                    setSearchQuery('');
                  }}
                  className="border-t border-slate-50 pt-3.5 flex items-center justify-between text-left cursor-pointer group"
                >
                  <p className="text-[11.5px] italic text-slate-400 group-hover:text-slate-650 transition-colors">
                    {lang === 'ru' 
                      ? 'Пока ничего не добавлено. Нажмите, чтобы записать.'
                      : 'No foods recorded yet. Tap to write down your portion.'
                    }
                  </p>
                  <span className="text-xs font-bold text-[#00c08b] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 uppercase tracking-wider">
                    {lang === 'ru' ? 'Внести ' : 'Record '} &rarr;
                  </span>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* 4. Complete Absolute Full Screen Modern Search Dashboard Modal overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[120] overflow-y-auto w-full h-full flex justify-center items-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-slate-100"
            >
              {/* Elegant header */}
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#00c08b]/10 flex items-center justify-center">
                    <Utensils className="h-4 w-4 text-[#00c08b]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">
                      {lang === 'ru' ? 'Новая запись' : 'New Intake Record'}
                    </h3>
                    <p className="text-[10.5px] text-slate-400 font-semibold tracking-wide uppercase font-sans mt-0.5">
                      {currentSearchMealType === 'breakfast' ? (lang === 'ru' ? 'Завтрак' : 'Breakfast') :
                       currentSearchMealType === 'lunch' ? (lang === 'ru' ? 'Обед' : 'Lunch') :
                       currentSearchMealType === 'dinner' ? (lang === 'ru' ? 'Ужин' : 'Dinner') : (lang === 'ru' ? 'Перекус' : 'Snack')}
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSelectedDbItem(null);
                  }}
                  className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer text-slate-500 active:scale-95"
                >
                  <X className="h-4 w-4 stroke-[3px]" />
                </button>
              </div>

              {/* Step State display */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {selectedDbItem ? (
                  /* Step 2: Set portion grams & log specs */
                  <div className="flex flex-col gap-5">
                    
                    <button
                      type="button"
                      onClick={() => setSelectedDbItem(null)}
                      className="self-start text-[10.5px] font-black uppercase font-sans border border-slate-200 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-slate-600"
                    >
                      <span>&larr;</span>
                      <span>{lang === 'ru' ? 'К поиску' : 'Back to search'}</span>
                    </button>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#00c08b] uppercase tracking-widest font-sans">
                        {selectedDbItem.brand ? `${selectedDbItem.brand} • Registry` : 'Open Food Database • Registry'}
                      </span>
                      <h4 className="text-lg font-black text-slate-800 leading-tight">
                        {selectedDbItem.name}
                      </h4>
                    </div>

                    {/* Simple weight entry interface */}
                    <div className="bg-slate-50 rounded-2xl p-5 flex flex-col items-center justify-center gap-2.5">
                      <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
                        {lang === 'ru' ? 'УКАЖИТЕ ВЕС В ГРАММАХ' : 'ENTER PORTION WEIGHT (GRAMS)'}
                      </span>
                      
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          value={portionGrams}
                          onChange={(e) => setPortionGrams(e.target.value)}
                          className="w-28 bg-white border border-slate-200 focus:border-[#00c08b] rounded-xl py-2 px-1 text-center text-2xl font-black text-slate-800 focus:outline-none transition-all"
                          placeholder="100"
                          autoFocus
                        />
                        <span className="text-lg font-bold text-slate-400 uppercase">g</span>
                      </div>
                    </div>

                    {/* Fast weight presets */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {lang === 'ru' ? 'Ориентиры порций' : 'Quick portion landmarks'}
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: '100g', grams: '100' },
                          { label: '150g', grams: '150' },
                          { label: '200g', grams: '200' },
                          { label: '300g', grams: '300' },
                        ].map((pSet) => {
                          const isAct = portionGrams === pSet.grams;
                          return (
                            <button
                              key={pSet.grams}
                              type="button"
                              onClick={() => setPortionGrams(pSet.grams)}
                              className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                                isAct
                                  ? 'bg-[#00c08b] border-[#00c08b] text-white'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {pSet.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Destiny Meal Slot Select */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {lang === 'ru' ? 'Прием пищи' : 'Destination meal category'}
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'breakfast', label: lang === 'ru' ? 'Завтрак' : 'Breakfast' },
                          { id: 'lunch', label: lang === 'ru' ? 'Обед' : 'Lunch' },
                          { id: 'dinner', label: lang === 'ru' ? 'Ужин' : 'Dinner' },
                          { id: 'snack', label: lang === 'ru' ? 'Снек' : 'Snack' },
                        ].map((mSlot) => {
                          const isAct = dbMealType === mSlot.id;
                          return (
                            <button
                              key={mSlot.id}
                              type="button"
                              onClick={() => {
                                setDbMealType(mSlot.id as any);
                                setMealType(mSlot.id as any);
                              }}
                              className={`py-2 text-[10.5px] font-bold rounded-xl border transition-colors cursor-pointer ${
                                isAct
                                  ? 'bg-[#00c08b] border-[#00c08b] text-white'
                                  : 'bg-white border-slate-200 text-slate-755 hover:bg-slate-50'
                              }`}
                            >
                              {mSlot.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom high-end live nutrient board */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-3 font-sans mt-1">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200/55 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                        <span>Live Scaling Info</span>
                        <span className="text-[#00c08b]">{portionGrams || '100'}g portion</span>
                      </div>

                      <div className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">CALORIES</span>
                          <p className="text-xl font-extrabold text-[#00c08b] leading-tight mt-0.5">
                            {Math.round(selectedDbItem.caloriesPer100g * ((parseFloat(portionGrams) || 100) / 100))} kcal
                          </p>
                        </div>

                        <div className="flex gap-4 text-center">
                          <div>
                            <span className="text-[9px] font-bold text-rose-450 block">P</span>
                            <span className="text-xs font-bold text-slate-705 leading-none font-mono">
                              {Math.round(selectedDbItem.proteinPer100g * ((parseFloat(portionGrams) || 100) / 100) * 10) / 10}g
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-emerald-455 block">C</span>
                            <span className="text-xs font-bold text-slate-705 leading-none font-mono">
                              {Math.round(selectedDbItem.carbsPer100g * ((parseFloat(portionGrams) || 100) / 100) * 10) / 10}g
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-amber-455 block">F</span>
                            <span className="text-xs font-bold text-slate-705 leading-none font-mono">
                              {Math.round(selectedDbItem.fatPer100g * ((parseFloat(portionGrams) || 100) / 100) * 10) / 10}g
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Commit! */}
                    <button
                      type="button"
                      onClick={handleLogDbItem}
                      className="w-full bg-[#00c08b] hover:bg-[#00a87a] text-white py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors mt-2 text-center"
                    >
                      {lang === 'ru' ? 'Подтвердить ввод' : 'Log Food item'}
                    </button>

                  </div>
                ) : (
                  /* Step 1: Browse Food registry or Custom forms */
                  <div className="flex flex-col gap-4">
                    {/* Minimal Tabs */}
                    <div className="flex bg-slate-50 border border-slate-150 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setEntryMode('database')}
                        className={`flex-1 text-center py-2 text-xs font-bold rounded-lg uppercase tracking-tight transition-all cursor-pointer ${
                          entryMode === 'database'
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-100'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {lang === 'ru' ? 'Поиск базы ' : 'Database'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntryMode('manual')}
                        className={`flex-1 text-center py-2 text-xs font-bold rounded-lg uppercase tracking-tight transition-all cursor-pointer ${
                          entryMode === 'manual'
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-100'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {lang === 'ru' ? 'Ввод вручную' : 'Manual entry'}
                      </button>
                    </div>

                    {/* Database Search module */}
                    {entryMode === 'database' ? (
                      <div className="flex flex-col gap-4">
                        
                        {/* Search Input bar */}
                        <form onSubmit={handleSearch} className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              placeholder={lang === 'ru' ? 'Введите: Банан, Овсянка, Сырники...' : 'Search: Oats, Eggs, Apple, Borsch...'}
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-[#00c08b] rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none"
                            />
                          </div>
                          <button
                            type="submit"
                            className="bg-[#00c08b] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#00a87a] transition-colors cursor-pointer flex items-center justify-center shrink-0 min-w-24"
                          >
                            {isSearchingOnline ? (
                              <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
                            ) : (
                              (lang === 'ru' ? 'Поиск' : 'Find')
                            )}
                          </button>
                        </form>

                        {/* Global portals search indicator */}
                        <div className="flex items-center gap-1.5 bg-emerald-50/75 border border-emerald-100/60 p-2 rounded-xl text-emerald-800 font-medium text-[10.5px]">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-550"></span>
                          </span>
                          <span>
                            {lang === 'ru' 
                              ? 'Поиск активен по локальной базе и международным порталам Open Food Facts' 
                              : 'Auto-searching local database + global Open Food Facts portals'}
                          </span>
                        </div>

                        {/* Query lists list view */}
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase pl-0.5">
                            {lang === 'ru' ? 'Результаты в вашей базе' : 'Food matching results'} ({dbResults.length})
                          </span>

                          <div className="max-h-[350px] overflow-y-auto border border-slate-150 rounded-2xl p-1 bg-slate-50 flex flex-col gap-1.5 divide-y divide-[#f1f3f6]">
                            {dbResults.length === 0 ? (
                              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 bg-white rounded-xl border border-dashed border-slate-200 p-4">
                                <Utensils className="h-6 w-6 text-slate-350" />
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lang === 'ru' ? 'Ничего не найдено' : 'No items matched'}</span>
                                <p className="text-[10px] text-slate-400 max-w-sm">{lang === 'ru' ? 'Простыми словами напишите запрос в поиске выше.' : 'Try specifying a different search query or select manual entry.'}</p>
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
                                  className="w-full text-left p-3 rounded-xl border border-transparent hover:border-slate-200 transition-all flex flex-col gap-1 cursor-pointer bg-white hover:bg-slate-50"
                                >
                                  <div className="flex justify-between items-start w-full gap-2 text-xs">
                                    <div className="flex-1 truncate flex items-center gap-1.5 min-w-0">
                                      {item.id.startsWith('custom-prod-') && (
                                        <span className="shrink-0 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-bold uppercase px-1 rounded">
                                          {lang === 'ru' ? 'МОЙ' : 'MY'}
                                        </span>
                                      )}
                                      <span className="font-bold text-slate-800 truncate">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {item.brand && (
                                        <span className="text-[8px] font-bold tracking-wide bg-slate-100 text-slate-450 px-1.5 py-0.5 rounded leading-none">
                                          {item.brand}
                                        </span>
                                      )}
                                      {item.id.startsWith('custom-prod-') && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteCustomProduct(item.id, e)}
                                          className="text-slate-350 hover:text-rose-500 p-0.5 rounded transition-colors"
                                          title={lang === 'ru' ? 'Удалить этот продукт' : 'Remove product'}
                                        >
                                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex justify-between items-center w-full mt-1.5 text-[10.5px]">
                                    <span className="text-[#00c08b] font-bold">
                                      {item.caloriesPer100g} <span className="text-[9px] text-slate-400 font-normal">kcal / 100g</span>
                                    </span>
                                    
                                    <div className="flex gap-2 text-[9px] text-slate-400 font-medium">
                                      <span className="text-rose-400">P: {item.proteinPer100g}g</span>
                                      <span>&bull;</span>
                                      <span className="text-emerald-400">C: {item.carbsPer100g}g</span>
                                      <span>&bull;</span>
                                      <span className="text-amber-400">F: {item.fatPer100g}g</span>
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Custom Product inline designer triggers */}
                        <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                          {!isCreatingProduct ? (
                            <button
                              type="button"
                              onClick={() => setIsCreatingProduct(true)}
                              className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-[10.5px] uppercase tracking-wider cursor-pointer transition-colors shadow-none"
                            >
                              <PlusCircle className="h-4 w-4 text-[#00c08b]" />
                              <span>{lang === 'ru' ? 'Создать свой продукт в базу данных' : 'Register Custom Choice in Base database'}</span>
                            </button>
                          ) : (
                            <form onSubmit={handleCreateCustomProduct} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                                  {lang === 'ru' ? 'Новый продукт (на 100г)' : 'New Custom product definition (per 100g)'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsCreatingProduct(false)}
                                  className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                                >
                                  {lang === 'ru' ? 'Отмена' : 'Cancel'}
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[8.5px] font-bold text-slate-400 uppercase">{lang === 'ru' ? 'Название:*' : 'Name:*'}</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder={lang === 'ru' ? 'Сырники из творога' : 'Cottage pancakes'}
                                    value={newProdName}
                                    onChange={(e) => setNewProdName(e.target.value)}
                                    className="w-full bg-white border border-slate-250 rounded-lg py-1.5 px-2.5 text-xs font-semibold focus:outline-none focus:border-[#00c08b]"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[8.5px] font-bold text-slate-400 uppercase">{lang === 'ru' ? 'Бренд (опция):' : 'Brand (optional):'}</label>
                                  <input
                                    type="text"
                                    placeholder="Samsung Cafe"
                                    value={newProdBrand}
                                    onChange={(e) => setNewProdBrand(e.target.value)}
                                    className="w-full bg-white border border-slate-250 rounded-lg py-1.5 px-2.5 text-xs font-semibold focus:outline-none focus:border-[#00c08b]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase text-center">Calories:*</span>
                                  <input
                                    type="number"
                                    required
                                    min="0"
                                    max="1500"
                                    placeholder="205"
                                    value={newProdCalories}
                                    onChange={(e) => setNewProdCalories(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg py-1 text-xs text-center font-bold focus:outline-none"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <span className="text-[8px] font-bold text-rose-450 uppercase text-center">Prot</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="12"
                                    step="0.1"
                                    value={newProdProtein}
                                    onChange={(e) => setNewProdProtein(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg py-1 text-xs text-center font-semibold focus:outline-none"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <span className="text-[8px] font-bold text-emerald-450 uppercase text-center">Carb</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="8"
                                    step="0.1"
                                    value={newProdCarbs}
                                    onChange={(e) => setNewProdCarbs(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg py-1 text-xs text-center font-semibold focus:outline-none"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <span className="text-[8px] font-bold text-amber-450 uppercase text-center">Fat</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="4"
                                    step="0.1"
                                    value={newProdFat}
                                    onChange={(e) => setNewProdFat(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg py-1 text-xs text-center font-semibold focus:outline-none"
                                  />
                                </div>
                              </div>

                              <button
                                type="submit"
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-[10.5px] uppercase tracking-wider cursor-pointer transition-colors"
                              >
                                {lang === 'ru' ? 'Добавить в список' : 'Save in user custom list'}
                              </button>
                            </form>
                          )}
                        </div>

                      </div>
                    ) : (
                      /* Manual input block */
                      <form onSubmit={handleCustomSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-sans">{t.foodNameLabel}</label>
                          <input
                            type="text"
                            placeholder={lang === 'ru' ? 'Гречка отварная, Сёмга на пару...' : 'Beef steak, raw almonds...'}
                            value={foodName}
                            onChange={(e) => setFoodName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00c08b]"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-sans">{t.foodCategoryLabel}</label>
                            <select
                              value={mealType}
                              onChange={(e) => setMealType(e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                            >
                              <option value="breakfast">{lang === 'ru' ? 'Завтрак' : 'Breakfast'}</option>
                              <option value="lunch">{lang === 'ru' ? 'Обед' : 'Lunch'}</option>
                              <option value="dinner">{lang === 'ru' ? 'Ужин' : 'Dinner'}</option>
                              <option value="snack">{lang === 'ru' ? 'Перекус' : 'Snack'}</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-sans">{t.foodCaloriesLabel}</label>
                            <input
                              type="number"
                              min="0"
                              max="5000"
                              placeholder="350"
                              value={calories}
                              onChange={(e) => setCalories(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        {/* Optional Macros splits */}
                        <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl">
                          <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                            {t.macrosHeaderOptional}
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[8.5px] font-bold text-rose-500 uppercase text-center">{lang === 'ru' ? 'Белки' : 'Prot'}</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="20"
                                value={protein}
                                onChange={(e) => setProtein(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-center text-slate-800 focus:outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-[8.5px] font-bold text-emerald-500 uppercase text-center">{lang === 'ru' ? 'Углеводы' : 'Carbs'}</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="35"
                                value={carbs}
                                onChange={(e) => setCarbs(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-center text-slate-800 focus:outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-[8.5px] font-bold text-sky-500 uppercase text-center">{lang === 'ru' ? 'Жиры' : 'Fats'}</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="6"
                                value={fat}
                                onChange={(e) => setFat(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-xs font-bold text-center text-slate-800 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Alert validations */}
                        {(() => {
                          const parsedCal = parseInt(calories) || 0;
                          const parsedP = parseInt(protein) || 0;
                          const parsedC = parseInt(carbs) || 0;
                          const parsedF = parseInt(fat) || 0;
                          const minMacroCals = (parsedP * 4) + (parsedC * 4) + (parsedF * 9);
                          const isOver = minMacroCals > parsedCal && parsedCal > 0;

                          if (!isOver) return null;

                          return (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] text-amber-800 flex gap-2 font-sans">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold">{lang === 'ru' ? 'Проверьте цифры' : 'Double check numbers'}</span>
                                <p className="text-slate-600">{lang === 'ru' ? `Введенное БЖУ дает ${minMacroCals} ккал, что больше общей калорийности (${calories} ккал).` : `Macros equal ${minMacroCals} kcal, which is more than specified ${calories} kcal.`}</p>
                              </div>
                            </div>
                          );
                        })()}

                        <button
                          type="submit"
                          className="w-full bg-[#00c08b] hover:bg-[#00a87a] text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          {t.manualEntryTab}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
