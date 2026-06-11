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
}

export default function TdeeLogger({
  logs,
  unitSystem,
  theoreticalTdee,
  onUpdateLogs,
  startingWeight
}: TdeeLoggerProps) {
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
    if (confirm('Are you absolutely sure you want to erase all calorie and weight logs?')) {
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
        <div className="bg-slate-900 border-2 border-slate-900 text-white rounded-3xl p-5 shadow-[6px_6px_0px_0px_rgba(249,115,22,1)] relative overflow-hidden flex flex-col justify-between min-h-[145px] transition-all hover:translate-y-[-2px]">
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-orange-500/10 blur-xl"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest font-mono">ADAPTIVE REAL METABOLISM</span>
            <span className={`text-[9px] font-black uppercase font-mono px-2.5 py-1 rounded-full border-2 border-white ${
              adaptiveResults.hasEnoughData
                ? 'text-emerald-400 bg-emerald-950/45'
                : 'text-amber-400 bg-amber-950/45'
            }`}>
              {adaptiveResults.hasEnoughData ? 'Synced' : 'Calibrating'}
            </span>
          </div>
          <div className="my-2 relative z-10">
            <span className="text-4xl font-black font-mono tracking-tight text-orange-450" id="adaptive-tdee-display">
              {Math.round(adaptiveResults.currentTdee)}
            </span>
            <span className="text-[10px] font-black text-slate-400 block mt-1 uppercase font-mono">kcal / day adaptive baseline</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold relative z-10">
            Calculated directly from logs. {adaptiveResults.hasEnoughData ? 'Calculated from 14-day energy change.' : `Requires ${Math.max(0, 7 - adaptiveResults.daysAnalyzed)} more logged days.`}
          </p>
        </div>

        {/* Metabolic Drift/Variance Block */}
        <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between min-h-[145px] transition-all hover:translate-y-[-2px]">
          <div className="flex justify-between items-start">
            <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest font-mono">Metabolic Deviation</span>
            <Award className="h-4.5 w-4.5 text-purple-600" />
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            {deviation === 0 ? (
              <span className="text-4xl font-black font-mono tracking-tight text-slate-900">0</span>
            ) : (
              <span className={`text-4xl font-black font-mono tracking-tight flex items-center gap-1 ${
                deviation > 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {deviation > 0 ? <TrendingUp className="h-7 w-7 stroke-[3px]" /> : <TrendingDown className="h-7 w-7 stroke-[3px]" />}
                {deviation > 0 ? `+${Math.round(deviation)}` : Math.round(deviation)}
              </span>
            )}
            <span className="text-[10px] font-black text-slate-405 font-mono uppercase">kcal delta</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
            {deviation > 0
              ? 'Your real-world metabolism burns active energy faster than mathematics estimated!'
              : deviation < 0
              ? 'Metabolism runs slightly slower or less water output. Keep caloric counts strict.'
              : 'Add logs to analyze deviation coefficients.'}
          </p>
        </div>

        {/* Logs Reliability Rate */}
        <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between min-h-[145px] transition-all hover:translate-y-[-2px]">
          <div className="flex justify-between items-start">
            <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest font-mono">Calibration Score</span>
            <Database className="h-4.5 w-4.5 text-orange-600" />
          </div>
          <div className="my-2">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-4xl font-black font-mono tracking-tight text-slate-905">
                {adaptiveResults.reliabilityScore}%
              </span>
              <span className="text-[10px] font-black text-slate-450 font-mono uppercase">
                {logs.length} logged days
              </span>
            </div>
            {/* simple micro progress bar */}
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border-2 border-slate-905">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${adaptiveResults.reliabilityScore}%` }}
              ></div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
            Accuracy scales with consistency. For extreme accuracy, weigh daily under identical morning conditions.
          </p>
        </div>

        {/* Historic Energy Change block */}
        <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between min-h-[145px] transition-all hover:translate-y-[-2px]">
          <div className="flex justify-between items-start">
            <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest font-mono">Net Weight Change</span>
            <BarChart2 className="h-4.5 w-4.5 text-sky-600" />
          </div>
          <div className="my-2">
            <span className={`text-4xl font-black font-mono tracking-tight ${
              adaptiveResults.overallWeightChange <= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {adaptiveResults.overallWeightChange > 0 ? `+${adaptiveResults.overallWeightChange}` : adaptiveResults.overallWeightChange}{' '}
              <span className="text-lg font-black text-slate-400 font-mono uppercase ml-0.5">
                {unitSystem === 'metric' ? 'kg' : 'lbs'}
              </span>
            </span>
            <span className="text-[10px] font-black text-slate-400 block mt-1 uppercase font-mono">across {adaptiveResults.daysAnalyzed} days</span>
          </div>
          <p className="text-[10px] text-slate-550 leading-relaxed font-semibold">
            Average caloric intake during this active timeline represents{' '}
            <strong className="text-slate-900 font-mono">{adaptiveResults.averageCalorieIntake} kcal/day</strong>.
          </p>
        </div>
      </div>

      {/* Main split: Input and history vs Graphic Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input group and logs ledger table */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Daily log input form */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
            <span className="text-[9px] font-black tracking-widest text-orange-600 uppercase font-mono block">LEDGER METRICS</span>
            <h3 className="text-lg font-black text-slate-905 flex items-center gap-1.5 mt-0.5 uppercase tracking-tight">
              <Calendar className="h-5 w-5 text-orange-550" />
              Log Daily Coordinates
            </h3>

            <form onSubmit={handleAddLog} className="flex flex-col gap-4 mt-4" id="add-log-form">
              {/* Date selection component */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Logging Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/55"
                  required
                />
              </div>

              {/* Responsive Inputs: Weight & Calories side-by-side */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Weight ({unitSystem === 'metric' ? 'kg' : 'lbs'})</label>
                  <input
                    type="number"
                    id="log-weight-input"
                    step="0.1"
                    min="20"
                    max="600"
                    placeholder={unitSystem === 'metric' ? '78.5' : '172.4'}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/55"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-505 font-mono">Calories (kcal)</label>
                  <input
                    type="number"
                    id="log-calories-input"
                    min="500"
                    max="10000"
                    placeholder="2450"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/55"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-slate-505 font-mono">Diary Notes (optional)</label>
                <input
                  type="text"
                  placeholder="Sodium day, legs day, heavy lifts..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/55"
                />
              </div>

              <button
                type="submit"
                id="save-log-btn"
                className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)] font-black py-2.5 rounded-xl text-xs cursor-pointer transition-all"
              >
                <Plus className="h-4.5 w-4.5 text-orange-450 stroke-[3px]" /> Save Coordinate Log
              </button>
            </form>
          </div>

          {/* Quick options panel */}
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-3">
            <h4 className="text-xs font-black text-slate-700 uppercase font-mono font-bold">Database Options</h4>
            <div className="grid grid-cols-2 gap-3.5">
              <button
                onClick={handleLoadSampleData}
                className="flex items-center justify-center gap-1 bg-orange-50 hover:bg-orange-100 border-2 border-slate-900 text-slate-900 font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wide font-mono shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-orange-655" /> Seed Data
              </button>
              <button
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className="flex items-center justify-center gap-1 bg-white hover:bg-rose-50 border-2 border-slate-900 text-slate-700 hover:text-rose-905 font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wide font-mono cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Erase Cache
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Graphic Dashboard */}
        <div className="lg:col-span-8 bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center border-b-2 border-slate-100 pb-4">
            <div>
              <span className="text-[9px] tracking-widest uppercase font-black font-mono text-orange-600 block">METABOLIC CURVES</span>
              <span className="text-base font-black text-slate-905 uppercase tracking-wide mt-0.5 block">Performance Plots</span>
            </div>

            {/* Toggle Graph tabs options */}
            <div className="flex bg-slate-100 p-1 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <button
                onClick={() => setGraphTab('weight')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase font-mono transition-all cursor-pointer ${
                  graphTab === 'weight'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                Weight Logs Chart
              </button>
              <button
                onClick={() => setGraphTab('tdee')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase font-mono transition-all cursor-pointer ${
                  graphTab === 'tdee'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                Adaptive TDEE Chart
              </button>
            </div>
          </div>

          {/* Graphical rendering element container */}
          <div className="h-72 w-full mt-2">
            {chartData.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-6 gap-3 border-4 border-dashed border-slate-205 rounded-3xl bg-slate-50">
                <CircleAlert className="h-9 w-9 text-orange-500" />
                <div className="text-center">
                  <p className="font-black text-slate-900 text-xs uppercase font-mono tracking-wider">No logs available in Cache</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[260px] font-semibold">
                    To see metabolic visualizations, please enter daily data or click <strong>Seed Data</strong> on options panel.
                  </p>
                </div>
              </div>
            ) : graphTab === 'weight' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 1.5', 'dataMax + 1.5']}
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '16px',
                      color: '#ffffff',
                      border: '2px solid #000000',
                      boxShadow: '4px 4px 0px 0px #000000',
                      fontSize: '11px',
                      fontWeight: 900,
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" />
                  <Area
                    type="monotone"
                    name={`Weight (${unitSystem === 'metric' ? 'kg' : 'lbs'})`}
                    dataKey="weight"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorWeight)"
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['dataMin - 300', 'dataMax + 300']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '16px',
                      color: '#ffffff',
                      border: '2px solid #000000',
                      boxShadow: '4px 4px 0px 0px #000000',
                      fontSize: '11px',
                      fontWeight: 900,
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" />
                  <Line
                    type="monotone"
                    name="Intake (kcal)"
                    dataKey="cal"
                    stroke="#1e293b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    name="Adaptive TDEE"
                    dataKey="tdee"
                    stroke="#fb923c"
                    strokeWidth={3.5}
                    dot={{ r: 4, strokeWidth: 1.5 }}
                    activeDot={{ r: 7, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Details table Ledger */}
          {chartData.length > 0 && (
            <div className="mt-4 flex flex-col gap-2.5">
              <span className="text-[10px] uppercase font-black text-slate-450 font-mono tracking-widest">Ledger Database ({logs.length} days)</span>
              <div className="max-h-[190px] overflow-y-auto overflow-x-auto border-2 border-slate-905 rounded-2xl">
                <table className="w-full text-[11px] text-left text-slate-600">
                  <thead className="bg-slate-50 text-[9px] uppercase font-mono border-b-2 border-slate-900 sticky top-0 font-bold text-slate-605">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Log Weight</th>
                      <th className="px-3 py-2.5">Cal Budget Intake</th>
                      <th className="px-3 py-2.5">Diary Logs Details</th>
                      <th className="px-3 py-2.5 text-right font-black">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {chartData
                      .slice()
                      .reverse()
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-55/40 font-semibold transition-colors">
                          <td className="px-3 py-2 font-mono font-bold text-slate-705">{log.date}</td>
                          <td className="px-3 py-2 font-mono text-blue-650 font-extrabold">
                            {log.weight} {unitSystem === 'metric' ? 'kg' : 'lbs'}
                          </td>
                          <td className="px-3 py-2 font-mono text-orange-600 font-extrabold">{log.cal.toLocaleString()} kcal</td>
                          <td className="px-3 py-2 truncate max-w-[150px] text-slate-555">
                            {log.notes || '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete log"
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
