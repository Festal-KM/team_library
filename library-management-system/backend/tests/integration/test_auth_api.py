import pytest
from fastapi.testclient import TestClient
def test_login_success(client: TestClient, test_user): response = client.post("/api/auth/login", json={"email": test_user.email, "password": "password123"}); assert response.status_code == 200
