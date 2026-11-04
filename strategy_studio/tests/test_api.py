import unittest,json,sqlite3,math,tempfile,shutil
from pathlib import Path
from fastapi.testclient import TestClient
from api import app
from database import connect,DB,ROOT
import service

PROFILE={'revenue':100e6,'revenue_growth':.3,'operating_margin':-.15,'gross_margin':.75,'sales_marketing_ratio':.4,'rd_ratio':.25}

class ResearchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.client=TestClient(app)

    def test_database_integrity_and_import_counts(self):
        with connect() as c:
            self.assertEqual(c.execute('PRAGMA integrity_check').fetchone()[0],'ok')
            self.assertEqual(c.execute('PRAGMA foreign_key_check').fetchall(),[])
        s=self.client.get('/api/summary').json()
        self.assertEqual(s['counts']['core_companies'],99)
        self.assertEqual(s['counts']['all_company_years'],1036)
        self.assertEqual(s['counts']['financial_source_facts'],22129)

    def test_company_search_and_pagination(self):
        r=self.client.get('/api/companies',params={'q':'hubspot'}).json()
        self.assertEqual(r['total'],1);self.assertEqual(r['items'][0]['ticker'],'HUBS')
        self.assertEqual(self.client.get('/api/companies',params={'q':"' OR 1=1--"}).json()['total'],0)
        a=self.client.get('/api/companies',params={'limit':10}).json()
        b=self.client.get('/api/companies',params={'limit':10,'offset':10}).json()
        self.assertFalse(set(x['company_id'] for x in a['items']) & set(x['company_id'] for x in b['items']))

    def test_history_sources_and_missingness(self):
        company=self.client.get('/api/companies',params={'q':'HUBS'}).json()['items'][0]
        r=self.client.get('/api/companies/'+company['company_id']+'/history').json()
        dates=[p['period_end'] for p in r['periods']]
        self.assertEqual(dates,sorted(set(dates)))
        row=r['periods'][-1]
        facts=self.client.get('/api/periods/'+row['row_id']+'/sources',params={'metric':'revenue'}).json()
        self.assertTrue(facts['source_facts']);self.assertTrue(all(f['source_url'].startswith('https://') for f in facts['source_facts']))
        self.assertEqual(self.client.get('/api/companies/0000000000/history').status_code,404)
        with connect() as c:
            self.assertGreater(c.execute('SELECT COUNT(*) FROM metric_values WHERE missing=1 AND value IS NULL').fetchone()[0],0)
            self.assertEqual(c.execute('SELECT COUNT(*) FROM metric_values WHERE missing=1 AND value IS NOT NULL').fetchone()[0],0)

    def test_matching_is_distinct_and_excludes_self(self):
        r=self.client.post('/api/similar-companies',json={'profile':PROFILE}).json()
        self.assertEqual(r['total_matches'],94)
        self.assertEqual(len({x['company_id'] for x in r['items']}),len(r['items']))
        cid=r['items'][0]['company_id']
        excluded=self.client.post('/api/similar-companies',json={'profile':PROFILE,'exclude_company_id':cid}).json()
        self.assertNotIn(cid,[x['company_id'] for x in excluded['items']])
        self.assertTrue(all(x['match']['feature_coverage']>=.8 for x in r['items']))
        self.assertTrue(all(isinstance(x['target_revenue_growth'],(int,float)) for x in r['items']))

    def test_distance_uses_weights_and_financial_inputs(self):
        r=service.similar({'profile':PROFILE,'limit':1})['items'][0]
        match=r['match'];expected=math.sqrt(sum(x['weighted_squared_difference'] for x in match['reasons'])/len(match['reasons']))
        self.assertAlmostEqual(match['distance'],expected)
        self.assertTrue(all(x['metric'] not in ['target_revenue_growth','target_operating_margin'] for x in match['reasons']))
        weights={k:0 for k in service.FEATURES};weights.update(log_revenue=1,operating_margin=1,gross_margin=1)
        weighted=self.client.post('/api/similar-companies',json={'profile':PROFILE,'weights':weights}).json()
        self.assertEqual(set(weighted['features_used']),{'log_revenue','operating_margin','gross_margin'})

    def test_future_outcomes_do_not_change_peer_ranking(self):
        request={'profile':PROFILE,'limit':10}
        original=service.similar(request)
        with tempfile.TemporaryDirectory(dir=ROOT) as folder:
            duplicate=Path(folder)/'research.sqlite3';shutil.copyfile(DB,duplicate)
            c=connect(duplicate)
            for row in c.execute('SELECT row_id,fields_json FROM periods').fetchall():
                fields=json.loads(row['fields_json']);fields['target_revenue_growth']=999;fields['target_operating_margin']=-999
                c.execute('UPDATE periods SET fields_json=? WHERE row_id=?',(json.dumps(fields),row['row_id']))
            c.commit();c.close()
            changed=service.similar(request,path=duplicate)
            self.assertEqual([r['row_id'] for r in original['items']],[r['row_id'] for r in changed['items']])
            self.assertEqual([r['match']['distance'] for r in original['items']],[r['match']['distance'] for r in changed['items']])

    def test_training_and_availability_filters(self):
        r=self.client.post('/api/similar-companies',json={'profile':PROFILE,'pool':'train','available_by':'2021-12-31'}).json()
        for row in r['items']:
            self.assertEqual(row['model_use'],'train')
            self.assertLessEqual(row['feature_available_date'],'2021-12-31')
            self.assertLessEqual(row['target_available_date'],'2021-12-31')
        empty=self.client.post('/api/similar-companies',json={'profile':PROFILE,'available_by':'2000-01-01'}).json()
        self.assertEqual(empty['items'],[])

    def test_invalid_queries_rejected(self):
        cases=[{'profile':{'revenue':1e8}}, {'profile':PROFILE,'weights':{'target_revenue_growth':1}},
               {'profile':PROFILE,'weights':{'rd_ratio':-1}}, {'profile':PROFILE,'start_year':2025,'end_year':2020},
               {'profile':{**PROFILE,'gross_margin':75}}, {'profile':PROFILE,'limit':500}]
        for body in cases:
            with self.subTest(body=body):self.assertEqual(self.client.post('/api/similar-companies',json=body).status_code,422)

    def test_compare_and_exports(self):
        r=self.client.post('/api/similar-companies',json={'profile':PROFILE,'limit':3}).json()
        ids=[x['row_id'] for x in r['items']]
        compared=self.client.get('/api/compare',params=[('row_ids',x) for x in ids]).json()
        self.assertEqual([x['row_id'] for x in compared['items']],ids)
        self.assertEqual(self.client.get('/api/compare',params=[('row_ids',ids[0])]*4).status_code,422)
        exported=self.client.post('/api/export/matches',json={'profile':PROFILE,'limit':3})
        self.assertEqual(exported.status_code,200);self.assertIn('match_distance',exported.text)
        self.assertEqual(len(exported.text.splitlines()),4)

    def test_changes_are_adjacent_and_correct(self):
        with connect() as c:
            for change in c.execute("SELECT * FROM observed_changes WHERE metric='sales_marketing_ratio' LIMIT 50"):
                a=json.loads(c.execute('SELECT fields_json FROM periods WHERE row_id=?',(change['previous_row_id'],)).fetchone()[0])
                b=json.loads(c.execute('SELECT fields_json FROM periods WHERE row_id=?',(change['row_id'],)).fetchone()[0])
                self.assertAlmostEqual(change['change'],b['sales_marketing_ratio']-a['sales_marketing_ratio'])

if __name__=='__main__':unittest.main()
