import unittest,json
import numpy as np
from fastapi.testclient import TestClient
from api import app,RelationshipRequest,StrategyRequest
from database import connect
import analysis
from html.parser import HTMLParser
from database import ROOT

PROFILE={'revenue':100e6,'revenue_growth':.3,'operating_margin':-.15,'gross_margin':.75,'sales_marketing_ratio':.4,'rd_ratio':.25}

class AnalysisTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.client=TestClient(app)

    def test_known_regression_and_company_uncertainty(self):
        r=self.client.post('/api/analysis/relationship',json={'bootstrap_samples':200}).json()
        self.assertEqual(r['status'],'ok');self.assertEqual(r['complete_rows'],267);self.assertEqual(r['companies'],74)
        self.assertAlmostEqual(r['unadjusted']['difference_pp_per_10pp'],2.8650186219682756,places=6)
        self.assertAlmostEqual(r['adjusted']['difference_pp_per_10pp'],1.0241724216006252,places=6)
        ci=r['adjusted']['ci95_pp'];self.assertLess(ci[0],0);self.assertGreater(ci[1],0)
        self.assertEqual(r['valid_bootstrap_samples'],200)
        self.assertEqual(r['excluded_missing'],7)

    def test_rank_ties_and_ols(self):
        np.testing.assert_allclose(analysis.rank([3,1,1]),[3,1.5,1.5])
        x=np.column_stack([np.ones(40),np.arange(40)]);y=2+3*np.arange(40)
        np.testing.assert_allclose(analysis.regress(x,y),[2,3],atol=1e-9)
        self.assertIsNone(analysis.regress(np.ones((40,2)),y))
        self.assertIsNone(analysis.correlation([1,1,1],[1,2,3]))

    def test_no_rows_and_no_invented_regression(self):
        r=self.client.post('/api/analysis/relationship',json={'available_by':'2000-01-01','bootstrap_samples':200}).json()
        self.assertEqual(r['complete_rows'],0);self.assertIsNone(r['adjusted']);self.assertEqual(r['rows'],[])

    def test_analysis_validation(self):
        for request in [{'predictor':'target_revenue_growth'},{'controls':['target_operating_margin']},{'controls':['revenue_growth','revenue_growth']},{'bootstrap_samples':10000},{'start_year':2025,'end_year':2020}]:
            self.assertEqual(self.client.post('/api/analysis/relationship',json=request).status_code,422)
        self.assertEqual(self.client.post('/api/analysis/strategy-comparison',json={'profile':PROFILE,'event_id':'custom'}).status_code,422)
        self.assertEqual(self.client.post('/api/analysis/strategy-comparison',json={'profile':PROFILE,'threshold_pp':0}).status_code,422)

    def test_strategy_timing_matching_and_groups(self):
        query={'profile':PROFILE,'event_id':'rates'}
        r=self.client.post('/api/analysis/strategy-comparison',json=query).json()
        self.assertGreater(r['similar_spending_rows'],0)
        for g in r['groups']:
            self.assertEqual(len({x['company_id'] for x in g['rows']}),len(g['rows']))
            for row in g['rows']:
                self.assertLess(row['starting_period_end'],row['spending_period_end'])
                self.assertLess(row['spending_period_end'],row['outcome_period_end'])
                self.assertLessEqual(row['spending_period_start'],r['event']['end'])
                self.assertGreaterEqual(row['spending_period_end'],r['event']['start'])
                self.assertLessEqual(row['distance'],1)
                self.assertAlmostEqual(row['action_change_pp'],(row['spending_ratio']-row['starting_ratio'])*100)
                if row['group']=='increased':self.assertGreater(row['action_change_pp'],2)
                if row['group']=='reduced':self.assertLess(row['action_change_pp'],-2)
                if row['group']=='held':self.assertLessEqual(abs(row['action_change_pp']),2)
        during=self.client.post('/api/analysis/strategy-comparison',json={**query,'outcome_timing':'during'}).json()
        self.assertTrue(any(g['rows'] for g in during['groups']))
        for g in during['groups']:
            for row in g['rows']:self.assertEqual(row['outcome_period_end'],row['spending_period_end'])

    def test_strategy_empty_future_event_and_rnd(self):
        query={'profile':PROFILE,'event_id':'custom','event_start':'2030-01-01','event_end':'2031-12-31'}
        r=self.client.post('/api/analysis/strategy-comparison',json=query).json()
        self.assertEqual(r['similar_spending_rows'],0)
        self.assertTrue(all(g['median_growth'] is None for g in r['groups']))
        rnd=self.client.post('/api/analysis/strategy-comparison',json={'profile':PROFILE,'action_metric':'rd_ratio','event_id':'all'}).json()
        self.assertGreater(rnd['similar_spending_rows'],0)

    def test_exports_and_sources(self):
        r=self.client.post('/api/export/analysis/relationship',json={'bootstrap_samples':200})
        self.assertEqual(r.status_code,200);self.assertIn('source_urls',r.text)
        r=self.client.post('/api/export/analysis/strategy-comparison',json={'profile':PROFILE})
        self.assertEqual(r.status_code,200);self.assertIn('starting_period_end',r.text);self.assertIn('expense_dollar_change',r.text)

    def test_default_numeric_form_values_are_submittable(self):
        class Inputs(HTMLParser):
            def __init__(self):super().__init__();self.inputs=[]
            def handle_starttag(self,tag,attrs):
                if tag=='input':self.inputs.append(dict(attrs))
        page=Inputs();page.feed((ROOT/'static/index.html').read_text(encoding='utf-8'))
        for field in page.inputs:
            if field.get('type')!='number' or 'value' not in field:continue
            value=float(field['value']);minimum=float(field.get('min',0));step=field.get('step','1')
            if 'min' in field:self.assertGreaterEqual(value,minimum)
            if 'max' in field:self.assertLessEqual(value,float(field['max']))
            if step!='any':self.assertAlmostEqual((value-minimum)/float(step),round((value-minimum)/float(step)),msg=field.get('id'))

if __name__=='__main__':unittest.main()
