import io

translations = {
    "Бюджетті жоспарлау": "Budjetti jobalastırıw",
    "Жаңа бюджет": "Jańa budjet",
    "Бөлінбеген ақша": "Bólinbegen pul",
    "Барлық кірістер бюджетке бөлінді": "Barlıq dáramatlar budjetke bólindi",
    "Сақтау": "Saqlaw",
    "Күн": "Kún",
    "Жоспар": "Joba",
    "Жұмсалғаны": "Jumsalǵanı",
    "Қалғаны": "Qalǵanı"
}

file = 'src/pages/Budget.tsx'
with io.open(file, 'r', encoding='utf8') as f:
    content = f.read()

for cyr, lat in translations.items():
    content = content.replace(cyr, lat)

with io.open(file, 'w', encoding='utf8') as f:
    f.write(content)
