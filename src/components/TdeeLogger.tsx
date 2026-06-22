import React, { useState, useEffect } from 'react';
import { DailyLog, UnitSystem } from '../types';
import { calculateAdaptiveTDEE, generateMockLogs } from '../utils/calc';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import {
  Calendar,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Award,
  CircleAlert,
  HelpCircle,
  Database,
  BarChart2,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { motion } from 'motion/react';

interface TdeeLoggerProps {
  logs: DailyLog[];
  unitSystem: UnitSystem;
  theoreticalTdee: number;
  onUpdateLogs: (newLogs: DailyLog[]) => void;
  startingWeight: number;
  themeStyle?: string;
  lang?: string;
}

export default function TdeeLogger({
  logs,
  unitSystem,
  theoreticalTdee,
  onUpdateLogs,
  startingWeight,
  themeStyle,
  lang = 'en'
}: TdeeLoggerProps) {
  const isActive = themeStyle === 'samsung-active';
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [graphTab, setGraphTab] = useState<'weight' | 'tdee'>('weight');

  // Trigger auto-prefill of inputs when date shifts or logs update (syncing food total cals)
  useEffect(() => {
    const matchedLog = logs.find((log) => log.date === date);
    if (matchedLog) {
      setWeight(matchedLog.weight ? matchedLog.weight.toString() : '');
      setCalories(matchedLog.caloriesConsumed ? matchedLog.caloriesConsumed.toString() : '');
      setNotes(matchedLog.notes || '');
    } else {
      setWeight('');
      setCalories('');
      setNotes('');
    }
  }, [date, logs]);

  // Calculate Adaptive TDEE results
  const adaptiveResults = calculateAdaptiveTDEE(logs, theoreticalTdee, unitSystem);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !calories) return;

    const parsedWeight = parseFloat(weight);
    const parsedCalories = parseInt(calories);

    if (isNaN(parsedWeight) || isNaN(parsedCalories)) return;

    // Check if entry for date already exists
    const existingIndex = logs.findIndex((log) => log.date === date);

    if (existingIndex >= 0) {
      // Overwrite confirmation/replacement
      const updated = [...logs];
      updated[existingIndex] = {
        id: logs[existingIndex].id,
        date,
        weight: parsedWeight,
        caloriesConsumed: parsedCalories,
        notes: notes || undefined,
      };
      onUpdateLogs(updated);
    } else {
      // Create new
      const newLog: DailyLog = {
        id: Math.random().toString(36).substring(2, 9),
        date,
        weight: parsedWeight,
        caloriesConsumed: parsedCalories,
        notes: notes || undefined,
      };
      onUpdateLogs([...logs, newLog]);
    }

    // Reset inputs but preserve date for subsequent entries
    setWeight('');
    setCalories('');
    setNotes('');
  };

  const handleDeleteLog = (id: string) => {
    onUpdateLogs(logs.filter((log) => log.id !== id));
  };

  const handleClearLogs = () => {
    const confirmationMsg = lang === 'ru'
      ? 'Вы абсолютно уверены, что хотите стереть все записи веса и калорий? Это действие необратимо.'
      : 'Are you absolutely sure you want to erase all calorie and weight logs?';
    if (confirm(confirmationMsg)) {
      onUpdateLogs([]);
    }
  };

  const handleLoadSampleData = () => {
    const defaultWt = startingWeight || (unitSystem === 'metric' ? 82 : 180);
    const mock = generateMockLogs(theoreticalTdee, defaultWt);
    onUpdateLogs(mock);
  };

  // Format date for display on charts
  const chartData = adaptiveResults.tdeeHistory.map((pt) => {
    const d = new Date(pt.date);
    const original = logs.find((l) => l.date === pt.date);
    return {
      ...pt,
      id: original?.id || pt.date,
      notes: original?.notes,
      formattedDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    };
  });

  const deviation = adaptiveResults.currentTdee - theoreticalTdee;

  return (
    <div className="flex flex-col gap-6">
      {/* Prime stats grid comparing current adaptive metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Empirical Adaptive TDEE Block */}
        <div className={`border rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[145px] transition-all ${
          isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-slate-900 border-slate-950 text-white'
        }`}>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-[#00c08b]/10 blur-xl"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[9px] uppercase font-black text-slate-450 tracking-widest font-mono">
              {lang === 'ru' ? 'АДАПТИВНЫЙ РАСХОД ENERGETICS' : 'ADAPTIVE REAL METABOLISM'}
            </span>
            <span className={`text-[9px] font-extrabold uppercase font-mono px-2.5 py-1 rounded-full border border-white/20 ${
              adaptiveResults.hasEnoughData
                ? 'text-emerald-450 bg-emerald-950/45'
                : 'text-amber-450 bg-amber-955/45'
            }`}>
              {adaptiveResults.hasEnoughData 
                ? (lang === 'ru' ? 'Синхронизировано' : 'Synced')
                : (lang === 'ru' ? 'Калибровка' : 'Calibrating')}
            </span>
          </div>
          <div className="my-2 relative z-10">
            <span className="text-4xl font-bold font-mono tracking-tight text-[#00c08b]" id="adaptive-tdee-display">
              {Math.round(adaptiveResults.currentTdee)}
            </span>
            <span className="text-[10px] font-bold text-slate-400 block mt-1 uppercase font-mono">
              {lang === 'ru' ? 'ккал / день адаптивный базовый расход' : 'kcal / day adaptive baseline'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold relative z-10">
            {lang === 'ru' ? 'Рассчитано напрямую из логов. ' : 'Calculated directly from logs. '}
            {adaptiveResults.hasEnoughData 
              ? (lang === 'ru' ? 'Определено на основе 14 дней.' : 'Calculated from 14-day energy change.') 
              : (lang === 'ru' ? `До калибровки требуется еще ${Math.max(0, 7 - adaptiveResults.daysAnalyzed)} дн. записей.` : `Requires ${Math.max(0, 7 - adaptiveResults.daysAnalyzed)} more logged days.`)}
          </p>
        </div>

        {/* Metabolic Drift/Variance Block */}
        <div className={`rounded-3xl p-5 flex flex-col justify-between min-h-[145px] transition-all border shadow-sm ${
          isActive ? 'bg-[#121622] border-[#252c42]' : 'bg-white border-[#eef1f6]'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest font-mono">
              {lang === 'ru' ? 'Отклонение метаболизма' : 'Metabolic Deviation'}
            </span>
            <Award className="h-4.5 w-4.5 text-purple-600" />
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            {deviation === 0 ? (
              <span className={`text-4xl font-bold font-mono tracking-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>0</span>
            ) : (
              <span className={`text-4xl font-bold font-mono tracking-tight flex items-center gap-1 ${
                deviation > 0 ? 'text-emerald-650' : 'text-rose-650'
              }`}>
                {deviation > 0 ? <TrendingUp className="h-7 w-7 stroke-[3px]" /> : <TrendingDown className="h-7 w-7 stroke-[3px]" />}
                {deviation > 0 ? `+${Math.round(deviation)}` : Math.round(deviation)}
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">
              {lang === 'ru' ? 'дельта ккал' : 'kcal delta'}
            </span>
          </div>
          <p className={`text-[10px] leading-relaxed font-semibold ${isActive ? 'text-slate-400' : 'text-slate-505'}`}>
            {deviation > 0
              ? (lang === 'ru' ? 'Ваш метаболизм сжигает энергию быстрее, чем рассчитывалось по теории!' : 'Your real-world metabolism burns active energy faster than mathematics estimated!')
              : deviation < 0
              ? (lang === 'ru' ? 'Расход энергии чуть ниже или удерживается вода. Следите строго за калориями.' : 'Metabolism runs slightly slower or less water output. Keep caloric counts strict.')
              : (lang === 'ru' ? 'Добавьте замеры веса для анализа отклонения.' : 'Add logs to analyze deviation coefficients.')}
          </p>
        </div>

        {/* Logs Reliability Rate */}
        <div className={`rounded-3xl p-5 flex flex-col justify-between min-h-[145px] transition-all border shadow-sm ${
          isActive ? 'bg-[#121622] border-[#252c42]' : 'bg-white border-[#eef1f6]'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest font-mono">
              {lang === 'ru' ? 'Качество калибровки' : 'Calibration Score'}
            </span>
            <Database className="h-4.5 w-4.5 text-[#00c08b]" />
          </div>
          <div className="my-2">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className={`text-4xl font-bold font-mono tracking-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                {adaptiveResults.reliabilityScore}%
              </span>
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">
                {lang === 'ru' ? `${logs.length} дн. внесено` : `${logs.length} logged days`}
              </span>
            </div>
            {/* simple micro progress bar */}
            <div className={`h-3 w-full rounded-full overflow-hidden border ${
              isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-slate-100 border-[#eef1f6]'
            }`}>
              <div
                className="h-full bg-[#00c08b] rounded-full transition-all duration-500"
                style={{ width: `${adaptiveResults.reliabilityScore}%` }}
              ></div>
            </div>
          </div>
          <p className={`text-[10px] leading-relaxed font-semibold ${isActive ? 'text-slate-400' : 'text-slate-505'}`}>
            {lang === 'ru' 
              ? 'Точность расчетов растет с каждым взвешиванием. Измеряйте вес каждое утро натощак.'
              : 'Accuracy scales with consistency. For extreme accuracy, weigh daily under identical morning conditions.'}
          </p>
        </div>

        {/* Historic Energy Change block */}
        <div className={`rounded-3xl p-5 flex flex-col justify-between min-h-[145px] transition-all border shadow-sm ${
          isActive ? 'bg-[#121622] border-[#252c42]' : 'bg-white border-[#eef1f6]'
        }`}>
          <div className="flex justify-between items-start">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest font-mono">
              {lang === 'ru' ? 'Изменение веса нетто' : 'Net Weight Change'}
            </span>
            <BarChart2 className="h-4.5 w-4.5 text-sky-600" />
          </div>
          <div className="my-2">
            <span className={`text-4xl font-bold font-mono tracking-tight ${
              adaptiveResults.overallWeightChange <= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {adaptiveResults.overallWeightChange > 0 ? `+${adaptiveResults.overallWeightChange}` : adaptiveResults.overallWeightChange}{' '}
              <span className="text-lg font-bold text-slate-400 font-mono uppercase ml-0.5">
                {unitSystem === 'metric' ? (lang === 'ru' ? 'кг' : 'kg') : (lang === 'ru' ? 'фунт' : 'lbs')}
              </span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 block mt-1 uppercase font-mono">
              {lang === 'ru' ? `за ${adaptiveResults.daysAnalyzed} дней` : `across ${adaptiveResults.daysAnalyzed} days`}
            </span>
          </div>
          <p className={`text-[10px] leading-relaxed font-semibold ${isActive ? 'text-slate-400' : 'text-slate-505'}`}>
            {lang === 'ru' ? 'Среднее потребление калорий за этот активный период составило ' : 'Average caloric intake during this active timeline represents '}
            <strong className={`font-mono ${isActive ? 'text-white' : 'text-slate-900'}`}>{adaptiveResults.averageCalorieIntake} {lang === 'ru' ? 'ккал/день' : 'kcal/day'}</strong>.
          </p>
        </div>
      </div>

      {/* Main split: Input and history vs Graphic Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input group and logs ledger table */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Daily log input form */}
          <div className={`border rounded-3xl p-6 shadow-sm transition-colors ${
            isActive ? 'bg-[#121622] border-[#252c42]' : 'bg-white border-[#eef1f6]'
          }`}>
            <span className="text-[9px] font-bold tracking-widest text-[#00c08b] uppercase font-mono block">
              {lang === 'ru' ? 'МЕТРИКИ И ЖУРНАЛ' : 'LEDGER METRICS'}
            </span>
            <h3 className={`text-lg font-black flex items-center gap-1.5 mt-0.5 uppercase tracking-tight ${isActive ? 'text-white' : 'text-slate-905'}`}>
              <Calendar className="h-5 w-5 text-[#00c08b]" />
              {lang === 'ru' ? 'Внести взвешивание' : 'Log Daily Coordinates'}
            </h3>

            <form onSubmit={handleAddLog} className="flex flex-col gap-4 mt-4" id="add-log-form">
              {/* Date selection component */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase font-bold font-mono ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                  {lang === 'ru' ? 'Дата замера' : 'Logging Date'}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00c08b]/10 focus:border-[#00c08b] transition-colors ${
                    isActive ? 'bg-[#0a0d16] border-[#1e253c] text-white' : 'bg-white border-[#eef1f6] text-slate-905'
                  }`}
                  required
                />
              </div>

              {/* Responsive Inputs: Weight & Calories side-by-side */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] uppercase font-bold font-mono ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                    {lang === 'ru' ? `Вес (${unitSystem === 'metric' ? 'кг' : 'фунты'})` : `Weight (${unitSystem === 'metric' ? 'kg' : 'lbs'})`}
                  </label>
                  <input
                    type="number"
                    id="log-weight-input"
                    step="0.1"
                    min="20"
                    max="600"
                    placeholder={unitSystem === 'metric' ? '78.5' : '172.4'}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00c08b]/10 focus:border-[#00c08b] transition-colors ${
                      isActive ? 'bg-[#0a0d16] border-[#1e253c] text-white' : 'bg-white border-[#eef1f6] text-slate-905'
                    }`}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] uppercase font-bold font-mono ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                    {lang === 'ru' ? 'Калории (ккал)' : 'Calories (kcal)'}
                  </label>
                  <input
                    type="number"
                    id="log-calories-input"
                    min="500"
                    max="10000"
                    placeholder="2450"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00c08b]/10 focus:border-[#00c08b] transition-colors ${
                      isActive ? 'bg-[#0a0d16] border-[#1e253c] text-white' : 'bg-white border-[#eef1f6] text-slate-905'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase font-bold font-mono ${isActive ? 'text-slate-400' : 'text-slate-550'}`}>
                  {lang === 'ru' ? 'Заметки дня (опционально)' : 'Diary Notes (optional)'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ru' ? 'День соленой еды, тренировка ног, тяжелый жим...' : 'Sodium day, legs day, heavy lifts...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition-colors ${
                    isActive ? 'bg-[#0a0d16] border-[#1e253c] text-white' : 'bg-white border-[#eef1f6] text-slate-905'
                  }`}
                />
              </div>

              <button
                type="submit"
                id="save-log-btn"
                className="w-full flex items-center justify-center gap-1.5 bg-[#00c08b] hover:bg-[#00a87a] text-white border border-[#00c08b] font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
              >
                <Plus className="h-4.5 w-4.5 text-white stroke-[3px]" /> 
                {lang === 'ru' ? 'Сохранить запись замера' : 'Save Coordinate Log'}
              </button>
            </form>
          </div>

          {/* Quick options panel */}
          <div className={`border rounded-3xl p-6 flex flex-col gap-3 shadow-sm transition-colors ${
            isActive ? 'bg-[#121622] border-[#252c42]' : 'bg-white border-[#eef1f6]'
          }`}>
            <h4 className={`text-xs font-bold uppercase font-mono ${isActive ? 'text-slate-350' : 'text-slate-705'}`}>
              {lang === 'ru' ? 'Функции базы данных' : 'Database Options'}
            </h4>
            <div className="grid grid-cols-2 gap-3.5">
              <button
                onClick={handleLoadSampleData}
                className={`flex items-center justify-center gap-1 border font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wide font-mono cursor-pointer transition-colors ${
                  isActive 
                    ? 'bg-[#1b2238] hover:bg-[#202943] border-[#293250] text-[#00c08b]' 
                    : 'bg-slate-50 hover:bg-slate-100 border-[#eef1f6] text-slate-900'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> {lang === 'ru' ? 'Залить демо-данные' : 'Seed Data'}
              </button>
              <button
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className={`flex items-center justify-center gap-1 border font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wide font-mono cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive 
                    ? 'bg-[#1b2238] hover:bg-rose-950/25 border-[#293250] text-rose-450 hover:text-rose-400' 
                    : 'bg-white hover:bg-rose-50 border-[#eef1f6] text-slate-705 hover:text-rose-900'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" /> {lang === 'ru' ? 'Очистить историю' : 'Erase Cache'}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Graphic Dashboard */}
        <div className={`lg:col-span-8 border rounded-3xl p-6 flex flex-col gap-4 shadow-sm transition-colors ${
          isActive ? 'bg-[#121622] border-[#252c42]' : 'bg-white border-[#eef1f6]'
        }`}>
          <div className={`flex flex-col sm:flex-row gap-3 justify-between sm:items-center border-b pb-4 ${
            isActive ? 'border-[#1e253c]' : 'border-[#f4f7fa]'
          }`}>
            <div>
              <span className="text-[9px] tracking-widest uppercase font-bold font-mono text-[#00c08b] block opacity-90">
                {lang === 'ru' ? 'МЕТАБОЛИЧЕСКИЕ КРИВЫЕ' : 'METABOLIC CURVES'}
              </span>
              <span className={`text-base font-bold uppercase tracking-wide mt-0.5 block ${isActive ? 'text-white' : 'text-slate-905'}`}>
                {lang === 'ru' ? 'Динамика веса и TDEE' : 'Performance Plots'}
              </span>
            </div>

            {/* Toggle Graph tabs options */}
            <div className={`flex p-1.5 rounded-2xl border ${
              isActive ? 'bg-[#0a0d16] border-[#1e253c]' : 'bg-slate-100/50 border-[#eef1f6]'
            }`}>
              <button
                onClick={() => setGraphTab('weight')}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase font-mono transition-all cursor-pointer ${
                  graphTab === 'weight'
                    ? 'bg-[#00c08b] text-white shadow-none'
                    : isActive
                    ? 'text-slate-400 hover:text-white hover:bg-[#1b2238]/55'
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                {lang === 'ru' ? 'График веса' : 'Weight Logs Chart'}
              </button>
              <button
                onClick={() => setGraphTab('tdee')}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase font-mono transition-all cursor-pointer ${
                  graphTab === 'tdee'
                    ? 'bg-[#00c08b] text-white shadow-none'
                    : isActive
                    ? 'text-slate-400 hover:text-white hover:bg-[#1b2238]/55'
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                {lang === 'ru' ? 'Кривая TDEE' : 'Adaptive TDEE Chart'}
              </button>
            </div>
          </div>

          {/* Graphical rendering element container */}
          <div className="h-72 w-full mt-2">
            {chartData.length === 0 ? (
              <div className={`h-full w-full flex flex-col items-center justify-center p-6 gap-3 border border-dashed rounded-3xl ${
                isActive ? 'border-[#1e253c] bg-[#0a0d16]/30' : 'border-[#eef1f6] bg-slate-50/50'
              }`}>
                <CircleAlert className="h-9 w-9 text-[#00c08b]" />
                <div className="text-center">
                  <p className={`font-bold text-xs uppercase font-mono tracking-wider ${isActive ? 'text-white' : 'text-slate-900'}`}>
                    {lang === 'ru' ? 'Журнал замеров пуст' : 'No logs available in Cache'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[260px] font-semibold">
                    {lang === 'ru' 
                      ? 'Чтобы увидеть интерактивные кривые, введите замеры веса или нажмите кнопку "Залить демо-данные" слева.'
                      : 'To see metabolic visualizations, please enter daily data or click Seed Data on options panel.'}
                  </p>
                </div>
              </div>
            ) : graphTab === 'weight' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c08b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#00c08b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isActive ? '#1e253c' : '#e2e8f0'} />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 9, fontWeight: 700, fill: isActive ? '#475569' : '#64748b', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 1.5', 'dataMax + 1.5']}
                    tick={{ fontSize: 9, fontWeight: 700, fill: isActive ? '#475569' : '#64748b', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: '1px solid #334155',
                      boxShadow: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" />
                  <Area
                    type="monotone"
                    name={lang === 'ru' ? `Вес (${unitSystem === 'metric' ? 'кг' : 'фунты'})` : `Weight (${unitSystem === 'metric' ? 'kg' : 'lbs'})`}
                    dataKey="weight"
                    stroke="#00c08b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorWeight)"
                    activeDot={{ r: 6, strokeWidth: 1.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isActive ? '#1e253c' : '#e2e8f0'} />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 9, fontWeight: 700, fill: isActive ? '#475569' : '#64748b', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fontWeight: 700, fill: isActive ? '#475569' : '#64748b', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['dataMin - 300', 'dataMax + 300']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: '1px solid #334155',
                      boxShadow: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" />
                  <Line
                    type="monotone"
                    name={lang === 'ru' ? 'Калории (ккал)' : 'Intake (kcal)'}
                    dataKey="cal"
                    stroke={isActive ? '#475569' : '#64748b'}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    name={lang === 'ru' ? 'Адаптивный TDEE' : 'Adaptive TDEE'}
                    dataKey="tdee"
                    stroke="#00c08b"
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 1 }}
                    activeDot={{ r: 6, strokeWidth: 1.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Details table Ledger */}
          {chartData.length > 0 && (
            <div className="mt-4 flex flex-col gap-2.5">
              <span className={`text-[10px] uppercase font-bold font-mono tracking-widest ${isActive ? 'text-slate-400' : 'text-slate-455'}`}>
                {lang === 'ru' ? `Архив суточных замеров (${logs.length} дн.)` : `Ledger Database (${logs.length} days)`}
              </span>
              <div className={`max-h-[190px] overflow-y-auto overflow-x-auto border rounded-3xl ${
                isActive ? 'border-[#1e253c]' : 'border-[#eef1f6]'
              }`}>
                <table className={`w-full text-[11px] text-left ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>
                  <thead className={`text-[9px] uppercase font-mono sticky top-0 font-bold ${
                    isActive ? 'bg-[#0a0d16] border-b border-[#1e253c] text-slate-400' : 'bg-slate-50 border-b border-[#f4f7fa] text-slate-500'
                  }`}>
                    <tr>
                      <th className="px-3 py-2.5">{lang === 'ru' ? 'Дата' : 'Date'}</th>
                      <th className="px-3 py-2.5">{lang === 'ru' ? 'Вес' : 'Log Weight'}</th>
                      <th className="px-3 py-2.5">{lang === 'ru' ? 'Энергия' : 'Cal Budget Intake'}</th>
                      <th className="px-3 py-2.5">{lang === 'ru' ? 'Заметки дня' : 'Diary Logs Details'}</th>
                      <th className="px-3 py-2.5 text-right font-bold w-12">{lang === 'ru' ? 'Удалить' : 'Delete'}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isActive ? 'divide-[#161c2d] bg-[#121622]' : 'divide-slate-100 bg-white'}`}>
                    {chartData
                      .slice()
                      .reverse()
                      .map((log) => (
                        <tr key={log.id} className={`hover:bg-slate-50/10 font-semibold transition-colors ${
                          isActive ? 'hover:bg-[#1a2134]' : 'hover:bg-slate-50'
                        }`}>
                          <td className={`px-3 py-2 font-mono font-bold ${isActive ? 'text-slate-100' : 'text-slate-707'}`}>{log.date}</td>
                          <td className="px-3 py-2 font-mono text-[#00c08b] font-bold">
                            {log.weight} {unitSystem === 'metric' ? (lang === 'ru' ? 'кг' : 'kg') : (lang === 'ru' ? 'фунт' : 'lbs')}
                          </td>
                          <td className={`px-3 py-2 font-mono font-bold ${isActive ? 'text-slate-205' : 'text-slate-800'}`}>{log.cal.toLocaleString()} {lang === 'ru' ? 'ккал' : 'kcal'}</td>
                          <td className={`px-3 py-2 truncate max-w-[150px] ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                            {log.notes || '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className={`transition-colors cursor-pointer ${
                                isActive ? 'text-slate-500 hover:text-rose-400' : 'text-slate-405 hover:text-rose-650'
                              }`}
                              title={lang === 'ru' ? 'Удалить эту запись' : 'Delete log'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
