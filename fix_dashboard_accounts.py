import io
import re

file = 'src/pages/Dashboard.tsx'
with io.open(file, 'r', encoding='utf8') as f:
    content = f.read()

# Add state
state_search = "const [categoryId, setCategoryId] = useState('');"
state_replace = "const [categoryId, setCategoryId] = useState('');\n  const [accountId, setAccountId] = useState('');"
content = content.replace(state_search, state_replace)

# Fix handleAddIncome
handle_income_search = """  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && accounts.length > 0) {
      addIncome(Number(amount), accounts[0].id, incomeComment, categoryId);"""
handle_income_replace = """  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAccountId = accountId || (accounts.length > 0 ? accounts[0].id : '');
    if (amount && targetAccountId) {
      addIncome(Number(amount), targetAccountId, incomeComment, categoryId);"""
content = content.replace(handle_income_search, handle_income_replace)

# Fix submitExpense
handle_expense_search = """  const submitExpense = (force = false) => {
    if (!amount || !categoryId || accounts.length === 0) return;"""
handle_expense_replace = """  const submitExpense = (force = false) => {
    const targetAccountId = accountId || (accounts.length > 0 ? accounts[0].id : '');
    if (!amount || !categoryId || !targetAccountId) return;"""
content = content.replace(handle_expense_search, handle_expense_replace)

submit_expense_search2 = """      accountId: accounts[0].id,"""
submit_expense_replace2 = """      accountId: targetAccountId,"""
content = content.replace(submit_expense_search2, submit_expense_replace2)


# Add Account Select to Income Modal
income_modal_search = """            <form onSubmit={handleAddIncome} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('amount')}</label>"""
income_modal_replace = """            <form onSubmit={handleAddIncome} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Esap (Kassa/Karta)</label>
                <select 
                  required
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="">Tańlań...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.balance} swm)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('amount')}</label>"""
content = content.replace(income_modal_search, income_modal_replace)


# Add Account Select to Expense Modal
expense_modal_search = """            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('amount')}</label>"""
expense_modal_replace = """            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Esap (Kassa/Karta)</label>
                <select 
                  required
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full border dark:border-gray-700 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="">Tańlań...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.balance} swm)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('amount')}</label>"""
content = content.replace(expense_modal_search, expense_modal_replace)

with io.open(file, 'w', encoding='utf8') as f:
    f.write(content)
print("Updated Dashboard.tsx with Account selects!")
