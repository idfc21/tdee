import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { UserBioProfile, DailyLog, FoodItemLog } from '../types';
import {
  calculateTheoreticalTDEE,
  calculateAdaptiveTDEE,
  calculateBMR,
  formatHeight,
  analyzeBMI,
  calculateMacroTargets,
  lbsToKg,
  inToCm,
  GOAL_ADJUSTMENTS
} from '../utils/calc';
import BioProfileForm from './BioProfileForm';
import MacroPlanner from './MacroPlanner';
import TdeeLogger from './TdeeLogger';
import MealPlanner from './MealPlanner';
import FoodDiary from './FoodDiary';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../utils/translations';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Compass,
  Zap,
  Flame,
  LineChart as ChartIcon,
  Apple,
  Settings,
  Dumbbell,
  ShieldAlert,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Utensils,
  ChevronDown,
  ChevronUp,
  Plus,
  PlusCircle,
  Calendar,
  ArrowLeft,
  X,
  Scale,
  Sparkles,
  Info,
  Database,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Cloud,
  RefreshCw,
  Check,
  Lock,
  Link2
} from 'lucide-react';
import { startGoogleAuth, findBackupFile, saveBackupFile, downloadBackupFile } from '../utils/googleDrive';

interface DashboardOverviewProps {
  profile: UserBioProfile;
  logs: DailyLog[];
  foodLogs: FoodItemLog[];
  onUpdateProfile: (updated: UserBioProfile) => void;
  onUpdateLogs: (newLogs: DailyLog[]) => void;
  onAddFoodLog: (item: Omit<FoodItemLog, 'id'>) => void;
  onDeleteFoodLog: (id: string) => void;
  onClearFoodLogsForDate: (dateStr: string) => void;
  onUpdateFoodLogs: (newFoodLogs: FoodItemLog[]) => void;
}

