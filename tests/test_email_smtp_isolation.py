"""
ThermoShield Email SMTP Isolation and Delivery Mode Test Suite.
Verifies:
A. Test environment sends zero SMTP network requests.
B. Fake/generated @example.com users do not cause external SMTP attempts.
C. Email service returns SIMULATED in test mode without socket/network connection.
D. Production adapter remains available and functional when correctly configured.
E. Failed production SMTP still returns FAILED truthfully without claiming SENT/DELIVERED.
F. Disabling email does not break alert generation itself.
"""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
import smtplib

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.services.email import (
    send_notification_email,
    send_email,
    is_smtp_configured,
    get_email_delivery_mode,
    get_email_delivery_status,
    EmailDeliveryMode,
)
from app.services.alert_engine import dispatch_automatic_early_warning
from app.database.connection import SessionLocal
from app.database.models import User, Location, Alert


class TestEmailSMTPIsolation(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    # ==========================================================================
    # TEST A: Test Environment Sends Zero SMTP Network Requests
    # ==========================================================================
    @patch("smtplib.SMTP_SSL")
    @patch("smtplib.SMTP")
    def test_a_test_environment_sends_zero_smtp_network_requests(self, mock_smtp, mock_smtp_ssl):
        """
        Verify that in test environment, calling send_notification_email makes zero
        network socket or SMTP connection requests.
        """
        with patch.dict(os.environ, {"ENVIRONMENT": "test", "EMAIL_DELIVERY_MODE": "test"}):
            res = send_notification_email(
                to_email="citizen.nagpur@maharashtra.gov.in",
                subject="ThermoShield Extreme Heat Alert",
                body="High WBGT heat index detected. Drink oral rehydration fluids."
            )

            # Neither SMTP nor SMTP_SSL constructors should have been invoked
            mock_smtp.assert_not_called()
            mock_smtp_ssl.assert_not_called()

            # Result must be simulated
            self.assertEqual(res["status"], "SIMULATED")
            self.assertEqual(res["channel"], "EMAIL")
            self.assertEqual(res["provider"], "TEST_ADAPTER")
            self.assertIn("citizen.nagpur@maharashtra.gov.in", res["recipient"])

    # ==========================================================================
    # TEST B: Fake/Generated @example.com Users Do Not Cause SMTP Attempts
    # ==========================================================================
    @patch("smtplib.SMTP_SSL")
    @patch("smtplib.SMTP")
    def test_b_fake_example_users_do_not_cause_external_smtp_attempts(self, mock_smtp, mock_smtp_ssl):
        """
        Verify that generated/fake test users (e.g., sec_..., legacy_..., risk_tester_...)
        with @example.com/org/net domains never trigger external SMTP socket calls.
        """
        fake_recipients = [
            "sec_98124@example.com",
            "legacy_user_77@example.com",
            "google_user_55@example.org",
            "risk_tester_01@example.net",
            "evaluator_candidate@test.com",
            "synthetic_worker@invalid",
        ]

        for fake_email in fake_recipients:
            with patch.dict(os.environ, {"ENVIRONMENT": "test", "EMAIL_DELIVERY_MODE": "test"}):
                res = send_notification_email(
                    to_email=fake_email,
                    subject="Automatic Heat Advisory",
                    body="Test alert payload"
                )

                mock_smtp.assert_not_called()
                mock_smtp_ssl.assert_not_called()
                self.assertEqual(res["status"], "SIMULATED")
                self.assertEqual(res["provider"], "TEST_ADAPTER")

    # ==========================================================================
    # TEST C: Email Service Returns SIMULATED in Test Mode
    # ==========================================================================
    def test_c_email_service_returns_simulated_in_test_mode(self):
        """
        Verify deterministic response contract for send_email(...) in TEST mode:
        status=SIMULATED, channel=EMAIL, provider=TEST_ADAPTER.
        """
        with patch.dict(os.environ, {"ENVIRONMENT": "test", "EMAIL_DELIVERY_MODE": "test"}):
            # Test both send_notification_email and send_email alias
            for fn in (send_notification_email, send_email):
                res = fn(
                    to_email="resident@community.gov.in",
                    subject="Heat Advisory",
                    body="Advisory details"
                )

                self.assertEqual(res["status"], "SIMULATED")
                self.assertEqual(res["channel"], "EMAIL")
                self.assertEqual(res["provider"], "TEST_ADAPTER")
                self.assertEqual(res["recipient"], "resident@community.gov.in")
                self.assertTrue(res.get("message_id", "").startswith("SIM-EMAIL-"))
                self.assertIn("resident@community.gov.in", res["message"])

        # Also verify delivery status endpoint contract for TEST mode
        with patch.dict(os.environ, {"ENVIRONMENT": "test", "EMAIL_DELIVERY_MODE": "test"}):
            status = get_email_delivery_status()
            self.assertEqual(status["status"], "SIMULATED")
            self.assertEqual(status["mode"], "TEST")
            self.assertEqual(status["provider"], "TEST_ADAPTER")

    # ==========================================================================
    # TEST D: Production Adapter Remains Available When Correctly Configured
    # ==========================================================================
    @patch("smtplib.SMTP_SSL")
    def test_d_production_adapter_remains_available_when_configured(self, mock_smtp_ssl):
        """
        Verify that production adapter remains available and correctly executes SMTP
        handshake and transmission when explicit production mode is enabled with credentials.
        """
        mock_server = MagicMock()
        mock_smtp_ssl.return_value.__enter__.return_value = mock_server

        prod_env = {
            "ENVIRONMENT": "production",
            "EMAIL_DELIVERY_MODE": "production",
            "MAIL_USERNAME": "alerts@thermoshield-india.gov.in",
            "MAIL_PASSWORD": "officialapppassword123",
            "MAIL_SERVER": "smtp.gmail.com",
            "MAIL_PORT": "465",
        }

        with patch.dict(os.environ, prod_env):
            res = send_notification_email(
                to_email="disaster.mgmt@maharashtra.gov.in",
                subject="RED ALERT: Severe Heatwave Action Protocol Active",
                body="Temperature exceeded 44.5C. Emergency cooling centers operational.",
                html_body="<p>Emergency cooling centers operational.</p>"
            )

            # Verifies production adapter was invoked
            mock_smtp_ssl.assert_called_once_with("smtp.gmail.com", 465, timeout=15)
            mock_server.login.assert_called_once_with(
                "alerts@thermoshield-india.gov.in",
                "officialapppassword123"
            )
            mock_server.sendmail.assert_called_once()
            call_args = mock_server.sendmail.call_args[0]
            self.assertEqual(call_args[0], "alerts@thermoshield-india.gov.in")
            self.assertEqual(call_args[1], "disaster.mgmt@maharashtra.gov.in")

            # Contractual response
            self.assertEqual(res["status"], "SENT")
            self.assertEqual(res["channel"], "EMAIL")
            self.assertEqual(res["provider"], "SMTP_DIRECT")
            self.assertIn("sent successfully", res["message"].lower())

    # ==========================================================================
    # TEST E: Failed Production SMTP Still Returns FAILED Truthfully
    # ==========================================================================
    @patch("smtplib.SMTP_SSL")
    def test_e_failed_production_smtp_returns_failed_truthfully(self, mock_smtp_ssl):
        """
        Verify that when real SMTP fails in production, it truthfully reports FAILED,
        never falsely claiming SENT or DELIVERED.
        """
        mock_smtp_ssl.side_effect = smtplib.SMTPConnectError(421, b"Connection refused by peer")

        prod_env = {
            "ENVIRONMENT": "production",
            "EMAIL_DELIVERY_MODE": "production",
            "MAIL_USERNAME": "alerts@thermoshield-india.gov.in",
            "MAIL_PASSWORD": "apppassword123",
            "MAIL_SERVER": "smtp.gmail.com",
            "MAIL_PORT": "465",
        }

        with patch.dict(os.environ, prod_env):
            res = send_notification_email(
                to_email="citizen@maharashtra.gov.in",
                subject="Heat Alert",
                body="Advisory"
            )

            self.assertEqual(res["status"], "FAILED")
            self.assertEqual(res["channel"], "EMAIL")
            self.assertEqual(res["provider"], "SMTP_DIRECT")
            self.assertNotEqual(res["status"], "SENT")
            self.assertNotEqual(res["status"], "DELIVERED")
            self.assertIn("failed", res["message"].lower())
            self.assertIsNotNone(res.get("error"))

    # ==========================================================================
    # TEST F: Disabling Email Does Not Break Alert Generation Itself
    # ==========================================================================
    def test_f_disabling_email_does_not_break_alert_generation(self):
        """
        Verify that disabling email delivery (EMAIL_DELIVERY_MODE=disabled) does not
        cause crashes, unhandled exceptions, or break database alert creation.
        """
        disabled_env = {
            "ENVIRONMENT": "production",
            "EMAIL_DELIVERY_MODE": "disabled",
            "MAIL_USERNAME": "alerts@thermoshield.org",
            "MAIL_PASSWORD": "secretpassword",
        }

        with patch.dict(os.environ, disabled_env):
            # 1. Direct email dispatch returns DISABLED
            res = send_notification_email(
                to_email="citizen@example.com",
                subject="Heatwave Warning",
                body="High thermal stress."
            )
            self.assertEqual(res["status"], "DISABLED")
            self.assertEqual(res["provider"], "DISABLED")

            # 2. Automated early warning engine dispatch executes cleanly
            report = dispatch_automatic_early_warning(
                db=self.db,
                location_name="Nagpur Central",
                location_id=None,
                risk_level="EXTREME",
                risk_score=95.0,
                temperature_c=45.2,
                wbgt_c=34.1,
                heat_index_c=48.0,
                interventions=["Activate cooling centers", "Distribute ORS packets"],
                force_test_recipient="citizen@example.com"
            )

            # Early warning engine gracefully completes without error
            self.assertIn(report["status"], ("DISABLED", "success"))
            self.assertIn("Severe Condition", report["transition"])
            self.assertEqual(report["dispatched_count"], 1)
            self.assertEqual(report["dispatched"][0]["status"], "DISABLED")


if __name__ == "__main__":
    unittest.main()
