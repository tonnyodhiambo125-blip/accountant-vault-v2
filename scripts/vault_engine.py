import json
from datetime import datetime

def update_vault():
    # This data will be sent to your Chrome browser
    vault_data = {
        "last_sync": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "system_status": "Active",
        "tax_deadlines": [
            {"agency": "KRA (VAT)", "deadline": "20th of every month"},
            {"agency": "PAYE / Housing Levy", "deadline": "9th of every month"},
            {"agency": "NTSA (Inspection)", "deadline": "Check Expiry"}
        ]
    }

    # Save it to the bridge file
    with open('automations.json', 'w') as f:
        json.dump(vault_data, f, indent=4)
    
    print(f"✅ Vault updated at {vault_data['last_sync']}")

if __name__ == "__main__":
    update_vault()