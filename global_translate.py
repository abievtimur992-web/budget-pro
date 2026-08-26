import os
import io
import re

# Dictionary for accurate semantic translation
exact_translations = {
    # Dashboard
    "Шоттар": "Esaplar",
    "Отбасы": "Shańaraq",
    "Жалпы қалдық": "Ulıwma qaldıq",
    "Осы айдағы кірістер": "Usı aydaǵı dáramatlar",
    "Осы айдағы шығыстар": "Usı aydaǵı shıǵıslar",
    "Таза табыс": "Taza tabıs",
    "Соңғы транзакциялар": "Sońǵı tranzakciyalar",
    "Барлығын көру": "Hámmesin kóriw",
    
    # Budget
    "Бөлінбеген ақша": "Bólinbegen pul",
    "Барлық кірістер бюджетке бөлінді": "Barlıq dáramatlar budjetke bólindi",
    
    # Common
    "Қосу": "Qosıw",
    "Сақтау": "Saqlaw",
    "Жою": "Óshiriw",
    "Өңдеу": "Ózgertiw",
    "Болдырмау": "Biykar etiw",
    "Артқа": "Artqa",
    "Жабық": "Jabıq",
    "Ашық": "Ashıq",
    
    # Transaction Types
    "Кіріс": "Dáramat",
    "Шығыс": "Shıǵıs",
    "Қарыз": "Qarız",
    "Төлем": "Tólem",
    "Мақсат": "Maqset",
    "Қор": "Qor",
    "Сома": "Summa",
    "Күн": "Kún",
    "Тақырып": "Atama",
    "Түсініктеме": "Túsindirme",
    "Валюта": "Valyuta",
    
    "Транзакция қосу": "Tranzakciya qosıw",
    "Жаңа транзакция": "Jańa tranzakciya",
}

# Character transliteration fallback
translit_map = {
    "А": "A", "а": "a", "Б": "B", "б": "b", "В": "V", "в": "v",
    "Г": "G", "г": "g", "Ғ": "Ǵ", "ғ": "ǵ", "Д": "D", "д": "d",
    "Е": "E", "е": "e", "Ё": "Yo", "ё": "yo", "Ж": "J", "ж": "j",
    "З": "Z", "з": "z", "И": "I", "и": "i", "Й": "Y", "й": "y",
    "К": "K", "к": "k", "Қ": "Q", "қ": "q", "Л": "L", "л": "l",
    "М": "M", "м": "m", "Н": "N", "н": "n", "Ң": "Ń", "ң": "ń",
    "О": "O", "о": "o", "Ө": "Ó", "ө": "ó", "П": "P", "п": "p",
    "Р": "R", "р": "r", "С": "S", "с": "s", "Т": "T", "т": "t",
    "У": "W", "у": "w", "Ұ": "U", "ұ": "u", "Ү": "Ú", "ү": "ú",
    "Ф": "F", "ф": "f", "Х": "X", "х": "x", "Һ": "H", "һ": "h",
    "Ц": "C", "ц": "c", "Ч": "Ch", "ч": "ch", "Ш": "Sh", "ш": "sh",
    "Щ": "Sh", "щ": "sh", "Ъ": "", "ъ": "", "Ы": "I", "ы": "ı",
    "І": "I", "і": "i", "Ь": "", "ь": "", "Э": "E", "э": "e",
    "Ю": "Yu", "ю": "yu", "Я": "Ya", "я": "ya", "Ә": "Á", "ә": "á"
}

def transliterate(text):
    res = ""
    for char in text:
        res += translit_map.get(char, char)
    return res

directory = 'src'
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with io.open(filepath, 'r', encoding='utf8') as f:
                content = f.read()
            
            original_content = content
            
            # 1. Exact translation
            for cyr, lat in exact_translations.items():
                content = content.replace(cyr, lat)
                
            # 2. Transliteration for the remaining Cyrillic letters
            # Find all Cyrillic parts and transliterate them
            def replacer(match):
                return transliterate(match.group(0))
                
            content = re.sub(r'[А-Яа-яЁёҚқҒғҮүҰұӨөІіҢңӘәҺһ]+', replacer, content)
            
            if content != original_content:
                with io.open(filepath, 'w', encoding='utf8') as f:
                    f.write(content)
                print(f"Updated: {filepath}")
