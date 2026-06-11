export interface FoodDbItem {
  id: string;
  name: string;
  brand?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  region: 'us' | 'ru' | 'ua' | 'global';
  lang: 'en' | 'ru' | 'uk';
  tags: string[]; // for search optimization
}

export const LOCAL_FOOD_DATABASE: FoodDbItem[] = [
  // --- US / GENERAL ENGLISH CLEAN GYM FOODS ---
  {
    id: 'l-chicken-breast',
    name: 'Grilled Chicken Breast',
    brand: 'Clean Whole Food',
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    region: 'us',
    lang: 'en',
    tags: ['chicken', 'breast', 'poultry', 'meat', 'grilled', 'грудка', 'курица', 'курятина', 'гриль', 'грудинка']
  },
  {
    id: 'l-white-rice',
    name: 'White Rice (Cooked)',
    brand: 'Whole Food',
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
    region: 'us',
    lang: 'en',
    tags: ['rice', 'white', 'carb', 'cooked', 'рис', 'белый', 'вареный', 'білий', 'варений']
  },
  {
    id: 'l-brown-rice',
    name: 'Brown Rice (Cooked)',
    brand: 'Whole Food',
    caloriesPer100g: 111,
    proteinPer100g: 2.6,
    carbsPer100g: 23,
    fatPer100g: 0.9,
    region: 'us',
    lang: 'en',
    tags: ['rice', 'brown', 'carb', 'cooked', 'рис', 'бурый', 'коричневый', 'вареный', 'кричневий']
  },
  {
    id: 'l-oatmeal',
    name: 'Oatmeal (Cooked in Water)',
    brand: 'Whole Food',
    caloriesPer100g: 68,
    proteinPer100g: 2.4,
    carbsPer100g: 12,
    fatPer100g: 1.4,
    region: 'us',
    lang: 'en',
    tags: ['oatmeal', 'oats', 'porridge', 'cooked', 'овсянка', 'овесяная', 'каша', 'геркулес', 'вівсянка', 'вівсяна']
  },
  {
    id: 'l-beef-steak',
    name: 'Grilled Sirloin Beef Steak',
    brand: 'Beef Cut',
    caloriesPer100g: 244,
    proteinPer100g: 27,
    carbsPer100g: 0,
    fatPer100g: 15,
    region: 'us',
    lang: 'en',
    tags: ['beef', 'steak', 'sirloin', 'meat', 'grilled', 'говядина', 'стейк', 'яловичина']
  },
  {
    id: 'l-salmon',
    name: 'Salmon Fillet (Baked)',
    brand: 'Whole Food',
    caloriesPer100g: 206,
    proteinPer100g: 22,
    carbsPer100g: 0,
    fatPer100g: 12,
    region: 'us',
    lang: 'en',
    tags: ['salmon', 'fish', 'omega3', 'baked', 'лосось', 'семга', 'рыба', 'риба']
  },
  {
    id: 'l-tuna-canned',
    name: 'Canned Tuna (In Water)',
    brand: 'Whole Food',
    caloriesPer100g: 116,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 1,
    region: 'us',
    lang: 'en',
    tags: ['tuna', 'fish', 'canned', 'water', 'тунец', 'консервы', 'тунець', 'консерва']
  },
  {
    id: 'l-whole-egg',
    name: 'Whole Hard-Boiled Egg',
    brand: 'Pasture Egg',
    caloriesPer100g: 155,
    proteinPer100g: 13,
    carbsPer100g: 1.1,
    fatPer100g: 11,
    region: 'us',
    lang: 'en',
    tags: ['egg', 'eggs', 'boiled', 'whole', 'яйцо', 'яйца', 'вареное', 'варені', 'яйця']
  },
  {
    id: 'l-egg-white',
    name: 'Liquid Egg Whites',
    brand: 'Egg Whites',
    caloriesPer100g: 52,
    proteinPer100g: 11,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    region: 'us',
    lang: 'en',
    tags: ['egg', 'white', 'liquid', 'protein', 'белок', 'яичный', 'білок']
  },
  {
    id: 'l-whey-protein',
    name: 'Whey Protein Powder',
    brand: 'Supplement',
    caloriesPer100g: 390,
    proteinPer100g: 80,
    carbsPer100g: 6,
    fatPer100g: 5,
    region: 'us',
    lang: 'en',
    tags: ['whey', 'protein', 'powder', 'supplement', 'shake', 'протеин', 'изолят', 'концентрат']
  },
  {
    id: 'l-banana',
    name: 'Banana (Raw)',
    brand: 'Fresh Fruit',
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 23,
    fatPer100g: 0.3,
    region: 'us',
    lang: 'en',
    tags: ['banana', 'fruit', 'banana', 'raw', 'банан', 'бананы']
  },
  {
    id: 'l-apple',
    name: 'Apple (with skin)',
    brand: 'Fresh Fruit',
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 14,
    fatPer100g: 0.2,
    region: 'us',
    lang: 'en',
    tags: ['apple', 'fruit', 'raw', 'яблоко', 'яблуко', 'свежее']
  },
  {
    id: 'l-peanut-butter',
    name: 'Peanut Butter (Smooth)',
    brand: 'Whole Nut',
    caloriesPer100g: 588,
    proteinPer100g: 25,
    carbsPer100g: 20,
    fatPer100g: 50,
    region: 'us',
    lang: 'en',
    tags: ['peanut', 'butter', 'fats', 'nut', 'арахисовая', 'паста', 'масло', 'арахісова']
  },
  {
    id: 'l-greek-yogurt',
    name: 'Greek Yogurt 0% Fat',
    brand: 'Dairy',
    caloriesPer100g: 59,
    proteinPer100g: 10,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    region: 'us',
    lang: 'en',
    tags: ['yogurt', 'greek', 'diary', 'fatfree', 'йогурт', 'греческий', 'обезжиренный']
  },

  // --- RUSSIAN TRADITIONAL & STANDARD FOODS (RU) ---
  {
    id: 'l-buckwheat-ru',
    name: 'Гречневая каша вареная (Buckwheat)',
    brand: 'Традиционная кухня',
    caloriesPer100g: 110,
    proteinPer100g: 4.2,
    carbsPer100g: 21,
    fatPer100g: 1.1,
    region: 'ru',
    lang: 'ru',
    tags: ['гречка', 'гречневая', 'каша', 'крупа', 'отварная', 'buckwheat', 'grechka']
  },
  {
    id: 'l-borscht-beef',
    name: 'Борщ с говядиной (Borscht with Beef)',
    brand: 'Домашний',
    caloriesPer100g: 65,
    proteinPer100g: 4.5,
    carbsPer100g: 5.5,
    fatPer100g: 3.2,
    region: 'ru',
    lang: 'ru',
    tags: ['борщ', 'суп', 'свекла', 'говядина', 'первое', 'borscht', 'soup', 'beef']
  },
  {
    id: 'l-tvorog-5',
    name: 'Творог 5% жирности (Cottage Cheese 5%)',
    brand: 'Молочные продукты',
    caloriesPer100g: 121,
    proteinPer100g: 16.5,
    carbsPer100g: 3.0,
    fatPer100g: 5.0,
    region: 'ru',
    lang: 'ru',
    tags: ['творог', 'молоко', 'белок', 'кальций', 'tvorog', 'cottage', 'cheese']
  },
  {
    id: 'l-tvorog-9',
    name: 'Творог 9% жирности (Cottage Cheese 9%)',
    brand: 'Молочные продукты',
    caloriesPer100g: 157,
    proteinPer100g: 16.0,
    carbsPer100g: 3.0,
    fatPer100g: 9.0,
    region: 'ru',
    lang: 'ru',
    tags: ['творог', 'молоко', 'кисляк', 'tvorog']
  },
  {
    id: 'l-syrniki',
    name: 'Сырники из творога запеченые (Syrniki)',
    brand: 'Домашняя выпечка',
    caloriesPer100g: 215,
    proteinPer100g: 15.0,
    carbsPer100g: 17.0,
    fatPer100g: 8.5,
    region: 'ru',
    lang: 'ru',
    tags: ['сырники', 'творог', 'завтрак', 'сладкое', 'syrniki', 'pancakes']
  },
  {
    id: 'l-pelmeni',
    name: 'Пельмени мясные классические (Pelmeni)',
    brand: 'Сибирские',
    caloriesPer100g: 275,
    proteinPer100g: 11.5,
    carbsPer100g: 29.0,
    fatPer100g: 12.0,
    region: 'ru',
    lang: 'ru',
    tags: ['пельмени', 'тесто', 'мясо', 'фарш', 'ужин', 'pelmeni', 'dumplings']
  },
  {
    id: 'l-olivier',
    name: 'Салат Оливье с колбасой (Olivier Salad)',
    brand: 'Праздничный',
    caloriesPer100g: 198,
    proteinPer100g: 5.2,
    carbsPer100g: 8.5,
    fatPer100g: 15.8,
    region: 'ru',
    lang: 'ru',
    tags: ['оливье', 'салат', 'майонез', 'колбаса', 'новый', 'год', 'olivier', 'salad']
  },
  {
    id: 'l-kefir-1',
    name: 'Кефир 1% жирности (Kefir 1%)',
    brand: 'Молочные продукты',
    caloriesPer100g: 40,
    proteinPer100g: 3.0,
    carbsPer100g: 4.0,
    fatPer100g: 1.0,
    region: 'ru',
    lang: 'ru',
    tags: ['кефир', 'молоко', 'питьевой', 'напиток', 'kefir']
  },
  {
    id: 'l-ryazhenka',
    name: 'Ряженка 3.2% (Ryazhenka baked milk)',
    brand: 'Традиционная кухня',
    caloriesPer100g: 57,
    proteinPer100g: 3.0,
    carbsPer100g: 4.1,
    fatPer100g: 3.2,
    region: 'ru',
    lang: 'ru',
    tags: ['ряженка', 'топленое', 'молоко', 'кефир', 'ryazhenka']
  },
  {
    id: 'l-kotleta',
    name: 'Котлета домашняя куриная (Chicken Cutlet)',
    brand: 'Домашняя кухня',
    caloriesPer100g: 180,
    proteinPer100g: 18.0,
    carbsPer100g: 5.0,
    fatPer100g: 9.5,
    region: 'ru',
    lang: 'ru',
    tags: ['котлета', 'курица', 'фарш', 'жареная', 'мясо', 'cutlet', 'kotleta']
  },

  // --- UKRAINIAN TRADITIONAL & STANDARD FOODS (UA) ---
  {
    id: 'l-borscht-ua',
    name: 'Борщ Український класичний (Ukrainian Borscht)',
    brand: 'Національна кухня',
    caloriesPer100g: 58,
    proteinPer100g: 3.2,
    carbsPer100g: 6.2,
    fatPer100g: 2.5,
    region: 'ua',
    lang: 'uk',
    tags: ['борщ', 'український', 'буряк', 'сало', 'традиція', 'суп', 'перше', 'borscht', 'soup']
  },
  {
    id: 'l-salo',
    name: 'Сало свиняче солоне (Salo / Salted Pork Fat)',
    brand: 'Традиційне сало',
    caloriesPer100g: 816,
    proteinPer100g: 1.4,
    carbsPer100g: 0,
    fatPer100g: 90,
    region: 'ua',
    lang: 'uk',
    tags: ['сало', 'жир', 'українське', 'свиняче', 'закуска', 'salo', 'fat', 'pork']
  },
  {
    id: 'l-deruny',
    name: 'Деруни картопляні смажені (Deruny / Potato pancakes)',
    brand: 'Домашня кухня',
    caloriesPer100g: 195,
    proteinPer100g: 2.8,
    carbsPer100g: 26.0,
    fatPer100g: 9.0,
    region: 'ua',
    lang: 'uk',
    tags: ['деруни', 'драники', 'картопля', 'смажені', 'цибуля', 'deruny', 'pancakes']
  },
  {
    id: 'l-varenyky-cherry',
    name: 'Вареники з вишнею (Varenyky with cherries)',
    brand: 'Домашня кухня',
    caloriesPer100g: 185,
    proteinPer100g: 3.5,
    carbsPer100g: 39.0,
    fatPer100g: 1.2,
    region: 'ua',
    lang: 'uk',
    tags: ['вареники', 'пироги', 'вишня', 'солодкі', 'тісто', 'varenyky', 'dumplings', 'cherry']
  },
  {
    id: 'l-varenyky-potato',
    name: 'Вареники з картоплею (Varenyky with potatoes)',
    brand: 'Домашня кухня',
    caloriesPer100g: 172,
    proteinPer100g: 4.1,
    carbsPer100g: 34.0,
    fatPer100g: 2.0,
    region: 'ua',
    lang: 'uk',
    tags: ['вареники', 'картопля', 'цибуля', 'пісні', 'тісто', 'varenyky', 'potato']
  },
  {
    id: 'l-varenyky-tvorog',
    name: 'Вареники з сиром солодкі (Varenyky with sweet cottage cheese)',
    brand: 'Домашня кухня',
    caloriesPer100g: 210,
    proteinPer100g: 10.5,
    carbsPer100g: 32.0,
    fatPer100g: 4.5,
    region: 'ua',
    lang: 'uk',
    tags: ['вареники', 'сир', 'творог', 'солодкі', 'тісто', 'varenyky', 'cheese']
  },
  {
    id: 'l-holubtsi',
    name: 'Голубці з м\'ясом та рисом (Golubtsi / Cabbage rolls)',
    brand: 'Домашня кухня',
    caloriesPer100g: 112,
    proteinPer100g: 6.5,
    carbsPer100g: 10.5,
    fatPer100g: 5.2,
    region: 'ua',
    lang: 'uk',
    tags: ['голубці', 'капуста', 'фарш', 'рис', 'соус', 'вечеря', 'golubtsi', 'cabbage', 'rolls']
  },
  {
    id: 'l-borodinsky-bread',
    name: 'Хліб житній Бородинський (Borodinsky Rye Bread)',
    brand: 'Хлібозавод',
    caloriesPer100g: 208,
    proteinPer100g: 6.8,
    carbsPer100g: 40.0,
    fatPer100g: 1.3,
    region: 'ua',
    lang: 'uk',
    tags: ['хліб', 'бородинський', 'житній', 'чорний', 'коріандр', 'хлеб', 'bread', 'rye']
  },
  {
    id: 'l-domashnya-kovbasa',
    name: 'Ковбаса домашня запечена свиняча (Homemade Pork Sausage)',
    brand: 'Традиційна кухня',
    caloriesPer100g: 320,
    proteinPer100g: 16.0,
    carbsPer100g: 1.5,
    fatPer100g: 28.0,
    region: 'ua',
    lang: 'uk',
    tags: ['ковбаса', 'домашня', 'свинина', 'запечена', 'м\'ясо', 'sausage', 'kovbasa']
  },
  {
    id: 'l-uzvar',
    name: 'Компот Узвар із сухофруктів без цукру (Uzvar Compote)',
    brand: 'Традиційний напій',
    caloriesPer100g: 15,
    proteinPer100g: 0.1,
    carbsPer100g: 3.6,
    fatPer100g: 0,
    region: 'ua',
    lang: 'uk',
    tags: ['узвар', 'компот', 'сухофрукти', 'напій', 'вода', 'uzvar', 'compote']
  }
];

