"""
ThermoShield Test Suite Global Fixture Configuration.
Enforces test environment isolation:
- ENVIRONMENT=test
- EMAIL_DELIVERY_MODE=test
- DISABLE_BACKGROUND_MONITOR=true
Guarantees real SMTP network calls are never dispatched and background daemons
are not started during test execution.
"""

import os
import sys

# Set explicit test environment variables before anything else imports or runs
os.environ["ENVIRONMENT"] = "test"
os.environ["EMAIL_DELIVERY_MODE"] = "test"
os.environ["DISABLE_BACKGROUND_MONITOR"] = "true"
