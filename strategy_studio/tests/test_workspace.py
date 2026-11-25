import unittest
from fastapi.testclient import TestClient
from api import app
class WorkspaceTests(unittest.TestCase):
 def test_flow_evidence(self):
  c=TestClient(app);body={'profile':{'revenue':100e6,'revenue_growth':.3,'operating_margin':-.15,'gross_margin':.75,'sales_marketing_ratio':.4,'rd_ratio':.25},'decisions':['sales_marketing_ratio'],'proposed_ratios':{'sales_marketing_ratio':.45}}
  r=c.post('/api/workspace/analyze',json=body);self.assertEqual(r.status_code,200,r.text);d=r.json();self.assertTrue(d['peers']['items']);self.assertAlmostEqual(d['decisions'][0]['budget_delta_at_current_revenue'],5e6);self.assertIsNone(d['analyst']);self.assertEqual(d['decisions'][0]['relationship']['settings']['pool'],'train')
  body['decisions']=[];self.assertEqual(c.post('/api/workspace/analyze',json=body).status_code,422)
 def test_page(self):self.assertIn('Your strategy, connected.',TestClient(app).get('/strategy').text)
 def test_company_flow(self):
  c=TestClient(app)
  r=c.get('/api/strategy/company-flow-list');self.assertEqual(r.status_code,200);self.assertTrue(len(r.json()['items'])>=10)
  r2=c.post('/api/strategy/company-flow/SNOW',json={'startup_profile':{'revenue':10e6,'sales_marketing_ratio':.45}});self.assertEqual(r2.status_code,200);d=r2.json();self.assertTrue(len(d['stages'])>=3);self.assertIn('graph LR',d['mermaid_code']);self.assertIn('comparison',d)
 def test_phase_deepdive(self):
  c=TestClient(app)
  r=c.get('/api/strategy/phase-deepdive/DDOG/3');self.assertEqual(r.status_code,200);d=r.json();self.assertIn('strategic_why',d);self.assertIn('frameworks',d);self.assertIn('ansoff',d['frameworks']);self.assertTrue(len(d['product_lines'])>=1)
 def test_extend_flow_endpoint(self):
  c=TestClient(app)
  r1=c.post('/api/strategy/extend-flow',json={'action':'append','model_type':'enterprise_sales','company_ticker':'DDOG'})
  self.assertEqual(r1.status_code,200);d1=r1.json();self.assertIn('stages',d1)
  r2=c.post('/api/strategy/extend-flow',json={'action':'branch','model_type':'multi_product','company_ticker':'SNOW','current_flow':d1})
  self.assertEqual(r2.status_code,200);d2=r2.json();self.assertTrue(any(s.get('is_branch') for s in d2['stages']))
  r3=c.post('/api/strategy/extend-flow',json={'action':'build','model_type':'rule_40_moat','company_ticker':'CRWD'})
  self.assertEqual(r3.status_code,200);d3=r3.json();self.assertTrue(len(d3['stages'])>=3)
 def test_backpack_recommend_endpoint(self):
  c=TestClient(app)
  r=c.post('/api/strategy/backpack-recommend',json={'backpack_items':[],'objective':'rule40'})
  self.assertEqual(r.status_code,200);d=r.json()
  self.assertTrue(len(d['recommended_additions'])>=1)
  self.assertTrue(len(d['assembled_sequence'])>=1)
  self.assertGreater(d['benchmarks']['companies_count'],0)
  r2=c.post('/api/strategy/backpack-recommend',json={'backpack_items':[{'ticker':'DDOG','year':'FY2019','revenue':362e6,'sales_marketing_ratio':0.40,'rd_ratio':0.30,'growth':0.83,'rule_of_40':77.6}],'objective':'growth'})
  self.assertEqual(r2.status_code,200);self.assertTrue(len(r2.json()['diagnosis'])>=1)
 def test_explain_connection_endpoint(self):
  c=TestClient(app)
  r=c.post('/api/strategy/explain-connection',json={
   'from_stage':{'ticker':'UPLD','year':'FY2013','revenue':41.2e6,'sales_marketing_ratio':0.258,'rd_ratio':0.15,'growth':0.81,'rule_of_40':69.8},
   'to_stage':{'ticker':'FROG','year':'FY2021','revenue':206.7e6,'sales_marketing_ratio':0.40,'rd_ratio':0.25,'growth':0.37,'rule_of_40':4.0}
  })
  self.assertEqual(r.status_code,200);d=r.json()
  self.assertIn('scale_summary',d);self.assertIn('gtm_shift',d);self.assertEqual(d['metrics']['sm_delta_pp'],14.2)
