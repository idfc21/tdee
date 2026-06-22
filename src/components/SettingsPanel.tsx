import React, { useState, useEffect } from 'react';
import { UserBioProfile, DailyLog, FoodItemLog } from '../types';
import { translations } from '../utils/translations';
import { motion } from 'motion/react';
import {
  Compass,
  Zap,
  Apple,
  Database,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Cloud,
  RefreshCw,
  Link2,
  ArrowLeft,
  ChevronRight,
  TrendingDown,
  Type,
  LineChart as ChartIcon
} from 'lucide-react';
import BioProfileForm from './BioProfileForm';
import MacroPlanner from './MacroPlanner';
import TdeeLogger from './TdeeLogger';
import MealPlanner from './MealPlanner';

interface SettingsPanelProps {
  profile: UserBioProfile;
  logs: DailyLog[];
  foodLogs: FoodItemLog[];
  onUpdateProfile: (updated: UserBioProfile) => void;
  onUpdateLogs: (newLogs: DailyLog[]) => void;
  onUpdateFoodLogs: (newFoodLogs: FoodItemLog[]) => void;
  adaptiveResults: {
    hasEnoughData: boolean;
    currentTdee?: number;
  };
  theoreticalTdee: number;
  
  // GDrive state & handlers
  gdriveClientId: string;
  setGdriveClientId: (id: string) => void;
  gdriveStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  gdriveError: string | null;
  gdriveBackupId: string | null;
  gdriveLastBackup: string | null;
  isGdriveSyncing: boolean;
  copiedUri: boolean;
  setCopiedUri: (val: boolean) => void;
  
  handleGDriveConnect: () => Promise<void>;
  handleGDriveUpload: () => Promise<void>;
  handleGDriveDownload: () => Promise<void>;
  handleGDriveDisconnect: () => void;
}

