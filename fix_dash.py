import io
import re

file = 'src/pages/Dashboard.tsx'
with io.open(file, 'r', encoding='utf8') as f:
    content = f.read()

search_string = """{categories.filter(c => c.type === 'income').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}"""

replace_string = """{categories.filter(c => c.type === 'income').length > 0 ? (
                    categories.filter(c => c.type === 'income').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    <option value="" disabled>Kategoriya joq! Budjet bóliminen qosıń</option>
                  )}"""

if search_string in content:
    content = content.replace(search_string, replace_string)
    with io.open(file, 'w', encoding='utf8') as f:
        f.write(content)
    print("Fixed income categories fallback!")
else:
    print("Search string not found.")
