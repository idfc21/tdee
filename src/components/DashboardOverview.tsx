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
  ChevronLeft,
  ChevronRight,
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
import SettingsPanel from './SettingsPanel';

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
  const isActive = profile.themeStyle === 'samsung-active';
  const t = translations[lang];

  // Navigation strategy: 'dashboard' | 'diary' | 'strategy' | 'settings'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'diary' | 'strategy' | 'settings'>('dashboard');
  
  // Custom expandable setting accordions states
  const [sectionsOpen, setSectionsOpen] = useState({
    coords: false,
    macros: false,
    tdee: false,
    meals: false,
    storage: false,
  });

  // Sub-navigation within settings: 'coords' | 'macros' | 'tdee' | 'meals' | 'storage' | null
  const [activeSettingsSubPanel, setActiveSettingsSubPanel] = useState<'coords' | 'macros' | 'tdee' | 'meals' | 'storage' | null>(null);

  // Reset settings sub-panel when activeTab changes
  useEffect(() => {
    setActiveSettingsSubPanel(null);
  }, [activeTab]);

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
      <div className={`hidden md:flex p-1.5 rounded-2xl gap-2 w-max self-center shadow-sm transition-all ${
        isActive 
          ? 'bg-[#121624] border border-[#1e253c]' 
          : 'bg-slate-50 border border-[#eef1f6]'
      }`}>
        {tabList.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSubPage('none');
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold font-mono tracking-tight uppercase border transition-all cursor-pointer ${
                active
                  ? isActive
                    ? 'border-blue-500 bg-blue-600/10 text-blue-400 font-extrabold shadow-sm'
                    : 'border-[#00c08b]/30 bg-[#00c08b]/5 text-[#00c08b]'
                  : isActive
                    ? 'border-transparent text-slate-400 hover:text-white hover:bg-[#1b2238]/60'
                    : 'border-[#eef1f6] text-slate-500 hover:text-slate-900 hover:bg-slate-50'
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
                (() => {
                  const activeThemeStyle = profile.themeStyle || 'soft-cozy';
                  const glassCardClass = isActive 
                    ? 'bg-[#121624]/20 border border-[#1e253c]/35 backdrop-blur-xl' 
                    : 'bg-white/45 border border-[#eef1f6]/70 backdrop-blur-xl';
                  
                  if (activeThemeStyle === 'samsung-active') {
                    // Computed ring calculations for Samsung Active Smartwatch Feel
                    const outerR = 64;
                    const outerCirc = 2 * Math.PI * outerR;
                    const outerPct = Math.min(100, Math.max(1, (todayTotals.calories / targetCalories) * 100));
                    const outerOffset = outerCirc - (outerPct / 100) * outerCirc;

                    const midR = 48;
                    const midCirc = 2 * Math.PI * midR;
                    const midPct = Math.min(100, Math.max(1, (todayTotals.protein / (macroTargets.proteinGrams || 1)) * 100));
                    const midOffset = midCirc - (midPct / 100) * midCirc;

                    const innerR = 32;
                    const innerCirc = 2 * Math.PI * innerR;
                    const innerPct = Math.min(100, Math.max(1, (todayTotals.carbs / (macroTargets.carbGrams || 1)) * 100));
                    const innerOffset = innerCirc - (innerPct / 100) * innerCirc;

                    const activeKcalLeft = Math.max(0, Math.round(targetCalories - todayTotals.calories));

                    return (
                      <div className="flex flex-col gap-4 font-sans">
                        {/* SAMSUNG HEALTH CHAMPION HERO BANNER: The Living Active Rings */}
                        <div className="bg-[#121624]/30 border border-[#1e253c]/45 backdrop-blur-xl text-white rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-md">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                          <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                          
                          {/* Concentric Smart Rings (SVG visualization) */}
                          <div className="relative flex items-center justify-center shrink-0 w-44 h-44 bg-slate-950/40 rounded-full border border-slate-800/50 p-2">
                            <svg className="w-full h-full rotate-[-90deg]">
                              {/* Background Tracks */}
                              <circle cx="88" cy="88" r={outerR} className="stroke-slate-800/60" strokeWidth="10" fill="transparent" />
                              <circle cx="88" cy="88" r={midR} className="stroke-slate-800/60" strokeWidth="10" fill="transparent" />
                              <circle cx="88" cy="88" r={innerR} className="stroke-slate-800/60" strokeWidth="10" fill="transparent" />
                              
                              {/* Active Progress Tracks */}
                              {/* Calories (Green-Blue Emerald) */}
                              <motion.circle
                                cx="88" cy="88" r={outerR}
                                className="stroke-[#00c08b]" strokeWidth="10" strokeLinecap="round" fill="transparent"
                                strokeDasharray={outerCirc}
                                initial={{ strokeDashoffset: outerCirc }}
                                animate={{ strokeDashoffset: outerOffset }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                              {/* Protein (Rose Neon) */}
                              <motion.circle
                                cx="88" cy="88" r={midR}
                                className="stroke-rose-500" strokeWidth="10" strokeLinecap="round" fill="transparent"
                                strokeDasharray={midCirc}
                                initial={{ strokeDashoffset: midCirc }}
                                animate={{ strokeDashoffset: midOffset }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                              />
                              {/* Carbs (Vibrant Gold) */}
                              <motion.circle
                                cx="88" cy="88" r={innerR}
                                className="stroke-amber-400" strokeWidth="10" strokeLinecap="round" fill="transparent"
                                strokeDasharray={innerCirc}
                                initial={{ strokeDashoffset: innerCirc }}
                                animate={{ strokeDashoffset: innerOffset }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                              />
                            </svg>
                            
                            {/* Inside ring details */}
                            <div className="absolute flex flex-col items-center justify-center text-center">
                              <Flame className="h-6 w-6 text-[#00c08b] animate-pulse" />
                              <span className="text-xl font-extrabold tracking-tight leading-none mt-1">{activeKcalLeft}</span>
                              <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">{lang === 'ru' ? 'ккал ост.' : 'kcal left'}</span>
                            </div>
                          </div>

                          {/* Quick details stack */}
                          <div className="flex-1 w-full md:pl-2 flex flex-col gap-4">
                            <div className="border-b border-slate-800 pb-2">
                              <span className="text-[9px] font-bold text-[#00c08b] uppercase tracking-widest font-mono">Samsung Health Active Feel</span>
                              <h3 className="text-lg font-extrabold text-white tracking-tight mt-0.5">{lang === 'ru' ? 'Активность за сегодня' : "Today's Active Progression"}</h3>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-2xl flex flex-col items-center text-center">
                                <span className="h-2 w-2 rounded-full bg-[#00c08b] block mb-1"></span>
                                <span className="text-[8px] text-slate-400 font-bold uppercase">{lang === 'ru' ? 'Калории' : 'Calories'}</span>
                                <span className="text-xs font-bold font-mono mt-1 text-[#00c08b]">{todayTotals.calories} / {Math.round(targetCalories)} <span className="text-[8px] text-slate-500 font-normal">kcal</span></span>
                              </div>
                              <div className="bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-2xl flex flex-col items-center text-center">
                                <span className="h-2 w-2 rounded-full bg-rose-500 block mb-1"></span>
                                <span className="text-[8px] text-slate-400 font-bold uppercase">{lang === 'ru' ? 'Белок' : 'Protein'}</span>
                                <span className="text-xs font-bold font-mono mt-1 text-rose-400">{Math.round(todayTotals.protein)}g / {macroTargets.proteinGrams}g</span>
                              </div>
                              <div className="bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-2xl flex flex-col items-center text-center">
                                <span className="h-2 w-2 rounded-full bg-amber-400 block mb-1"></span>
                                <span className="text-[8px] text-slate-400 font-bold uppercase">{lang === 'ru' ? 'Углеводы' : 'Carbs'}</span>
                                <span className="text-xs font-bold font-mono mt-1 text-amber-300">{Math.round(todayTotals.carbs)}g / {macroTargets.carbGrams}g</span>
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-400 leading-normal flex items-center gap-1.5 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/30 z-10 font-sans font-medium">
                              <Info className="h-3.5 w-3.5 text-sky-450 shrink-0" />
                              <span>{lang === 'ru' ? 'Активные кольца показывают прогресс по калориям, белкам и углеводам.' : 'Active smart rings aggregate live calorie, protein, and carbohydrate goals progression.'}</span>
                            </p>
                          </div>
                        </div>

                        {/* HIGH-LEVEL ACTIVE METRICS GRID (SAMSUNG SPORT CONCEPT) */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setSubPage('expenditure')}
                            className={`border rounded-3xl p-5 text-left flex flex-col justify-between transition-all w-full cursor-pointer group shadow-sm backdrop-blur-xl ${
                              isActive 
                                ? 'bg-[#121624]/20 border-[#1e253c]/35 hover:border-blue-500/80 hover:bg-[#121624]/40' 
                                : 'bg-white/45 border-[#e1e6f0]/70 hover:border-blue-500/60 hover:bg-white/60'
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className={`text-[9px] font-black tracking-wider font-mono ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>TDEE ACTIVE EXPENDITURE</span>
                              <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded-lg uppercase ${
                                isActive 
                                  ? 'bg-blue-950/40 text-blue-400 border-blue-900/60' 
                                  : 'bg-blue-100 text-blue-600 border-blue-200'
                              }`}>Active</span>
                            </div>
                            <div className="my-3">
                              <p className={`text-3xl font-black font-mono tracking-tight leading-none group-hover:text-blue-455 transition-colors ${
                                isActive ? 'text-white' : 'text-slate-900'
                              }`}>
                                {Math.round(activeBaseTdee).toLocaleString()}{' '}
                                <span className={`text-xs font-normal ${isActive ? 'text-slate-400' : 'text-slate-455'}`}>kcal</span>
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1.5 tracking-tight">{lang === 'ru' ? 'Текущий расход с учетом активности' : 'Calibrated daily energy burn rate'}</p>
                            </div>
                            <div className={`pt-2.5 border-t flex items-center justify-between w-full text-slate-500 ${
                              isActive ? 'border-[#1e253c]/35' : 'border-slate-100'
                            }`}>
                              <span className="text-[8.5px] font-bold uppercase">BMR {bmrValue} kcal &bull; Multiplier: {profile.activityLevel}</span>
                              <ArrowLeft className="h-3.5 w-3.5 text-blue-500 rotate-180 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>

                          <button
                            onClick={() => setSubPage('weight_trend')}
                            className={`border rounded-3xl p-5 text-left flex flex-col justify-between transition-all w-full cursor-pointer group shadow-sm backdrop-blur-xl ${
                              isActive 
                                ? 'bg-[#121624]/20 border-[#1e253c]/35 hover:border-emerald-500/80 hover:bg-[#121624]/40' 
                                : 'bg-white/45 border-[#e1e6f0]/70 hover:border-emerald-500/65 hover:bg-white/60'
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className={`text-[9px] font-black tracking-wider font-mono ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>BODY WEIGHT METRICS</span>
                              <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded-lg uppercase ${
                                isActive 
                                  ? 'bg-emerald-950/40 text-[#00c08b] border-emerald-900/60' 
                                  : 'bg-emerald-100 text-emerald-600 border-emerald-200'
                              }`}>Calibrate</span>
                            </div>
                            <div className="my-3">
                              <p className={`text-3xl font-black font-mono tracking-tight leading-none group-hover:text-emerald-500 transition-colors ${
                                isActive ? 'text-white' : 'text-slate-900'
                              }`}>
                                {profile.weight}{' '}
                                <span className={`text-sm font-extrabold uppercase ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>{profile.unitSystem === 'metric' ? 'kg' : 'lbs'}</span>
                              </p>
                              <p className="text-[9.5px] text-slate-400 font-bold uppercase mt-1.5 tracking-tight">
                                BMI {bmiAnalytics.bmi.toFixed(1)} &bull; {bmiAnalytics.category}
                              </p>
                            </div>
                            <div className={`pt-2.5 border-t flex items-center justify-between w-full text-slate-500 ${
                              isActive ? 'border-[#1e253c]/35' : 'border-slate-100'
                            }`}>
                              <span className="text-[8.5px] font-bold uppercase">{lang === 'ru' ? 'Синхронизировано' : 'Sync logs active'}</span>
                              <ArrowLeft className="h-3.5 w-3.5 text-emerald-500 rotate-180 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>
                        </div>

                        {/* ATHLETIC TARGET CARDS GRID */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <button
                            onClick={() => setSubPage('calories')}
                            className={`border rounded-3xl p-4 text-left flex flex-col justify-between transition-all w-full cursor-pointer group shadow-sm backdrop-blur-xl ${
                              isActive 
                                ? 'bg-[#121624]/20 border-[#1e253c]/35 hover:border-[#00c08b]/80 hover:bg-[#121624]/40' 
                                : 'bg-white/45 border-[slate-200]/45 hover:border-[#00c08b]/60 hover:bg-white/60'
                            }`}
                          >
                            <span className="text-[8px] font-black text-[#00c08b] font-mono tracking-widest uppercase">CALORIES BUDGET</span>
                            <div className="my-2.5 font-mono">
                              <p className={`text-2xl font-black block ${isActive ? 'text-white' : 'text-slate-900'}`}>{todayTotals.calories}</p>
                              <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {targetCalories} target</p>
                            </div>
                            <div className={`w-full h-1 rounded-full overflow-hidden ${isActive ? 'bg-slate-950/60' : 'bg-slate-100'}`}>
                              <div className="bg-[#00c08b] h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.calories / targetCalories) * 100)}%` }} />
                            </div>
                          </button>

                          <button
                            onClick={() => setSubPage('protein')}
                            className={`border rounded-3xl p-4 text-left flex flex-col justify-between transition-all w-full cursor-pointer group shadow-sm backdrop-blur-xl ${
                              isActive 
                                ? 'bg-[#121624]/20 border-[#1e253c]/35 hover:border-rose-500/80 hover:bg-[#121624]/40' 
                                : 'bg-white/45 border-slate-200/45 hover:border-rose-500/60 hover:bg-white/60'
                            }`}
                          >
                            <span className="text-[8px] font-black text-rose-500 font-mono tracking-widest uppercase">PROTEIN MATRIX</span>
                            <div className="my-2.5 font-mono">
                              <p className={`text-2xl font-black block ${isActive ? 'text-white' : 'text-slate-900'}`}>{Math.round(todayTotals.protein)}g</p>
                              <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {macroTargets.proteinGrams}g target</p>
                            </div>
                            <div className={`w-full h-1 rounded-full overflow-hidden ${isActive ? 'bg-slate-950/60' : 'bg-slate-100'}`}>
                              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.protein / macroTargets.proteinGrams) * 100)}%` }} />
                            </div>
                          </button>

                          <button
                            onClick={() => setSubPage('carbs')}
                            className={`border rounded-3xl p-4 text-left flex flex-col justify-between transition-all w-full cursor-pointer group shadow-sm backdrop-blur-xl ${
                              isActive 
                                ? 'bg-[#121624]/20 border-[#1e253c]/35 hover:border-amber-500/80 hover:bg-[#121624]/40' 
                                : 'bg-white/45 border-slate-200/45 hover:border-amber-500/60 hover:bg-white/60'
                            }`}
                          >
                            <span className="text-[8px] font-black text-amber-500 font-mono tracking-widest uppercase">CARBON METERS</span>
                            <div className="my-2.5 font-mono">
                              <p className={`text-2xl font-black block ${isActive ? 'text-white' : 'text-slate-900'}`}>{Math.round(todayTotals.carbs)}g</p>
                              <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {macroTargets.carbGrams}g target</p>
                            </div>
                            <div className={`w-full h-1 rounded-full overflow-hidden ${isActive ? 'bg-slate-950/60' : 'bg-slate-100'}`}>
                              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.carbs / macroTargets.carbGrams) * 105)}%` }} />
                            </div>
                          </button>

                          <button
                            onClick={() => setSubPage('fats')}
                            className={`border rounded-3xl p-4 text-left flex flex-col justify-between transition-all w-full cursor-pointer group shadow-sm backdrop-blur-xl ${
                              isActive 
                                ? 'bg-[#121624]/20 border-[#1e253c]/35 hover:border-sky-500/80 hover:bg-[#121624]/40' 
                                : 'bg-white/45 border-slate-200/45 hover:border-sky-500/60 hover:bg-white/60'
                            }`}
                          >
                            <span className="text-[8px] font-black text-sky-500 font-mono tracking-widest uppercase">LIPIDS LEVEL</span>
                            <div className="my-2.5 font-mono">
                              <p className={`text-2xl font-black block ${isActive ? 'text-white' : 'text-slate-900'}`}>{Math.round(todayTotals.fat)}g</p>
                              <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {macroTargets.fatGrams}g target</p>
                            </div>
                            <div className={`w-full h-1 rounded-full overflow-hidden ${isActive ? 'bg-slate-950/60' : 'bg-slate-100'}`}>
                              <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.fat / macroTargets.fatGrams) * 100)}%` }} />
                            </div>
                          </button>
                        </div>

                        {/* HISTORIES / 7d COLUMNS LIST */}
                        <div className={`border rounded-3xl p-5 flex flex-col gap-3 shadow-sm backdrop-blur-xl ${
                          isActive ? 'bg-[#121624]/20 border-[#1e253c]/35' : 'bg-white/45 border-slate-200/45'
                        }`}>
                          <div className={`flex items-center justify-between border-b pb-2.5 ${isActive ? 'border-[#1e253c]' : 'border-slate-100'}`}>
                            <span className="text-[9px] font-black tracking-widest text-[#00c08b] uppercase font-mono">{lang === 'ru' ? 'НЕДЕЛЬНЫЙ ОБЗОР' : '7-DAY SUMMARY'}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{lang === 'ru' ? 'Активность по дням' : 'Calories index per day'}</span>
                          </div>
                          
                          <div className="grid grid-cols-7 gap-1 pt-2 text-center h-28 items-end">
                            {weeklyNutrition.map((day) => {
                              const pct = targetCalories > 0 ? (day.calories / targetCalories) * 100 : 0;
                              const blockHeight = `${Math.max(8, Math.min(100, pct))}%`;
                              const isTodayDay = day.dateStr === todayStr;
                              return (
                                <div key={day.dateStr} className="flex flex-col items-center justify-end h-full gap-1.5 font-sans">
                                  <span className={`text-[8.5px] font-mono font-bold ${isActive ? 'text-slate-300' : 'text-slate-550'}`}>{Math.round(day.calories)}</span>
                                  <div className={`w-5 h-16 border rounded-lg flex flex-col justify-end overflow-hidden ${
                                    isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-slate-50 border-slate-150'
                                  }`}>
                                    <div className="w-full bg-emerald-500 rounded-lg" style={{ height: blockHeight }} />
                                  </div>
                                  <span className={`text-[9.5px] font-black uppercase ${
                                    isTodayDay 
                                      ? 'text-blue-400 underline font-extrabold' 
                                      : isActive 
                                        ? 'text-slate-450' 
                                        : 'text-slate-400'
                                  }`}>{day.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default Cozy Soft Velvet (Aesthetic Look) with Extremely Polished Layout borders, spacing and Outfit details
                  return (
                    <div className="flex flex-col gap-4 font-sans">
                      {/* NEW CIRCULAR PROGRESS HERO CARD (MINIMALIST, THIN LINE, SOFT GLASS EFFECT) */}
                      <div className="bg-white/45 border border-[#eef1f6]/70 backdrop-blur-xl rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c08b]/5 rounded-full blur-3xl pointer-events-none" />
                        
                        {/* Circular Progress (Minimalist, Thin Line) */}
                        <div className="relative flex items-center justify-center shrink-0 w-32 h-32 ml-4">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
                            {/* Track Circle */}
                            <circle
                              cx="72"
                              cy="72"
                              r="64"
                              className="stroke-slate-250/30 dark:stroke-slate-750/30 fill-none"
                              strokeWidth="2.5"
                            />
                            {/* Fill Circle */}
                            <circle
                              cx="72"
                              cy="72"
                              r="64"
                              className="stroke-[#00c08b] fill-none transition-all duration-500 ease-out"
                              strokeWidth="3.5"
                              strokeDasharray={2 * Math.PI * 64}
                              strokeDashoffset={2 * Math.PI * 64 - (Math.min(100, (todayTotals.calories / targetCalories) * 100) / 100) * (2 * Math.PI * 64)}
                              strokeLinecap="round"
                            />
                          </svg>
                          
                          {/* Inner Percentage Indicators */}
                          <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-black font-mono tracking-tight text-slate-800">
                              {Math.round((todayTotals.calories / targetCalories) * 100)}%
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {lang === 'ru' ? 'ккал цель' : 'kcal target'}
                            </span>
                          </div>
                        </div>

                        {/* Description Text Column */}
                        <div className="flex-1 text-center md:text-left md:pl-4">
                          <div className="pb-2 border-b border-slate-100/60">
                            <span className="text-[8.5px] font-bold text-[#00c08b] uppercase tracking-widest font-mono">My Calorie Flow Engine</span>
                            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-0.5">
                              {lang === 'ru' ? 'Прогресс за сегодня' : "Today's Calorie progression"}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-4 font-mono">
                            <div>
                              <span className="text-[8px] text-slate-400 font-bold block uppercase">{lang === 'ru' ? 'ПОТРЕБЛЕНО' : 'LEAN INTAKE'}</span>
                              <span className="text-xl font-extrabold text-slate-800">{todayTotals.calories} <span className="text-[10px] text-slate-450 font-normal">kcal</span></span>
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-400 font-bold block uppercase">{lang === 'ru' ? 'ОСТАЛОСЬ' : 'REMAINING BUDGET'}</span>
                              <span className="text-xl font-extrabold text-slate-820">
                                {Math.max(0, Math.round(targetCalories - todayTotals.calories))} <span className="text-[10px] text-slate-455 font-normal">kcal</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Row A: Weekly Nutrition Columns Pillars Chart (Inspired by premium layouts) */}
                      <div className="bg-white/45 border border-[#eef1f6]/70 backdrop-blur-xl rounded-3xl p-5 sm:p-6 flex flex-col gap-3 shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#f4f7fa] pb-2.5 font-sans">
                          <div>
                            <span className="text-[9px] font-bold tracking-widest text-[#00c08b] block uppercase">{t.weeklyIntakeProgress}</span>
                            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">{t.weeklyNutrition}</h3>
                          </div>
                          <span className="text-[10px] text-slate-450 font-black uppercase font-mono">{t.roll7d}</span>
                        </div>

                        <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2 text-center h-44 items-end">
                          {weeklyNutrition.map((day) => {
                            const isTodayDay = day.dateStr === todayStr;
                            const pct = targetCalories > 0 ? (day.calories / targetCalories) * 100 : 0;
                            const validPct = Math.min(130, Math.round(pct));
                            
                            // Dynamically scale height safely
                            const blockHeight = `${Math.max(5, Math.min(100, (validPct / 130) * 105))}%`;
                            
                            // Assess color representation
                            let colorClass = 'bg-[#00c08b]';
                            if (validPct >= 90 && validPct <= 110) {
                              colorClass = 'bg-emerald-500';
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
                                <span className="text-[8px] font-bold text-slate-500 block leading-none font-mono">
                                  {day.calories > 0 ? `${Math.round(day.calories)}` : '0'}
                                </span>

                                {/* Outer Track box container */}
                                <div className="w-4 sm:w-6 h-28 bg-slate-50/50 border border-[#eef1f6] rounded-full flex flex-col justify-end overflow-hidden relative">
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
                                  <span className={`text-[9px] font-bold leading-none uppercase ${isTodayDay ? 'text-[#00c08b] underline decoration-2' : 'text-slate-500'}`}>
                                    {day.label}
                                  </span>
                                  <span className="text-[7.5px] text-slate-400 mt-0.5 font-bold font-mono">{day.dayNum}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Row B: INSIGHTS & ANALYTICS HEADER */}
                      <div className="flex items-center gap-2 mt-2">
                        <ChartIcon className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-sans">Аналитика и Расход / Insights & Analytics</h3>
                      </div>

                      {/* Row C: Expenditure + Weight Trend (Custom Dual Card Row) */}
                      <div className="grid grid-cols-2 gap-3">
                        
                        {/* CARD 1: EXPENDITURE */}
                        <button
                          onClick={() => setSubPage('expenditure')}
                          className="bg-white/45 border border-[#eef1f6]/70 backdrop-blur-xl rounded-3xl p-5 text-left flex flex-col justify-between transition-all w-full cursor-pointer group hover:border-[#00c08b]/50 shadow-sm"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[8.5px] font-extrabold text-slate-400 tracking-wider font-mono">EXPENDITURE</span>
                            <span className="text-[8px] bg-[#00c08b]/10 text-[#00c08b] font-bold border border-[#00c08b]/20 px-1.5 py-0.5 rounded-lg uppercase font-mono">Live TDEE</span>
                          </div>
                          <div className="my-3">
                            <p className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight leading-none group-hover:text-[#00c08b] transition-colors">
                              {Math.round(activeBaseTdee).toLocaleString()}
                            </p>
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1">kcal / daily energy</p>
                          </div>
                          <div className="pt-2 border-t border-[#f4f7fa] flex items-center justify-between w-full">
                            <span className="text-[8.5px] font-medium text-slate-450 uppercase font-sans">BMR {bmrValue} kcal &bull; Calibrated</span>
                            <ArrowLeft className="h-3.5 w-3.5 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </button>

                        {/* CARD 2: WEIGHT TREND */}
                        <button
                          onClick={() => setSubPage('weight_trend')}
                          className="bg-slate-900/40 border border-slate-800/45 backdrop-blur-xl text-white rounded-3xl p-5 text-left flex flex-col justify-between transition-all w-full cursor-pointer group hover:bg-slate-900/60 hover:border-[#00c08b]/55 shadow-sm"
                        >
                          <div className="flex justify-between items-center w-full bg-transparent">
                            <span className="text-[8.5px] font-extrabold text-slate-400 tracking-wider font-mono">WEIGHT TREND</span>
                            <span className="text-[8px] bg-slate-800 text-slate-300 font-bold border border-slate-700 px-1.5 py-0.5 rounded-lg uppercase font-mono">Progression</span>
                          </div>
                          <div className="my-3 font-mono">
                            <p className="text-3xl font-extrabold text-white tracking-tight leading-none group-hover:text-[#00c08b] transition-colors">
                              {profile.weight}{' '}
                              <span className="text-xs text-slate-500 font-bold uppercase">{profile.unitSystem === 'metric' ? 'kg' : 'lbs'}</span>
                            </p>
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1 font-sans">
                              BMI {bmiAnalytics.bmi.toFixed(1)} &bull; {bmiAnalytics.category}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between w-full">
                            <span className="text-[8.5px] font-medium text-[#00c08b] uppercase">Weight logs synced</span>
                            <ArrowLeft className="h-3.5 w-3.5 text-slate-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </button>

                      </div>

                      {/* Row D: SEPARATE NUTRITION SECTION HEADER */}
                      <div className="flex items-center gap-2 mt-2">
                        <Apple className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-sans">Питание / Nutrition</h3>
                      </div>

                      {/* Row E: Calories + Protein + Carbs + Fats (4 individual mini cards) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        
                        {/* CALORIES */}
                        <button
                          onClick={() => setSubPage('calories')}
                          className="bg-white/45 border border-[#eef1f6]/70 backdrop-blur-xl rounded-3xl p-4 text-left flex flex-col justify-between transition-all w-full cursor-pointer group hover:border-[#00c08b]/50 shadow-sm font-sans"
                        >
                          <span className="text-[8px] font-black text-[#00c08b] font-mono uppercase">CALORIES</span>
                          <div className="my-2.5 font-mono">
                            <p className="text-2xl font-black text-slate-950 block">{todayTotals.calories}</p>
                            <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {targetCalories} target</p>
                          </div>
                          <div className="w-full bg-slate-100/50 h-1 rounded-full overflow-hidden">
                            <div className="bg-[#00c08b] h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.calories / targetCalories) * 100)}%` }} />
                          </div>
                        </button>

                        {/* PROTEIN */}
                        <button
                          onClick={() => setSubPage('protein')}
                          className="bg-white/45 border border-[#eef1f6]/70 backdrop-blur-xl rounded-3xl p-4 text-left flex flex-col justify-between transition-all w-full cursor-pointer group hover:border-rose-500/50 shadow-sm font-sans"
                        >
                          <span className="text-[8px] font-black text-rose-500 font-mono uppercase">PROTEIN</span>
                          <div className="my-2.5 font-mono">
                            <p className="text-2xl font-black text-slate-950 block">{Math.round(todayTotals.protein)}g</p>
                            <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {macroTargets.proteinGrams}g target</p>
                          </div>
                          <div className="w-full bg-slate-100/50 h-1 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.protein / macroTargets.proteinGrams) * 100)}%` }} />
                          </div>
                        </button>

                        {/* CARBS */}
                        <button
                          onClick={() => setSubPage('carbs')}
                          className="bg-white/45 border border-[#eef1f6]/70 backdrop-blur-xl rounded-3xl p-4 text-left flex flex-col justify-between transition-all w-full cursor-pointer group hover:border-amber-500/50 shadow-sm font-sans"
                        >
                          <span className="text-[8px] font-black text-amber-500 font-mono uppercase font-sans">CARBS</span>
                          <div className="my-2.5 font-mono">
                            <p className="text-2xl font-black text-slate-950 block">{Math.round(todayTotals.carbs)}g</p>
                            <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {macroTargets.carbGrams}g target</p>
                          </div>
                          <div className="w-full bg-slate-100/50 h-1 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.carbs / macroTargets.carbGrams) * 100)}%` }} />
                          </div>
                        </button>

                        {/* FATS */}
                        <button
                          onClick={() => setSubPage('fats')}
                          className="bg-white/45 border border-[#eef1f6]/70 backdrop-blur-xl rounded-3xl p-4 text-left flex flex-col justify-between transition-all w-full cursor-pointer group hover:border-sky-500/50 shadow-sm font-sans"
                        >
                          <span className="text-[8px] font-black text-sky-500 font-mono uppercase">FAT</span>
                          <div className="my-2.5 font-mono">
                            <p className="text-2xl font-black text-slate-950 block">{Math.round(todayTotals.fat)}g</p>
                            <p className="text-[8px] text-slate-400 uppercase tracking-wide mt-0.5">/ {macroTargets.fatGrams}g target</p>
                          </div>
                          <div className="w-full bg-slate-100/50 h-1 rounded-full overflow-hidden">
                            <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(100, (todayTotals.fat / macroTargets.fatGrams) * 100)}%` }} />
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* REDIRECT SUB-PAGES ACCORDING TO USER'S DIRECT CLICK MAP */
                <div className={`rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col gap-6 border transition-all duration-200 backdrop-blur-xl ${
                  isActive 
                    ? 'bg-[#121624]/20 border-[#1e253c]/35 text-white shadow-md' 
                    : 'bg-white/45 border-[#eef1f6]/70 text-slate-800'
                }`}>
                  
                  {/* Common Back navigation elements on sub-views */}
                  <div className={`flex items-center justify-between border-b pb-4 font-mono ${
                    isActive ? 'border-slate-800/80' : 'border-[#f4f7fa]'
                  }`}>
                    <button
                      onClick={() => setSubPage('none')}
                      className={`flex items-center gap-1.5 text-xs font-black uppercase transition-colors cursor-pointer ${
                        isActive ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'
                      }`}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>{lang === 'ru' ? 'Назад на Дашборд' : 'Back to Dashboard'}</span>
                    </button>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase">MacroFactor Calibration View</span>
                  </div>

                  {/* SUBPAGE 1: METABOLIC EXPENDITURE / TDEE DETAILS */}
                  {subPage === 'expenditure' && (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-1 col-span-1">
                        <span className="text-[9px] font-black text-[#00c08b] uppercase font-mono tracking-widest">SUBPAGE DETAILED OVERVIEW</span>
                        <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-2 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          <Flame className="h-6 w-6 text-[#00c08b]" />
                          {lang === 'ru' ? 'Расход энергии / Energy Expenditure' : 'Energy Expenditure'}
                        </h2>
                        <p className={`text-xs ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>How your body metabolizes active energy, calculated via theoretical standards & live calibration.</p>
                      </div>

                      {/* Prime comparative metrics row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`rounded-2xl p-5 border flex flex-col justify-between transition-colors ${
                          isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-slate-900 border-slate-950 text-white'
                        }`}>
                          <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Estimated Active TDEE</span>
                          <div className="my-3 font-mono">
                            <span className="text-5xl font-bold text-[#00c08b] block">{Math.round(activeBaseTdee)} kcal</span>
                            <span className="text-[10px] text-slate-400 block mt-1 font-bold">Dynamic Metabolic Baseline</span>
                          </div>
                          <p className={`text-[10px] leading-relaxed font-semibold ${isActive ? 'text-slate-400' : 'text-slate-300'}`}>
                            Calculated dynamically. {adaptiveResults.hasEnoughData ? 'Calculated from prior logs change.' : `Using theoretical standards calibrated. Maintain consistency to unlock real live adaptive tracking!`}
                          </p>
                        </div>

                        <div className={`rounded-3xl p-5 border flex flex-col justify-between shadow-xs transition-colors ${
                          isActive ? 'bg-[#181d2f] border-[#2c3654]' : 'bg-slate-50 border-[#eef1f6]'
                        }`}>
                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider ${isActive ? 'text-slate-400' : 'text-slate-505'}`}>Calibration Formulas Baseline</span>
                          <div className={`my-3 flex flex-col gap-2 font-mono text-xs ${isActive ? 'text-slate-350' : 'text-slate-700'}`}>
                            <div className="flex justify-between items-center">
                              <span className="font-bold">Mifflin-St Jeor:</span>
                              <span className={`font-extrabold ${isActive ? 'text-white' : 'text-slate-950'}`}>{theoreticalTdee} kcal</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-700">
                              <span className={`font-bold ${isActive ? 'text-slate-300' : 'text-slate-700'}`}>Basal Metabolic (BMR):</span>
                              <span className={`font-extrabold ${isActive ? 'text-white' : 'text-slate-950'}`}>{bmrValue} kcal</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-700">
                              <span className={`font-bold ${isActive ? 'text-slate-300' : 'text-slate-700'}`}>Active sex:</span>
                              <span className={`font-extrabold uppercase ${isActive ? 'text-white' : 'text-slate-950'}`}>{profile.gender}</span>
                            </div>
                          </div>
                          <p className={`text-[9px] leading-relaxed uppercase font-mono font-bold ${isActive ? 'text-slate-450' : 'text-slate-450'}`}>
                            Ref: formulas are dependent on target bodyweight ({profile.weight} {profile.unitSystem === 'metric' ? 'kg':'lbs'}) & age ({profile.age} Yrs).
                          </p>
                        </div>
                      </div>

                      {/* Formula Side-By-Side Comparison Grid */}
                      <div className={`border p-5 rounded-3xl flex flex-col gap-3 font-mono shadow-xs transition-colors ${
                        isActive ? 'bg-[#181d2f]/50 border-[#232d4b]' : 'bg-slate-50 border-[#eef1f6]'
                      }`}>
                        <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest block font-mono">FORMULA STANDARD BASES (BMR ESTIMATES)</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className={`p-3.5 rounded-2xl border shadow-xs transition-colors ${
                            isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-white border-[#eef1f6]'
                          }`}>
                            <span className="text-[8px] font-extrabold text-[#00c08b] block uppercase">Mifflin-St Jeor</span>
                            <span className={`text-lg font-black block mt-1 ${isActive ? 'text-white' : 'text-slate-950'}`}>{bmrValue} kcal</span>
                            <span className="text-[7.5px] text-slate-400 mt-1 block font-bold">Default robust standard</span>
                          </div>
                          <div className={`p-3.5 rounded-2xl border shadow-xs transition-colors ${
                            isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-white border-[#eef1f6]'
                          }`}>
                            <span className="text-[8px] font-extrabold text-blue-500 block uppercase">Revised Harris-Benedict</span>
                            <span className={`text-lg font-black block mt-1 ${isActive ? 'text-white' : 'text-slate-950'}`}>
                              {Math.round(
                                profile.gender === 'male'
                                  ? 13.397 * weightKg + 4.799 * heightCm - 5.677 * profile.age + 88.362
                                  : 9.247 * weightKg + 3.098 * heightCm - 4.33 * profile.age + 447.593
                              )} kcal
                            </span>
                            <span className="text-[7.5px] text-slate-400 mt-1 block font-bold">Refined physical standard</span>
                          </div>
                          <div className={`p-3.5 rounded-2xl border shadow-xs transition-colors ${
                            isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-white border-[#eef1f6]'
                          }`}>
                            <span className="text-[8px] font-extrabold text-purple-500 block uppercase">Katch-McArdle</span>
                            <span className={`text-lg font-black block mt-1 ${isActive ? 'text-white' : 'text-slate-950'}`}>
                              {profile.bodyFat && profile.bodyFat > 0
                                ? `${Math.round(370 + 21.6 * (weightKg * (1 - profile.bodyFat / 100)))}`
                                : 'Needs Body Fat %'}
                            </span>
                            <span className="text-[7.5px] text-slate-400 mt-1 block font-bold">Lean Body Mass calculation</span>
                          </div>
                        </div>
                      </div>

                      {/* Expenditure FAQ section */}
                      <div className="flex flex-col gap-3 pt-2 col-span-1">
                        <h4 className={`text-xs font-black uppercase tracking-wider font-mono ${isActive ? 'text-white' : 'text-slate-900'}`}>FAQ - Как это работает / Calculated FAQ</h4>
                        <div className="space-y-2 text-xs leading-relaxed">
                          <div className={`p-3 border rounded-xl transition-colors ${
                            isActive ? 'bg-[#181d2f]/40 border-[#232d4b] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <p className={`font-extrabold ${isActive ? 'text-white' : 'text-slate-950'}`}>Как рассчитывается расход энергии?</p>
                            <p className="mt-1">Мы берем параметры вашего тела (пол, возраст, рост, вес) и применяем научно доказанные формулы для расчета базового обмена веществ (BMR). Умножая его на коэффициент вашей активности, мы получаем теоретический расход калорий (TDEE).</p>
                          </div>
                          <div className={`p-3 border rounded-xl transition-colors ${
                            isActive ? 'bg-[#181d2f]/40 border-[#232d4b] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <p className={`font-extrabold ${isActive ? 'text-white' : 'text-slate-950'}`}>В чем разница между расчетным и адаптивным расходом?</p>
                            <p className="mt-1">Расчетный TDEE берется исключительно по математической формуле. Адаптивный TDEE учитывает ваши ежедневные взвешивания и количество съеденных калорий. Если вы худеете медленнее, чем предсказывает математика — система понижает ваш TDEE; если быстрее — повышает. Это и есть калибровка под ваш реальный метаболизм!</p>
                          </div>
                          <div className={`p-3 border rounded-xl transition-colors ${
                            isActive ? 'bg-[#181d2f]/40 border-[#232d4b] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <p className={`font-extrabold ${isActive ? 'text-white' : 'text-slate-950'}`}>Зачем нужно вести дневник регулярно?</p>
                            <p className="mt-1">Адаптивный алгоритм требует от 7 до 14 дней непрерывных логов питания и веса. Чем точнее и регулярнее вы записываете свои приемы пищи, тем более точным будет оценка вашего личного метаболизма, без догадок.</p>
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
                        <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-2 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          <Scale className="h-6 w-6 text-indigo-550" />
                          {lang === 'ru' ? 'Аналитика тренда веса' : 'Weight Trend Analytics'}
                        </h2>
                        <p className={`text-xs ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>Analyze raw fluctuations smoothed into real-time bodyweight trends and predicted trajectory slopes.</p>
                      </div>

                      {/* Interactive range controllers */}
                      <div className={`flex gap-2 p-1 rounded-xl w-max self-start font-mono text-[10px] sm:text-xs border ${
                        isActive ? 'bg-[#1b2238] border-[#293250]' : 'bg-slate-100 border-slate-200'
                      }`}>
                        {['7d', '30d', '1y'].map((per) => {
                          const isSel = timePeriod === per;
                          return (
                            <button
                              key={per}
                              onClick={() => setTimePeriod(per as any)}
                              className={`px-3 py-1.5 rounded-lg font-black uppercase text-center cursor-pointer transition-all ${
                                isSel 
                                  ? isActive 
                                    ? 'bg-blue-600 text-white shadow' 
                                    : 'bg-slate-900 text-white shadow' 
                                  : isActive 
                                    ? 'text-slate-400 hover:text-white' 
                                    : 'text-slate-600 hover:text-slate-900'
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
                      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border rounded-xl font-mono text-center transition-colors ${
                        isActive ? 'bg-[#181d2f] border-[#283251]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">Average Weight</span>
                          <span className={`text-lg font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>{periodStats.avg} {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">Range Delta</span>
                          <span className={`text-lg font-bold ${periodStats.delta > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {periodStats.delta > 0 ? `+${periodStats.delta}` : periodStats.delta} {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">Starting weight</span>
                          <span className={`text-md font-medium ${isActive ? 'text-slate-300' : 'text-slate-700'}`}>{periodStats.start} {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">End weight</span>
                          <span className={`text-md font-medium ${isActive ? 'text-slate-300' : 'text-slate-700'}`}>{periodStats.end} {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}</span>
                        </div>
                      </div>

                      {/* RECHARTS DUAL LINE CORES */}
                      <div className={`border rounded-xl p-3 h-64 sm:h-80 select-none transition-colors ${
                        isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-white border-slate-200'
                      }`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isActive ? '#1f2538' : '#f1f5f9'} />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <Tooltip
                              contentStyle={{ 
                                fontFamily: 'monospace', 
                                fontSize: '11px', 
                                borderRadius: '12px', 
                                backgroundColor: isActive ? '#121727' : '#ffffff', 
                                borderColor: isActive ? '#2b3552' : '#e2e8f0', 
                                color: isActive ? '#ffffff' : '#0f172a',
                                boxShadow: 'none' 
                              }}
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
                      <div className={`border rounded-xl p-3.5 flex flex-col gap-2 font-mono text-xs transition-colors ${
                        isActive ? 'bg-[#181d2f]/50 border-[#2b3552]' : 'bg-slate-50 border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-1.5 font-extrabold uppercase">
                          <Info className="h-4 w-4 text-purple-500" />
                          <span className={isActive ? 'text-white' : 'text-slate-900'}>{lang === 'ru' ? 'Совет по анализу тренда' : 'Trend Smoothing Advice'}</span>
                        </div>
                        <p className={`leading-relaxed text-[11px] ${isActive ? 'text-slate-300' : 'text-slate-650'}`}>
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
                        <span className="text-[9px] font-black text-[#00c08b] uppercase font-mono tracking-widest">NUTRITION TRACKS</span>
                        <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-2 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          <Flame className="h-6 w-6 text-[#00c08b]" />
                          {lang === 'ru' ? 'Калории за период' : 'Calories Intake History'}
                        </h2>
                        <p className={`text-xs ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>Track daily logged food calories relative to budget parameters.</p>
                      </div>

                      <div className={`flex gap-2 p-1 rounded-xl w-max self-start font-mono text-[10px] sm:text-xs border transition-colors ${
                        isActive ? 'bg-[#1b2238] border-[#293250]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        {['7d', '30d', '1y'].map((per) => (
                          <button
                            key={per}
                            onClick={() => setTimePeriod(per as any)}
                            className={`px-3 py-1.5 rounded-lg font-bold uppercase text-center cursor-pointer transition-all ${
                              timePeriod === per 
                                ? isActive ? 'bg-blue-600 text-white shadow' : 'bg-[#00c08b] text-white shadow' 
                                : isActive ? 'text-slate-400 hover:text-white' : 'text-slate-650 hover:text-slate-900'
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

                      <div className={`grid grid-cols-2 gap-3 p-4 border rounded-xl font-mono text-center transition-colors ${
                        isActive ? 'bg-[#181d2f] border-[#252c42]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Ср. за период' : 'Period Avg'}</span>
                          <span className={`text-lg font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>{caloriePeriodStats.avg.toLocaleString()} kcal</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Цель' : 'Daily Target'}</span>
                          <span className={`text-lg font-bold ${isActive ? 'text-[#00c08b]' : 'text-slate-500'}`}>{targetCalories.toLocaleString()} kcal</span>
                        </div>
                      </div>

                      <div className={`border rounded-xl p-3 h-64 sm:h-80 select-none transition-colors ${
                        isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-white border-slate-200'
                      }`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={caloriePeriodData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isActive ? '#1f2538' : '#f1f5f9'} />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <YAxis stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <Tooltip contentStyle={{ 
                              fontFamily: 'monospace', 
                              fontSize: '11px', 
                              borderRadius: '12px', 
                              backgroundColor: isActive ? '#121727' : '#ffffff', 
                              borderColor: isActive ? '#2b3552' : '#e2e8f0', 
                              color: isActive ? '#ffffff' : '#0f172a',
                              boxShadow: 'none' 
                            }} />
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
                        <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-2 font-sans ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          <Zap className="h-6 w-6 text-rose-500" />
                          {lang === 'ru' ? 'Детали белка' : 'Protein Logging Details'}
                        </h2>
                        <p className={`text-xs ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>Daily structural reconstruction metrics and protein completions.</p>
                      </div>

                      <div className={`flex gap-2 p-1 rounded-xl w-max self-start font-mono text-[10px] border transition-colors ${
                        isActive ? 'bg-[#1b2238] border-[#293250]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        {['7d', '30d'].map((per) => (
                          <button
                            key={per}
                            onClick={() => setTimePeriod(per as any)}
                            className={`px-3 py-1.5 rounded-lg font-bold uppercase text-center cursor-pointer transition-all ${
                              timePeriod === per 
                                ? isActive ? 'bg-blue-600 text-white shadow' : 'bg-[#00c08b] text-white shadow' 
                                : isActive ? 'text-slate-400 hover:text-white' : 'text-slate-650 hover:text-slate-900'
                            }`}
                          >
                            {per === '7d' ? (lang === 'ru' ? '7 дней' : '7 Days') : (lang === 'ru' ? '30 дней' : '30 Days')}
                          </button>
                        ))}
                      </div>

                      <div className={`grid grid-cols-2 gap-3 p-4 border rounded-xl font-mono text-center transition-colors ${
                        isActive ? 'bg-[#181d2f] border-[#252c42]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Ср. за период' : 'Period Avg'}</span>
                          <span className={`text-lg font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>{macroPeriodStats.proteinAvg} g</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Цель' : 'Target'}</span>
                          <span className={`text-lg font-bold ${isActive ? 'text-[#00c08b]' : 'text-slate-500'}`}>{macroTargets.proteinGrams} g</span>
                        </div>
                      </div>

                      <div className={`border rounded-xl p-3 h-64 sm:h-80 select-none transition-colors ${
                        isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-white border-slate-200'
                      }`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={caloriePeriodData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isActive ? '#1f2538' : '#f1f5f9'} />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <YAxis stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <Tooltip contentStyle={{ 
                              fontFamily: 'monospace', 
                              fontSize: '11px', 
                              borderRadius: '12px', 
                              backgroundColor: isActive ? '#121727' : '#ffffff', 
                              borderColor: isActive ? '#2b3552' : '#e2e8f0', 
                              color: isActive ? '#ffffff' : '#0f172a',
                              boxShadow: 'none' 
                            }} />
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
                        <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-2 font-sans ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          <Zap className="h-6 w-6 text-amber-500" />
                          {lang === 'ru' ? 'Детали углеводов' : 'Carbs Log Details'}
                        </h2>
                        <p className={`text-xs ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>Glycogen reserve balances logged relative to target budgets.</p>
                      </div>

                      <div className={`flex gap-2 p-1 rounded-xl w-max self-start font-mono text-[10px] border transition-colors ${
                        isActive ? 'bg-[#1b2238] border-[#293250]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        {['7d', '30d'].map((per) => (
                          <button
                            key={per}
                            onClick={() => setTimePeriod(per as any)}
                            className={`px-3 py-1.5 rounded-lg font-bold uppercase text-center cursor-pointer transition-all ${
                              timePeriod === per 
                                ? isActive ? 'bg-blue-600 text-white shadow' : 'bg-[#00c08b] text-white shadow' 
                                : isActive ? 'text-slate-400 hover:text-white' : 'text-slate-650 hover:text-slate-900'
                            }`}
                          >
                            {per === '7d' ? (lang === 'ru' ? '7 дней' : '7 Days') : (lang === 'ru' ? '30 дней' : '30 Days')}
                          </button>
                        ))}
                      </div>

                      <div className={`grid grid-cols-2 gap-3 p-4 border rounded-xl font-mono text-center transition-colors ${
                        isActive ? 'bg-[#181d2f] border-[#252c42]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Ср. за период' : 'Period Avg'}</span>
                          <span className={`text-lg font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>{macroPeriodStats.carbsAvg} g</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Цель' : 'Target'}</span>
                          <span className={`text-lg font-bold ${isActive ? 'text-[#00c08b]' : 'text-slate-500'}`}>{macroTargets.carbGrams} g</span>
                        </div>
                      </div>

                      <div className={`border rounded-xl p-3 h-64 sm:h-80 select-none transition-colors ${
                        isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-white border-slate-200'
                      }`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={caloriePeriodData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isActive ? '#1f2538' : '#f1f5f9'} />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <YAxis stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <Tooltip contentStyle={{ 
                              fontFamily: 'monospace', 
                              fontSize: '11px', 
                              borderRadius: '12px', 
                              backgroundColor: isActive ? '#121727' : '#ffffff', 
                              borderColor: isActive ? '#2b3552' : '#e2e8f0', 
                              color: isActive ? '#ffffff' : '#0f172a',
                              boxShadow: 'none' 
                            }} />
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
                        <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-2 font-sans ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          <Zap className="h-6 w-6 text-sky-500" />
                          {lang === 'ru' ? 'Детали жиров' : 'Lipids Log Details'}
                        </h2>
                        <p className={`text-xs ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>Daily lipid balances and healthy fatty acids percentages.</p>
                      </div>

                      <div className={`flex gap-2 p-1 rounded-xl w-max self-start font-mono text-[10px] border transition-colors ${
                        isActive ? 'bg-[#1b2238] border-[#293250]' : 'bg-slate-50 border-slate-205'
                      }`}>
                        {['7d', '30d'].map((per) => (
                          <button
                            key={per}
                            onClick={() => setTimePeriod(per as any)}
                            className={`px-3 py-1.5 rounded-lg font-bold uppercase text-center cursor-pointer transition-all ${
                              timePeriod === per 
                                ? isActive ? 'bg-blue-600 text-white shadow' : 'bg-[#00c08b] text-white shadow' 
                                : isActive ? 'text-slate-400 hover:text-white' : 'text-slate-650 hover:text-slate-900'
                            }`}
                          >
                            {per === '7d' ? (lang === 'ru' ? '7 дней' : '7 Days') : (lang === 'ru' ? '30 дней' : '30 Days')}
                          </button>
                        ))}
                      </div>

                      <div className={`grid grid-cols-2 gap-3 p-4 border rounded-xl font-mono text-center transition-colors ${
                        isActive ? 'bg-[#181d2f] border-[#252c42]' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Ср. за период' : 'Period Avg'}</span>
                          <span className={`text-lg font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>{macroPeriodStats.fatAvg} g</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">{lang === 'ru' ? 'Цель' : 'Target'}</span>
                          <span className={`text-lg font-bold ${isActive ? 'text-[#00c08b]' : 'text-slate-500'}`}>{macroTargets.fatGrams} g</span>
                        </div>
                      </div>

                      <div className={`border rounded-xl p-3 h-64 sm:h-80 select-none transition-colors ${
                        isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-white border-slate-200'
                      }`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={caloriePeriodData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isActive ? '#1f2538' : '#f1f5f9'} />
                            <XAxis dataKey="formattedDate" stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <YAxis stroke="#94a3b8" fontSize={9} fontClass="font-mono" />
                            <Tooltip contentStyle={{ 
                              fontFamily: 'monospace', 
                              fontSize: '11px', 
                              borderRadius: '12px', 
                              backgroundColor: isActive ? '#121727' : '#ffffff', 
                              borderColor: isActive ? '#2b3552' : '#e2e8f0', 
                              color: isActive ? '#ffffff' : '#0f172a',
                              boxShadow: 'none' 
                            }} />
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
              className={`border p-5 sm:p-7 font-mono shadow-sm rounded-3xl transition-colors ${
                isActive ? 'bg-[#121624] border-[#1e253c] text-white' : 'bg-white border-[#eef1f6]'
              }`}
            >
              <div className={`flex flex-col gap-1 border-b pb-3 mb-4 ${isActive ? 'border-[#1e253c]' : 'border-[#f4f7fa]'}`}>
                <span className="text-[9px] font-bold tracking-widest text-blue-400 block uppercase">DIETING ROADMAPS</span>
                <h2 className={`text-lg font-bold uppercase tracking-tight flex items-center gap-2 font-sans font-black ${
                  isActive ? 'text-white' : 'text-slate-900'
                }`}>
                  <Flame className="h-5.5 w-5.5 text-blue-500" />
                  {lang === 'ru' ? 'Моя стратегия диеты' : 'Strategy & Diet Goals'}
                </h2>
                <p className={`text-xs ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>Review recommendations on macro-splitting targets & physical stages calibration.</p>
              </div>

              <div className="mt-6 flex flex-col gap-3 text-xs">
                <h3 className={`text-xs font-black uppercase flex items-center gap-1.5 border-b pb-2 font-bold ${
                  isActive ? 'text-slate-200 border-[#1e253c]' : 'text-slate-955 border-[#f4f7fa]'
                }`}>
                  <Info className="h-4 w-4 text-[#00c08b]" />
                  {lang === 'ru' ? 'Вопросы и ответы по стратегии' : 'Strategy FAQ Guide'}
                </h3>

                <div className="space-y-2">
                  <details className={`border rounded-2xl p-3.5 transition-colors group cursor-pointer font-bold ${
                    isActive ? 'border-[#1e253c] bg-[#0c101d] hover:bg-[#121727]' : 'border-[#eef1f6] bg-slate-50/50 hover:bg-slate-50/70'
                  }`}>
                    <summary className={`font-extrabold flex justify-between items-center outline-none list-none cursor-pointer ${
                      isActive ? 'text-white' : 'text-slate-905'
                    }`}>
                      <span>{lang === 'ru' ? 'Какую фазу (цель) мне выбрать?' : 'Which phase should I choose?'}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className={`mt-2 leading-relaxed font-sans font-medium ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>
                      {lang === 'ru' 
                        ? 'Если ваша цель — избавиться от лишнего жира, выберите Cut (Дефицит) (медленный или умеренный для сохранения мышц). Если вы хотите набрать мышечную массу — выберите Bulk (Профицит). Для закрепления веса и рекомпозиции выберите Maintain (Поддержание).'
                        : 'If your goal is to lose weight or fat, choose Cut (Deficit) - slow or moderate styles are recommended to preserve muscular tissues. If you seek lean gains, select Bulk. For body recomposition and maintenance phase, select Maintain.'
                      }
                    </p>
                  </details>

                  <details className={`border rounded-2xl p-3.5 transition-colors group cursor-pointer font-bold ${
                    isActive ? 'border-[#1e253c] bg-[#0c101d] hover:bg-[#121727]' : 'border-[#eef1f6] bg-slate-50/50 hover:bg-slate-50/70'
                  }`}>
                    <summary className={`font-extrabold flex justify-between items-center outline-none list-none cursor-pointer ${
                      isActive ? 'text-white' : 'text-slate-905'
                    }`}>
                      <span>{lang === 'ru' ? 'Почему важен высокий белок?' : 'Why is a high-protein intake critical?'}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className={`mt-2 leading-relaxed font-sans font-medium ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>
                      {lang === 'ru'
                        ? 'Белок является главным строительным макронутриентом. На дефиците калорий повышенный белок предотвращает распад мышечных волокон, а на профиците способствует их эффективному росту.'
                        : 'Protein acts as the primary building element for muscle tissue. Under a caloric deficit, elevated protein preserves lean muscle tissue from breakdown; under a surplus, it leverages accelerated hypertrophy.'
                      }
                    </p>
                  </details>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: SYSTEM SETTINGS WITH SELECTABLE CUSTOM FONTS */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              <SettingsPanel
                profile={profile}
                logs={logs}
                foodLogs={foodLogs}
                onUpdateProfile={onUpdateProfile}
                onUpdateLogs={onUpdateLogs}
                onUpdateFoodLogs={onUpdateFoodLogs}
                adaptiveResults={adaptiveResults}
                theoreticalTdee={theoreticalTdee}
                gdriveClientId={gdriveClientId}
                setGdriveClientId={setGdriveClientId}
                gdriveStatus={gdriveStatus}
                gdriveError={gdriveError}
                gdriveBackupId={gdriveBackupId}
                gdriveLastBackup={gdriveLastBackup}
                isGdriveSyncing={isGdriveSyncing}
                copiedUri={copiedUri}
                setCopiedUri={setCopiedUri}
                handleGDriveConnect={handleGDriveConnect}
                handleGDriveUpload={handleGDriveUpload}
                handleGDriveDownload={handleGDriveDownload}
                handleGDriveDisconnect={handleGDriveDisconnect}
              />
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
            className={`mx-1 h-10 w-10 rounded-full text-white flex items-center justify-center cursor-pointer transition-transform hover:scale-105 select-none relative -top-2 ${
              isActive ? 'bg-[#00c08b] hover:bg-[#00ab7c]' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            title="Log weight or custom meal items"
          >
            <Plus className="h-5.5 w-5.5 stroke-[3px] text-white" />
          </button>

          {/* Right Core Tabs */}
          {tabList.slice(2).map((tab) => {
            const active = activeTab === tab.id;
            const tabActiveColor = isActive ? 'text-[#00c08b]' : 'text-blue-600';
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
                    ? `font-bold ${tabActiveColor}`
                    : 'text-slate-400 hover:text-slate-905'
                }`}
              >
                <span className={active ? `${tabActiveColor} stroke-[2.5px]` : 'text-slate-600'}>{tab.icon}</span>
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
          className={`flex h-12 w-12 items-center justify-center text-white rounded-full select-none cursor-pointer hover:scale-105 transition-all shadow-md ${
            isActive ? 'bg-[#00c08b] hover:bg-[#00ab7c]' : 'bg-blue-600 hover:bg-blue-700'
          }`}
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
              className={`border rounded-3xl w-full max-w-sm p-6 relative z-10 font-mono shadow-xl transition-all ${
                isActive ? 'bg-[#121624] border-[#1e253c] text-white font-sans' : 'bg-white border-[#eef1f6] text-slate-800'
              }`}
            >
              <div className={`flex justify-between items-center pb-2.5 border-b ${isActive ? 'border-[#1e253c]' : 'border-slate-100'}`}>
                <span className={`text-xs font-bold uppercase ${isActive ? 'text-slate-200 font-sans' : 'text-slate-800'}`}>{lang === 'ru' ? 'Что добавить?' : 'Log Options'}</span>
                <button
                  onClick={() => setIsPlusOpen(false)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    isActive ? 'hover:bg-[#1a2033] text-slate-400 hover:text-white' : 'hover:bg-slate-150 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                {/* Weight Option */}
                <button
                  onClick={() => handlePlusActionClick('weight')}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border font-semibold text-xs uppercase text-left transition-colors cursor-pointer ${
                    isActive 
                      ? 'border-[#232c45] bg-[#1a2035]/80 hover:bg-[#1f264d]/90' 
                      : 'border-indigo-100/30 bg-indigo-50/40 hover:bg-indigo-50/80'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg shrink-0 border ${isActive ? 'bg-[#0f1220] border-[#1e253c]' : 'bg-indigo-100/70 border-indigo-200'}`}>
                    <Scale className={`h-4 w-4 stroke-[2.5px] ${isActive ? 'text-indigo-400' : 'text-indigo-900'}`} />
                  </span>
                  <div>
                    <span className={`font-bold text-xs ${isActive ? 'text-white font-sans' : 'text-slate-900'}`}>{lang === 'ru' ? 'Внести вес' : 'Log Weight'}</span>
                    <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-tight">
                      {lang === 'ru' ? 'Записать утренний вес' : 'Register morning weigh-in'}
                    </p>
                  </div>
                </button>

                {/* Breakfast Option */}
                <button
                  onClick={() => handlePlusActionClick('breakfast')}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border font-semibold text-xs uppercase text-left transition-colors cursor-pointer ${
                    isActive 
                      ? 'border-[#232c45] bg-[#1a2035]/80 hover:bg-[#1f264d]/90' 
                      : 'border-[#00c08b]/20 bg-[#00c08b]/5 hover:bg-[#00c08b]/10'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg shrink-0 border ${isActive ? 'bg-[#0f1220] border-[#1e253c]' : 'bg-[#00c08b]/15 border-[#00c08b]/25'}`}>
                    <Utensils className={`h-4 w-4 stroke-[2.5px] ${isActive ? 'text-[#00c08b]' : 'text-[#00c08b]'}`} />
                  </span>
                  <div>
                    <span className={`font-bold text-xs ${isActive ? 'text-white font-sans' : 'text-slate-950'}`}>{lang === 'ru' ? 'Внести завтрак' : 'Breakfast'}</span>
                    <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-tight">
                      {lang === 'ru' ? 'Записать кашу, омлет или еду' : 'Add cereals, eggs or pancakes'}
                    </p>
                  </div>
                </button>

                {/* Lunch Option */}
                <button
                  onClick={() => handlePlusActionClick('lunch')}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border font-semibold text-xs uppercase text-left transition-colors cursor-pointer ${
                    isActive 
                      ? 'border-[#232c45] bg-[#1a2035]/80 hover:bg-[#1f264d]/90' 
                      : 'border-amber-100/30 bg-amber-50/40 hover:bg-amber-50/80'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg shrink-0 border ${isActive ? 'bg-[#0f1220] border-[#1e253c]' : 'bg-amber-100/70 border-amber-200'}`}>
                    <Utensils className={`h-4 w-4 stroke-[2.5px] ${isActive ? 'text-amber-400' : 'text-amber-900'}`} />
                  </span>
                  <div>
                    <span className={`font-bold text-xs ${isActive ? 'text-white font-sans' : 'text-slate-900'}`}>{lang === 'ru' ? 'Внести обед' : 'Lunch'}</span>
                    <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-tight">
                      {lang === 'ru' ? 'Записать курицу, рис или салат' : 'Record chicken, rice or salad'}
                    </p>
                  </div>
                </button>

                {/* Dinner Option */}
                <button
                  onClick={() => handlePlusActionClick('dinner')}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border font-semibold text-xs uppercase text-left transition-colors cursor-pointer ${
                    isActive 
                      ? 'border-[#232c45] bg-[#1a2035]/80 hover:bg-[#1f264d]/90' 
                      : 'border-rose-100/30 bg-rose-50/40 hover:bg-rose-50/80'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg shrink-0 border ${isActive ? 'bg-[#0f1220] border-[#1e253c]' : 'bg-rose-100/70 border-rose-200'}`}>
                    <Utensils className={`h-4 w-4 stroke-[2.5px] ${isActive ? 'text-rose-450' : 'text-rose-900'}`} />
                  </span>
                  <div>
                    <span className={`font-bold text-xs ${isActive ? 'text-white font-sans' : 'text-slate-900'}`}>{lang === 'ru' ? 'Внести ужин' : 'Dinner'}</span>
                    <p className="text-[8.5px] text-slate-400 font-bold uppercase mt-1 leading-none tracking-tight">
                      {lang === 'ru' ? 'Записать стейк, рыбу или гарнир' : 'Log steak, salmon or grains'}
                    </p>
                  </div>
                </button>

                {/* Snack Option */}
                <button
                  onClick={() => handlePlusActionClick('snack')}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border font-semibold text-xs uppercase text-left transition-colors cursor-pointer ${
                    isActive 
                      ? 'border-[#232c45] bg-[#1a2035]/80 hover:bg-[#1f264d]/90' 
                      : 'border-sky-100/30 bg-sky-50/40 hover:bg-sky-50/80'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg shrink-0 border ${isActive ? 'bg-[#0f1220] border-[#1e253c]' : 'bg-sky-100/70 border-sky-200'}`}>
                    <Apple className={`h-4 w-4 stroke-[2.5px] ${isActive ? 'text-sky-400' : 'text-sky-900'}`} />
                  </span>
                  <div>
                    <span className={`font-bold text-xs ${isActive ? 'text-white font-sans' : 'text-slate-900'}`}>{lang === 'ru' ? 'Внести перекус' : 'Snack'}</span>
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
              className={`border rounded-3xl w-full max-w-sm p-6 sm:p-7 relative z-10 shadow-xl transition-all ${
                isActive ? 'bg-[#121624] border-[#1e253c] text-white font-sans' : 'bg-white border-[#eef1f6] text-slate-800 font-mono'
              }`}
            >
              <div className={`flex justify-between items-center pb-3 border-b mb-4 ${isActive ? 'border-[#1e253c]' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <Scale className={`h-5 w-5 ${isActive ? 'text-[#00c08b]' : 'text-indigo-600'}`} />
                  <span className={`text-sm font-bold uppercase ${isActive ? 'text-white' : 'text-slate-900'}`}>
                    {lang === 'ru' ? 'Внести вес' : 'Log Weight'}
                  </span>
                </div>
                <button
                  onClick={() => setIsWeightModalOpen(false)}
                  className={`p-1 rounded-lg cursor-pointer transition-colors ${
                    isActive ? 'hover:bg-[#1a2033] text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {weightSaveSuccess ? (
                <div className="py-6 text-center flex flex-col items-center justify-center gap-2">
                  <span className="text-3xl">🎉</span>
                  <p className={`text-sm font-bold uppercase ${isActive ? 'text-[#00c08b]' : 'text-slate-900'}`}>
                    {lang === 'ru' ? 'Вес успешно сохранен!' : 'Weight logged successfully!'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {lang === 'ru' ? 'TDEE модели пересчитывают метаболизм.' : 'TDEE models are synchronizing calibration.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={saveQuickWeight} className="flex flex-col gap-4">
                  
                  {/* Weight Value Input */}
                  <div className="flex flex-col gap-1.5">
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
                        className={`w-full border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-blue-500 ${
                          isActive 
                            ? 'bg-[#0c101d] border-[#1e253c] text-white focus:border-[#00c08b]' 
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                        placeholder="80.5"
                        autoFocus
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                        {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}
                      </span>
                    </div>
                  </div>

                  {/* Date Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">
                      {lang === 'ru' ? 'Дата записи' : 'Date'}
                    </label>
                    <input
                      type="date"
                      required
                      value={loggedWeightDate}
                      onChange={(e) => setLoggedWeightDate(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none font-mono ${
                        isActive 
                          ? 'bg-[#0c101d] border-[#1e253c] text-white focus:border-[#00c08b]' 
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Notes Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-550 uppercase">
                      {lang === 'ru' ? 'Заметки (опционально)' : 'Notes (optional)'}
                    </label>
                    <input
                      type="text"
                      value={loggedNotes}
                      onChange={(e) => setLoggedNotes(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                        isActive 
                          ? 'bg-[#0c101d] border-[#1e253c] text-white focus:border-[#00c08b]' 
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                      placeholder={lang === 'ru' ? 'Утреннее взвешивание' : 'Morning weigh-in'}
                    />
                  </div>

                  {/* Buttons */}
                  <button
                    type="submit"
                    className={`w-full py-2.5 text-white font-bold text-xs uppercase rounded-xl cursor-pointer transition-colors mt-2 ${
                      isActive ? 'bg-[#00c08b] hover:bg-[#00ab7c]' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
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
