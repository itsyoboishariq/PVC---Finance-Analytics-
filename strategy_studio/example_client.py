"""Run after starting the app: python example_client.py"""
import json
from urllib.request import Request,urlopen

BASE='http://127.0.0.1:8771'
with urlopen(BASE+'/api/companies?q=HubSpot') as response:
    company=json.load(response)['items'][0]
print('Company:',company['name'],'ID:',company['company_id'])
with urlopen(BASE+'/api/companies/'+company['company_id']+'/history') as response:
    history=json.load(response)
print('Annual periods:',len(history['periods']))
request={'profile':{'revenue':100_000_000,'revenue_growth':.3,'operating_margin':-.15,
                    'gross_margin':.75,'sales_marketing_ratio':.4,'rd_ratio':.25},'limit':5}
with urlopen(Request(BASE+'/api/similar-companies',data=json.dumps(request).encode(),headers={'Content-Type':'application/json'})) as response:
    peers=json.load(response)
for row in peers['items']:
    print(row['company_name'],row['period_end'],'distance',round(row['match']['distance'],3))
