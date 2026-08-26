import io
import os

translations = {
    # Analytics.tsx
    "Бұл ай": "Bul ay",
    "Өткен ай": "Ótken ay",
    "Соңғы 3 ай": "Sońǵı 3 ay",
    "Соңғы 6 ай": "Sońǵı 6 ay",
    "Бұл жыл": "Bul jıl",
    "Басқа уақыт": "Basqa waqıt",
    "Жаңа": "Jańa",
    "Өзгеріс жоқ": "Ózgeris joq",
    "Финанслық Жағдай": "Finanslıq jaǵday",
    "Бұл периодта мәлімлеме жоқ.": "Bul dáwirde maǵlıwmat joq.",
    "Жалпы баланс": "Ulıwma balans",
    "Жалпы қарыз қалдығы": "Ulıwma qarız qaldıǵı",
    "Мерзім": "Múddeti",
    "Сарпланды": "Sarp etildi",
    "Лимит": "Limit",
    "Қорлар Аналитикасы": "Qorlar Analitikası",
    "Қарыз Аналитикасы": "Qarız Analitikası",

    # analyticsEngine.ts insights
    "өсті! Өте жақсы!": "ósti! Oǵada jaqsı!",
    "өсті. Бюджетіңізді қайта қарап шығыңыз.": "ósti. Budjetińizdi qayta kórip shıǵıń.",
    "азайды. Көбірек табыс табу жолдарын іздеп көріңіз.": "azaydı. Kóbirek tabıs tabıw jolların izlep kóriń.",
    "азайды. Жақсы нәтиже!": "azaydı. Jaqsı nátiyje!",
    "Жалпы кіріс": "Ulıwma dáramat",
    "Жалпы шығыс": "Ulıwma shıǵıs",
    "бойынша жаңа шығын пайда болды.": "boyınsha jańa shıǵıs payda boldı.",
    "бойынша шығын әдеттегіден": "boyınsha shıǵıs ádettegiden",
    "есе көп!": "ese kóp!",
    "бюджеті": "budjeti",
    "пайдаланылды.": "paydalanıldı.",
    "Қауіпті шекке жақындады": "Qáwipli shekke jaqınladı",
    "Бұл периодта қарыз қалдығы": "Bul dáwirde qarız qaldıǵı",
    "сумға азайды.": "sumǵa azaydı.",
    "сумға көбейді. Қарызды азайтуға тырысыңыз.": "sumǵa kóbeydi. Qarızdı azaytıwǵa háreket etiń.",
    "Жинақ процентіңіз төмен": "Jıynaq procentińiz tómen",
    "Қорларға көбірек ақша бөлуді ойлап көрің.": "Qorlarǵa kóbirek pul ajıratıwdı oylap kóriń.",
    "Жақсы жинақ! Сіз кірістің": "Jaqsı jıynaq! Siz dáramattıń",
    "сақтап қалдыңыз.": "saqlap qaldıńız.",
    "Тамаша қаржылық денсаулық! Сіздің бюджетіңіз өте жақсы теңестірілген.": "Tamasha qarjılay jaǵday! Siziń budjetińiz oǵada jaqsı teńlestirilgen.",
    "Жақсы жағдай. Біраз шығындарды азайтсаңыз тіпті керемет болады.": "Jaqsı jaǵday. Biraz shıǵıslardı azaytsańız bunnan da jaqsı boladı.",
    "Орташа жағдай. Қарыздар мен қажетсіз шығындарға назар аударыңыз.": "Ortasha jaǵday. Qarızlar hám kerek emes shıǵıslarǵa dıqqat awdarıń.",
    "Қауіпті жағдай! Шұғыл түрде бюджетіңізді қайта құрыңыз.": "Qáwipli jaǵday! Tezlik penen budjetińizdi qayta kórip shıǵıń.",
    "Өте тамаша": "Oǵada tamasha",
    "Жақсы": "Jaqsı",
    "Назар аударыңыз": "Dıqqat awdarıń",
    "Қауіпті": "Qáwipli"
}

files = ['src/pages/Analytics.tsx', 'src/services/analyticsEngine.ts']

for file in files:
    with io.open(file, 'r', encoding='utf8') as f:
        content = f.read()
    for cyr, lat in translations.items():
        content = content.replace(cyr, lat)
    with io.open(file, 'w', encoding='utf8') as f:
        f.write(content)
