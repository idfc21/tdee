import { useState } from 'react';
import { UserBioProfile, MealAllocation } from '../types';
import { calculateTheoreticalTDEE, calculateMacroTargets } from '../utils/calc';
import { Soup, Coffee, Sun, Sunset, Info, Settings, Sparkles } from 'lucide-react';

interface MealPlannerProps {
  profile: UserBioProfile;
  adaptiveTdee?: number;
  lang?: string;
}

export default function MealPlanner({ profile, adaptiveTdee, lang = 'en' }: MealPlannerProps) {
  const [allocation, setAllocation] = useState<MealAllocation>({
    breakfast: 30,
    lunch: 35,
    dinner: 20,
    snack: 15,
  });

  const targetCalories = adaptiveTdee || calculateTheoreticalTDEE(profile);
  const macroTargets = calculateMacroTargets(targetCalories, profile);

  const handleSliderChange = (meal: keyof MealAllocation, val: number) => {
    const nextAlloc = { ...allocation, [meal]: val };
    setAllocation(nextAlloc);
  };

  const total = allocation.breakfast + allocation.lunch + allocation.dinner + allocation.snack;
  const isExactSum = total === 100;

  const applyPreset = (presetName: 'even' | 'standard' | 'nosnacks' | 'intermittent') => {
    let newAlloc: MealAllocation;
    switch (presetName) {
      case 'even':
        newAlloc = { breakfast: 25, lunch: 25, dinner: 25, snack: 25 };
        break;
      case 'nosnacks':
        newAlloc = { breakfast: 35, lunch: 40, dinner: 25, snack: 0 };
        break;
      case 'intermittent':
        newAlloc = { breakfast: 0, lunch: 50, dinner: 40, snack: 10 };
        break;
      case 'standard':
      default:
        newAlloc = { breakfast: 30, lunch: 35, dinner: 20, snack: 15 };
        break;
    }
    setAllocation(newAlloc);
  };

  const computeMealSplit = (percent: number) => {
    const fraction = percent / 100;
    return {
      cal: Math.round(targetCalories * fraction),
      protein: Math.round(macroTargets.proteinGrams * fraction),
      carb: Math.round(macroTargets.carbGrams * fraction),
      fat: Math.round(macroTargets.fatGrams * fraction),
    };
  };

  const mealsList = [
    {
      id: 'breakfast',
      name: lang === 'ru' ? 'Завтрак — утренняя энергия' : 'Breakfast Morning Fuel',
      labelRu: 'Завтрак',
      labelEn: 'Breakfast',
      icon: <Coffee className="h-5 w-5 text-amber-500" />,
      color: 'border-amber-100 bg-amber-50/20 backdrop-blur-xs',
      text: 'text-amber-800',
      p: allocation.breakfast,
      recipes: {
        balanced: lang === 'ru' 
          ? 'Овсянка с сывороточным протеином, грецкими орехами, семенами чиа и свежими ягодами.'
          : 'Oatmeal with whey isolate, walnut halves, chia seeds, and fresh berries.',
        high_protein: lang === 'ru'
          ? 'Яичница из яичных белков с ломтиками индейки, шпинатом, грибами и хрустящим тостом.'
          : 'Egg-white scrambled wrap, with low-fat turkey bacon, spinach and mushrooms.',
        low_fat: lang === 'ru'
          ? 'Большая порция медовых овсяных хлопьев с теплым обезжиренным молоком и бананом.'
          : 'Large bowl of honey oat cluster flakes, fat-free milk, and whole banana.',
        keto: lang === 'ru'
          ? 'Яичница на сливочном масле из цельных яиц с кусочками авокадо, беконом и сыром фета.'
          : 'Whole pasture eggs scrambled in butter, with sliced avocado, uncured bacon and goat cheese.',
        custom: lang === 'ru'
          ? 'Сбалансированная овсянка с добавлением легких легкоусвояемых белков.'
          : 'Macro balanced breakfast oatmeal containing lean structural proteins.'
      }
    },
    {
      id: 'lunch',
      name: lang === 'ru' ? 'Обед — дневное насыщение' : 'Lunch Midday Nutrition',
      labelRu: 'Обед',
      labelEn: 'Lunch',
      icon: <Sun className="h-5 w-5 text-teal-500" />,
      color: 'border-teal-100 bg-teal-50/20 backdrop-blur-xs',
      text: 'text-teal-800',
      p: allocation.lunch,
      recipes: {
        balanced: lang === 'ru'
          ? 'Тарелка с нежной обжаренной куриной грудкой, киноа, соцветиями брокколи и заправкой из оливкового масла.'
          : 'Seared chicken breast bowl with red quinoa, broccoli florets, and olive oil dressing.',
        high_protein: lang === 'ru'
          ? 'Филе трески на пару или запеченная индейка, рис жасмин и гарнир из стручковой фасоли.'
          : 'Baked wild cod or shredded turkey breast, jasmine rice, and unlimited steamed green beans.',
        low_fat: lang === 'ru'
          ? 'Легкий салат с диким тунцом, бальзамическим уксусом, запеченным бататом и яблоками.'
          : 'Tuna meat salad with balsamic glaze, baked sweet potato, and sliced apples.',
        keto: lang === 'ru'
          ? 'Медленно тушеная мраморная говядина на топленом масле с порцией спаржи на гриле.'
          : 'Slow cooked beef roast top sirloin, sautéed in grass-fed tallow, side of asparagus.',
        custom: lang === 'ru'
          ? 'Микс качественного нежирного белка с гарниром из полезных сложных углеводов.'
          : 'Lean structural protein lunch bowl alongside complex starch fuel.'
      }
    },
    {
      id: 'dinner',
      name: lang === 'ru' ? 'Ужин — восстановление сил' : 'Dinner Recover Block',
      labelRu: 'Ужин',
      labelEn: 'Dinner',
      icon: <Sunset className="h-5 w-5 text-indigo-500" />,
      color: 'border-indigo-100 bg-indigo-50/20 backdrop-blur-xs',
      text: 'text-indigo-800',
      p: allocation.dinner,
      recipes: {
        balanced: lang === 'ru'
          ? 'Запеченное филе дикого лосося, молодой обжаренный картофель и цукини на кунжутном масле.'
          : 'Baked coho salmon fillet, baby yellow potatoes, roasted zucchini in sesame oil.',
        high_protein: lang === 'ru'
          ? 'Котлеты из постной говядины или грудки индейки, отварной рис и салат из свежих томатов и шпината.'
          : 'Lean 96% beef patties or turkey bowls, white rice, side of kimchi and spinach.',
        low_fat: lang === 'ru'
          ? 'Белая рыба на гриле, цельнозерновая теплая пита, свежая мини-морковь и домашний хумус.'
          : 'Baked cod fillets with whole wheat pita slices, sweet baby carrots, hummus dip.',
        keto: lang === 'ru'
          ? 'Сочные свиные отбивные под нежным сливочным соусом и запеченная брокколи с тертым чеддером.'
          : 'Pork chops with cream cheese butter sauce, baked broccoli with cheddar melt.',
        custom: lang === 'ru'
          ? 'Легкий ужин с упором на белок и зеленые сезонные хрустящие овощи.'
          : 'Recomposition dinner focus with low glycemic vegetables.'
      }
    },
    {
      id: 'snack',
      name: lang === 'ru' ? 'Перекусы и подпитка' : 'Snacks & Intra Energy',
      labelRu: 'Перекус',
      labelEn: 'Snack',
      icon: <Soup className="h-5 w-5 text-purple-500" />,
      color: 'border-purple-100 bg-purple-50/20 backdrop-blur-xs',
      text: 'text-purple-800',
      p: allocation.snack,
      recipes: {
        balanced: lang === 'ru'
          ? 'Густой греческий йогурт высокой жирности с горстью миндаля и щепоткой корицы.'
          : 'Greek whole milk yogurt with raw almonds and ground cinnamon.',
        high_protein: lang === 'ru'
          ? 'Мицеллярный казеиновый коктейль или вяленое органическое мясо индейки/говядины.'
          : 'Micellar casein shake mixed with organic peanut butter, or beef jerky.',
        low_fat: lang === 'ru'
          ? 'Хрустящие рисовые хлебцы с натуральным ягодным джемом без добавления сахара.'
          : 'Rice cakes with low sugar berry jam, sliced rice wafers.',
        keto: lang === 'ru'
          ? 'Соленые отборные орехи макадамия, ломтики салями, стебли сельдерея с миндальной пастой.'
          : 'Salted macadamia nuts, dry salami cuts, celery sticks with organic almond butter.',
        custom: lang === 'ru'
          ? 'Полезный функциональный перекус, помогающий легко добрать нутриенты.'
          : 'Macro matching snacks to top off dietary requirements.'
      }
    }
  ] as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Allocation controllers and guidelines */}
      <div className="lg:col-span-5 bg-white/85 backdrop-blur-md rounded-3xl border border-[#eef1f6] p-6 shadow-sm flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#00c08b]" />
            {lang === 'ru' ? 'Калькулятор порций пищи' : 'Meal Budget Allocator'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ru'
              ? 'Распределите целевые калории на приемы пищи. Проценты влияют на граммовку макронутриентов.'
              : 'Split daily calories into custom meals. Ratios apply to macronutrient grams.'}
          </p>
        </div>

        {/* Presets Row */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {lang === 'ru' ? 'Быстрые шаблоны' : 'Fast Ratio Presets'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => applyPreset('standard')}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer text-left sm:text-center"
            >
              {lang === 'ru' ? 'Классика (30 / 35 / 20 / 15)' : 'Standard (30/35/20/15)'}
            </button>
            <button
              onClick={() => applyPreset('even')}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer text-left sm:text-center"
            >
              {lang === 'ru' ? 'Равномерно (по 25%)' : 'Even split (25% each)'}
            </button>
            <button
              onClick={() => applyPreset('nosnacks')}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer text-left sm:text-center"
            >
              {lang === 'ru' ? 'Без перекусов (35 / 40 / 25 / 0)' : 'No snacks (35/40/25/0)'}
            </button>
            <button
              onClick={() => applyPreset('intermittent')}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer text-left sm:text-center"
            >
              {lang === 'ru' ? 'Окно поста (0 / 50 / 40 / 10)' : 'Fast window (0/50/40/10)'}
            </button>
          </div>
        </div>

        {/* Interactive Sliders list */}
        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 mt-1">
          {mealsList.map((meal) => (
            <div key={meal.id} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-700 flex items-center gap-1.5 font-bold">
                  {meal.icon}
                  {lang === 'ru' ? meal.labelRu : meal.labelEn} {lang === 'ru' ? '— Доля' : 'Rate'}
                </span>
                <span className="font-mono text-[#00c08b] font-bold bg-[#00c08b]/5 px-2 py-0.5 rounded border border-[#00c08b]/10">
                  {meal.p}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={meal.p}
                onChange={(e) => handleSliderChange(meal.id as keyof MealAllocation, parseInt(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-[#00c08b]"
              />
            </div>
          ))}
        </div>

        {/* Validation error msg alerts */}
        {!isExactSum ? (
          <div className="bg-rose-50 text-rose-800 border-rose-100 border text-[10px] font-bold p-2.5 rounded-xl flex items-center gap-2">
            <Info className="h-4 w-4 text-rose-500 shrink-0" />
            <span>
              {lang === 'ru'
                ? `Сумма приемов пищи должна составлять ровно 100%. Текущая сумма: ${total}%.`
                : `Meal allocation percentages must sum up to exactly 100%. Current total is ${total}%.`}
            </span>
          </div>
        ) : (
          <div className="bg-emerald-50 text-emerald-800 border-emerald-100 border text-[10px] font-bold p-2.5 rounded-xl flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              {lang === 'ru'
                ? '🎉 Идеально! Достигнуто точное распределение в 100%!'
                : '🎉 Outstanding! Exact 100% budget breakdown mapping achieved!'}
            </span>
          </div>
        )}
      </div>

      {/* Main recipe outputs columns */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {mealsList.map((meal) => {
          const stats = computeMealSplit(meal.p);
          if (meal.p <= 0) return null; // hide if allocated to 0

          return (
            <div
              key={meal.id}
              className={`rounded-2xl border p-5 flex flex-col md:flex-row gap-5 items-start justify-between shadow-sm transition-all duration-300 ${meal.color}`}
            >
              {/* Left group */}
              <div className="flex flex-col gap-2.5 max-w-full md:max-w-[65%]">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                    {meal.icon}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">{meal.name}</h3>
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    {lang === 'ru' ? 'Рецепт Шеф-Повара (Цельное питание)' : 'Suggested Whole Foods Chef Recipe'}
                  </span>
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                    {meal.recipes[profile.macroType] || meal.recipes.balanced}
                  </p>
                </div>
              </div>

              {/* Meal calorie block statistics details */}
              <div className="bg-white rounded-2xl p-4 border border-slate-150 min-w-full md:min-w-[170px] flex flex-col gap-3 shadow-inner">
                <div className="border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                    {lang === 'ru' ? 'Энергия приема' : 'Energy Split'}
                  </span>
                  <span className="text-lg font-black text-slate-800 font-mono tracking-tight block">
                    {stats.cal.toLocaleString()} <span className="text-xs font-medium text-slate-500">{lang === 'ru' ? 'ккал' : 'kcal'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  <div className="text-center bg-slate-50 py-1.5 px-1 rounded-lg border border-slate-100">
                    <span className="text-[8px] font-bold text-rose-500 uppercase font-mono block">
                      {lang === 'ru' ? 'БЕЛ' : 'PRO'}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-slate-700">{stats.protein}g</span>
                  </div>
                  <div className="text-center bg-slate-50 py-1.5 px-1 rounded-lg border border-slate-100">
                    <span className="text-[8px] font-bold text-amber-500 uppercase font-mono block">
                      {lang === 'ru' ? 'УГЛ' : 'CARB'}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-slate-700">{stats.carb}g</span>
                  </div>
                  <div className="text-center bg-slate-50 py-1.5 px-1 rounded-lg border border-slate-100">
                    <span className="text-[8px] font-bold text-sky-500 uppercase font-mono block">
                      {lang === 'ru' ? 'ЖИР' : 'FAT'}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-slate-700">{stats.fat}g</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
