import json
import os
from datetime import datetime

# Path to the shared JSON file
FILE_PATH = 'automations.json'

def update_vault_data():
    """
    This script runs on GitHub and generates the latest 
    tax and system data for your website banner.
    """
    print("Starting Vault Engine Sync...")

    # Data structure that the website reads
    vault_status = {
        "last_sync": datetime.now().strftime("%d %b %Y, %H:%M"),
        "status": "System Online",
        "tax_deadlines": [
            {"agency": "KRA (VAT)", "deadline": "20th of every month"},
            {"agency": "PAYE", "deadline": "9th of every month"},
            {"agency": "Housing Levy", "deadline": "9th of every month"},
            {"agency": "eCitizen", "deadline": "Review Weekly"}
        ]
    }

    try:
        with open(FILE_PATH, 'w') as f:
            json.dump(vault_status, f, indent=4)
        print(f"✅ Successfully updated {FILE_PATH} at {vault_status['last_sync']}")
    except Exception as e:
        print(f"❌ Error updating vault: {e}")

if __name__ == "__main__":
    update_vault_data()