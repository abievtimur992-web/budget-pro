const fs = require('fs');
let content = fs.readFileSync('src/pages/Analytics.tsx', 'utf8');

const translations = {
  "Аналитика": "Analitika",
  "Жалпы кіріс": "Ulıwma dáramat",
  "Жалпы шығыс": "Ulıwma shıǵıs",
  "Жинақ (Пайызы:": "Jıynaq (Procenti:",
  "Дебиторка (Берген қарыз)": "Debitor (Bergen qarız)",
  "Қарыз төлемдері": "Qarız tólemleri",
  "Ең көп жұмсалған 5 шығын (Топ-5)": "Eń kóp jumsalǵan 5 shıǵıs (Top-5)",
  "Ақша айналымы": "Pul aylanbası",
  "Мақсатты қорлар": "Maqsetli qorlar",
  "Қорлар": "Qorlar",
  "Қарыз статистикасы": "Qarız statistikası",
  "Бюджеттің орындалуы": "Budjettiń orınlanıwı",
  "Ақылды кеңестер (Жасанды Интеллект)": "Aqıllı keńesler (Jasalma intellekt)",
  "Қаржылық жағдай индексі": "Qarjılay jaǵday indeksi",
  "Негізгі қарыз": "Tiykarǵı qarız",
  "Пайыздық үстеме": "Procentlik ústeme",
  "Ағымдағы ай": "Házirgi ay",
  "Өткен ай": "Ótken ay",
  "Соңғы 3 ай": "Sońǵı 3 ay",
  "Соңғы 6 ай": "Sońǵı 6 ay",
  "Бұл жыл": "Bul jıl",
  "Басқа уақыт": "Basqa waqıt",
  "Бұл кезеңде транзакциялар жоқ.": "Bul dáwirde tranzakciyalar joq.",
  "Жаңа": "Jańa",
  "Өзгеріс жоқ": "Ózgeris joq",
  "Мақсат:": "Maqset:",
  "Жұмсалғаны:": "Jumsalǵanı:",
  "Кіріс": "Dáramat",
  "Шығыс": "Shıǵıs",
  "Жинақ": "Jıynaq",
  "Қарыз": "Qarız",
  "Дебиторка": "Debitor",
  "Жалпы мақсат": "Ulıwma maqset",
  "Негізгі": "Tiykarǵı"
};

for (const [cyr, lat] of Object.entries(translations)) {
  content = content.replaceAll(cyr, lat);
}

fs.writeFileSync('src/pages/Analytics.tsx', content, 'utf8');
