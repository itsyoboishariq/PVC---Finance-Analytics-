"""Read-only company research and transparent weighted financial matching."""
import json,math,csv,io
from database import connect,DB,ROOT,METRICS,numeric

MODEL=json.loads((ROOT/'data/cluster_model.json').read_text())
FEATURES=MODEL['features']
DISPLAY={'log_revenue':'Annual revenue (log scale)','revenue_growth':'Revenue growth','operating_margin':'Operating profit/loss','gross_margin':'Gross margin','sales_marketing_ratio':'Sales and marketing spending','rd_ratio':'Product development spending'}

def decode(row):return json.loads(row['fields_json'])

def profile_cluster(r):
    p=MODEL['preprocessing'];values=[]
    for i,k in enumerate(FEATURES):
        v=numeric(r.get(k));v=p['median'][i] if v is None else v
        values.append((min(max(v,p['low'][i]),p['high'][i])-p['mean'][i])/p['scale'][i])
    distances=[sum((a-b)**2 for a,b in zip(values,center)) for center in MODEL['centers']]
    i=min(range(len(distances)),key=distances.__getitem__)
    return {'cluster_id':i+1,'name':MODEL['clusters'][i]['name'],'description':MODEL['clusters'][i]['description']}

def summary(path=DB):
    with connect(path) as c:
        manifest=json.loads(c.execute("SELECT value FROM import_info WHERE key='manifest'").fetchone()[0])
        counts={'screened_companies':c.execute('SELECT COUNT(*) FROM companies').fetchone()[0],
                'core_companies':c.execute('SELECT COUNT(*) FROM companies WHERE strict_include=1').fetchone()[0],
                'all_company_years':c.execute('SELECT COUNT(*) FROM periods').fetchone()[0],
                'core_company_years':c.execute('SELECT COUNT(*) FROM periods p JOIN companies c USING(company_id) WHERE c.strict_include=1').fetchone()[0],
                'financial_source_facts':c.execute('SELECT COUNT(*) FROM source_facts').fetchone()[0],
                'observed_changes':c.execute('SELECT COUNT(*) FROM observed_changes').fetchone()[0]}
        dates=c.execute('SELECT MIN(period_end),MAX(period_end) FROM periods').fetchone()
        return {'snapshot':manifest['snapshot'],'counts':counts,'period_range':list(dates),'matching_features':FEATURES,
                'units':'USD monetary values; ratios as fractions (0.40 = 40%).',
                'history_policy':'All available imported annual fiscal periods, preserving missing values and original disclosure cutoffs.',
                'matching_policy':'Financial inputs only; standardized with the earlier training sample. No future outcomes enter ranking.'}

def search_companies(q='',scope='core',limit=30,offset=0,path=DB):
    with connect(path) as c:
        data=[]
        for r in c.execute('SELECT * FROM companies ORDER BY name'):
            if scope=='core' and not r['strict_include']:continue
            if q.casefold() not in (r['name']+' '+r['ticker']+' '+r['company_id']).casefold():continue
            latest=c.execute('SELECT * FROM periods WHERE company_id=? ORDER BY period_end DESC LIMIT 1',(r['company_id'],)).fetchone()
            fields=decode(latest) if latest else {}
            data.append({'company_id':r['company_id'],'ticker':r['ticker'],'name':r['name'],
                         'strict_include':bool(r['strict_include']),'ipo_date':json.loads(r['metadata_json']).get('ipo_date'),
                         'latest_period':fields.get('period_end'),'latest_revenue':fields.get('revenue'),
                         'latest_growth':fields.get('revenue_growth'),
                         'period_count':c.execute('SELECT COUNT(*) FROM periods WHERE company_id=?',(r['company_id'],)).fetchone()[0]})
        return {'items':data[offset:offset+limit],'total':len(data),'limit':limit,'offset':offset,'scope':scope}

def history(cid,start_year=None,end_year=None,path=DB):
    with connect(path) as c:
        company=c.execute('SELECT * FROM companies WHERE company_id=?',(cid,)).fetchone()
        if not company:raise KeyError('Company not found')
        result=[]
        for p in c.execute('SELECT * FROM periods WHERE company_id=? ORDER BY period_end',(cid,)):
            year=int(p['period_end'][:4])
            if start_year and year<start_year or end_year and year>end_year:continue
            fields=decode(p);fields['cluster']=profile_cluster(fields)
            fields['changes']=[dict(r) for r in c.execute('SELECT previous_row_id,metric,change FROM observed_changes WHERE row_id=?',(p['row_id'],))]
            fields['targets']={**dict(c.execute('SELECT * FROM targets WHERE row_id=?',(p['row_id'],)).fetchone())}
            result.append(fields)
        metadata=json.loads(company['metadata_json'])
        return {'company':{'company_id':cid,'ticker':company['ticker'],'name':company['name'],'strict_include':bool(company['strict_include']),'metadata':metadata},'periods':result,
                'notes':['Periods are actual fiscal dates; absent periods and metrics are not interpolated.',
                         'Cluster names describe financial profiles, not verified management strategies.',
                         'Early prospectus periods may have become public years after the fiscal period ended. See feature_available_date.']}

