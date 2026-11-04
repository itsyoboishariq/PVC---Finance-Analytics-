import unittest,time
from unittest.mock import patch
from fastapi.testclient import TestClient
from api import app
class JobTests(unittest.TestCase):
 def test_job_completion_and_validation(self):
  c=TestClient(app)
  with patch('side_agent.chat',return_value={'message':'ready'}):
   r=c.post('/api/jobs/agent',json={'message':'Explain','context':{}});self.assertEqual(r.status_code,200)
   for _ in range(100):
    result=c.get('/api/jobs/'+r.json()['job_id'])
    if result.json().get('status')=='complete':break
    time.sleep(.01)
   self.assertEqual(result.json()['result']['message'],'ready')
  self.assertEqual(c.get('/api/jobs/unknown').status_code,404)
  self.assertEqual(c.post('/api/jobs/agent',json={'message':'','context':{}}).status_code,422)
