import { useState, useEffect } from 'react';
import { UserBioProfile, DailyLog } from './types';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import { lbsToKg, kgToLbs, inToCm, cmToIn } from './utils/calc';

// Standard Initial Bio Profile Defaults
const DEFAULT_PROFILE: UserBioProfile = {
  gender: 'male',
  weight: 80, // 80 kg
  height: 180, // 180 cm
  age: 26,
  activityLevel: 'moderately_active',
  formula: 'mifflin',
  unitSystem: 'metric',
  goal: 'maintain',
  macroType: 'balanced',
  heightFt: 5,
  heightIn: 11,
};

export default function App() {
  const [profile, setProfile] = useState<UserBioProfile>(DEFAULT_PROFILE);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem('tdee_user_profile');
      const storedLogs = localStorage.getItem('tdee_daily_logs');

      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      }
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      }
    } catch (e) {
      console.error('Failed to load local storage datasets', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateProfile = (newProfile: UserBioProfile) => {
    setProfile(newProfile);
    localStorage.setItem('tdee_user_profile', JSON.stringify(newProfile));
  };

  const handleUpdateLogs = (newLogs: DailyLog[]) => {
    setLogs(newLogs);
    localStorage.setItem('tdee_daily_logs', JSON.stringify(newLogs));
  };

  // Convert unit system cleanly (weight, height variables, and all historic log entries dynamically!)
  const handleToggleUnits = () => {
    const nextSystem = profile.unitSystem === 'metric' ? 'imperial' : 'metric';
    let nextWeight = profile.weight;
    let nextHeight = profile.height;
    let nextHeightFt = profile.heightFt || 5;
    let nextHeightIn = profile.heightIn || 11;

    if (nextSystem === 'imperial') {
      // Metric -> Imperial
      nextWeight = Math.round(kgToLbs(profile.weight) * 10) / 10;
      const totalInches = Math.round(cmToIn(profile.height));
      nextHeightFt = Math.floor(totalInches / 12);
      nextHeightIn = totalInches % 12;
    } else {
      // Imperial -> Metric
      nextWeight = Math.round(lbsToKg(profile.weight) * 10) / 10;
      const totalInches = nextHeightFt * 12 + nextHeightIn;
      nextHeight = Math.round(inToCm(totalInches));
    }

    // Convert weights in historic entries cleanly in place
    const updatedLogs = logs.map((log) => {
      const convertedWeight =
        nextSystem === 'imperial'
          ? Math.round(kgToLbs(log.weight) * 10) / 10
          : Math.round(lbsToKg(log.weight) * 10) / 10;
      return {
        ...log,
        weight: convertedWeight,
      };
    });

    const updatedProfile = {
      ...profile,
      unitSystem: nextSystem,
      weight: nextWeight,
      height: nextHeight,
      heightFt: nextHeightFt,
      heightIn: nextHeightIn,
    };

    setProfile(updatedProfile);
    setLogs(updatedLogs);

    localStorage.setItem('tdee_user_profile', JSON.stringify(updatedProfile));
    localStorage.setItem('tdee_daily_logs', JSON.stringify(updatedLogs));
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-400 font-mono text-xs">
        Booting TDEE Tracker Systems...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 antialiased flex flex-col">
      {/* Header bar */}
      <Header unitSystem={profile.unitSystem} onToggleUnits={handleToggleUnits} />

      {/* Main Container Dashboard */}
      <main className="flex-1 w-full flex flex-col">
        <DashboardOverview
          profile={profile}
          logs={logs}
          onUpdateProfile={handleUpdateProfile}
          onUpdateLogs={handleUpdateLogs}
        />
      </main>

      {/* Simple decorative page footer */}
      <footer className="border-t border-slate-100 bg-white py-4 text-center text-[10px] text-slate-400 font-mono">
        &copy; {new Date().getFullYear()} TDEE Empirical Tracker Engine &bull; Private & Secure
      </footer>
    </div>
  );
}
