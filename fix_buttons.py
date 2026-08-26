import os
import io

directory = 'src'
search_str = 'className="flex-1 py-2 bg-gray-100 rounded-lg"'
replace_str = 'className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg"'

search_str2 = 'className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-700 dark:text-gray-300"'
replace_str2 = 'className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg"'

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with io.open(filepath, 'r', encoding='utf8') as f:
                content = f.read()
            
            if search_str in content or search_str2 in content:
                content = content.replace(search_str2, replace_str2)
                content = content.replace(search_str, replace_str)
                with io.open(filepath, 'w', encoding='utf8') as f:
                    f.write(content)
                print(f"Fixed buttons in {filepath}")
