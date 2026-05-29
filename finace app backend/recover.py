import os, json, glob

logs = glob.glob(r'C:\Users\Kabir Mendiratta\.gemini\antigravity\brain\*\.system_generated\logs\overview.txt')

targets = [
    'Dashboard.jsx', 'Transactions.jsx', 'Insights.jsx', 'Settings.jsx', 
    'AIAssistant.jsx', 'UploadConnectBank.jsx', 'LoginPage.jsx', 
    'SignupPage.jsx', 'ForgotPasswordPage.jsx', 
    'WealthIntelFinancialIntelligencePlatform.jsx', 'BudgetPlanner.jsx', 'Goals.jsx'
]

for target in targets:
    best_content = ""
    max_lines = 0
    for log in logs:
        try:
            with open(log, 'r', encoding='utf-8') as f:
                for line in f:
                    if target in line and 'TOOL_RESPONSE' in line:
                        data = json.loads(line)
                        for resp in data.get('tool_responses', []):
                            output = resp.get('response', {}).get('output', '')
                            if target in output and "The following code has been modified" in output:
                                parts = output.split("The following code has been modified")
                                if len(parts) > 1:
                                    code_part = parts[1].split("The above content")[0].split('\n', 1)[1]
                                    lines = []
                                    for codeline in code_part.split('\n'):
                                        if ':' in codeline:
                                            lines.append(codeline.split(':', 1)[1][1:])
                                    if len(lines) > max_lines:
                                        max_lines = len(lines)
                                        best_content = '\n'.join(lines)
        except Exception as e:
            pass
    if best_content:
        dest = f'../finance app frontend/src/pages/{target}'
        with open(dest, 'w', encoding='utf-8') as out_f:
            out_f.write(best_content)
        print(f"Recovered {target} with {max_lines} lines.")