def sources(row_id,metric=None,path=DB):
    with connect(path) as c:
        row=c.execute('SELECT fields_json FROM periods WHERE row_id=?',(row_id,)).fetchone()
        if not row:raise KeyError('Period not found')
        fields=decode(row)
        query='SELECT source_json FROM source_facts WHERE row_id=?';args=[row_id]
        if metric:query+=' AND metric=?';args.append(metric)
        facts=[json.loads(r[0]) for r in c.execute(query,args)]
        metrics=[dict(r) for r in c.execute('SELECT metric,value,missing,status FROM metric_values WHERE row_id=?'+(' AND metric=?' if metric else ''),args)]
        return {'row_id':row_id,'metric':metric,'values':metrics,'source_facts':facts,'period_source_urls':fields.get('source_urls',''),
                'note':'Derived ratios may have no directly reported source fact. Consult the metric definition and component filing facts.'}

def compare(row_ids,path=DB):
    with connect(path) as c:
        result=[]
        for rid in row_ids:
            row=c.execute('SELECT * FROM periods WHERE row_id=?',(rid,)).fetchone()
            if not row:raise KeyError('Unknown company period: '+rid)
            r=decode(row);r['cluster']=profile_cluster(r);result.append(r)
        return {'items':result,'notes':'Every column is an explicitly selected fiscal period. Missing values stay null; no period alignment is implied.'}

def similar(request,path=DB):
    user={k:v for k,v in request['profile'].items() if v is not None}
    if 'revenue' in user:user['log_revenue']=math.log(user.pop('revenue'))
    weights=request.get('weights') or {};selected=[k for k in FEATURES if k in user and weights.get(k,1)>0]
    if len(selected)<3:raise ValueError('Provide at least three financial measures with positive weights.')
    prep=MODEL['preprocessing'];weighted={k:float(weights.get(k,1)) for k in selected}
    def standard(k,v):
        i=FEATURES.index(k);return (min(max(v,prep['low'][i]),prep['high'][i])-prep['mean'][i])/prep['scale'][i]
    z={k:standard(k,user[k]) for k in selected};total_weight=sum(weighted.values())
    start=request.get('start_year');end=request.get('end_year');cutoff=request.get('available_by')
    items=[];candidates=0
    with connect(path) as c:
        query='SELECT p.* FROM periods p JOIN companies c USING(company_id) JOIN targets t USING(row_id) WHERE c.strict_include=1 AND t.eligible=1'
        for row in c.execute(query):
            if request.get('stage_only',True) and not row['stage']:continue
            if request.get('pool','research')=='train' and row['split']!='train':continue
            if request.get('exclude_company_id')==row['company_id']:continue
            if start and int(row['period_end'][:4])<start or end and int(row['period_end'][:4])>end:continue
            # available_by applies to the entire retrospective comparison, including outcomes.
            r=decode(row)
            if cutoff and (row['available_date']>cutoff or not r.get('target_available_date') or r['target_available_date']>cutoff):continue
            candidates+=1
            common=[k for k in selected if numeric(r.get(k)) is not None]
            covered=sum(weighted[k] for k in common)/total_weight
            if len(common)<3 or covered<.8:continue
            parts={k:weighted[k]*(z[k]-standard(k,r[k]))**2 for k in common}
            matched_weight=sum(weighted[k] for k in common)
            distance=math.sqrt(sum(parts.values())/matched_weight)
            r['match']={'distance':distance,'feature_coverage':covered,'missing_measures':[DISPLAY[k] for k in selected if k not in common],
                        'reasons':[{'metric':k,'label':DISPLAY[k],'your_value':user[k],'company_value':r[k],
                                    'standardized_gap':abs(z[k]-standard(k,r[k])),
                                    'weighted_squared_difference':parts[k]} for k in sorted(common,key=lambda k:parts[k])],
                        'explanation':'Ranked by weighted financial distance, not subsequent results. Lower distance is closer; it is not a probability.'}
            r['cluster']=profile_cluster(r);items.append(r)
    items.sort(key=lambda r:(r['match']['distance'],r['row_id']))
    if request.get('one_per_company',True):
        unique=[];seen=set()
        for r in items:
            if r['company_id'] not in seen:seen.add(r['company_id']);unique.append(r)
        items=unique
    outside=[DISPLAY[k] for k in selected if user[k]<prep['low'][FEATURES.index(k)] or user[k]>prep['high'][FEATURES.index(k)]]
    return {'items':items[:request.get('limit',10)],'total_matches':len(items),'candidate_company_years':candidates,
            'settings':request,'features_used':selected,'weights_used':weighted,
            'warnings':(['Inputs outside the training 1st–99th percentile bounds were clipped for distance calculations: '+', '.join(outside)] if outside else [])+
                       ['Historical comparisons are descriptive. Outcomes did not determine ranking. Missing features were not filled for matching.',
                        'This public-company sample may not represent private companies. Similarity is financial, not a verified sector or product match.'],
            'normalization':'Fixed training medians/means/scales from the earlier 274-row model; matching skips missing measures and requires at least 80% weighted coverage and three observed measures.',
            'snapshot':'2026-10-23'}

def rows_csv(items):
    out=io.StringIO();keys=['row_id','company_id','ticker','company_name','period_start','period_end','feature_available_date','revenue','revenue_growth','operating_margin','gross_margin','sales_marketing_ratio','rd_ratio','cash','operating_cash_flow','fcf','target_period_end','target_revenue_growth','target_operating_margin','target_available_date','source_urls']
    w=csv.DictWriter(out,fieldnames=keys+['match_distance'],extrasaction='ignore');w.writeheader()
    for r in items:
        row={**r,'match_distance':r.get('match',{}).get('distance')}
        # Prevent spreadsheet formulas in external text fields while retaining raw JSON separately.
        for k,v in row.items():
            if isinstance(v,str) and v.startswith(('=','+','@')):row[k]="'"+v
        w.writerow(row)
    return out.getvalue()
