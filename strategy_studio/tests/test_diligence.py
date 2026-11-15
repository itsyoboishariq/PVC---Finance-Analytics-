import unittest
from fastapi.testclient import TestClient
from api import app

class DiligenceAndPitchBookTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_pitchbook_status(self):
        res = self.client.get('/api/pitchbook/status')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('data_coverage', data)
        self.assertGreaterEqual(data['data_coverage']['companies_indexed'], 10)

    def test_pitchbook_screening(self):
        res = self.client.get('/api/pitchbook/screen?sector=prediction')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(len(data['items']) >= 2)
        names = [c['name'] for c in data['items']]
        self.assertIn('Kalshi', names)

    def test_pitchbook_company_detail(self):
        res = self.client.get('/api/pitchbook/companies/PB-KALSHI-01')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['name'], 'Kalshi')
        self.assertEqual(data['regulatory_status'], 'CFTC-Designated Contract Market (DCM) since Nov 2020')

    def test_pitchbook_deals(self):
        res = self.client.get('/api/pitchbook/deals')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(len(data['items']) >= 3)

    def test_diligence_spaces(self):
        res = self.client.get('/api/diligence/spaces')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(len(data['items']) >= 3)

    def test_diligence_agent_guide(self):
        res = self.client.get('/api/diligence/agent-guide?space_id=prediction-markets')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('questions', data)
        self.assertEqual(len(data['questions']), 5)

    def test_diligence_generate(self):
        payload = {
            'space_id': 'prediction-markets',
            'mandate': 'ma_acquisition',
            'data_source': 'hybrid_diligence',
            'monetization': 'blended_exchange',
            'financial_ambition': 'balanced_growth'
        }
        res = self.client.post('/api/diligence/generate', json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        # Verify all 4 pillars
        self.assertIn('pillar_1_market_sizing', data)
        self.assertIn('pillar_2_target_screening', data)
        self.assertIn('pillar_3_financial_model', data)
        self.assertIn('pillar_4_executive_slides', data)
        
        # Verify Pillar 1 TAM/SAM/SOM
        self.assertGreater(data['pillar_1_market_sizing']['top_down']['implied_tam_usd_bn'], 0)
        
        # Verify Pillar 2 screening targets
        self.assertTrue(len(data['pillar_2_target_screening']['screened_targets']) >= 3)

        # Verify Pillar 3 5-year financial model
        projections = data['pillar_3_financial_model']['projections_table']
        self.assertEqual(len(projections), 5)
        self.assertIn('free_cash_flow_usd_m', projections[0])
        self.assertGreater(data['pillar_3_financial_model']['terminal_valuation_usd_m'], 0)

        # Verify Pillar 4 executive slides
        slides = data['pillar_4_executive_slides']
        self.assertEqual(len(slides), 5)
        self.assertEqual(slides[0]['slide_number'], 1)
