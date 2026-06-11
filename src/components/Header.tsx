import { Activity, ShieldCheck, Flame } from 'lucide-react';

interface HeaderProps {
  unitSystem: 'metric' | 'imperial';
  onToggleUnits: () => void;
}

export default function Header({ unitSystem, onToggleUnits }: HeaderProps) {
  return (
    <header className="border-b-2 border-slate-900 bg-white sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(249,115,22,1)]">
            <Flame className="h-6 w-6 text-orange-400 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block font-mono">Metabolic Engine v2.4</span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 uppercase">
              TDEE Analytics
              <span className="text-orange-600 font-extrabold text-[10px] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                STABLE
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onToggleUnits}
            id="toggle-units-btn"
            className="flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-3.5 py-1.5 text-xs font-black text-slate-900 hover:bg-slate-50 active:translate-y-0.5 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
          >
            <Activity className="h-4 w-4 text-orange-500" />
            UNITS: <span className="font-black text-orange-600 uppercase">{unitSystem}</span>
          </button>

          <div className="hidden lg:flex gap-3 items-center border-l-2 border-slate-100 pl-4">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">USER SESSION</p>
              <p className="text-xs font-bold text-slate-900 underline decoration-2 decoration-orange-500">Kisher59</p>
            </div>
            <div className="w-9 h-9 bg-slate-900 hover:bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow-[2px_2px_0px_0px_rgba(249,115,22,1)] font-mono">
              KK
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
