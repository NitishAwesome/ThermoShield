import os
import sys
import unittest
import uuid
import jwt
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.database.connection import SessionLocal
from backend.app.database.models import User
from backend.app.auth.router import (
    hash_password,
    verify_password,
    create_access_token,
    get_jwt_secret,
)


class TestAuthSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def _generate_unique_user_data(self):
        unique_suffix = uuid.uuid4().hex[:8]
        return {
            "name": f"Security User {unique_suffix}",
            "email": f"sec_{unique_suffix}@example.com",
            "phone_number": f"+9198{unique_suffix[:8]}",
            "password": "SecurePassword123!",
            "role": "user"
        }

    # 1. Registration with valid password
    def test_01_registration_with_valid_password(self):
        data = self._generate_unique_user_data()
        res = self.client.post("/auth/register", json=data)
        self.assertEqual(res.status_code, 201, res.text)
        body = res.json()
        self.assertIn("access_token", body)
        self.assertEqual(body["token_type"], "bearer")
        self.assertIn("user", body)
        self.assertEqual(body["user"]["email"], data["email"])
        self.assertNotIn("password", body["user"])
        self.assertNotIn("password_hash", body["user"])

    # 2. Registration rejects too-short password
    def test_02_registration_rejects_too_short_password(self):
        data = self._generate_unique_user_data()
        data["password"] = "short"  # < 8 chars
        res = self.client.post("/auth/register", json=data)
        self.assertIn(res.status_code, [400, 422])

    # 3. Password is stored hashed in the database
    def test_03_password_is_stored_hashed(self):
        data = self._generate_unique_user_data()
        res = self.client.post("/auth/register", json=data)
        self.assertEqual(res.status_code, 201)

        user_in_db = self.db.query(User).filter(User.email == data["email"]).first()
        self.assertIsNotNone(user_in_db)
        self.assertIsNotNone(user_in_db.password_hash)
        self.assertNotEqual(user_in_db.password_hash, data["password"])
        # Bcrypt hashes start with $2b$ or $2a$
        self.assertTrue(user_in_db.password_hash.startswith("$2b$") or user_in_db.password_hash.startswith("$2a$"))
        self.assertTrue(verify_password(data["password"], user_in_db.password_hash))

    # 4. Correct password login succeeds
    def test_04_correct_password_login_succeeds(self):
        data = self._generate_unique_user_data()
        reg_res = self.client.post("/auth/register", json=data)
        self.assertEqual(reg_res.status_code, 201)

        login_res = self.client.post("/auth/login", json={
            "email": data["email"],
            "password": data["password"]
        })
        self.assertEqual(login_res.status_code, 200, login_res.text)
        body = login_res.json()
        self.assertIn("access_token", body)
        self.assertIn("user", body)
        self.assertEqual(body["user"]["email"], data["email"])

    # 5. Incorrect password login fails with generic 401
    def test_05_incorrect_password_login_fails(self):
        data = self._generate_unique_user_data()
        self.client.post("/auth/register", json=data)

        login_res = self.client.post("/auth/login", json={
            "email": data["email"],
            "password": "WrongPassword999!"
        })
        self.assertEqual(login_res.status_code, 401)
        self.assertIn("Invalid email/phone", login_res.json().get("detail", ""))

    # 6. User with UNSET_PASSWORD_RESET_REQUIRED sentinel cannot log in
    def test_06_unmigrated_or_blank_password_user_cannot_login(self):
        unique_suffix = uuid.uuid4().hex[:8]
        legacy_user = User(
            name=f"Legacy {unique_suffix}",
            email=f"legacy_{unique_suffix}@example.com",
            phone_number=f"+9188{unique_suffix[:8]}",
            role="user",
            password_hash="UNSET_PASSWORD_RESET_REQUIRED"
        )
        self.db.add(legacy_user)
        self.db.commit()

        login_res = self.client.post("/auth/login", json={
            "email": legacy_user.email,
            "password": "AnyAttemptedPassword123"
        })
        self.assertEqual(login_res.status_code, 401)
        self.assertIn("Invalid email/phone", login_res.json().get("detail", ""))

    # 7. Missing JWT_SECRET in production configuration raises RuntimeError
    def test_07_missing_jwt_secret_in_production_fails_safely(self):
        old_secret = os.environ.get("JWT_SECRET")
        old_env = os.environ.get("ENVIRONMENT")
        try:
            if "JWT_SECRET" in os.environ:
                del os.environ["JWT_SECRET"]
            os.environ["ENVIRONMENT"] = "production"

            with self.assertRaises(RuntimeError) as ctx:
                get_jwt_secret()
            self.assertIn("JWT_SECRET", str(ctx.exception))
        finally:
            if old_secret is not None:
                os.environ["JWT_SECRET"] = old_secret
            elif "JWT_SECRET" in os.environ:
                del os.environ["JWT_SECRET"]
            if old_env is not None:
                os.environ["ENVIRONMENT"] = old_env
            elif "ENVIRONMENT" in os.environ:
                del os.environ["ENVIRONMENT"]

    # 8. Unauthorized CRUD access is rejected (401 without token, 403 for non-admin)
    def test_08_unauthorized_crud_access_is_rejected(self):
        # Unauthenticated access to /users should return 401
        res_unauth = self.client.get("/users")
        self.assertEqual(res_unauth.status_code, 401)

        # Normal user access to /users should return 403 Forbidden
        user_data = self._generate_unique_user_data()
        user_data["role"] = "user"
        reg = self.client.post("/auth/register", json=user_data)
        user_token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {user_token}"}

        res_forbidden = self.client.get("/users", headers=headers)
        self.assertEqual(res_forbidden.status_code, 403)
        self.assertIn("requires one of the following roles", res_forbidden.json().get("detail", ""))

        # Non-admin user cannot delete locations
        del_forbidden = self.client.delete("/locations/9999", headers=headers)
        self.assertEqual(del_forbidden.status_code, 403)

    # 9. Authorized admin/official access works
    def test_09_authorized_admin_access_works(self):
        admin_data = self._generate_unique_user_data()
        admin_data["role"] = "admin"
        reg = self.client.post("/auth/register", json=admin_data)
        admin_token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Admin can access /users list
        res_admin = self.client.get("/users", headers=headers)
        self.assertEqual(res_admin.status_code, 200)
        self.assertIsInstance(res_admin.json(), list)

    # 10. GET /auth/me returns safe user fields only
    def test_10_auth_me_returns_safe_fields_only(self):
        user_data = self._generate_unique_user_data()
        reg = self.client.post("/auth/register", json=user_data)
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me_res = self.client.get("/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        profile = me_res.json()
        self.assertEqual(profile["email"], user_data["email"])
        self.assertEqual(profile["name"], user_data["name"])
        self.assertEqual(profile["role"], user_data["role"])

        # Strictly verify sensitive fields are NEVER leaked
        forbidden_keys = ["password", "password_hash", "jwt_secret", "smtp", "MAIL_PASSWORD"]
        for key in forbidden_keys:
            self.assertNotIn(key, profile)
            self.assertNotIn(key.upper(), profile)

    # 11. Google Sign-In returns valid JWT token and user profile
    def test_11_google_login_success(self):
        unique_suffix = uuid.uuid4().hex[:8]
        test_email = f"google_user_{unique_suffix}@example.com"
        res = self.client.post("/auth/google", json={"credential": f"dev_google_{test_email}"})
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertIn("access_token", body)
        self.assertEqual(body["token_type"], "bearer")
        self.assertEqual(body["user"]["email"], test_email)

        # Verify token works on protected route
        headers = {"Authorization": f"Bearer {body['access_token']}"}
        me_res = self.client.get("/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["email"], test_email)

    # 12. Google Sign-In rejects empty credential
    def test_12_google_login_empty_credential(self):
        res = self.client.post("/auth/google", json={"credential": ""})
        self.assertIn(res.status_code, [400, 422])


if __name__ == "__main__":
    unittest.main()

