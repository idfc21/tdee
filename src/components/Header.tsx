import { Activity, ShieldCheck, Flame, Leaf, Sparkles } from 'lucide-react';

interface HeaderProps {
  unitSystem: 'metric' | 'imperial';
  onToggleUnits: () => void;
  themeStyle: 'soft-cozy' | 'samsung-active';
  onChangeThemeStyle: (style: 'soft-cozy' | 'samsung-active') => void;
  language?: 'en' | 'ru';
}

export default function Header({
  unitSystem,
  onToggleUnits,
  themeStyle,
  onChangeThemeStyle,
  language = 'ru',
}: HeaderProps) {
  const isRu = language === 'ru';
  const isActive = themeStyle === 'samsung-active';

  return (
    <header className={`border-b sticky top-0 z-40 select-none transition-colors duration-200 ${
      isActive 
        ? 'bg-[#0a0d16] border-[#1f2538] text-white' 
        : 'bg-[#faf9f5] border-[#e9e8e2] text-slate-900'
    }`}>
      <div className="mx-auto flex max-w-7xl h-16 sm:h-20 items-center justify-between px-2.5 sm:px-6 lg:px-8">
        {/* Brand logo / tag */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-slate-950 text-white border border-slate-800">
            <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-[#00c08b]" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] sm:text-[10px] font-bold tracking-widest text-slate-450 uppercase block font-mono truncate">Metabolic Engine v3.0</span>
            <h1 className={`text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-1 uppercase leading-none mt-0.5 ${
              isActive ? 'text-white' : 'text-slate-900'
            }`}>
              IDFC
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full border shrink-0 font-bold ${
                isActive 
                  ? 'text-blue-400 bg-blue-950/40 border-blue-800/50' 
                  : 'text-[#00c08b] bg-[#00c08b]/5 border-[#00c08b]/10'
              }`}>
                {isActive ? 'ACTIVE Health' : 'COZY Soft'}
              </span>
            </h1>
          </div>
        </div>

        {/* Action button groupings */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Quick Premium Theme Switcher */}
          <div className={`p-1 rounded-2xl border flex gap-1 items-center transition-colors ${
            isActive ? 'bg-[#121727] border-[#222a41]' : 'bg-slate-200/50 border-slate-300/30'
          }`}>
            <button
              onClick={() => onChangeThemeStyle('soft-cozy')}
              title={isRu ? 'Мягкий уютный дизайн' : 'Soft Cozy design'}
              className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-150 cursor-pointer ${
                themeStyle === 'soft-cozy'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isActive 
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Leaf className="h-3 w-3 shrink-0" />
              <span className="hidden xs:inline">{isRu ? 'Уютный' : 'Cozy'}</span>
            </button>
            <button
              onClick={() => onChangeThemeStyle('samsung-active')}
              title={isRu ? 'Стиль Samsung Health Active' : 'Samsung Health Active style'}
              className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-150 cursor-pointer ${
                themeStyle === 'samsung-active'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isActive
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              <span className="hidden xs:inline">{isRu ? 'Samsung' : 'Active'}</span>
            </button>
          </div>

          <button
            onClick={onToggleUnits}
            id="toggle-units-btn"
            className={`flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 ${
              isActive 
                ? 'bg-[#121727] border-[#222a41] text-[#00c08b] hover:border-[#00c08b]/50'
                : 'bg-white border-slate-300/60 text-slate-950 hover:border-[#00c08b]/30'
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-[#00c08b] shrink-0" />
            <span className="font-bold text-[#00c08b] uppercase font-mono">
              <span className="hidden sm:inline">UNITS: </span>
              {unitSystem}
            </span>
          </button>

          <div className={`hidden lg:flex gap-3 items-center border-l pl-4 ${
            isActive ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">USER SESSION</p>
              <p className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-900'}`}>Kisher59</p>
            </div>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${
              isActive ? 'bg-[#1b2238] hover:bg-[#252f4c] text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-850'
            }`}>
              KK
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