export default function DashboardOverview({
  profile,
  logs,
  foodLogs,
  onUpdateProfile,
  onUpdateLogs,
  onAddFoodLog,
  onDeleteFoodLog,
  onClearFoodLogsForDate,
  onUpdateFoodLogs,
}: DashboardOverviewProps) {
  const lang = profile.language || 'en';
  const t = translations[lang];

  // Navigation strategy: 'dashboard' | 'diary' | 'strategy' | 'settings'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'diary' | 'strategy' | 'settings'>('dashboard');
  
  // Custom expandable setting accordions states
  const [sectionsOpen, setSectionsOpen] = useState({
    coords: true,
    macros: false,
    tdee: false,
    meals: false,
    storage: false,
  });

  // Google Drive states
  const [gdriveClientId, setGdriveClientId] = useState<string>(() => {
    return localStorage.getItem('gdrive_client_id') || '342674987019-vps7dld7r8k0p5l696n38ff5d56o7bmo.apps.googleusercontent.com'; // Default sandbox oauth client ID
  });
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [gdriveStatus, setGdriveStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [gdriveError, setGdriveError] = useState<string | null>(null);
  const [gdriveBackupId, setGdriveBackupId] = useState<string | null>(() => {
    return localStorage.getItem('gdrive_backup_id') || null;
  });
  const [gdriveLastBackup, setGdriveLastBackup] = useState<string | null>(() => {
    return localStorage.getItem('gdrive_last_backup') || null;
  });
  const [isGdriveSyncing, setIsGdriveSyncing] = useState<boolean>(false);

  const handleGDriveConnect = async () => {
    const trimmedId = gdriveClientId.trim();
    if (!trimmedId) {
      setGdriveError(lang === 'ru' ? 'Пожалуйста, введите корректный Google Client ID' : 'Please provide a valid Google Client ID');
      return;
    }
    setGdriveStatus('connecting');
    setGdriveError(null);
    try {
      const token = await startGoogleAuth(trimmedId);
      setGdriveToken(token);
      setGdriveStatus('connected');
      localStorage.setItem('gdrive_client_id', trimmedId);
      
      // Auto look for existing backup file on cloud
      try {
        const existing = await findBackupFile(token);
        if (existing) {
          setGdriveBackupId(existing.id);
          setGdriveLastBackup(existing.modifiedTime);
          localStorage.setItem('gdrive_backup_id', existing.id);
          localStorage.setItem('gdrive_last_backup', existing.modifiedTime);
        }
      } catch (listErr) {
        console.warn('Failed listing files:', listErr);
      }
    } catch (err: any) {
      setGdriveStatus('error');
      if (err.message === 'COULD_NOT_OPEN_POPUP') {
        setGdriveError(lang === 'ru' 
          ? 'Всплывающее окно заблокировано! Пожалуйста, разрешите всплывающие окна в браузере.' 
          : 'Popup was blocked! Please allow popups for this site in your browser.'
        );
      } else if (err.message === 'USER_CLOSED_POPUP') {
        setGdriveError(lang === 'ru' ? 'Вход отменен пользователем.' : 'Sign-in canceled by user.');
      } else {
        setGdriveError(err.message || 'OAuth Connection Failed');
      }
    }
  };

  const handleGDriveDisconnect = () => {
    setGdriveToken(null);
    setGdriveStatus('disconnected');
    setGdriveError(null);
  };

  const handleGDriveUpload = async () => {
    if (!gdriveToken) return;
    setIsGdriveSyncing(true);
    setGdriveError(null);
    try {
      const storedCustomProds = localStorage.getItem('my_custom_products');
      const customProducts = storedCustomProds ? JSON.parse(storedCustomProds) : [];

      const backupObj = {
        profile,
        logs,
        foodLogs,
        customProducts,
        exportedAt: new Date().toISOString(),
        app: "IDFC_Metabolic_Engine"
      };
      
      let activeFileId = gdriveBackupId || undefined;
      if (!activeFileId) {
        const found = await findBackupFile(gdriveToken);
        if (found) {
          activeFileId = found.id;
        }
      }
      
      const fileId = await saveBackupFile(gdriveToken, backupObj, activeFileId);
      const timestamp = new Date().toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US');
      
      setGdriveBackupId(fileId);
      setGdriveLastBackup(timestamp);
      localStorage.setItem('gdrive_backup_id', fileId);
      localStorage.setItem('gdrive_last_backup', timestamp);
      
      alert(lang === 'ru' ? 'Резервная копия успешно загружена в Google Диск!' : 'Backup successfully uploaded to Google Drive!');
    } catch (err: any) {
      console.error(err);
      setGdriveError(lang === 'ru' ? 'Не удалось загрузить бекап в Google Диск.' : 'Failed to save backup to Google Drive.');
    } finally {
      setIsGdriveSyncing(false);
    }
  };

  const handleGDriveDownload = async () => {
    if (!gdriveToken) return;
    setIsGdriveSyncing(true);
    setGdriveError(null);
    try {
      let activeFileId = gdriveBackupId || undefined;
      if (!activeFileId) {
        const found = await findBackupFile(gdriveToken);
        if (found) {
          activeFileId = found.id;
        }
      }
      
      if (!activeFileId) {
        alert(lang === 'ru' 
          ? 'Резервных копий от этого приложения на вашем Google Диске не обнаружено.' 
          : 'No existing app backup was discovered on your Google Drive.'
        );
        return;
      }
      
      const confirmed = window.confirm(lang === 'ru'
        ? 'Вы уверены, что хотите восстановить резервную копию из Google Диска? Это перезапишет ваши текущие локальные данные!'
        : 'Are you sure you want to download backup from Google Drive? This will overwrite your current logs!'
      );
      if (!confirmed) return;
      
      const parsed = await downloadBackupFile(gdriveToken, activeFileId);
      if (parsed.profile) onUpdateProfile(parsed.profile);
      if (parsed.logs) onUpdateLogs(parsed.logs);
      if (parsed.foodLogs) onUpdateFoodLogs(parsed.foodLogs);
      if (parsed.customProducts) {
        localStorage.setItem('my_custom_products', JSON.stringify(parsed.customProducts));
      }
      
      alert(t.importSuccess);
    } catch (err: any) {
      console.error(err);
      alert(lang === 'ru' ? 'Ошибка восстановления из облака.' : 'Failed to restore backup from cloud.');
    } finally {
      setIsGdriveSyncing(false);
    }
  };

  // Plus quick actions modal trigger
  const [isPlusOpen, setIsPlusOpen] = useState(false);
  
  // Custom dialog log modal state overrides
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [loggedWeightVal, setLoggedWeightVal] = useState('');
  const [loggedWeightDate, setLoggedWeightDate] = useState(new Date().toISOString().split('T')[0]);
  const [loggedNotes, setLoggedNotes] = useState('');
  const [weightSaveSuccess, setWeightSaveSuccess] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  // Directly pass meal activation triggers straight into the Diary search
  const [initialMealTrigger, setInitialMealTrigger] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(null);

  // Sub-detail page route controllers
  const [subPage, setSubPage] = useState<'none' | 'expenditure' | 'weight_trend' | 'calories' | 'protein' | 'carbs' | 'fats'>('none');
  
  // Historical chart selected duration timers ('7d' | '30d' | '1y' | 'all')
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '1y' | 'all'>('7d');

  const theoreticalTdee = calculateTheoreticalTDEE(profile);
  const adaptiveResults = calculateAdaptiveTDEE(logs, theoreticalTdee, profile.unitSystem);
  const bmiAnalytics = analyzeBMI(profile);

  // Calorie calculations
  const activeBaseTdee = adaptiveResults.hasEnoughData ? adaptiveResults.currentTdee : theoreticalTdee;
  const targetCalories = Math.max(1200, activeBaseTdee + GOAL_ADJUSTMENTS[profile.goal]);
  const macroTargets = calculateMacroTargets(targetCalories, profile);

  // BMR base
  let weightKg = profile.weight;
  if (profile.unitSystem === 'imperial') {
    weightKg = lbsToKg(profile.weight);
  }
  let heightCm = profile.height;
  if (profile.unitSystem === 'imperial') {
    const totalInches = (profile.heightFt || 0) * 12 + (profile.heightIn || 0);
    heightCm = inToCm(totalInches);
  }
  const bmrValue = Math.round(
    calculateBMR(profile.gender, weightKg, heightCm, profile.age, profile.formula, profile.bodyFat)
  );

  // Compute actual foods logged today
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaysFoods = useMemo(() => foodLogs.filter(f => f.date === todayStr), [foodLogs, todayStr]);
  const todayTotals = useMemo(() => {
    return todaysFoods.reduce((acc, f) => {
      acc.calories += f.calories;
      acc.protein += f.protein;
      acc.carbs += f.carbs;
      acc.fat += f.fat;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [todaysFoods]);

  // Compute Weekly Nutrition Columns Matrix 7 Days
  const weeklyNutrition = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      let weekDayLabel = d.toLocaleDateString('ru-RU', { weekday: 'short' });
      weekDayLabel = weekDayLabel.charAt(0).toUpperCase() + weekDayLabel.slice(1);

      const dayFoods = foodLogs.filter(f => f.date === dateStr);
      const daySum = dayFoods.reduce((acc, f) => {
        acc.calories += f.calories;
        acc.protein += f.protein;
        acc.carbs += f.carbs;
        acc.fat += f.fat;
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

      arr.push({
        dateStr,
        label: weekDayLabel,
        dayNum: d.getDate(),
        ...daySum
      });
    }
    return arr;
  }, [foodLogs]);

  // Smoothed metric weight trends prediction algorithms
  const trendData = useMemo(() => {
    const periodDays = timePeriod === '7d' ? 7 : timePeriod === '30d' ? 30 : timePeriod === '1y' ? 365 : 30;

    const result = [];
    const today = new Date();
    const datePoints = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      datePoints.push(d.toISOString().split('T')[0]);
    }

    let lastKnownWeight = profile.weight;
    const tempLogsMap = new Map();
    logs.forEach(l => {
      if (l.weight > 0) {
        tempLogsMap.set(l.date, l.weight);
      }
    });

    const interpolated = datePoints.map(dt => {
      if (tempLogsMap.has(dt)) {
        lastKnownWeight = tempLogsMap.get(dt);
      }
      return {
        dateStr: dt,
        weight: tempLogsMap.has(dt) ? tempLogsMap.get(dt) : null,
        effectiveWeight: lastKnownWeight
      };
    });

    for (let idx = 0; idx < interpolated.length; idx++) {
      const dt = interpolated[idx].dateStr;
      const rawWeight = interpolated[idx].weight;
      
      let windowSum = 0;
      let windowCount = 0;
      const windowSize = Math.min(5, periodDays === 7 ? 3 : 5);
      for (let k = Math.max(0, idx - windowSize + 1); k <= idx; k++) {
        windowSum += interpolated[k].effectiveWeight;
        windowCount++;
      }
      const trendWeight = windowCount > 0 ? (windowSum / windowCount) : lastKnownWeight;

      const dObj = new Date(dt);
      const formatted = dObj.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });

      result.push({
        dateStr: dt,
        formattedDate: formatted,
        weight: rawWeight,
        trendWeight: Math.round(trendWeight * 100) / 100,
        predictedWeight: Math.round((trendWeight * 0.997) * 100) / 100, // micro projected metatrend
      });
    }
    return result;
  }, [logs, timePeriod, profile.weight]);

  // Period aggregate summaries
  const periodStats = useMemo(() => {
    const loggedWt = trendData.filter(d => d.weight !== null).map(d => d.weight as number);
    if (loggedWt.length === 0) {
      return { start: profile.weight, end: profile.weight, avg: profile.weight, delta: 0 };
    }
    const start = loggedWt[0];
    const end = loggedWt[loggedWt.length - 1];
    const avg = loggedWt.reduce((s, w) => s + w, 0) / loggedWt.length;
    return {
      start: Math.round(start * 10) / 10,
      end: Math.round(end * 10) / 10,
      avg: Math.round(avg * 10) / 10,
      delta: Math.round((end - start) * 10) / 10
    };
  }, [trendData, profile.weight]);

  // Aggregate calorie history for the period
  const caloriePeriodData = useMemo(() => {
    const periodDays = timePeriod === '7d' ? 7 : timePeriod === '30d' ? 30 : timePeriod === '1y' ? 365 : 30;
    const today = new Date();
    const result = [];
    
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayFoods = foodLogs.filter(f => f.date === dateStr);
      const sumCalories = dayFoods.reduce((acc, f) => acc + f.calories, 0);
      const sumProtein = dayFoods.reduce((acc, f) => acc + f.protein, 0);
      const sumCarbs = dayFoods.reduce((acc, f) => acc + f.carbs, 0);
      const sumFat = dayFoods.reduce((acc, f) => acc + f.fat, 0);

      result.push({
        dateStr,
        formattedDate: d.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
        calories: sumCalories,
        protein: sumProtein,
        carbs: sumCarbs,
        fat: sumFat
      });
    }
    return result;
  }, [foodLogs, timePeriod]);

  const caloriePeriodStats = useMemo(() => {
    const total = caloriePeriodData.reduce((s, d) => s + d.calories, 0);
    const avg = total / caloriePeriodData.length;
    return {
      total,
      avg: Math.round(avg)
    };
  }, [caloriePeriodData]);

  const macroPeriodStats = useMemo(() => {
    const totals = caloriePeriodData.reduce((acc, d) => {
      acc.protein += d.protein;
      acc.carbs += d.carbs;
      acc.fat += d.fat;
      return acc;
    }, { protein: 0, carbs: 0, fat: 0 });
    const count = caloriePeriodData.length;
    return {
      proteinAvg: Math.round(totals.protein / count),
      carbsAvg: Math.round(totals.carbs / count),
      fatAvg: Math.round(totals.fat / count)
    };
  }, [caloriePeriodData]);

  // Toggles settings accordion sections dynamically and respects manual adjustments
  const toggleSectionState = (key: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePlusActionClick = (action: 'weight' | 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setIsPlusOpen(false);
    if (action === 'weight') {
      setLoggedWeightVal(profile.weight.toString());
      setLoggedWeightDate(new Date().toISOString().split('T')[0]);
      setIsWeightModalOpen(true);
      setWeightSaveSuccess(false);
    } else {
      // Set food search meal trigger type, switch activeTab to 'diary' immediately
      setInitialMealTrigger(action);
      setActiveTab('diary');
    }
  };

  const saveQuickWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(loggedWeightVal);
    if (isNaN(parsed) || parsed <= 0) return;

    const existingIdx = logs.findIndex(l => l.date === loggedWeightDate);
    const updated = [...logs];
    if (existingIdx >= 0) {
      updated[existingIdx] = {
        ...updated[existingIdx],
        weight: parsed,
        notes: loggedNotes || undefined
      };
    } else {
      updated.push({
        id: Math.random().toString(36).substring(2, 9),
        date: loggedWeightDate,
        weight: parsed,
        caloriesConsumed: todayTotals.calories,
        notes: loggedNotes || undefined
      });
    }
    // Also update physical weight on active profile
    onUpdateProfile({
      ...profile,
      weight: parsed
    });

    onUpdateLogs(updated);
    setWeightSaveSuccess(true);
    setTimeout(() => {
      setIsWeightModalOpen(false);
      setLoggedWeightVal('');
      setLoggedNotes('');
      setWeightSaveSuccess(false);
    }, 1500);
  };

  // Build list of tabs for bottom and main desktop navbar navigation
  const tabList = useMemo(() => [
    { id: 'dashboard', label: t.dashboard, icon: <Compass className="h-5 w-5" /> },
    { id: 'diary', label: t.diary, icon: <Utensils className="h-5 w-5" /> },
    { id: 'strategy', label: t.strategy, icon: <Flame className="h-5 w-5" /> },
    { id: 'settings', label: t.settings, icon: <Settings className="h-5 w-5" /> }
  ], [t]);

  return (
    <div className="w-full mx-auto max-w-7xl px-1.5 sm:px-6 lg:px-8 py-3 md:py-6 flex flex-col gap-4 md:gap-6 pb-24 md:pb-8">
      
      {/* Desktop Top Navbar Segments */}
      <div className="hidden md:flex bg-slate-50 p-1.5 rounded-xl border border-slate-200 gap-2 w-max self-center">
        {tabList.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSubPage('none');
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-bold font-mono tracking-tight uppercase border transition-colors cursor-pointer ${
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Views Routing Block */}
      <div className="min-h-[400px] w-full flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: DASHBOARD VIEW CORES */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4"
            >
              {subPage === 'none' ? (
                <>
                  {logs.some(log => log.id.startsWith('mock-')) && (
                    <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                      <div className="flex gap-3 items-start">
                        <span className="text-xl">📊</span>
                        <div>
                          <h4 className="text-xs font-black text-amber-900 uppercase tracking-tight font-mono">
                            {lang === 'ru' ? 'Включен демонстрационный режим' : 'Demo Mode Active'}
                          </h4>
                          <p className="text-[11px] text-amber-800 leading-normal mt-1">
                            {lang === 'ru'
                              ? 'Для наглядности графиков и формул мы временно загрузили 15 дней примерных данных веса и ккал. Нажмите кнопку справа, чтобы удалить их и начать вводить свои реальные показатели.'
                              : 'To help visualize metabolic curves, we have loaded 15 days of demo logs. Press the button to delete them and start logging your real metrics.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(lang === 'ru' ? 'Вы уверены, что хотите удалить демонстрационные данные за 15 дней?' : 'Are you sure you want to clear the 15-day demonstration data?')) {
                            onUpdateLogs(logs.filter(l => !l.id.startsWith('mock-')));
                          }
                        }}
                        className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        {lang === 'ru' ? 'Удалить демо-данные' : 'Delete Demo Data'}
                      </button>
                    </div>
                  )}

                  {/* Row A: Weekly Nutrition Columns Pillars Chart (Inspired by premium layouts) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 font-mono">
                    <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2">
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-orange-650 block uppercase">{t.weeklyIntakeProgress}</span>
                        <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">{t.weeklyNutrition}</h3>
                      </div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">{t.roll7d}</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2 text-center h-44 items-end">
                      {weeklyNutrition.map((day) => {
                        const isTodayDay = day.dateStr === todayStr;
                        const pct = targetCalories > 0 ? (day.calories / targetCalories) * 100 : 0;
                        const validPct = Math.min(130, Math.round(pct));
                        
                        // Dynamically scale height safely
                        const blockHeight = `${Math.max(5, Math.min(100, (validPct / 130) * 100))}%`;
                        
                        // Assess color representation
                        let colorClass = 'bg-orange-400';
                        if (validPct >= 90 && validPct <= 110) {
                          colorClass = 'bg-emerald-450';
                        } else if (validPct > 110) {
                          colorClass = 'bg-rose-500';
                        } else if (validPct === 0) {
                          colorClass = 'bg-slate-100';
                        }

                        // Check macro completion status for this day
                        const isProteinMet = day.protein >= macroTargets.proteinGrams * 0.8;
                        const isCarbsMet = day.carbs >= macroTargets.carbGrams * 0.8;
                        const isFatMet = day.fat >= macroTargets.fatGrams * 0.8;

                        return (
                          <div key={day.dateStr} className="flex flex-col items-center justify-end h-full gap-2 relative">
                            {/* Hover / top percentage tag */}
                            <span className="text-[8px] font-black text-slate-600 block leading-none">
                              {day.calories > 0 ? `${Math.round(day.calories)}` : '0'}
                            </span>

                            {/* Outer Track box container */}
                            <div className="w-4 sm:w-6 h-28 bg-slate-100 border border-slate-200 rounded-full flex flex-col justify-end overflow-hidden relative">
                              <motion.div
                                className={`w-full rounded-full ${colorClass}`}
                                style={{ height: blockHeight }}
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transformOrigin="bottom"
                                transition={{ duration: 0.4 }}
                              />
                            </div>

                            {/* Intertwined protein/carbs/fat indicators */}
                            <div className="flex gap-0.5 justify-center">
                              <span className={`w-1 h-1 rounded-full ${isProteinMet ? 'bg-rose-500' : 'bg-slate-200'}`} title="Protein" />
                              <span className={`w-1 h-1 rounded-full ${isCarbsMet ? 'bg-amber-500' : 'bg-slate-200'}`} title="Carbs" />
                              <span className={`w-1 h-1 rounded-full ${isFatMet ? 'bg-sky-500' : 'bg-slate-200'}`} title="Fat" />
                            </div>

                            {/* Label */}
                            <div className="flex flex-col">
                              <span className={`text-[9px] font-black leading-none uppercase ${isTodayDay ? 'text-orange-550 underline decoration-2' : 'text-slate-500'}`}>
                                {day.label}
                              </span>
                              <span className="text-[7.5px] text-slate-400 mt-0.5 font-bold">{day.dayNum}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row B: INSIGHTS & ANALYTICS HEADER */}
                  <div className="flex items-center gap-2 mt-2">
                    <ChartIcon className="h-4.5 w-4.5 text-slate-800" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">Аналитика и Расход / Insights & Analytics</h3>
                  </div>

                  {/* Row C: Expenditure + Weight Trend (Custom Dual Card Row) */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* CARD 1: EXPENDITURE */}
                    <button
                      onClick={() => setSubPage('expenditure')}
                      className="bg-white border border-slate-200 rounded-2xl p-4 text-left flex flex-col justify-between transition-colors w-full cursor-pointer group hover:bg-slate-50"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider font-mono">EXPENDITURE</span>
                        <span className="text-[8px] bg-orange-50 text-orange-600 font-bold border border-orange-100 px-1.5 py-0.5 rounded-md uppercase">Live TDEE</span>
                      </div>
                      <div className="my-3">
                        <p className="text-3xl font-black font-mono text-slate-900 tracking-tight leading-none group-hover:text-orange-550 transition-colors">
                          {Math.round(activeBaseTdee).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1">kcal / daily energy</p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between w-full">
                        <span className="text-[8px] font-extrabold text-slate-550 uppercase">BMR {bmrValue} kcal &bull; Calibrated</span>
                        <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    {/* CARD 2: WEIGHT TREND */}
                    <button
                      onClick={() => setSubPage('weight_trend')}
                      className="bg-slate-900 text-white rounded-2xl p-4 text-left flex flex-col justify-between transition-colors w-full cursor-pointer group hover:bg-slate-800"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[8.5px] font-black text-slate-400 tracking-wider font-mono">WEIGHT TREND</span>
                        <span className="text-[8px] bg-slate-800 text-slate-300 font-bold border border-slate-700 px-1.5 py-0.5 rounded-md uppercase">Progression</span>
                      </div>
                      <div className="my-3 font-mono">
                        <p className="text-3xl font-black text-white tracking-tight leading-none group-hover:text-orange-450 transition-colors">
                          {profile.weight}{' '}
                          <span className="text-xs text-slate-500 font-bold uppercase">{profile.unitSystem === 'metric' ? 'kg' : 'lbs'}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1">
                          BMI {bmiAnalytics.bmi.toFixed(1)} &bull; {bmiAnalytics.category}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between w-full">
                        <span className="text-[8px] font-extrabold text-emerald-400 uppercase">Weight logs synced</span>
                        <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                  </div>

                  {/* Row D: SEPARATE NUTRITION SECTION HEADER */}
                  <div className="flex items-center gap-2 mt-2">
                    <Apple className="h-4.5 w-4.5 text-slate-800" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">Питание / Nutrition</h3>
                  </div>

                  {/* Row E: Calories + Protein + Carbs + Fats (4 individual mini cards) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    
                    {/* CALORIES */}
                    <button
                      onClick={() => setSubPage('calories')}
                      className="bg-white border border-slate-200 rounded-2xl p-3.5 text-left flex flex-col justify-between transition-colors w-full cursor-pointer group hover:bg-slate-50"
                    >
                      <span className="text-[8px] font-black text-slate-400 font-mono uppercase">CALORIES</span>
                      <div className="my-2.5">
                        <p className="text-2xl font-black font-mono text-slate-950 block">{todayTotals.calories}</p>
                        <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {targetCalories} target</p>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.calories / targetCalories) * 100)}%` }} />
                      </div>
                    </button>

                    {/* PROTEIN */}
                    <button
                      onClick={() => setSubPage('protein')}
                      className="bg-white border border-slate-200 rounded-2xl p-3.5 text-left flex flex-col justify-between transition-colors w-full cursor-pointer group hover:bg-slate-50"
                    >
                      <span className="text-[8px] font-black text-rose-500 font-mono uppercase">PROTEIN</span>
                      <div className="my-2.5">
                        <p className="text-2xl font-black font-mono text-slate-950 block">{Math.round(todayTotals.protein)}g</p>
                        <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {macroTargets.proteinGrams}g target</p>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.protein / macroTargets.proteinGrams) * 100)}%` }} />
                      </div>
                    </button>

                    {/* CARBS */}
                    <button
                      onClick={() => setSubPage('carbs')}
                      className="bg-white border border-slate-200 rounded-2xl p-3.5 text-left flex flex-col justify-between transition-colors w-full cursor-pointer group hover:bg-slate-50"
                    >
                      <span className="text-[8px] font-black text-amber-500 font-mono uppercase">CARBS</span>
                      <div className="my-2.5">
                        <p className="text-2xl font-black font-mono text-slate-950 block">{Math.round(todayTotals.carbs)}g</p>
                        <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {macroTargets.carbGrams}g target</p>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.carbs / macroTargets.carbGrams) * 100)}%` }} />
                      </div>
                    </button>

                    {/* FATS */}
                    <button
                      onClick={() => setSubPage('fats')}
                      className="bg-white border border-slate-200 rounded-2xl p-3.5 text-left flex flex-col justify-between transition-colors w-full cursor-pointer group hover:bg-slate-50"
                    >
                      <span className="text-[8px] font-black text-sky-500 font-mono uppercase">FAT</span>
                      <div className="my-2.5">
                        <p className="text-2xl font-black font-mono text-slate-950 block">{Math.round(todayTotals.fat)}g</p>
                        <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {macroTargets.fatGrams}g target</p>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.fat / macroTargets.fatGrams) * 100)}%` }} />
                      </div>
                    </button>

                  </div>
                </>
              ) : (
                /* REDIRECT SUB-PAGES ACCORDING TO USER'S DIRECT CLICK MAP */
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-6">
                  
                  {/* Common Back navigation elements on sub-views */}
                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3 font-mono">
                    <button
                      onClick={() => setSubPage('none')}
                      className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700 hover:text-slate-950 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Назад на Дашборд / Back</span>
                    </button>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase">MacroFactor Calibration View</span>
                  </div>

                  {/* SUBPAGE 1: METABOLIC EXPENDITURE / TDEE DETAILS */}
                  {subPage === 'expenditure' && (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-orange-650 uppercase font-mono tracking-widest">SUBPAGE DETAILED OVERVIEW</span>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <Flame className="h-6 w-6 text-orange-550" />
                          Расход энергии / Energy Expenditure
                        </h2>
                        <p className="text-xs text-slate-500">How your body metabolizes active energy, calculated via theoretical standards & live calibration.</p>
                      </div>

                      {/* Prime comparative metrics row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-950 flex flex-col justify-between">
                          <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Estimated Active TDEE</span>
                          <div className="my-3 font-mono">
                            <span className="text-5xl font-bold text-orange-400 block">{Math.round(activeBaseTdee)} kcal</span>
                            <span className="text-[10px] text-slate-400 block mt-1 font-bold">Dynamic Metabolic Baseline</span>
                          </div>
                          <p className="text-[10px] text-slate-300 leading-relaxed font-semibold">
                            Calculated dynamically. {adaptiveResults.hasEnoughData ? 'Calculated from prior logs change.' : `Using theoretical standards calibrated. Maintain consistency to unlock real live adaptive tracking!`}
                          </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
                          <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider">Calibration Formulas Baseline</span>
                          <div className="my-3 flex flex-col gap-2 font-mono text-xs">
                            <div className="flex justify-between items-center text-slate-700">
                              <span className="font-bold">Mifflin-St Jeor:</span>
                              <span className="font-extrabold text-slate-950">{theoreticalTdee} kcal</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-700">
                              <span className="font-bold">Basal Metabolic (BMR):</span>
                              <span className="font-extrabold text-slate-950">{bmrValue} kcal</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-700">
                              <span className="font-bold">Active sex:</span>
                              <span className="font-extrabold text-slate-950 uppercase">{profile.gender}</span>
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-450 leading-relaxed uppercase font-mono font-bold">
                            Ref: formulas are dependent on target bodyweight ({profile.weight} {profile.unitSystem === 'metric' ? 'kg':'lbs'}) & age ({profile.age} Yrs).
                          </p>
                        </div>
                      </div>

                      {/* Formula Side-By-Side Comparison Grid */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3 font-mono">
                        <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest block">FORMULA STANDARD BASES (BMR ESTIMATES)</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-white p-3 rounded-lg border border-slate-300">
                            <span className="text-[8px] font-extrabold text-slate-400 block uppercase">Mifflin-St Jeor</span>
                            <span className="text-lg font-black text-slate-950 block mt-1">{bmrValue} kcal</span>
                            <span className="text-[7.5px] text-slate-400 mt-1 block font-bold">Default robust standard</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-300">
                            <span className="text-[8px] font-extrabold text-slate-400 block uppercase">Revised Harris-Benedict</span>
                            <span className="text-lg font-black text-slate-950 block mt-1">
                              {Math.round(
                                profile.gender === 'male'
                                  ? 13.397 * weightKg + 4.799 * heightCm - 5.677 * profile.age + 88.362
                                  : 9.247 * weightKg + 3.098 * heightCm - 4.33 * profile.age + 447.593
                              )} kcal
                            </span>
                            <span className="text-[7.5px] text-slate-400 mt-1 block font-bold">Refined physical standard</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-300">
                            <span className="text-[8px] font-extrabold text-slate-400 block uppercase">Katch-McArdle</span>
                            <span className="text-lg font-black text-slate-950 block mt-1">
                              {profile.bodyFat && profile.bodyFat > 0
                                ? `${Math.round(370 + 21.6 * (weightKg * (1 - profile.bodyFat / 100)))}`
                                : 'Needs Body Fat %'}
                            </span>
                            <span className="text-[7.5px] text-slate-400 mt-1 block font-bold">Lean Body Mass calculation</span>
                          </div>
                        </div>
                      </div>

                      {/* Expenditure FAQ section */}
                      <div className="flex flex-col gap-3 pt-2">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider font-mono">FAQ - Как это работает / Calculated FAQ</h4>
                        <div className="space-y-2 text-xs leading-relaxed text-slate-700">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <p className="font-extrabold text-slate-950">Как рассчитывается расход энергии?</p>
                            <p className="mt-1 text-slate-600">Мы берем параметры вашего тела (пол, возраст, рост, вес) и применяем научно доказанные формулы для расчета базового обмена веществ (BMR). Умножая его на коэффициент вашей активности, мы получаем теоретический расход калорий (TDEE).</p>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <p className="font-extrabold text-slate-950">В чем разница между расчетным и адаптивным расходом?</p>
                            <p className="mt-1 text-slate-600">Расчетный TDEE берется исключительно по математической формуле. Адаптивный TDEE учитывает ваши ежедневные взвешивания и количество съеденных калорий. Если вы худеете медленнее, чем предсказывает математика — система понижает ваш TDEE; если быстрее — повышает. Это и есть калибровка под ваш реальный метаболизм!</p>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <p className="font-extrabold text-slate-950">Зачем нужно вести дневник регулярно?</p>
                            <p className="mt-1 text-slate-600">Адаптивный алгоритм требует от 7 до 14 дней непрерывных логов питания и веса. Чем точнее и регулярнее вы записываете свои приемы пищи, тем более точным будет оценка вашего личного метаболизма, без догадок.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBPAGE 2: WEIGHT TREND DETAILS */}
                  {subPage === 'weight_trend' && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-rose-650 uppercase font-mono tracking-widest">METATREND ANALYTICS</span>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <Scale className="h-6 w-6 text-indigo-550" />
                          {lang === 'ru' ? 'Аналитика тренда веса' : 'Weight Trend Analytics'}
                        </h2>
                        <p className="text-xs text-slate-500">Analyze raw fluctuations smoothed into real-time bodyweight trends and predicted trajectory slopes.</p>
                      </div>

                      {/* Interactive range controllers */}
                      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-max self-start font-mono text-[10px] sm:text-xs">
                        {['7d', '30d', '1y'].map((per) => {
                          const isSel = timePeriod === per;
                          return (
                            <button
                              key={per}
                              onClick={() => setTimePeriod(per as any)}
                              className={`px-3 py-1.5 rounded-lg font-black uppercase text-center cursor-pointer transition-all ${
                                isSel ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {per === '7d' 
                                ? (lang === 'ru' ? '7 дней' : '7 Days') 
                                : per === '30d' 
                                  ? (lang === 'ru' ? '30 дней' : '30 Days') 
                                  : (lang === 'ru' ? '1 год' : '1 Year')
                              }
                            </button>
                          );
                        })}
                      </div>

                      {/* Period aggregate stats card */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl font-mono text-center">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">Average Weight</span>
                          <span className="text-lg font-bold text-slate-900">{periodStats.avg} {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">Range Delta</span>
                          <span className={`text-lg font-bold ${periodStats.delta > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {periodStats.delta > 0 ? `+${periodStats.delta}` : periodStats.delta} {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">Starting weight</span>
                          <span className="text-md font-medium text-slate-700">{periodStats.start} {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">End weight</span>
                          <span className="text-md font-medium text-slate-700">{periodStats.end} {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}</span>
                        </div>
                      </div>

                      {/* RECHARTS DUAL LINE CORES */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 h-64 sm:h-80 select-none">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <Tooltip
                              contentStyle={{ fontFamily: 'monospace', fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                            <Line
                              name={lang === 'ru' ? 'Вес на весах' : 'Logged Weight'}
                              type="monotone"
                              dataKey="weight"
                              stroke="#2563eb"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#38bdf8', strokeWidth: 1, stroke: '#2563eb' }}
                              connectNulls
                            />
                            <Line
                              name={lang === 'ru' ? 'Линия тренда' : 'Predicted Trend'}
                              type="monotone"
                              dataKey="predictedWeight"
                              stroke="#c084fc"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Explanatory tips on weight calculations */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2 font-mono text-xs">
                        <div className="flex items-center gap-1.5 font-extrabold text-slate-900 uppercase">
                          <Info className="h-4 w-4 text-purple-500" />
                          <span>{lang === 'ru' ? 'Совет по анализу тренда' : 'Trend Smoothing Advice'}</span>
                        </div>
                        <p className="text-slate-650 leading-relaxed text-[11px]">
                          {lang === 'ru' 
                            ? 'Ваш повседневный вес постоянно колеблется из-за задержки воды, гликогена и наполнения ЖКТ. Поэтому линия тренда является значительно лучшим ориентиром для выявления реального рекомпозиционного прогресса, чем просто цифра на весах сегодня утром!'
                            : 'Your scale weight fluctuates daily due to hydration, glycogen levels, and digestive content. A mathematical smoothing trend (Predicted Trend) is a far superior metric for identifying real progressive fat-loss patterns than raw morning scale readings.'
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SUBPAGE 3: CALORIES TREND */}
                  {subPage === 'calories' && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-orange-650 uppercase font-mono tracking-widest">NUTRITION TRACKS</span>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <Flame className="h-6 w-6 text-orange-550" />
                          {lang === 'ru' ? 'Калории за период' : 'Calories Intake History'}
                        </h2>
                        <p className="text-xs text-slate-500">Track daily logged food calories relative to budget parameters.</p>
                      </div>

                      <div className="flex gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl w-max self-start font-mono text-[10px] sm:text-xs">
                        {['7d', '30d', '1y'].map((per) => (
                          <button
                            key={per}
                            onClick={() => setTimePeriod(per as any)}
                            className={`px-3 py-1.5 rounded-lg font-bold uppercase text-center cursor-pointer transition-all ${
                              timePeriod === per ? 'bg-blue-600 text-white shadow-none' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {per === '7d' 
                              ? (lang === 'ru' ? '7 дней' : '7 Days') 
                              : per === '30d' 
                                ? (lang === 'ru' ? '30 дней' : '30 Days') 
                                : (lang === 'ru' ? '1 год' : '1 Year')
                            }
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl font-mono text-center">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Ср. за период' : 'Period Avg'}</span>
                          <span className="text-lg font-bold text-slate-900">{caloriePeriodStats.avg.toLocaleString()} kcal</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Цель' : 'Daily Target'}</span>
                          <span className="text-lg font-bold text-slate-500">{targetCalories.toLocaleString()} kcal</span>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 h-64 sm:h-80 select-none">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={caloriePeriodData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <YAxis stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }} />
                            <Bar dataKey="calories" name="Logged Calories (kcal)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <ReferenceLine y={targetCalories} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: 'Target', fill: '#3b82f6', fontSize: 10, position: 'top' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* SUBPAGE 4: PROTEIN DETAILS */}
                  {subPage === 'protein' && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-rose-650 uppercase font-mono tracking-widest">NUTRITION TRACKS</span>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 font-sans">
                          <Zap className="h-6 w-6 text-rose-500" />
                          {lang === 'ru' ? 'Детали белка' : 'Protein Logging Details'}
                        </h2>
                        <p className="text-xs text-slate-500 font-sans">Daily structural reconstruction metrics and protein completions.</p>
                      </div>

                      <div className="flex gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl w-max self-start font-mono text-[10px]">
                        {['7d', '30d'].map((per) => (
                          <button
                            key={per}
                            onClick={() => setTimePeriod(per as any)}
                            className={`px-3 py-1.5 rounded-lg font-bold uppercase text-center cursor-pointer transition-all ${
                              timePeriod === per ? 'bg-blue-600 text-white shadow-none' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {per === '7d' ? (lang === 'ru' ? '7 дней' : '7 Days') : (lang === 'ru' ? '30 дней' : '30 Days')}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl font-mono text-center">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Ср. за период' : 'Period Avg'}</span>
                          <span className="text-lg font-bold text-slate-900">{macroPeriodStats.proteinAvg} g</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Цель' : 'Target'}</span>
                          <span className="text-lg font-bold text-slate-500">{macroTargets.proteinGrams} g</span>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 h-64 sm:h-80 select-none">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={caloriePeriodData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <YAxis stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }} />
                            <Bar dataKey="protein" name="Protein (g)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            <ReferenceLine y={macroTargets.proteinGrams} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Target', fill: '#f43f5e', fontSize: 10, position: 'top' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* SUBPAGE 5: CARBS DETAILS */}
                  {subPage === 'carbs' && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-amber-650 uppercase font-mono tracking-widest">NUTRITION TRACKS</span>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 font-sans">
                          <Zap className="h-6 w-6 text-amber-500" />
                          {lang === 'ru' ? 'Детали углеводов' : 'Carbs Log Details'}
                        </h2>
                        <p className="text-xs text-slate-500 font-sans">Glycogen reserve balances logged relative to target budgets.</p>
                      </div>

                      <div className="flex gap-2 bg-slate-55 border border-slate-205 p-1 rounded-xl w-max self-start font-mono text-[10px]">
                        {['7d', '30d'].map((per) => (
                          <button
                            key={per}
                            onClick={() => setTimePeriod(per as any)}
                            className={`px-3 py-1.5 rounded-lg font-bold uppercase text-center cursor-pointer transition-all ${
                              timePeriod === per ? 'bg-blue-600 text-white shadow-none' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {per === '7d' ? (lang === 'ru' ? '7 дней' : '7 Days') : (lang === 'ru' ? '30 дней' : '30 Days')}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl font-mono text-center">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Ср. за период' : 'Period Avg'}</span>
                          <span className="text-lg font-bold text-slate-900">{macroPeriodStats.carbsAvg} g</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Цель' : 'Target'}</span>
                          <span className="text-lg font-bold text-slate-500">{macroTargets.carbGrams} g</span>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 h-64 sm:h-80 select-none">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={caloriePeriodData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <YAxis stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }} />
                            <Bar dataKey="carbs" name="Carbs (g)" fill="#eab308" radius={[4, 4, 0, 0]} />
                            <ReferenceLine y={macroTargets.carbGrams} stroke="#eab308" strokeDasharray="4 4" label={{ value: 'Target', fill: '#eab308', fontSize: 10, position: 'top' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* SUBPAGE 6: FATS DETAILS */}
                  {subPage === 'fats' && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-sky-650 uppercase font-mono tracking-widest">NUTRITION TRACKS</span>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 font-sans">
                          <Zap className="h-6 w-6 text-sky-500" />
                          {lang === 'ru' ? 'Детали жиров' : 'Lipids Log Details'}
                        </h2>
                        <p className="text-xs text-slate-500 font-sans">Daily lipid balances and healthy fatty acids percentages.</p>
                      </div>

                      <div className="flex gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl w-max self-start font-mono text-[10px]">
                        {['7d', '30d'].map((per) => (
                          <button
                            key={per}
                            onClick={() => setTimePeriod(per as any)}
                            className={`px-3 py-1.5 rounded-lg font-bold uppercase text-center cursor-pointer transition-all ${
                              timePeriod === per ? 'bg-blue-600 text-white shadow-none' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {per === '7d' ? (lang === 'ru' ? '7 дней' : '7 Days') : (lang === 'ru' ? '30 дней' : '30 Days')}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl font-mono text-center">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Ср. за период' : 'Period Avg'}</span>
                          <span className="text-lg font-bold text-slate-900">{macroPeriodStats.fatAvg} g</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Цель' : 'Target'}</span>
                          <span className="text-lg font-bold text-slate-500">{macroTargets.fatGrams} g</span>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 h-64 sm:h-80 select-none">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={caloriePeriodData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <YAxis stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }} />
                            <Bar dataKey="fat" name="Fat (g)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                            <ReferenceLine y={macroTargets.fatGrams} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: 'Target', fill: '#38bdf8', fontSize: 10, position: 'top' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: CLEAN FOOD DIARY VIEW */}
          {activeTab === 'diary' && (
            <motion.div
              key="diary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              <FoodDiary
                profile={profile}
                foodLogs={foodLogs}
                onAddFoodLog={onAddFoodLog}
                onDeleteFoodLog={onDeleteFoodLog}
                onClearFoodLogsForDate={onClearFoodLogsForDate}
                adaptiveTdee={adaptiveResults.hasEnoughData ? adaptiveResults.currentTdee : undefined}
                initialMealSearchTrigger={initialMealTrigger}
                onResetMealSearchTrigger={() => setInitialMealTrigger(null)}
              />
            </motion.div>
          )}

          {/* TAB 3: DIETING STRATEGIES GUIDE */}
          {activeTab === 'strategy' && (
            <motion.div
              key="strategy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6"
            >
              <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 mb-4">
                <span className="text-[9px] font-bold tracking-widest text-blue-600 block font-mono uppercase">DIETING ROADMAPS</span>
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Flame className="h-5.5 w-5.5 text-blue-550" />
                  {lang === 'ru' ? 'Моя стратегия диеты' : 'Strategy & Diet Goals'}
                </h2>
                <p className="text-xs text-slate-400">Review recommendations on macro-splitting targets & physical stages calibration.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-4 flex flex-col gap-2">
                  <span className="text-[8px] font-bold text-indigo-500 font-mono uppercase">TARGET OBJECTIVE</span>
                  <p className="text-md font-bold text-slate-900 uppercase italic">
                    {profile.goal.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Your goal shift has been set to <strong>{
                      profile.goal === 'maintain' ? '0 kcal (Maintenance)' :
                      profile.goal === 'cut_slow' ? '-250 kcal (Slow Cut)' :
                      profile.goal === 'cut_moderate' ? '-500 kcal (Moderate Cut)' :
                      profile.goal === 'cut_aggressive' ? '-1000 kcal (Aggressive Cut)' :
                      profile.goal === 'bulk_slow' ? '+250 kcal (Clean Bulking)' : '+500 kcal'
                    }</strong>. This dictates daily budget bounds.
                  </p>
                </div>

                <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-4 flex flex-col gap-2">
                  <span className="text-[8px] font-bold text-rose-500 font-mono uppercase">MACRO ALLOCATIONS</span>
                  <p className="text-md font-black text-slate-900 uppercase">
                    Split Type: <span className="underline decoration-2">{profile.macroType}</span>
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Protein targets: <strong>{macroTargets.proteinGrams}g</strong> &bull; Carbs: <strong>{macroTargets.carbGrams}g</strong> &bull; Fats: <strong>{macroTargets.fatGrams}g</strong>. Highly optimized for muscle preservation under dynamic adaptation.
                  </p>
                </div>
              </div>

              {/* Strategy FAQ Accordion Guides */}
              <div className="mt-6 flex flex-col gap-3 font-mono text-xs">
                <h3 className="text-xs font-black uppercase text-slate-950 flex items-center gap-1.5 border-b pb-2">
                  <Info className="h-4 w-4 text-orange-550" />
                  {lang === 'ru' ? 'Вопросы и ответы по стратегии' : 'Strategy FAQ Guide'}
                </h3>

                <div className="space-y-2">
                  <details className="border border-slate-200 rounded-xl bg-slate-50/50 p-2.5 transition-colors hover:bg-slate-50 group cursor-pointer">
                    <summary className="font-extrabold text-slate-900 flex justify-between items-center outline-none list-none">
                      <span>{lang === 'ru' ? 'Какую фазу (цель) мне выбрать?' : 'Which phase should I choose?'}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className="mt-2 text-slate-600 leading-relaxed leading-normal">
                      {lang === 'ru' 
                        ? 'Если ваша цель — избавиться от лишнего жира, выберите Cut (Дефицит) (медленный или умеренный для сохранения мышц). Если вы хотите набрать мышечную массу — выберите Bulk (Профицит). Для закрепления веса и рекомпозиции выберите Maintain (Поддержание).'
                        : 'If your goal is to lose weight or fat, choose Cut (Deficit) - slow or moderate styles are recommended to preserve muscular tissues. If you seek lean gains, select Bulk. For body recomposition and maintenance phase, select Maintain.'
                      }
                    </p>
                  </details>

                  <details className="border border-slate-200 rounded-xl bg-slate-50/50 p-2.5 transition-colors hover:bg-slate-50 group cursor-pointer">
                    <summary className="font-extrabold text-slate-900 flex justify-between items-center outline-none list-none">
                      <span>{lang === 'ru' ? 'Почему важен высокий белок?' : 'Why is a high-protein intake critical?'}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className="mt-2 text-slate-600 leading-relaxed">
                      {lang === 'ru'
                        ? 'Белок является главным строительным макронутриентом. На дефиците калорий повышенный белок предотвращает распад мышечных волокон, заставляя ваш организм использовать жировые запасы в качестве источника энергии. Рекомендуется удерживать от 1.8г до 2.2г белка на кг веса.'
                        : 'Protein is the primary structural building block. Under caloric deficits, high protein prevents the breakdown of lean tissue fibers, forcing the body to draw upon fat cells for metabolic energy requirements.'
                      }
                    </p>
                  </details>

                  <details className="border border-slate-200 rounded-xl bg-slate-50/50 p-2.5 transition-colors hover:bg-slate-50 group cursor-pointer">
                    <summary className="font-extrabold text-slate-900 flex justify-between items-center outline-none list-none">
                      <span>{lang === 'ru' ? 'Сколько длится калибровка TDEE?' : 'How long does TDEE calibration take?'}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className="mt-2 text-slate-600 leading-relaxed">
                      {lang === 'ru'
                        ? 'Первичная теоретическая оценка работает сразу. Адаптивный калькулятор TDEE производит точные расчеты на 7-й день регулярных ежедневных записей еды и веса. Максимальная точность достигается к 14-му дню.'
                        : 'The initial baseline estimates apply instantly. The adaptive TDEE algorithm provides highly mathematically precise outputs by Day 7 of consistent weight logging and calorie reporting, reaching maximum precision around Day 14.'
                      }
                    </p>
                  </details>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: SETTINGS / MORE CORES */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3 font-mono"
            >
              <div className="border-b pb-2 mb-1 flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">APP CONTROLS</span>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight font-sans">{t.specsAndProfile}</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono">Compact Accordion Modes</span>
              </div>

              {/* Language Selection Segmented Control */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-sans">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight font-mono">{lang === 'ru' ? 'ЯЗЫК ИНТЕРФЕЙСА' : 'INTERFACE LANGUAGE'}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal">{lang === 'ru' ? 'Выберите язык для всего интерфейса приложения' : 'Select your preferred application language translation'}</p>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto font-mono text-[9.5px] font-bold">
                  <button
                    type="button"
                    onClick={() => onUpdateProfile({ ...profile, language: 'en' })}
                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                      lang === 'en'
                        ? 'bg-white text-slate-900 shadow-sm font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ENGLISH (EN)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateProfile({ ...profile, language: 'ru' })}
                    className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                      lang === 'ru'
                        ? 'bg-slate-900 text-white shadow-sm font-black'
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    РУССКИЙ (RU)
                  </button>
                </div>
              </div>

              {/* Group 1: Personal Details */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSectionState('coords')}
                  className={`w-full flex items-center justify-between p-3.5 transition-colors border-b border-slate-100 text-left cursor-pointer ${
                    sectionsOpen.coords ? 'bg-slate-50/50' : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-orange-50 text-orange-650 rounded-lg">
                      <Compass className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{lang === 'ru' ? 'Личные данные' : 'Personal Details'}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'ru' ? 'Форма параметров тела' : 'Your body coordinates & weights'}</p>
                    </div>
                  </div>
                  {sectionsOpen.coords ? <ChevronUp className="h-4 w-4 text-slate-900" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>
                {sectionsOpen.coords && (
                  <div className="p-3 sm:p-5 bg-white border-t border-slate-100">
                    <BioProfileForm profile={profile} onChange={onUpdateProfile} />
                  </div>
                )}
              </div>

              {/* Group 2: Targets & Formulas */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden font-sans">
                <button
                  onClick={() => toggleSectionState('macros')}
                  className={`w-full flex items-center justify-between p-3.5 transition-colors border-b border-slate-100 text-left cursor-pointer font-mono ${
                    sectionsOpen.macros ? 'bg-amber-50/50' : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-55 text-amber-650 rounded-lg">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight font-mono">{lang === 'ru' ? 'Назначение КБЖУ' : 'Targets & Formulas'}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Daily Calorie shift & Macro targets</p>
                    </div>
                  </div>
                  {sectionsOpen.macros ? <ChevronUp className="h-4 w-4 text-slate-900" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>
                {sectionsOpen.macros && (
                  <div className="p-3 sm:p-5 bg-white border-t border-slate-100">
                    <MacroPlanner
                      profile={profile}
                      onChange={onUpdateProfile}
                      adaptiveTdee={adaptiveResults.hasEnoughData ? adaptiveResults.currentTdee : undefined}
                    />
                  </div>
                )}
              </div>

              {/* Group 3: Metabolic Calibration & Weights Log Tracker */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSectionState('tdee')}
                  className={`w-full flex items-center justify-between p-3.5 transition-colors border-b border-slate-100 text-left cursor-pointer ${
                    sectionsOpen.tdee ? 'bg-purple-50/50' : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                      <ChartIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{lang === 'ru' ? 'Адаптивный метаболизм (TDEE)' : 'Adaptive Metabolism (TDEE)'}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Metabolic Calibration logs & history</p>
                    </div>
                  </div>
                  {sectionsOpen.tdee ? <ChevronUp className="h-4 w-4 text-slate-900" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>
                {sectionsOpen.tdee && (
                  <div className="p-3 sm:p-5 bg-white border-t border-slate-105 flex flex-col gap-4 font-sans">
                    <div className="bg-slate-900 text-white rounded-xl p-3.5 flex gap-3 items-start">
                      <TrendingDown className="w-5 h-5 text-orange-450 shrink-0 mt-0.5" />
                      <div className="font-mono">
                        <h4 className="text-[10px] font-bold text-slate-100 uppercase tracking-wide">Metabolic Intelligence Guidance</h4>
                        <p className="text-[10.5px] text-slate-400 leading-normal mt-0.5">
                          Keep sequential weight logs combined with logged daily food macros up to date! 
                          The estimator utilizes daily intake shifts trends to deduce real metabolic calibration.
                        </p>
                      </div>
                    </div>
                    <TdeeLogger
                      logs={logs}
                      unitSystem={profile.unitSystem}
                      theoreticalTdee={theoreticalTdee}
                      onUpdateLogs={onUpdateLogs}
                      startingWeight={profile.weight}
                    />
                  </div>
                )}
              </div>

              {/* Group 4: Meal Timings & percentages settings */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden font-sans">
                <button
                  onClick={() => toggleSectionState('meals')}
                  className={`w-full flex items-center justify-between p-3.5 transition-colors border-b border-slate-105 text-left cursor-pointer font-mono ${
                    sectionsOpen.meals ? 'bg-emerald-50/50' : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Apple className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight font-mono">{lang === 'ru' ? 'Приемы пищи' : 'Meal Timings'}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Breakfast, lunch & Dinner ratios</p>
                    </div>
                  </div>
                  {sectionsOpen.meals ? <ChevronUp className="h-4 w-4 text-slate-900" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>
                {sectionsOpen.meals && (
                  <div className="p-3 sm:p-5 bg-white border-t border-slate-100">
                    <MealPlanner
                      profile={profile}
                      adaptiveTdee={adaptiveResults.hasEnoughData ? adaptiveResults.currentTdee : undefined}
                    />
                  </div>
                )}
              </div>

              {/* Group 5: Data Storage & Backups */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden font-sans">
                <button
                  type="button"
                  onClick={() => toggleSectionState('storage')}
                  className={`w-full flex items-center justify-between p-3.5 transition-colors border-b border-slate-105 text-left cursor-pointer font-mono ${
                    sectionsOpen.storage ? 'bg-sky-50/50' : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight font-mono">{lang === 'ru' ? 'Резервное Копирование и Хранилище' : 'Backup & Data Storage'}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Bilateral backups & local storage state</p>
                    </div>
                  </div>
                  {sectionsOpen.storage ? <ChevronUp className="h-4 w-4 text-slate-900" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>
                {sectionsOpen.storage && (
                  <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-col gap-4 font-sans text-xs">
                    
                    {/* Information about where data is saved */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex gap-3 text-slate-700">
                      <Database className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-900 text-xs">{t.storageInfoTitle}</span>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                          {t.storageInfoDesc}
                        </p>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                          {t.storageAccessDesc}
                        </p>
                      </div>
                    </div>

                    {/* Stats overview */}
                    <div className="grid grid-cols-3 gap-2 text-center font-mono py-1">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{t.weightsCount}</span>
                        <span className="text-sm font-black text-slate-900">{logs.length}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{t.foodLogsCount}</span>
                        <span className="text-sm font-black text-slate-900">{foodLogs.length}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{t.unitSystemLabel}</span>
                        <span className="text-sm font-black text-slate-900 uppercase">{profile.unitSystem}</span>
                      </div>
                    </div>

                    {/* Google Drive Cloud Backup Console */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-3 font-sans">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black tracking-wider text-slate-800 uppercase font-mono flex items-center gap-1">
                            <Cloud className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            {lang === 'ru' ? 'Облако Google Drive' : 'Google Drive Cloud Sync'}
                          </span>
                        </div>

                        {/* Connection status badge */}
                        <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase select-none">
                          {gdriveStatus === 'connected' && (
                            <span className="flex items-center gap-1 text-green-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                              {lang === 'ru' ? 'Подключено' : 'Connected'}
                            </span>
                          )}
                          {gdriveStatus === 'connecting' && (
                            <span className="flex items-center gap-1 text-amber-500">
                              <RefreshCw className="h-3 w-3 animate-spin shrink-0" />
                              {lang === 'ru' ? 'Вход...' : 'Connecting...'}
                            </span>
                          )}
                          {gdriveStatus === 'disconnected' && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                              {lang === 'ru' ? 'Отключено' : 'Disconnected'}
                            </span>
                          )}
                          {gdriveStatus === 'error' && (
                            <span className="flex items-center gap-1 text-rose-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                              {lang === 'ru' ? 'Ошибка' : 'Error'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display Connection/Error Alert Message */}
                      {gdriveError && (
                        <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-rose-700 text-[11px] leading-relaxed">
                          {gdriveError}
                        </div>
                      )}

                      {/* Config & connection trigger */}
                      {gdriveStatus !== 'connected' && gdriveStatus !== 'connecting' ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                              Google Client ID
                            </label>
                            <input
                              type="text"
                              value={gdriveClientId}
                              onChange={(e) => setGdriveClientId(e.target.value)}
                              placeholder="342674987019-xxx.apps.googleusercontent.com"
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-[11px] text-slate-705 font-mono focus:outline-none focus:ring-1 focus:ring-slate-450"
                            />
                            
                            {/* Copy URI card */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 font-mono text-[10px] text-slate-600 mt-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px]">
                                  {lang === 'ru' ? 'СКОПИРУЙТЕ ЭТОТ АДРЕС (URL):' : 'COPY THIS ADDRESS (URL):'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(window.location.origin);
                                    setCopiedUri(true);
                                    setTimeout(() => setCopiedUri(false), 2000);
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline font-bold font-sans flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedUri ? (
                                    <span className="text-emerald-600 font-bold">{lang === 'ru' ? 'Скопировано!' : 'Copied!'}</span>
                                  ) : (
                                    <span>{lang === 'ru' ? 'Скопировать адрес' : 'Copy URL'}</span>
                                  )}
                                </button>
                              </div>
                              <div className="bg-white border border-slate-150 py-1.5 px-2.5 rounded-lg text-slate-800 font-mono text-xs select-all break-all leading-normal font-semibold">
                                {typeof window !== 'undefined' ? window.location.origin : 'https://...'}
                              </div>
                              <p className="text-[9px] text-slate-450 font-sans leading-normal mt-0.5">
                                {lang === 'ru'
                                  ? '💡 Если вы настраиваете Google Console на компьютере: нажмите «Скопировать адрес» на телефоне и отправьте его себе (в Избранное Telegram/Viber/WhatsApp или на email), затем вставьте его в настройки Google.'
                                  : '💡 If configuring Google Console on your PC: click "Copy URL" on your phone, send it to yourself (e.g., Telegram Saved Messages, WhatsApp, or email), then paste it into Google Console.'}
                              </p>
                            </div>

                            {/* Info Box */}
                            <div className="bg-slate-50/80 border border-slate-200 p-3 rounded-xl text-[11px] leading-relaxed text-slate-650 flex flex-col gap-2 font-sans mt-2.5">
                              <p className="font-black text-xs text-slate-900 border-b border-slate-150 pb-1 flex items-center gap-1.5 font-mono">
                                🔑 {lang === 'ru' ? 'Инструкция для входа Google Drive' : 'Google Drive Auth Instructions'}
                              </p>
                              {lang === 'ru' ? (
                                <div className="space-y-1.5 text-[10px] text-slate-600 leading-normal">
                                  <div className="text-slate-500 italic">
                                    Предустановленный демонстрационный Client ID часто выдает ошибку 'OAuth client not found', так как Google требует точного совпадения адреса. Чтобы исправить это и запустить синхронизацию:
                                  </div>
                                  <p><strong>1.</strong> Перейдите на сайт <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">Google Cloud Console</a> и создайте бесплатный проект.</p>
                                  <p><strong>2.</strong> Зайдите в <strong>APIs & Services</strong> &rarr; <strong>OAuth consent screen</strong>, выберите <em>External</em>, впишите ваше имя и email.</p>
                                  <p><strong>3.</strong> Раздел <strong>Credentials</strong> &rarr; <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong>. Тип приложения: <strong>Web Application</strong>.</p>
                                  <p><strong>4.</strong> В поле <strong>Authorized JavaScript origins</strong> скопируйте и вставьте адрес выше.</p>
                                  <p><strong>5.</strong> В поле <strong>Authorized redirect URIs</strong> вставьте тот же адрес.</p>
                                  <p><strong>6.</strong> Скопируйте сгенерированный Google Client ID, сохраните в поле ввода выше и нажмите кнопку ниже!</p>
                                </div>
                              ) : (
                                <div className="space-y-1.5 text-[10px] text-slate-600 leading-normal">
                                  <div className="text-slate-500 italic">
                                    The prefilled sandbox Client ID may report 'OAuth client not found' because Google requires the redirect URI to match your app URL perfectly. To connect:
                                  </div>
                                  <p><strong>1.</strong> Head to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">Google Cloud Console</a> and create a free project.</p>
                                  <p><strong>2.</strong> Go to <strong>APIs & Services</strong> &rarr; <strong>OAuth consent screen</strong>, select <em>External</em>, enter your email.</p>
                                  <p><strong>3.</strong> Click <strong>Credentials</strong> &rarr; <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong>. Select <strong>Web Application</strong>.</p>
                                  <p><strong>4.</strong> Under <strong>Authorized JavaScript origins</strong> paste our App URL shown above.</p>
                                  <p><strong>5.</strong> Under <strong>Authorized redirect URIs</strong> paste the exact same App URL.</p>
                                  <p><strong>6.</strong> Click Create, copy your generated Client ID, paste it into the field above and connect!</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleGDriveConnect}
                            className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold py-2.5 px-3 rounded-lg cursor-pointer transition-colors text-[10px] uppercase font-mono tracking-wider shadow-sm"
                          >
                            <Link2 className="h-3.5 w-3.5 stroke-[2.5px]" />
                            <span>{lang === 'ru' ? 'Подключить и войти' : 'Authorize & Connect'}</span>
                          </button>
                        </div>
                      ) : null}

                      {/* If connected, show Backup / Load actions */}
                      {gdriveStatus === 'connected' && (
                        <div className="flex flex-col gap-2.5">
                          <div className="bg-white border border-slate-150 p-2.5 rounded-lg flex flex-col gap-1.5 font-mono text-[10.5px]">
                            <div className="flex justify-between gap-2 overflow-hidden">
                              <span className="text-slate-400 uppercase font-black text-[8px] tracking-wider">{lang === 'ru' ? 'ID Бекапа' : 'File ID'}</span>
                              <span className="text-slate-650 truncate max-w-[200px] shrink">{gdriveBackupId || (lang === 'ru' ? 'Не найдено' : 'Not Created')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 uppercase font-black text-[8px] tracking-wider">{lang === 'ru' ? 'Последний бекап' : 'Last Synced'}</span>
                              <span className="text-slate-800 font-bold">{gdriveLastBackup || (lang === 'ru' ? 'Никогда' : 'Never')}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 font-mono">
                            <button
                              type="button"
                              disabled={isGdriveSyncing}
                              onClick={handleGDriveUpload}
                              className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-2 rounded-lg cursor-pointer disabled:opacity-50 transition-colors uppercase tracking-wider text-[9px]"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${isGdriveSyncing ? 'animate-spin' : ''}`} />
                              <span>{lang === 'ru' ? 'Создать бекап' : 'Backup'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isGdriveSyncing}
                              onClick={handleGDriveDownload}
                              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-2 rounded-lg cursor-pointer disabled:opacity-50 transition-colors uppercase tracking-wider text-[9px]"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>{lang === 'ru' ? 'Восстановиться' : 'Restore'}</span>
                            </button>
                          </div>

                          <div className="flex justify-end mt-0.5">
                            <button
                              type="button"
                              onClick={handleGDriveDisconnect}
                              className="text-[9.5px] text-rose-500 font-bold hover:underline cursor-pointer uppercase tracking-wider"
                            >
                              {lang === 'ru' ? 'Выйти из Google' : 'Sign Out Google'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action utilities */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      {/* Active Export handler */}
                      <button
                        type="button"
                        onClick={() => {
                          const backupObj = {
                            profile,
                            logs,
                            foodLogs,
                            exportedAt: new Date().toISOString(),
                            app: "IDFC_Metabolic_Engine"
                          };
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
                          const dlAnchor = document.createElement('a');
                          dlAnchor.setAttribute("href", dataStr);
                          dlAnchor.setAttribute("download", `idfc_tdee_backup_${new Date().toISOString().slice(0, 10)}.json`);
                          document.body.appendChild(dlAnchor);
                          dlAnchor.click();
                          dlAnchor.remove();
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl cursor-pointer transition-colors shadow-sm uppercase tracking-wider text-[10px]"
                      >
                        <Download className="h-3.5 w-3.5 stroke-[2.5px]" />
                        <span>{t.exportBackup}</span>
                      </button>

                      {/* Active Import handler using native input file trigger */}
                      <div className="flex-1">
                        <label className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold py-2.5 px-3 rounded-xl cursor-pointer transition-colors shadow-sm uppercase tracking-wider text-[10px] text-center select-none">
                          <Upload className="h-3.5 w-3.5 stroke-[2.5px]" />
                          <span>{t.importBackup}</span>
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                              const fileReader = new FileReader();
                              if (e.target.files && e.target.files[0]) {
                                fileReader.readAsText(e.target.files[0], "UTF-8");
                                fileReader.onload = (event) => {
                                  try {
                                    const parsed = JSON.parse(event.target?.result as string);
                                    if (parsed.app === "IDFC_Metabolic_Engine" || parsed.profile || parsed.logs) {
                                      if (parsed.profile) onUpdateProfile(parsed.profile);
                                      if (parsed.logs) onUpdateLogs(parsed.logs);
                                      if (parsed.foodLogs) onUpdateFoodLogs(parsed.foodLogs);
                                      alert(t.importSuccess);
                                    } else {
                                      alert(t.importFail);
                                    }
                                  } catch (err) {
                                    alert(t.importError);
                                  }
                                };
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Dangerous clear database button */}
                    <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                       <div className="flex items-center gap-1.5 text-rose-600 font-bold font-mono">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span className="uppercase tracking-widest text-[9px] font-black">{t.dangerZone}</span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-mono">
                        {t.dangerDesc}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(t.confirmClear)) {
                            localStorage.removeItem('tdee_user_profile');
                            localStorage.removeItem('tdee_daily_logs');
                            localStorage.removeItem('tdee_food_logs');
                            window.location.reload();
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-2 rounded-xl cursor-pointer transition-colors text-[10px] uppercase font-mono tracking-wider animate-pulse hover:animate-none"
                      >
                        <Trash2 className="h-3.5 w-3.5 stroke-[2.5px]" />
                        <span>{t.clearStorage}</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR WITH A BIG ACCENT PLUS ACTIONS POPUP BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-150 block md:hidden select-none">
        <div className="max-w-md mx-auto px-1 py-1 flex justify-between items-center font-mono relative">
          
          {/* Left Core Tabs */}
          {tabList.slice(0, 2).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSubPage('none');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex-1 flex flex-col items-center justify-center py-1 rounded-lg transition-colors cursor-pointer ${
                  active
                    ? 'font-bold text-blue-600'
                    : 'text-slate-400 hover:text-slate-905'
                }`}
              >
                <span className={active ? 'text-blue-600 stroke-[3px]' : 'text-slate-600'}>{tab.icon}</span>
                <span className="text-[9px] font-bold uppercase mt-1 leading-none tracking-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Plus Actions central highlight button */}
          <button
            onClick={() => setIsPlusOpen(true)}
            id="mobile-plus-btn"
            className="mx-1 h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer transition-transform hover:scale-105 select-none relative -top-2"
            title="Log weight or custom meal items"
          >
            <Plus className="h-5.5 w-5.5 stroke-[3px] text-white" />
          </button>

          {/* Right Core Tabs */}
          {tabList.slice(2).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSubPage('none');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex-1 flex flex-col items-center justify-center py-1 rounded-lg transition-colors cursor-pointer ${
                  active
                    ? 'font-bold text-blue-600'
                    : 'text-slate-400 hover:text-slate-905'
                }`}
              >
                <span className={active ? 'text-blue-600 stroke-[2.5px]' : 'text-slate-600'}>{tab.icon}</span>
                <span className="text-[9px] font-bold uppercase mt-1 leading-none tracking-tight text-center">
                  {tab.label}
                </span>
              </button>
            );
          })}

        </div>
      </div>

      {/* DESKTOP FLOATING FIXED PLUS BUTTON IN CORNER TO KEEP EXPERIENCE ENTIRELY SYMMETRIC */}
      <div className="hidden md:block fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsPlusOpen(true)}
          className="flex h-12 w-12 items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full select-none cursor-pointer hover:scale-105 transition-all shadow-md"
          title="Quick entry logging popup"
        >
          <Plus className="h-6 w-6 text-white stroke-[3px]" />
        </button>
      </div>

      {/* QUICK PLUS ACTION POPUP MENU MODAL OVERLAY */}
      <AnimatePresence>
        {isPlusOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
            {/* Click backdrop to dismiss */}
            <div className="absolute inset-0" onClick={() => setIsPlusOpen(false)} />

            <motion.div
              initial={{ y: 150, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 150, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-5 relative z-10 font-mono"
            >
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase">{lang === 'ru' ? 'Что добавить?' : 'Log Options'}</span>
                <button
                  onClick={() => setIsPlusOpen(false)}
                  className="p-1 hover:bg-slate-150 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                {/* Weight Option */}
                <button
                  onClick={() => handlePlusActionClick('weight')}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-indigo-100/30 bg-indigo-50/40 hover:bg-indigo-50/80 font-semibold text-xs uppercase text-slate-950 text-left transition-colors cursor-pointer"
                >
                  <span className="p-1.5 bg-indigo-100/70 border border-indigo-200 rounded-lg shrink-0">
                    <Scale className="h-4 w-4 text-indigo-900 stroke-[2.5px]" />
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{lang === 'ru' ? 'Внести вес' : 'Log Weight'}</span>
                    <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-tight">
                      {lang === 'ru' ? 'Записать утренний вес' : 'Register morning weigh-in'}
                    </p>
                  </div>
                </button>

                {/* Breakfast Option */}
                <button
                  onClick={() => handlePlusActionClick('breakfast')}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-orange-100/30 bg-orange-50/40 hover:bg-orange-50/80 font-semibold text-xs uppercase text-slate-950 text-left transition-colors cursor-pointer"
                >
                  <span className="p-1.5 bg-orange-100/70 border border-orange-200 rounded-lg shrink-0">
                    <Utensils className="h-4 w-4 text-orange-900 stroke-[2.5px]" />
                  </span>
                  <div>
                    <span className="font-bold text-slate-950 text-xs">{lang === 'ru' ? 'Внести завтрак' : 'Breakfast'}</span>
                    <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-tight">
                      {lang === 'ru' ? 'Записать кашу, омлет или еду' : 'Add cereals, eggs or pancakes'}
                    </p>
                  </div>
                </button>

                {/* Lunch Option */}
                <button
                  onClick={() => handlePlusActionClick('lunch')}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-amber-100/30 bg-amber-50/40 hover:bg-amber-50/80 font-semibold text-xs uppercase text-slate-950 text-left transition-colors cursor-pointer"
                >
                  <span className="p-1.5 bg-amber-100/70 border border-amber-200 rounded-lg shrink-0">
                    <Utensils className="h-4 w-4 text-amber-900 stroke-[2.5px]" />
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{lang === 'ru' ? 'Внести обед' : 'Lunch'}</span>
                    <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-tight">
                      {lang === 'ru' ? 'Записать курицу, рис или салат' : 'Record chicken, rice or salad'}
                    </p>
                  </div>
                </button>

                {/* Dinner Option */}
                <button
                  onClick={() => handlePlusActionClick('dinner')}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-rose-100/30 bg-rose-50/40 hover:bg-rose-50/80 font-semibold text-xs uppercase text-slate-950 text-left transition-colors cursor-pointer"
                >
                  <span className="p-1.5 bg-rose-100/70 border border-rose-200 rounded-lg shrink-0">
                    <Utensils className="h-4 w-4 text-rose-900 stroke-[2.5px]" />
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{lang === 'ru' ? 'Внести ужин' : 'Dinner'}</span>
                    <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-tight">
                      {lang === 'ru' ? 'Записать стейк, рыбу или гарнир' : 'Log steak, salmon or grains'}
                    </p>
                  </div>
                </button>

                {/* Snack Option */}
                <button
                  onClick={() => handlePlusActionClick('snack')}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-sky-100/30 bg-sky-50/40 hover:bg-sky-50/80 font-semibold text-xs uppercase text-slate-950 text-left transition-colors cursor-pointer"
                >
                  <span className="p-1.5 bg-sky-100/70 border border-sky-200 rounded-lg shrink-0">
                    <Apple className="h-4 w-4 text-sky-900 stroke-[2.5px]" />
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{lang === 'ru' ? 'Внести перекус' : 'Snack'}</span>
                    <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-tight">
                      {lang === 'ru' ? 'Добавить орехи, протеин или фрукты' : 'Quick add nuts, shakes or fruits'}
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REAL-TIME INNER WEIGHT LOG MODAL (NO ALERT BLOCKS) */}
      <AnimatePresence>
        {isWeightModalOpen && (
          <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 block" onClick={() => setIsWeightModalOpen(false)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-5 sm:p-6 relative z-10 font-mono"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2 font-sans">
                  <Scale className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-900 uppercase">
                    {lang === 'ru' ? 'Внести вес' : 'Log Weight'}
                  </span>
                </div>
                <button
                  onClick={() => setIsWeightModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {weightSaveSuccess ? (
                <div className="py-6 text-center flex flex-col items-center justify-center gap-2 font-sans">
                  <span className="text-3xl">🎉</span>
                  <p className="text-sm font-bold text-slate-900 uppercase">
                    {lang === 'ru' ? 'Вес успешно сохранен!' : 'Weight logged successfully!'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {lang === 'ru' ? 'TDEE модели пересчитывают метаболизм.' : 'TDEE models are synchronizing calibration.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={saveQuickWeight} className="flex flex-col gap-4">
                  
                  {/* Weight Value Input */}
                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">
                      {lang === 'ru' ? `Текущий вес (${profile.unitSystem === 'metric' ? 'кг' : 'фунты'})` : `Current Weight (${profile.unitSystem === 'metric' ? 'kg' : 'lbs'})`}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="20"
                        max="500"
                        required
                        value={loggedWeightVal}
                        onChange={(e) => setLoggedWeightVal(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-blue-500 bg-white"
                        placeholder="80.5"
                        autoFocus
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                        {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}
                      </span>
                    </div>
                  </div>

                  {/* Date Input */}
                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">
                      {lang === 'ru' ? 'Дата записи' : 'Date'}
                    </label>
                    <input
                      type="date"
                      required
                      value={loggedWeightDate}
                      onChange={(e) => setLoggedWeightDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-blue-500 bg-white font-mono"
                    />
                  </div>

                  {/* Notes Input */}
                  <div className="flex flex-col gap-1.5 font-sans">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">
                      {lang === 'ru' ? 'Заметки (опционально)' : 'Notes (optional)'}
                    </label>
                    <input
                      type="text"
                      value={loggedNotes}
                      onChange={(e) => setLoggedNotes(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 bg-white"
                      placeholder={lang === 'ru' ? 'Утреннее взвешивание' : 'Morning weigh-in'}
                    />
                  </div>

                  {/* Buttons */}
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-xl cursor-pointer transition-colors mt-2"
                  >
                    {lang === 'ru' ? 'Сохранить замеры' : 'Log Metrics'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
