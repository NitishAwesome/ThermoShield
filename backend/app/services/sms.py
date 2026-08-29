async def send_sms(phone_number: str, message: str):
    print("\n========== THERMOSHIELD SMS ==========")
    print(f"TO: {phone_number}")
    print(f"MESSAGE: {message}")
    print("======================================\n")

    return {
        "success": True,
        "mode": "DEMO",
        "status": "SENT"
    }