// Helper to filter and search local items securely
export function searchLocalFoods(query: string, region: 'all' | 'us' | 'ru' | 'ua'): FoodDbItem[] {
  const normQuery = query.toLowerCase().trim();
  if (!normQuery) return [];

  return LOCAL_FOOD_DATABASE.filter((item) => {
    // Check region filter
    if (region !== 'all' && item.region !== region) {
      return false;
    }

    // Match name, brand, or tag keyword inclusions
    const matchesName = item.name.toLowerCase().includes(normQuery);
    const matchesBrand = item.brand ? item.brand.toLowerCase().includes(normQuery) : false;
    const matchesTags = item.tags.some((tag) => tag.toLowerCase().includes(normQuery));

    return matchesName || matchesBrand || matchesTags;
  });
}

// Global Open Food Facts Live Search API Integration
// Free, CORS-friendly, no authentication token required!
export async function searchOpenFoodFacts(query: string, regionCode: 'all' | 'us' | 'ru' | 'ua'): Promise<FoodDbItem[]> {
  const normQuery = query.toLowerCase().trim();
  if (!normQuery) return [];

  // Map region to standard Open Food Facts codes or domain prefixes
  let subdomain = 'world';
  if (regionCode === 'ru') subdomain = 'ru';
  if (regionCode === 'ua') subdomain = 'ua'; // Ukraine localized subdomain

  // Query endpoint using process parameters
  const url = `https://${subdomain}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(normQuery)}&search_simple=1&action=process&json=1&page_size=24`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TdeeDietEmpiricalTracker - Web - v1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`Open Food Facts returned healthy status code ${res.status}`);
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.products)) {
      return [];
    }

    return data.products
      .filter((prod: any) => {
        // filter out items lacking primary identifier info
        return prod && (prod.product_name || prod.product_name_ru || prod.product_name_en);
      })
      .map((p: any, index: number) => {
        // Choose highest likelihood local name matched
        let name = p.product_name || p.product_name_en || p.product_name_ru || 'Unknown food item';
        
        // Clean double names or extra code noise from titles
        if (p.product_name_ru && regionCode === 'ru') name = p.product_name_ru;
        if (p.product_name_uk && regionCode === 'ua') name = p.product_name_uk;

        // Extract safe real metrics fallback
        const nut = p.nutriments || {};
        
        // OFF provides energy in kJ or kcal, extract kcal primarily or convert if kJ-only
        let cals = 0;
        if (typeof nut['energy-kcal_100g'] === 'number') {
          cals = nut['energy-kcal_100g'];
        } else if (typeof nut['energy-kcal'] === 'number') {
          cals = nut['energy-kcal'];
        } else if (typeof nut['energy_100g'] === 'number') {
          // Convert kJ to kcal
          cals = Math.round(nut['energy_100g'] / 4.184);
        }

        const protein = Math.round((parseFloat(nut.proteins_100g || nut.proteins || 0) || 0) * 10) / 10;
        const carbs = Math.round((parseFloat(nut.carbohydrates_100g || nut.carbohydrates || 0) || 0) * 10) / 10;
        const fat = Math.round((parseFloat(nut.fat_100g || nut.fat || 0) || 0) * 10) / 10;

        return {
          id: `off-${p.code || index}-${Math.random().toString(36).substring(2, 5)}`,
          name: name,
          brand: p.brands ? p.brands.split(',')[0].trim() : 'Global Food',
          caloriesPer100g: Math.round(cals),
          proteinPer100g: protein,
          carbsPer100g: carbs,
          fatPer100g: fat,
          region: regionCode === 'all' ? 'global' : regionCode,
          lang: regionCode === 'ru' ? 'ru' : regionCode === 'ua' ? 'uk' : 'en',
          tags: []
        } as FoodDbItem;
      });

  } catch (error) {
    console.warn('Open Food Facts online background query failed or CORS was limited. Falling back to local search.', error);
    return [];
  }
}
