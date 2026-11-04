import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from api import app
class SideAgentTests(unittest.TestCase):
 def test_context_validation_and_messages(self):
  c=TestClient(app)
  with patch('side_agent.chat',return_value={'message':'Review evidence','choices':[],'action':'relationships','metric':'rd_ratio','company_query':''}) as fn:
   r=c.post('/api/agent/chat',json={'message':'Show R&D','context':{'screen':'/','metric':'rd_ratio'},'messages':[]})
   self.assertEqual(r.status_code,200);self.assertEqual(fn.call_args.args[1]['metric'],'rd_ratio')
  self.assertEqual(c.post('/api/agent/chat',json={'message':'test','context':{'metric':'arbitrary_code'}}).status_code,422)
 def test_surfaces(self):
  c=TestClient(app)
  for page in ['/','/advanced','/strategy']:self.assertIn('/static/side-agent.js',c.get(page).text)
