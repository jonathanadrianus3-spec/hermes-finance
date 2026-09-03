from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_mobile_endpoints():
    print("Testing Hermes Mobile API Endpoints...")

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("  [OK] Health check OK")

    # 2. Entities endpoint
    res = client.get("/api/entities")
    assert res.status_code == 200
    entities = res.json()
    assert set(entities) == {"Personal", "Family", "Community", "Professional"}
    print(f"  [OK] Entities returned: {entities}")

    # 3. Mobile dashboard
    res = client.get("/api/mobile/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "pending_review_count" in data
    assert "entity_breakdown" in data["summary"]
    breakdown_entities = [e["entity"] for e in data["summary"]["entity_breakdown"]]
    assert set(breakdown_entities) == {"Personal", "Family", "Community", "Professional"}
    print(f"  [OK] Dashboard OK - Total Spent: {data['summary']['total_spent']}, Pending: {data['pending_review_count']}")

    # 4. Pending reviews
    res = client.get("/api/transactions/pending-review")
    assert res.status_code == 200
    pending = res.json()
    print(f"  [OK] Pending reviews count: {len(pending)}")

    # 5. Review a transaction
    if pending:
        tx_id = pending[0]["id"]
        review_payload = {
            "category": "Food & Dining",
            "entity": "Family",
            "notes": "Reviewed via mobile test"
        }
        res = client.post(f"/api/transactions/{tx_id}/review", json=review_payload)
        assert res.status_code == 200
        assert res.json()["success"] is True
        print(f"  [OK] Transaction {tx_id} successfully reviewed as Family")

    # 6. Query transactions by entity
    for ent in ["Personal", "Family", "Community", "Professional"]:
        res = client.get(f"/api/transactions?entity={ent}")
        assert res.status_code == 200
        items = res.json()["items"]
        print(f"  [OK] Filter entity '{ent}': {len(items)} transactions")

    print("\n[SUCCESS] All mobile backend endpoints verified!")

if __name__ == "__main__":
    test_mobile_endpoints()
