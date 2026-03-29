import json
from datetime import datetime

# THIS SCRIPT WRITES THE DATA - DO NOT PUT THIS IN THE .JSON FILE
def update_vault():
    vault_data = {
        "last_sync": datetime.now().strftime("%d %b %Y, %H:%M"),
        "tax_deadlines": [
            {"agency": "KRA VAT", "deadline": "20th"},
            {"agency": "PAYE", "deadline": "9th"},
            {"agency": "NSSF", "deadline": "9th"},
            {"agency": "SHIF", "deadline": "9th"}
        ]
    }
    with open('automations.json', 'w') as f:
        json.dump(vault_data, f, indent=4)

if __name__ == "__main__":
    update_vault()