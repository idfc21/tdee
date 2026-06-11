import { useState } from 'react';
import { UserBioProfile, DailyLog, FoodItemLog } from '../types';
import {
  calculateTheoreticalTDEE,
  calculateAdaptiveTDEE,
  calculateBMR,
  formatHeight,
  analyzeBMI,
  lbsToKg,
  inToCm
} from '../utils/calc';
import BioProfileForm from './BioProfileForm';
import MacroPlanner from './MacroPlanner';
import TdeeLogger from './TdeeLogger';
import MealPlanner from './MealPlanner';
import FoodDiary from './FoodDiary';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Zap,
  Flame,
  LineChart,
  Grid3X3,
  BookOpen,
  Apple,
  Settings,
  Dumbbell,
  ShieldAlert,
  HelpCircle,
  TrendingDown,
  Utensils
} from 'lucide-react';

interface DashboardOverviewProps {
  profile: UserBioProfile;
  logs: DailyLog[];
  foodLogs: FoodItemLog[];
  onUpdateProfile: (updated: UserBioProfile) => void;
  onUpdateLogs: (newLogs: DailyLog[]) => void;
  onAddFoodLog: (item: Omit<FoodItemLog, 'id'>) => void;
  onDeleteFoodLog: (id: string) => void;
  onClearFoodLogsForDate: (dateStr: string) => void;
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
}: DashboardOverviewProps) {
  const [activeTab, setActiveTab] = useState<'bio' | 'tracker' | 'diary' | 'diet' | 'meals'>('diary');

  const theoreticalTdee = calculateTheoreticalTDEE(profile);
  const adaptiveResults = calculateAdaptiveTDEE(logs, theoreticalTdee, profile.unitSystem);
  const bmiAnalytics = analyzeBMI(profile);

  // Compute metric inputs for calling calculateBMR safely
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
    calculateBMR(
      profile.gender,
      weightKg,
      heightCm,
      profile.age,
      profile.formula,
      profile.bodyFat
    )
  );

  const tabList = [
    {
      id: 'diary',
      label: 'Дневник / Diary',
      miniLabel: 'Дневник',
      desc: 'Add & count foods',
      icon: <Utensils className="h-5 w-5" />
    },
    {
      id: 'tracker',
      label: 'Прогресс / Tracker',
      miniLabel: 'Прогресс',
      desc: 'Weight & Adaptive TDEE',
      icon: <LineChart className="h-5 w-5" />
    },
    {
      id: 'diet',
      label: 'Макро / Diet',
      miniLabel: 'Макро',
      desc: 'Macros ratios & caloric levels',
      icon: <Zap className="h-5 w-5" />
    },
    {
      id: 'meals',
      label: 'Приемы / Meals',
      miniLabel: 'Приемы',
      desc: 'Timing allocation & diet',
      icon: <Apple className="h-5 w-5" />
    },
    {
      id: 'bio',
      label: 'Профиль / Specs',
      miniLabel: 'Профиль',
      desc: 'Formulas & BMI indicators',
      icon: <Compass className="h-5 w-5" />
    }
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 md:py-8 flex flex-col gap-6 md:gap-8 pb-24 md:pb-8">
      
      {/* Bento Grid Header Summary Row - Only displays on Tracker to save vertical space & scrolling */}
      {activeTab === 'tracker' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Hero Estimate Card: Adaptive TDEE (Takes 2 columns) */}
          <div className="col-span-1 md:col-span-2 bg-white border-2 border-slate-900 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] relative overflow-hidden transition-all hover:translate-y-[-2px]">
            <div className="flex justify-between items-start">
              <span className="px-3.5 py-1.5 bg-orange-100 text-orange-900 text-[10px] font-black tracking-widest rounded-full border-2 border-slate-900 uppercase font-mono">
                {adaptiveResults.hasEnoughData ? 'Adaptive Live Estimate' : 'Theoretical Engine'}
              </span>
              <span className="text-slate-400 font-mono text-[10px] italic hidden sm:inline-block">
                Ref: {profile.formula === 'mifflin' ? 'Mifflin-St Jeor' : 'Katch-McArdle'}
              </span>
            </div>
            <div className="my-5">
              <p className="text-5xl sm:text-6xl font-black text-slate-900 leading-none tracking-tight">
                {Math.round(adaptiveResults.currentTdee).toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm font-black text-slate-500 mt-2 uppercase tracking-wider">KCAL / DAILY ENERGY EXPENDITURE</p>
            </div>
            <div className="pt-4 border-t-2 border-dashed border-slate-200 flex gap-6 sm:gap-10">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase font-mono">BMR BASE</p>
                <p className="text-lg font-black text-slate-900">{bmrValue.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">kcal</span></p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase font-mono">MULTIPLIER</p>
                <p className="text-lg font-black text-slate-900">
                  {profile.activityLevel === 'sedentary' ? 'x1.2' :
                   profile.activityLevel === 'lightly_active' ? 'x1.375' :
                   profile.activityLevel === 'moderately_active' ? 'x1.55' :
                   profile.activityLevel === 'very_active' ? 'x1.725' : 'x1.9'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase font-mono">MATH TDEE</p>
                <p className="text-lg font-black text-slate-500">{theoreticalTdee.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">kcal</span></p>
              </div>
            </div>
          </div>

          {/* Current Weight / Physical Stats Block (1 column) */}
          <div className="col-span-1 bg-slate-900 text-white rounded-3xl p-6 flex flex-col justify-between shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 transition-all hover:translate-y-[-2px]">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase font-mono">BODY COMPOSITION</p>
              <span className="w-2.5 h-2.5 bg-emerald-450 rounded-full animate-pulse inline-block"></span>
            </div>
            <div className="my-4">
              <div className="text-4xl font-mono font-black tracking-tight text-white">
                {profile.weight}{' '}
                <span className="text-lg font-bold text-slate-400 uppercase">
                  {profile.unitSystem === 'metric' ? 'kg' : 'lbs'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                Height: {formatHeight(profile)}
              </p>
            </div>
            
            <div className="pt-3 border-t border-slate-800">
              <p className="text-[9px] font-bold text-slate-500 uppercase font-mono">INDEX ANALYTICS</p>
              <p className="text-xs font-bold text-emerald-450 block mt-0.5 truncate">
                BMI: {bmiAnalytics.bmi.toFixed(1)} &bull; {bmiAnalytics.category}
              </p>
            </div>
          </div>

          {/* Current Objective / Goal Block (1 column) */}
          <div className="col-span-1 bg-gradient-to-br from-orange-550 to-orange-600 text-white rounded-3xl p-6 flex flex-col justify-between shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 transition-all hover:translate-y-[-2px]">
            <div>
              <p className="text-[10px] font-black text-orange-200 tracking-wider uppercase font-mono">ACTIVE OBJECTIVE</p>
            </div>
            <div className="my-4">
              <p className="text-2xl font-black italic tracking-tight text-white truncate">
                {profile.goal.replace(/_/g, ' ').toUpperCase()}
              </p>
              <p className="text-[10px] font-bold text-orange-100 uppercase mt-1">
                Macro Target: <span className="underline decoration-2">{profile.macroType}</span>
              </p>
            </div>
            <div className="pt-3 border-t border-orange-500/50 flex justify-between items-center">
              <span className="text-[10px] text-orange-200 font-medium">Calorie Shift:</span>
              <span className="text-sm font-black bg-white/20 px-2 py-0.5 rounded text-white font-mono">
                {profile.goal === 'maintain' ? '0 kcal' :
                 profile.goal === 'cut_slow' ? '-250 kcal' :
                 profile.goal === 'cut_moderate' ? '-500 kcal' :
                 profile.goal === 'cut_aggressive' ? '-1,000 kcal' :
                 profile.goal === 'bulk_slow' ? '+250 kcal' : '+500 kcal'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Desktop / Tab Segment Selector - Hidden on very small screens to let Bottom Bar dominate */}
      <div className="flex flex-col gap-6">
        <div className="hidden md:inline-flex bg-slate-100 p-2 rounded-2xl border-2 border-slate-900 flex-wrap gap-2 md:gap-3">
          {tabList.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                id={`tab-${tab.id}`}
                className={`flex items-center gap-2.5 py-3 px-4 rounded-xl text-xs font-black font-mono tracking-tight uppercase border-2 transition-all cursor-pointer ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                {tab.icon}
                <div className="text-left flex flex-col">
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab windows dynamic layout render with Bento container styles */}
        <div className="min-h-[450px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
            >
              {activeTab === 'bio' && (
                <BioProfileForm profile={profile} onChange={onUpdateProfile} />
              )}

              {activeTab === 'tracker' && (
                <TdeeLogger
                  logs={logs}
                  unitSystem={profile.unitSystem}
                  theoreticalTdee={theoreticalTdee}
                  onUpdateLogs={onUpdateLogs}
                  startingWeight={profile.weight}
                />
              )}

              {activeTab === 'diary' && (
                <FoodDiary
                  profile={profile}
                  foodLogs={foodLogs}
                  onAddFoodLog={onAddFoodLog}
                  onDeleteFoodLog={onDeleteFoodLog}
                  onClearFoodLogsForDate={onClearFoodLogsForDate}
                  adaptiveTdee={adaptiveResults.hasEnoughData ? adaptiveResults.currentTdee : undefined}
                />
              )}

              {activeTab === 'diet' && (
                <MacroPlanner
                  profile={profile}
                  onChange={onUpdateProfile}
                  adaptiveTdee={adaptiveResults.hasEnoughData ? adaptiveResults.currentTdee : undefined}
                />
              )}

              {activeTab === 'meals' && (
                <MealPlanner
                  profile={profile}
                  adaptiveTdee={adaptiveResults.hasEnoughData ? adaptiveResults.currentTdee : undefined}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Persistent Mobile Bottom Navigation Bar - Sticky position satisfying user's exact menu expectation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-4 border-slate-900 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] block md:hidden">
        <div className="max-w-md mx-auto px-4 py-2 flex justify-between items-center gap-1 font-mono">
          {tabList.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                id={`bottom-nav-${tab.id}`}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all select-none cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-[2px_2px_0px_0px_and_rgba(15,23,42,1)] scale-102 border-2 border-slate-900'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-2 border-transparent'
                }`}
              >
                <div className="text-slate-900 group-hover:scale-110">
                  <span className={active ? 'text-white' : 'text-slate-700'}>{tab.icon}</span>
                </div>
                <span className={`text-[9px] font-black tracking-tighter uppercase mt-1 leading-none ${active ? 'text-orange-450' : 'text-slate-500'}`}>
                  {tab.miniLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fueling Intelligence & Calibration Advice Section (Bento Row) */}
      <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <TrendingDown className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Metabolic Intelligence & Calibration</h3>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            Mathematical models like <strong>Mifflin-St Jeor</strong> calculate theoretical baselines. Our 
            <strong> Adaptive TDEE Tracker</strong> uses your dynamic daily food calories and physical weight changes to deduce your real-time bio-metabolism. 
            Keep a minimum 7 to 14 days of sequential data logs back-to-back for highest precision!
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:self-center">
          <span className="bg-slate-50 border-2 border-slate-900 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-700 font-mono shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Settings className="h-3.5 w-3.5 text-orange-550" />
            <span>Mifflin baseline calibrated</span>
          </span>
          <span className="bg-slate-50 border-2 border-slate-900 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-700 font-mono shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Dumbbell className="h-3.5 w-3.5 text-purple-650" />
            <span>Recomposition active</span>
          </span>
        </div>
      </div>

    </div>
  );
}
