import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from api import app
import reasoning
class LiveTests(unittest.TestCase):
 def test_missing_connection(self):
  with patch('reasoning.load_config',return_value={'OPENAI_API_KEY':'','OPENAI_MODEL':''}):
   c=TestClient(app)
   self.assertFalse(c.get('/api/ai/status').json()['configured'])
   self.assertEqual(c.post('/api/ai/analyze',json={'company_id':'0001404655','period_end':'2025-12-31','question':'Explain growth'}).status_code,503)
 def test_provider(self):
  h={'company':{'name':'Example'},'periods':[{'period_end':'2025-12-31','row_id':'example','revenue':100}]}
  resp=MagicMock();resp.json.return_value={'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':'Evidence summary'}]}]}
  with patch('reasoning.load_config',return_value={'OPENAI_API_KEY':'test-secret','OPENAI_MODEL':'test-model'}),patch('reasoning.service.history',return_value=h),patch('reasoning.service.sources',return_value={}),patch('reasoning.analysis.relationship',return_value={'rows':[],'complete_rows':30}),patch('reasoning.httpx.Client') as client:
   client.return_value.__enter__.return_value.post.return_value=resp
   result=reasoning.explain('example','2025-12-31','Explain',{},None)
   self.assertEqual(result['mode'],'live_ai');self.assertNotIn('test-secret',str(result))
   self.assertFalse(client.return_value.__enter__.return_value.post.call_args.kwargs['json']['store'])
 def test_pages(self):
  c=TestClient(app);self.assertIn('LIVE REASONING API',c.get('/').text);self.assertEqual(c.get('/advanced').status_code,200)
