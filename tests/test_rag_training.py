import sys
import unittest
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from fastapi.testclient import TestClient
from app.main import app
from app.services.rag_service import rag_engine, KnowledgeChunk


class TestRAGTrainingAndAntiRedundancy(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_dynamic_knowledge_training_and_retrieval(self):
        """Verify that training a custom document makes it immediately searchable."""
        test_title = "Jaipur Pink City Heat Shelter Protocol 2026"
        test_content = (
            "Jaipur Municipal Corporation operates 50 air-cooled public shelters with chilled Jal-Dhara "
            "potable water stations across Johari Bazaar and Tripolia Gate during Orange and Red Alert days."
        )
        chunk = rag_engine.train_from_text(
            title=test_title,
            authority="Jaipur Municipal Corporation (JMC)",
            category="hap",
            content=test_content,
            keywords=["jaipur", "shelter", "jmc", "johari", "jal-dhara"],
            priority=2
        )
        self.assertIsNotNone(chunk.chunk_id)
        self.assertEqual(chunk.category, "hap")

        # Test retrieval
        retrieved = rag_engine.retrieve_relevant_chunks("Where are heat shelters in Jaipur?")
        self.assertTrue(len(retrieved) > 0)
        retrieved_ids = [c.chunk_id for c in retrieved]
        self.assertIn(chunk.chunk_id, retrieved_ids)

        # Cleanup custom test chunk
        rag_engine.delete_knowledge_chunk(chunk.chunk_id)

    def test_anti_redundancy_followup_suppresses_header(self):
        """Verify that multi-turn follow-up queries do not repeat the bulky telemetry intro."""
        query_first = "How much water should I drink today?"
        first_resp = rag_engine.synthesize_rag_response(
            query=query_first,
            location="Mumbai, Maharashtra",
            temp=38.5,
            humidity=60.0,
            risk_level="HIGH",
            chunks=rag_engine.retrieve_relevant_chunks(query_first),
            conversation_history=[]
        )
        # First turn MUST contain the intro header
        self.assertIn("ThermoShield Biometeorological Advisory for Mumbai", first_resp["reply"])

        # Follow-up turn MUST NOT repeat the intro header
        followup_query = "What traditional Indian drinks can help?"
        history = [
            {"role": "user", "text": query_first},
            {"role": "model", "text": first_resp["reply"]}
        ]
        followup_resp = rag_engine.synthesize_rag_response(
            query=followup_query,
            location="Mumbai, Maharashtra",
            temp=38.5,
            humidity=60.0,
            risk_level="HIGH",
            chunks=rag_engine.retrieve_relevant_chunks(followup_query),
            conversation_history=history
        )
        self.assertNotIn("ThermoShield Biometeorological Advisory for Mumbai", followup_resp["reply"])
        self.assertTrue(any(w in followup_resp["reply"] for w in ["Aam Panna", "Sattu", "Chaas", "Coconut"]))

    def test_api_train_and_knowledge_endpoints(self):
        """Verify /copilot/train and /copilot/knowledge REST API endpoints."""
        train_payload = {
            "title": "Pune District Rural Heat Shelter Standard",
            "authority": "Pune District Disaster Management Authority",
            "category": "hap",
            "content": "Pune rural Gram Panchayats must install shaded misting shades at weekly rural haats and mandis.",
            "keywords": ["pune", "rural", "mandi", "haat", "panchayat"],
            "priority": 1
        }
        res = self.client.post("/copilot/train", json=train_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        chunk_id = data["chunk_id"]

        # Verify /copilot/knowledge lists the newly trained chunk
        list_res = self.client.get("/copilot/knowledge")
        self.assertEqual(list_res.status_code, 200)
        knowledge_data = list_res.json()
        self.assertTrue(knowledge_data["total_chunks"] >= 8)
        ids = [c["chunk_id"] for c in knowledge_data["chunks"]]
        self.assertIn(chunk_id, ids)

        # Cleanup via delete endpoint
        del_res = self.client.delete(f"/copilot/knowledge/{chunk_id}")
        self.assertEqual(del_res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