export default function SettingsPanel({
  profile,
  logs,
  foodLogs,
  onUpdateProfile,
  onUpdateLogs,
  onUpdateFoodLogs,
  adaptiveResults,
  theoreticalTdee,
  gdriveClientId,
  setGdriveClientId,
  gdriveStatus,
  gdriveError,
  gdriveBackupId,
  gdriveLastBackup,
  isGdriveSyncing,
  copiedUri,
  setCopiedUri,
  handleGDriveConnect,
  handleGDriveUpload,
  handleGDriveDownload,
  handleGDriveDisconnect
}: SettingsPanelProps) {
  const lang = profile.language || 'en';
  const t = translations[lang];

  // Sub-navigation within settings: 'coords' | 'macros' | 'tdee' | 'meals' | 'storage' | 'fonts' | null
  const [activeSettingsSubPanel, setActiveSettingsSubPanel] = useState<'coords' | 'macros' | 'tdee' | 'meals' | 'storage' | 'fonts' | null>(null);
  const [showAdvancedGDrive, setShowAdvancedGDrive] = useState(false);

  return (
    <div className="flex flex-col gap-3 font-mono">
      <div className="border-b pb-2 mb-1 flex items-center justify-between">
        <div>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">APP CONTROLS</span>
          <h3 className="text-sm font-black text-slate-955 uppercase tracking-tight font-sans">
            {activeSettingsSubPanel ? (
              activeSettingsSubPanel === 'coords' ? (lang === 'ru' ? 'Личные данные и цели' : 'Personal Details & Goals') :
              activeSettingsSubPanel === 'macros' ? (lang === 'ru' ? 'Назначение КБЖУ' : 'Targets & Formulas') :
              activeSettingsSubPanel === 'tdee' ? (lang === 'ru' ? 'Адаптивный метаболизм' : 'Adaptive Metabolism') :
              activeSettingsSubPanel === 'meals' ? (lang === 'ru' ? 'Приемы пищи' : 'Meal Timings') :
              activeSettingsSubPanel === 'storage' ? (lang === 'ru' ? 'Синхронизация и бэкап' : 'Backup & Cloud Sync') :
              (lang === 'ru' ? 'Шрифты и оформление' : 'Typography & Fonts')
            ) : t.specsAndProfile}
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono">
          {activeSettingsSubPanel ? (lang === 'ru' ? 'Настройка' : 'Sub-Option') : (lang === 'ru' ? 'Главные настройки' : 'Root Settings')}
        </span>
      </div>

      {activeSettingsSubPanel === null ? (
        <div className="flex flex-col gap-3 font-sans">
          {/* Language Selection Segmented Control */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-sans">
            <div>
              <h4 className="text-xs font-black text-slate-909 uppercase tracking-tight font-mono">{lang === 'ru' ? 'ЯЗЫК ИНТЕРФЕЙСА' : 'INTERFACE LANGUAGE'}</h4>
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

          {/* Option 1: Personal Details */}
          <button
            type="button"
            onClick={() => setActiveSettingsSubPanel('coords')}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#eef1f6] hover:border-[#00c08b]/30 hover:bg-slate-50/50 rounded-2xl text-left cursor-pointer transition-all duration-150 group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-[#00c08b]/10 text-[#00c08b] rounded-xl transition-colors group-hover:bg-[#00c08b]/20">
                <Compass className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight font-mono">{lang === 'ru' ? 'Личные данные' : 'Personal Details'}</h4>
                <p className="text-[10px] text-slate-450 leading-normal mt-0.5">{lang === 'ru' ? 'Форма параметров тела, возраст, пол и активность' : 'Your body coordinates, weight, age, gender and multiplier'}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-455 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Option 2: Targets & Formulas */}
          <button
            type="button"
            onClick={() => setActiveSettingsSubPanel('macros')}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#eef1f6] hover:border-[#00c08b]/30 hover:bg-slate-50/50 rounded-2xl text-left cursor-pointer transition-all duration-150 group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl transition-colors group-hover:bg-amber-100/70">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight font-mono">{lang === 'ru' ? 'Назначение КБЖУ' : 'Targets & Formulas'}</h4>
                <p className="text-[10px] text-slate-450 leading-normal mt-0.5">{lang === 'ru' ? 'Параметры дефицита/профицита и соотношение нутриентов' : 'Daily Calorie shift, core formulas & target macro splits'}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-455 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Option 3: Adaptive Metabolism */}
          <button
            type="button"
            onClick={() => setActiveSettingsSubPanel('tdee')}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#eef1f6] hover:border-[#00c08b]/30 hover:bg-slate-50/50 rounded-2xl text-left cursor-pointer transition-all duration-150 group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-purple-50 text-purple-650 rounded-xl transition-colors group-hover:bg-purple-100/70">
                <ChartIcon className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight font-mono">{lang === 'ru' ? 'Адаптивный метаболизм (TDEE)' : 'Adaptive Metabolism (TDEE)'}</h4>
                <p className="text-[10px] text-slate-455 leading-normal mt-0.5">{lang === 'ru' ? 'Калибровка метаболизма на основе взвешиваний' : 'Metabolic Calibration logs, weight logs & history charts'}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-455 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Option 4: Meal Timings */}
          <button
            type="button"
            onClick={() => setActiveSettingsSubPanel('meals')}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#eef1f6] hover:border-[#00c08b]/30 hover:bg-slate-50/50 rounded-2xl text-left cursor-pointer transition-all duration-150 group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl transition-colors group-hover:bg-emerald-100/70">
                <Apple className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight font-mono">{lang === 'ru' ? 'Приемы пищи' : 'Meal Timings'}</h4>
                <p className="text-[10px] text-slate-455 leading-normal mt-0.5">{lang === 'ru' ? 'Пропорции калорий на завтрак, обед и ужин' : 'Breakfast, lunch, dinner & snack percentages splits'}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-455 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Option 5: Backup & Data Storage */}
          <button
            type="button"
            onClick={() => setActiveSettingsSubPanel('storage')}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#eef1f6] hover:border-[#00c08b]/30 hover:bg-slate-50/50 rounded-2xl text-left cursor-pointer transition-all duration-150 group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl transition-colors group-hover:bg-sky-100/70">
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight font-mono">{lang === 'ru' ? 'Синхронизация и бэкап' : 'Backup & Data Storage'}</h4>
                <p className="text-[10px] text-slate-455 leading-normal mt-0.5">{lang === 'ru' ? 'Облачный бэкап Google Drive и экспорт/импорт JSON' : 'Google Drive Cloud Sync setup, JSON backups & local states'}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-455 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Option 6: Typography & Fonts */}
          <button
            type="button"
            onClick={() => setActiveSettingsSubPanel('fonts')}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#eef1f6] hover:border-[#00c08b]/30 hover:bg-slate-50/50 rounded-2xl text-left cursor-pointer transition-all duration-150 group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl transition-colors group-hover:bg-rose-100/70">
                <Type className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight font-mono">{lang === 'ru' ? 'Шрифты и оформление' : 'Typography & Fonts'}</h4>
                <p className="text-[10px] text-slate-455 leading-normal mt-0.5">{lang === 'ru' ? 'Выбор шрифта интерфейса с мгновенным предпросмотром' : 'Select typography and feel with instant live app preview'}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-455 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ← Back Navigation bar */}
          <div className="flex items-center justify-between bg-slate-50 p-2 border border-slate-200 rounded-xl mb-1">
            <button
              type="button"
              onClick={() => setActiveSettingsSubPanel(null)}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 hover:text-slate-900 uppercase font-mono tracking-tight cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>{lang === 'ru' ? 'Назад' : 'Back'}</span>
            </button>
            
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono px-3">
              {activeSettingsSubPanel === 'coords' && (lang === 'ru' ? 'Личные данные' : 'Personal Details')}
              {activeSettingsSubPanel === 'macros' && (lang === 'ru' ? 'КБЖУ' : 'Targets')}
              {activeSettingsSubPanel === 'tdee' && (lang === 'ru' ? 'Метаболизм' : 'Calibration')}
              {activeSettingsSubPanel === 'meals' && (lang === 'ru' ? 'Приемы пищи' : 'Meals')}
              {activeSettingsSubPanel === 'storage' && (lang === 'ru' ? 'Резервное копирование' : 'Backup')}
              {activeSettingsSubPanel === 'fonts' && (lang === 'ru' ? 'Шрифты' : 'Typography')}
            </span>
          </div>

          {/* Render the selected panel contents directly in full-page style */}
          <motion.div
            key={activeSettingsSubPanel}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm font-sans flex flex-col gap-4"
          >
            {activeSettingsSubPanel === 'coords' && (
              <div className="flex flex-col gap-3">
                <div className="border-b border-slate-100 pb-2.5 mb-2">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Compass className="h-4.5 w-4.5 text-[#00c08b]" />
                    {lang === 'ru' ? 'Личные данные и цели' : 'Personal Details & Goals'}
                  </h4>
                  <p className="text-[11px] text-slate-450 uppercase tracking-wider mt-0.5 font-mono">{lang === 'ru' ? 'Настройте веса, рост, пол и физическую активность' : 'Configure height, weight, gender, age and metabolic activity multiplier'}</p>
                </div>
                <BioProfileForm profile={profile} onChange={onUpdateProfile} />
              </div>
            )}

            {activeSettingsSubPanel === 'macros' && (
              <div className="flex flex-col gap-3">
                <div className="border-b border-slate-100 pb-2.5 mb-2">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Zap className="h-4.5 w-4.5 text-amber-555" />
                    {lang === 'ru' ? 'Назначение КБЖУ' : 'Targets & Formulas'}
                  </h4>
                  <p className="text-[11px] text-slate-450 uppercase tracking-wider mt-0.5 font-mono">{lang === 'ru' ? 'Формулы дефицита/профицита и соотношение нутриентов' : 'Daily caloric deficit/surplus shifts & target macro ratios'}</p>
                </div>
                <MacroPlanner
                  profile={profile}
                  onChange={onUpdateProfile}
                  adaptiveTdee={adaptiveResults.hasEnoughData ? adaptiveResults.currentTdee : undefined}
                />
              </div>
            )}

            {activeSettingsSubPanel === 'tdee' && (
              <div className="flex flex-col gap-4 font-sans">
                <div className="border-b border-slate-100 pb-2.5 mb-1">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <ChartIcon className="h-4.5 w-4.5 text-purple-650" />
                    {lang === 'ru' ? 'Адаптивный метаболизм (TDEE)' : 'Adaptive Metabolism (TDEE)'}
                  </h4>
                  <p className="text-[11px] text-slate-450 uppercase tracking-wider mt-0.5 font-mono">{lang === 'ru' ? 'Калибровка индивидуального расхода энергии' : 'Metabolic calibration logs, weight entries & adaptive metrics'}</p>
                </div>
                
                <div className="bg-slate-900 text-white rounded-xl p-3.5 flex gap-3 items-start">
                  <TrendingDown className="w-5 h-5 text-[#00c08b] shrink-0 mt-0.5" />
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
                  themeStyle={profile.themeStyle}
                />
              </div>
            )}

            {activeSettingsSubPanel === 'meals' && (
              <div className="flex flex-col gap-3">
                <div className="border-b border-slate-100 pb-2.5 mb-2">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Apple className="h-4.5 w-4.5 text-emerald-500" />
                    {lang === 'ru' ? 'Приемы пищи' : 'Meal Timings & Splits'}
                  </h4>
                  <p className="text-[11px] text-slate-450 uppercase tracking-wider mt-0.5 font-mono">{lang === 'ru' ? 'Распределение дневного калоража на завтрак, обед и ужин' : 'Breakfast, lunch, dinner & snack calorie distribution budgets'}</p>
                </div>
                <MealPlanner
                  profile={profile}
                  adaptiveTdee={adaptiveResults.hasEnoughData ? adaptiveResults.currentTdee : undefined}
                  lang={lang}
                />
              </div>
            )}

            {activeSettingsSubPanel === 'storage' && (
              <div className="flex flex-col gap-4 font-sans text-xs">
                <div className="border-b border-slate-100 pb-2.5 mb-1">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Database className="h-4.5 w-4.5 text-sky-505" />
                    {lang === 'ru' ? 'Резервное копирование и Хранилище' : 'Backup & Data Storage'}
                  </h4>
                  <p className="text-[11px] text-slate-450 uppercase tracking-wider mt-0.5 font-mono">{lang === 'ru' ? 'Синхронизация с облаком и экспорт ваших данных' : 'Bilateral cloud backups and offline storage state parameters'}</p>
                </div>
                
                {/* Information about where data is saved */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex gap-3 text-slate-705">
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
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-sans">
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
                        <span className="flex items-center gap-1 text-slate-450">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-350" />
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
                    <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-rose-700 text-[11px] leading-relaxed font-sans">
                      {gdriveError}
                    </div>
                  )}

                  {/* Config & connection trigger */}
                  {gdriveStatus !== 'connected' && gdriveStatus !== 'connecting' ? (
                    <div className="flex flex-col gap-4 font-sans">
                      <div className="flex flex-col gap-3">
                        <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                          {lang === 'ru'
                            ? 'Вы можете войти под своим аккаунтом Google для автоматического сохранения всех настроек, измерений веса и дневника питания в скрытом приватном JSON-файле на вашем Google Диске.'
                            : 'Sign in under your trusted Google account to automatically store and restore your metabolic settings, body weight trends, and food logs inside a private file on your Google Drive.'}
                        </p>

                        <button
                          type="button"
                          onClick={handleGDriveConnect}
                          className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-705 border border-slate-200 font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all text-xs font-sans shadow-sm hover:shadow active:scale-[0.98]"
                        >
                          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.274 1.564-1.564 4.13-5.132 4.13-3.13 0-5.653-2.593-5.653-5.79s2.523-5.79 5.653-5.79c1.782 0 2.977.784 3.662 1.446l3.264-3.143C18.8 3.553 15.82 2.3 12.24 2.3c-5.4 0-9.8 4.35-9.8 9.7s4.4 9.7 9.8 9.7c5.65 0 9.4-3.95 9.4-9.5 0-.64-.07-1.125-.15-1.615H12.24z"/>
                          </svg>
                          <span>{lang === 'ru' ? 'Войти с помощью Google' : 'Sign in with Google'}</span>
                        </button>
                        
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => setShowAdvancedGDrive(!showAdvancedGDrive)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 underline font-semibold font-mono uppercase tracking-wider"
                          >
                            {showAdvancedGDrive 
                              ? (lang === 'ru' ? 'Скрыть расширенную панель' : 'Hide Custom Client ID Panel') 
                              : (lang === 'ru' ? 'Настроить собственный Client ID' : 'Advanced: Set Custom Client ID')}
                          </button>
                        </div>
                      </div>

                      {showAdvancedGDrive && (
                        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 font-mono mt-1">
                          <div className="flex flex-col gap-1.5 font-mono">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                              Google Client ID
                            </label>
                            <input
                              type="text"
                              value={gdriveClientId}
                              onChange={(e) => setGdriveClientId(e.target.value)}
                              placeholder="342674987019-xxx.apps.googleusercontent.com"
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-[11px] text-slate-705 font-mono focus:outline-none"
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
                                <div className="space-y-1.5 text-[10px] text-slate-605 leading-normal font-sans">
                                  <div className="text-slate-500 italic">
                                    Предустановленный демонстрационный Client ID часто выдает ошибку 'OAuth client not found', так как Google требует точного совпадения адреса. Чтобы исправить это и запустить синхронизацию:
                                  </div>
                                  <p><strong>1.</strong> Перейдите на сайт <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold font-0.5">Google Cloud Console</a> и создайте бесплатный проект.</p>
                                  <p><strong>2.</strong> Зайдите в <strong>APIs & Services</strong> &rarr; <strong>OAuth consent screen</strong>, выберите <em>External</em>, впишите ваше имя и email.</p>
                                  <p><strong>3.</strong> Раздел <strong>Credentials</strong> &rarr; <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong>. Тип приложения: <strong>Web Application</strong>.</p>
                                  <p><strong>4.</strong> В поле <strong>Authorized JavaScript origins</strong> скопируйте и вставьте адрес выше.</p>
                                  <p><strong>5.</strong> В поле <strong>Authorized redirect URIs</strong> вставьте тот же адрес.</p>
                                  <p><strong>6.</strong> Скопируйте сгенерированный Google Client ID, сохраните в поле ввода выше и нажмите кнопку ниже!</p>
                                </div>
                              ) : (
                                <div className="space-y-1.5 text-[10px] text-slate-605 leading-normal font-sans">
                                  <div className="text-slate-500 italic">
                                    The prefilled sandbox Client ID may report 'OAuth client not found' because Google requires the redirect URI to match your app URL perfectly. To connect:
                                  </div>
                                  <p><strong>1.</strong> Head to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold font-0.5">Google Cloud Console</a> and create a free project.</p>
                                  <p><strong>2.</strong> Go to <strong>APIs & Services</strong> &rarr; <strong>OAuth consent screen</strong>, select <em>External</em>, enter your email.</p>
                                  <p><strong>3.</strong> Click <strong>Credentials</strong> &rarr; <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong>. Select <strong>Web Application</strong>.</p>
                                  <p><strong>4.</strong> Under <strong>Authorized JavaScript origins</strong> paste our App URL shown above.</p>
                                  <p><strong>5.</strong> Under <strong>Authorized redirect URIs</strong> paste the exact same App URL.</p>
                                  <p><strong>6.</strong> Click Create, copy your generated Client ID, paste it into the field above and connect!</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* If connected, show Backup / Load actions */}
                  {gdriveStatus === 'connected' && (
                    <div className="flex flex-col gap-2.5 font-mono">
                      <div className="bg-white border border-slate-150 p-2.5 rounded-lg flex flex-col gap-1.5 text-[10.5px]">
                        <div className="flex justify-between gap-2 overflow-hidden">
                          <span className="text-slate-400 uppercase font-black text-[8px] tracking-wider">{lang === 'ru' ? 'ID Бекапа' : 'File ID'}</span>
                          <span className="text-slate-650 truncate max-w-[200px] shrink">{gdriveBackupId || (lang === 'ru' ? 'Не найдено' : 'Not Created')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 uppercase font-black text-[8px] tracking-wider">{lang === 'ru' ? 'Последний бекап' : 'Last Synced'}</span>
                          <span className="text-slate-800 font-bold">{gdriveLastBackup || (lang === 'ru' ? 'Никогда' : 'Never')}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
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
                <div className="flex flex-col sm:flex-row gap-2 mt-2 font-sans text-xs">
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
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 font-sans">
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

            {activeSettingsSubPanel === 'fonts' && (
              <div className="flex flex-col gap-4 font-sans text-xs">
                <div className="border-b border-slate-100 pb-2.5 mb-1">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Type className="h-4.5 w-4.5 text-rose-555" />
                    {lang === 'ru' ? 'Шрифты и Темы' : 'Typography & App Feel'}
                  </h4>
                  <p className="text-[11px] text-slate-450 uppercase tracking-wider mt-0.5 font-mono">
                    {lang === 'ru' ? 'Мгновенный живой предпросмотр и сохранение' : 'Instant live typography preview and automated sync'}
                  </p>
                </div>

                {/* Info block */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex gap-3 text-slate-700">
                  <Type className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-900 text-xs">
                      {lang === 'ru' ? 'Как это работает?' : 'How typography rendering works'}
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      {lang === 'ru'
                        ? 'Мы загружаем высококачественные векторные шрифты через Google Fonts API. При нажатии на любую из карт ниже, шрифт всего приложения моментально обновится. Выбранный стиль надежно сохраняется в вашем локальном профиле.'
                        : 'We dynamically interface with high-fidelity Google Fonts vector assets. Clicking any styling token card below immediately triggers a root application stylesheet refresh. Your preference syncs securely in your bio profile.'}
                    </p>
                  </div>
                </div>

                {/* Fonts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  {[
                    {
                      id: 'dm-sans',
                      name: 'DM Sans',
                      sub: lang === 'ru' ? 'Геометрический гротеск' : 'Geometric Sans',
                      desc: lang === 'ru' ? 'Сбалансированный, чистый и современный' : 'Balanced, pristine, and modern layout',
                      sampleEn: 'Uncompromising design for healthy lifestyle.',
                      sampleRu: 'Индивидуальные рекомендации и адаптивность TDEE.',
                      styleName: '"DM Sans", sans-serif'
                    },
                    {
                      id: 'inter',
                      name: 'Inter',
                      sub: lang === 'ru' ? 'Нейтральный интерфейсный' : 'Clean Technical Sans',
                      desc: lang === 'ru' ? 'Высокоточная разборчивость и прагматика' : 'High-precision interface legibility standard',
                      sampleEn: 'Optimized metabolic calculations daily.',
                      sampleRu: 'Точный подсчет калорий и логов веса ежедневно.',
                      styleName: '"Inter", sans-serif'
                    },
                    {
                      id: 'space-grotesk',
                      name: 'Space Grotesk',
                      sub: lang === 'ru' ? 'Футуристический техно' : 'Futuristic Tech-Grotesque',
                      desc: lang === 'ru' ? 'Энергичный, акцентный и смелый дизайн' : 'Energetic, expressive display headings',
                      sampleEn: 'Empower metabolic performance engines.',
                      sampleRu: 'Чистая скорость метаболического анализа.',
                      styleName: '"Space Grotesk", sans-serif'
                    },
                    {
                      id: 'outfit',
                      name: 'Outfit',
                      sub: lang === 'ru' ? 'Мягкий премиальный' : 'Premium Rounded Sans',
                      desc: lang === 'ru' ? 'Гладкий, минималистичный, дружелюбный' : 'Sleek, rounded organic minimalism',
                      sampleEn: 'Nurture your daily metabolic goals.',
                      sampleRu: 'Забота о метаболических целях ежедневно.',
                      styleName: '"Outfit", sans-serif'
                    },
                    {
                      id: 'playfair',
                      name: 'Playfair Display',
                      sub: lang === 'ru' ? 'Элегантная антиква' : 'Editorial Classic Serif',
                      desc: lang === 'ru' ? 'Классический, утонченный и человечный' : 'Classical sophistication and premium storytelling',
                      sampleEn: 'Crafted with absolute attention to details.',
                      sampleRu: 'Создано с любовью и вниманием к деталям.',
                      styleName: '"Playfair Display", serif'
                    },
                    {
                      id: 'mono',
                      name: 'JetBrains Mono',
                      sub: lang === 'ru' ? 'Инженерный моноширинный' : 'Cyberpunk Technical Mono',
                      desc: lang === 'ru' ? 'Минималистичный код-эстетика' : 'Code-inspired monospaced structural layout',
                      sampleEn: 'SYS_ENG: CALC_TDEE_ADAPTIVE = 2650; // OK',
                      sampleRu: 'ЛОГ: СКОРОСТЬ_ОБМЕНА_ВЕЩЕСТВ = 99.8%;',
                      styleName: '"JetBrains Mono", monospace'
                    }
                  ].map((fItem) => {
                    const isSelected = (profile.fontFamily || 'dm-sans') === fItem.id;
                    return (
                      <button
                        key={fItem.id}
                        type="button"
                        onClick={() => onUpdateProfile({ ...profile, fontFamily: fItem.id })}
                        className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/50'
                        }`}
                        style={{ fontFamily: fItem.styleName }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[13px] text-slate-900 tracking-tight">
                            {fItem.name}
                          </span>
                          <span className="font-mono text-[8px] font-black uppercase text-rose-600 tracking-wider">
                            {fItem.sub}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                          {fItem.desc}
                        </p>
                        
                        {/* Interactive Dynamic Prevue Sandbox */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100/70 select-text">
                          <div className="text-[11.5px] font-medium text-slate-800 leading-snug">
                            {fItem.sampleEn}
                          </div>
                          <div className="text-[11.5px] font-normal text-slate-600 leading-snug mt-1 italic">
                            {fItem.sampleRu}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-rose-600 font-mono text-[8.5px] font-black uppercase">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {lang === 'ru' ? 'Активный шрифт системы' : 'Active System Font'}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
