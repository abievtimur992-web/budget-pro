import io

translations = {
    "Басты бет": "Bas bet",
    "Транзакциялар": "Tranzakciyalar",
    "Бюджет": "Budjet",
    "Мақсатты қорлар": "Maqsetli qorlar",
    "Қорлар": "Qorlar",
    "Қарыздар": "Qarızlar",
    "Аналитика": "Analitika",
    "Профиль": "Profil",
    "Шығу": "Shıǵıw",
    "Тақырып": "Tema",
    "Жарық": "Jarıq",
    "Қараңғы": "Qarańǵı"
}

file = 'src/components/layout/AppLayout.tsx'
with io.open(file, 'r', encoding='utf8') as f:
    content = f.read()

for cyr, lat in translations.items():
    content = content.replace(cyr, lat)

with io.open(file, 'w', encoding='utf8') as f:
    f.write(content)
