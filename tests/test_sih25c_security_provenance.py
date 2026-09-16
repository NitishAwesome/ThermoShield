"""
SIH-25C: Security, Provenance & Notification Correctness Test Suite

Covers:
  M. JWT Secret Guard — Render exemption removed, strength checks enforced
  N. SQLite Production Fail-Fast — ephemeral data loss prevention
  O. Browser Notification Terminology — no 'Native OS push' in frontend source
  P. RAG Provenance Completeness — every chunk has a valid classification
  Q. Worker Config Safety — single-worker marker present in render.yaml
  R. /copilot/provenance endpoint structure
"""

import os
import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
backend_dir = Path(__file__).resolve().parent.parent / "backend"
project_root = backend_dir.parent
for p in (str(project_root), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.auth.router import get_jwt_secret, _JWT_DEV_FALLBACK, _JWT_MIN_LENGTH
from backend.app.database.connection import _create_database_engine
from backend.app.services.rag_service import (
    RAG_KNOWLEDGE_CORPUS,
    get_provenance_report,
)


class TestSIH25CSecurityProvenance(unittest.TestCase):

    # ==========================================================================
    # TEST M: JWT Secret Guard
    # ==========================================================================

    def test_m1_jwt_missing_in_production_raises(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": ""}):
            with self.assertRaises(RuntimeError) as ctx:
                get_jwt_secret()
            self.assertIn("JWT_SECRET", str(ctx.exception))
            self.assertIn("missing or blank", str(ctx.exception))

    def test_m2_jwt_dev_fallback_in_production_raises(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": _JWT_DEV_FALLBACK}):
            with self.assertRaises(RuntimeError) as ctx:
                get_jwt_secret()
            self.assertIn("development fallback", str(ctx.exception))

    def test_m3_jwt_short_secret_in_production_raises(self):
        short = "x" * (_JWT_MIN_LENGTH - 1)
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": short}):
            with self.assertRaises(RuntimeError) as ctx:
                get_jwt_secret()
            self.assertIn(str(_JWT_MIN_LENGTH), str(ctx.exception))

    def test_m4_jwt_strong_secret_in_production_succeeds(self):
        strong = "a-very-strong-random-jwt-secret-for-sih26083"
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": strong}):
            result = get_jwt_secret()
            self.assertEqual(result, strong)

    def test_m5_render_is_not_exempt_from_jwt_guard(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "RENDER": "true", "JWT_SECRET": ""}):
            with self.assertRaises(RuntimeError):
                get_jwt_secret()

    def test_m6_dev_missing_jwt_falls_back(self):
        env = {k: v for k, v in os.environ.items()}
        env.pop("JWT_SECRET", None)
        env["ENVIRONMENT"] = "development"
        with patch.dict(os.environ, env, clear=True):
            result = get_jwt_secret()
            self.assertEqual(result, _JWT_DEV_FALLBACK)

    def test_m7_error_does_not_leak_secret_value(self):
        short = "short-secret"
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": short}):
            with self.assertRaises(RuntimeError) as ctx:
                get_jwt_secret()
            self.assertNotIn(short, str(ctx.exception))

    # ==========================================================================
    # TEST N: SQLite Production Fail-Fast
    # ==========================================================================

    def test_n1_sqlite_in_production_raises(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            with self.assertRaises(RuntimeError) as ctx:
                _create_database_engine("sqlite:///./thermoshield.db")
            msg = str(ctx.exception)
            self.assertIn("SQLite", msg)
            self.assertIn("PostgreSQL", msg)

    def test_n2_sqlite_error_does_not_expose_path(self):
        url = "sqlite:////home/user/secret-thermoshield.db"
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            with self.assertRaises(RuntimeError) as ctx:
                _create_database_engine(url)
            self.assertNotIn("/home/user/secret-thermoshield.db", str(ctx.exception))

    def test_n3_sqlite_in_development_is_allowed(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            engine = _create_database_engine("sqlite:///./test_thermoshield_n3.db")
            self.assertIsNotNone(engine)
            engine.dispose()

    def test_n4_sqlite_detection_case_insensitive(self):
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            for variant in ["SQLite:///./x.db", "SQLITE:///./x.db", "sqlite:///./x.db"]:
                with self.assertRaises(RuntimeError, msg=f"Should raise for: {variant}"):
                    _create_database_engine(variant)

    # ==========================================================================
    # TEST O: Browser Notification Terminology
    # ==========================================================================

    FRONTEND_SRC = Path(__file__).resolve().parent.parent / "frontend" / "src"

    BANNED_PHRASES = [
        r"Native OS push",
        r"native OS push",
        r"background push",
        r"Background push",
        r"Device & Browser Notifications",
    ]

    def _get_all_ts_tsx_content(self):
        all_content = ""
        for ext in ("*.ts", "*.tsx"):
            for f in self.FRONTEND_SRC.rglob(ext):
                all_content += f.read_text(encoding="utf-8", errors="ignore")
        return all_content

    def test_o1_no_banned_notification_phrase_in_frontend(self):
        content = self._get_all_ts_tsx_content()
        for phrase in self.BANNED_PHRASES:
            matches = re.findall(phrase, content)
            self.assertEqual(len(matches), 0,
                f"Banned phrase found in frontend source: '{phrase}' ({len(matches)} occurrence(s))")

    def test_o2_web_notification_api_label_present(self):
        content = self._get_all_ts_tsx_content()
        self.assertIn("Web Notification API", content)

    def test_o3_notification_channel_legend_correct_label(self):
        legend_file = self.FRONTEND_SRC / "components" / "alerts" / "NotificationChannelLegend.tsx"
        self.assertTrue(legend_file.exists())
        content = legend_file.read_text(encoding="utf-8")
        self.assertIn("Browser Notifications (Web Notification API)", content)
        self.assertNotIn("Native OS push", content)

    # ==========================================================================
    # TEST P: RAG Provenance Completeness
    # ==========================================================================

    VALID_PROVENANCE = {"VERIFIED_PUBLIC_SOURCE", "INTERNAL_SUMMARY", "NOT_VERIFIED"}

    def test_p1_every_chunk_has_provenance_class(self):
        for chunk in RAG_KNOWLEDGE_CORPUS:
            self.assertTrue(hasattr(chunk, "provenance_class") and chunk.provenance_class,
                f"Chunk '{chunk.chunk_id}' missing provenance_class")

    def test_p2_all_provenance_classes_valid(self):
        for chunk in RAG_KNOWLEDGE_CORPUS:
            self.assertIn(chunk.provenance_class, self.VALID_PROVENANCE,
                f"Chunk '{chunk.chunk_id}' has invalid provenance_class: '{chunk.provenance_class}'")

    def test_p3_verified_chunks_have_source_url(self):
        for chunk in RAG_KNOWLEDGE_CORPUS:
            if chunk.provenance_class == "VERIFIED_PUBLIC_SOURCE":
                self.assertTrue(hasattr(chunk, "source_url") and chunk.source_url.strip(),
                    f"VERIFIED_PUBLIC_SOURCE chunk '{chunk.chunk_id}' has no source_url")

    def test_p4_get_provenance_report_returns_all_chunks(self):
        report = get_provenance_report()
        self.assertEqual(len(report), len(RAG_KNOWLEDGE_CORPUS))

    def test_p5_provenance_report_row_structure(self):
        required_keys = {"chunk_id", "title", "authority", "provenance_class", "source_url", "category"}
        for row in get_provenance_report():
            missing = required_keys - set(row.keys())
            self.assertFalse(missing, f"Row for '{row.get('chunk_id')}' missing keys: {missing}")

    def test_p6_no_chunk_makes_mortality_claims(self):
        banned = [
            r"\bpredicted\s+death", r"\bmortality\s+rate\b",
            r"\bhospital\s+admission", r"\bestimated\s+casualt", r"\blives\s+saved\b",
        ]
        for chunk in RAG_KNOWLEDGE_CORPUS:
            for pat in banned:
                self.assertEqual(len(re.findall(pat, chunk.content, re.IGNORECASE)), 0,
                    f"Chunk '{chunk.chunk_id}' makes banned outcome claim: '{pat}'")

    # ==========================================================================
    # TEST Q: Worker Config Safety
    # ==========================================================================

    RENDER_YAML = Path(__file__).resolve().parent.parent / "render.yaml"

    def test_q1_render_yaml_has_environment_production(self):
        self.assertTrue(self.RENDER_YAML.exists())
        content = self.RENDER_YAML.read_text(encoding="utf-8")
        self.assertIn("ENVIRONMENT", content)
        self.assertIn("production", content)

    def test_q2_render_yaml_no_multi_worker_flag(self):
        content = self.RENDER_YAML.read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"--workers\s+[2-9]\d*", content),
            "render.yaml uses multi-worker uvicorn which would duplicate the monitoring daemon")

    def test_q3_render_yaml_documents_single_worker_rationale(self):
        content = self.RENDER_YAML.read_text(encoding="utf-8")
        self.assertIn("Single-worker", content)


if __name__ == "__main__":
    unittest.main()
