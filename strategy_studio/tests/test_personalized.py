import unittest,json
from reasoning import build_dashboard
class DashboardTests(unittest.TestCase):
 def test_values_are_from_data_and_units_match(self):
  row={'period_end':'2025-12-31','revenue':123,'revenue_growth':None}
  spec={'summary':'Test','kpis':['revenue','invented'],'charts':[{'metrics':['revenue'],'start_year':2025,'end_year':2025,'rows':[{'revenue':999}]},{'metrics':['revenue','revenue_growth']},{'metrics':['revenue_growth']}]}
  d=build_dashboard(json.dumps(spec),[row],row)
  self.assertEqual(d['kpis'][0]['value'],123)
  self.assertEqual(len(d['charts']),2)
  self.assertEqual(d['charts'][0]['rows'][0]['revenue'],123)
  self.assertIsNone(d['charts'][1]['rows'][0]['revenue_growth'])
 def test_invalid_response_fallback(self):
  self.assertIsNone(build_dashboard('not json',[],{}))
