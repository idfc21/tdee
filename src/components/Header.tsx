import { Activity, ShieldCheck, Flame } from 'lucide-react';

interface HeaderProps {
  unitSystem: 'metric' | 'imperial';
  onToggleUnits: () => void;
}

export default function Header({ unitSystem, onToggleUnits }: HeaderProps) {
  return (
    <header className="border-b border-slate-100 bg-white sticky top-0 z-40 select-none">
      <div className="mx-auto flex max-w-7xl h-16 sm:h-20 items-center justify-between px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-slate-950 text-white">
            <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] sm:text-[10px] font-bold tracking-widest text-slate-400 uppercase block font-mono truncate">Metabolic Engine v2.4</span>
            <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1 sm:gap-1.5 uppercase leading-none mt-0.5">
              IDFC
              <span className="text-orange-600 font-bold text-[8px] sm:text-[10px] bg-orange-50 px-1.5 py-0.5 sm:px-2 rounded-full border border-orange-100 shrink-0">
                STABLE
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={onToggleUnits}
            id="toggle-units-btn"
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-slate-950 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
          >
            <Activity className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <span className="font-bold text-orange-600 uppercase">
              <span className="hidden sm:inline">UNITS: </span>
              {unitSystem}
            </span>
          </button>

          <div className="hidden lg:flex gap-3 items-center border-l border-slate-100 pl-4">
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">USER SESSION</p>
              <p className="text-xs font-semibold text-slate-900">Kisher59</p>
            </div>
            <div className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-800 text-xs font-bold font-mono">
              KK
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
