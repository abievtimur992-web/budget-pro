import os
import re
import io

directory = 'src'
cyrillic_pattern = re.compile(r'[А-Яа-яЁёҚқҒғҮүҰұӨөІіҢңӘәҺһ]')

found_files = []
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx') or file.endswith('.json'):
            filepath = os.path.join(root, file)
            with io.open(filepath, 'r', encoding='utf8') as f:
                content = f.read()
                if cyrillic_pattern.search(content):
                    found_files.append(filepath)

if found_files:
    print("Files with Cyrillic:")
    for f in found_files:
        print(f)
else:
    print("No Cyrillic found in any .ts, .tsx, or .json file!")
