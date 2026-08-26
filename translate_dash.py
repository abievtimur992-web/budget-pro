import io

translations = {
    "Шоттар": "Esaplar",
    "Транзакциялар": "Tranzakciyalar",
    "Отбасы": "Shańaraq",
    "Жалпы қалдық": "Ulıwma qaldıq",
    "Осы айдағы кірістер": "Usı aydaǵı dáramatlar",
    "Осы айдағы шығыстар": "Usı aydaǵı shıǵıslar",
    "Таза табыс": "Taza tabıs",
    "Соңғы транзакциялар": "Sońǵı tranzakciyalar",
    "Қосу": "Qosıw",
    "Барлығын көру": "Hámmesin kóriw",
    "Транзакция қосу": "Tranzakciya qosıw",
    "Кіріс": "Dáramat",
    "Шығыс": "Shıǵıs",
    "Бюджет": "Budjet",
    "Қорлар": "Qorlar"
}

file = 'src/pages/Dashboard.tsx'
with io.open(file, 'r', encoding='utf8') as f:
    content = f.read()

for cyr, lat in translations.items():
    content = content.replace(cyr, lat)

with io.open(file, 'w', encoding='utf8') as f:
    f.write(content)
