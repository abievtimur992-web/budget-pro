import io
import os

translations = {
    "Басты бет": "Bas bet",
    "Транзакциялар": "Tranzakciyalar",
    "Бюджет": "Budjet",
    "Қорлар": "Qorlar",
    "Қарыздар": "Qarızlar",
    "Аналитика": "Analitika",
    "Профиль": "Profil",
    "Шығу": "Shıǵıw",
    "Қосымша": "Qosımsha",
    "Ақша": "Pul",
    "Төлем": "Tólem",
    "Қарыз": "Qarız"
}

files = ['src/components/Navigation.tsx', 'src/components/Header.tsx']

for file in files:
    if os.path.exists(file):
        with io.open(file, 'r', encoding='utf8') as f:
            content = f.read()
        for cyr, lat in translations.items():
            content = content.replace(cyr, lat)
        with io.open(file, 'w', encoding='utf8') as f:
            f.write(content)
