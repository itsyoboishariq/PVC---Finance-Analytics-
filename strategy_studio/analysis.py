"""Observed relationships and time-aligned strategy research; no causal claims."""
import csv,io,json,math
from datetime import date
from statistics import median
import numpy as np
from database import DB,connect,numeric
from service import MODEL,FEATURES,DISPLAY

PREDICTORS=['sales_marketing_ratio','rd_ratio','ga_ratio','cfo_margin','gross_margin','revenue_growth','operating_margin','deferred_revenue_growth']
TARGETS=['target_revenue_growth','target_operating_margin']
CONTROLS=['log_revenue','revenue_growth','operating_margin','gross_margin']

def finite(v):return isinstance(v,(int,float)) and math.isfinite(v)

def records(path=DB):
    with connect(path) as c:
        return [dict(json.loads(r['fields_json']),_strict=bool(r['strict_include']),_eligible=bool(r['eligible'])) for r in c.execute('SELECT p.fields_json,c.strict_include,t.eligible FROM periods p JOIN companies c USING(company_id) JOIN targets t USING(row_id)')]

def sample_filter(r,settings,follow=True):
    if not r['_strict'] or follow and not r['_eligible']:return False
    if settings.get('stage_only',True) and str(r.get('growth_stage_period')) not in ['1','1.0']:return False
    if settings.get('pool','train')=='train' and r['model_use']!='train':return False
    year=int(r['period_end'][:4]);start,end=settings.get('start_year'),settings.get('end_year')
    if start and year<start or end and year>end:return False
    cutoff=settings.get('available_by')
    if cutoff and (r['feature_available_date']>cutoff or follow and (not r.get('target_available_date') or r['target_available_date']>cutoff)):return False
    return True

def rank(values):
    values=np.asarray(values);order=np.argsort(values,kind='stable');out=np.empty(len(values));i=0
    while i<len(order):
        j=i+1
        while j<len(order) and values[order[j]]==values[order[i]]:j+=1
        out[order[i:j]]=(i+j-1)/2+1;i=j
    return out

def correlation(a,b):
    if len(a)<3 or np.std(a)<1e-12 or np.std(b)<1e-12:return None
    return float(np.corrcoef(a,b)[0,1])

def regress(x,y):
    if len(y)<=x.shape[1] or np.linalg.matrix_rank(x)<x.shape[1]:return None
    return np.linalg.lstsq(x,y,rcond=None)[0]

def relationship(settings,path=DB):
    predictor,target=settings['predictor'],settings['target'];controls=settings.get('controls',[])
    all_rows=records(path);outcome_lookup={(r['company_id'],r['period_end']):r for r in all_rows}
    eligible=[r for r in all_rows if sample_filter(r,settings)]
    needed=[predictor,target]+controls
    complete=[r for r in eligible if all(finite(r.get(k)) for k in needed)]
    ids=sorted({r['company_id'] for r in complete});n=len(complete)
    rows=[{k:r.get(k) for k in ['row_id','company_id','company_name','ticker','period_end','feature_available_date','target_period_end','target_available_date','source_urls']+list(dict.fromkeys(needed))} for r in complete]
    for row in rows:row['outcome_source_urls']=outcome_lookup.get((row['company_id'],row['target_period_end']),{}).get('source_urls')
    report={'settings':settings,'snapshot':'2026-10-23','eligible_rows':len(eligible),'complete_rows':n,'companies':len(ids),'excluded_missing':len(eligible)-n,
            'missing_by_measure':{k:sum(not finite(r.get(k)) for r in eligible) for k in needed},'rows':rows,
            'method':'OLS on observed complete cases; 95% percentile intervals from resampling whole companies, fixed seed 421. Same rows for unadjusted and adjusted fits.',
            'warnings':['Association is not the causal return on spending. Controls cannot eliminate unmeasured differences.',
                        'Repeated company-years are dependent. Bootstrap resamples whole companies; it does not remove bias or account for all shared time shocks.',
                        'Intervals are exploratory and not corrected for testing many relationships. In-sample fit is not prediction accuracy.'],
            'status':'insufficient_data','pearson':None,'spearman':None,'unadjusted':None,'adjusted':None}
    if n<3:return report
    a=np.array([r[predictor] for r in complete]);y=np.array([r[target] for r in complete])
    report['pearson']=correlation(a,y);report['spearman']=correlation(rank(a),rank(y))
    if n<max(30,len(controls)+12) or len(ids)<10:
        report['warnings'].append('Regression requires at least 30 complete rows and 10 distinct companies.');return report
    if np.std(y)<1e-12:report['warnings'].append('The outcome has no usable variation.');return report
    raw=np.column_stack([a]+[np.array([r[k] for r in complete]) for k in controls]);means=raw.mean(0);scales=raw.std(0)
    if (scales<1e-12).any():report['warnings'].append('A requested predictor or control has no usable variation.');return report
    x=np.column_stack([np.ones(n),(raw-means)/scales]);simple=x[:,:2]
    b=regress(x,y);b0=regress(simple,y)
    if b is None or b0 is None:report['warnings'].append('Requested regression is not identifiable because columns are collinear.');return report
    condition=float(np.linalg.cond(x));report['condition_number']=condition
    if condition>100:report['warnings'].append('Controls are strongly collinear; coefficient estimates may be unstable.')
    groups=[np.flatnonzero(np.array([r['company_id'] for r in complete])==cid) for cid in ids]
    rng=np.random.default_rng(421);boot=[]
    for _ in range(settings.get('bootstrap_samples',1000)):
        ix=np.concatenate([groups[i] for i in rng.integers(0,len(groups),len(groups))]);bb=regress(x[ix],y[ix]);bb0=regress(simple[ix],y[ix])
        if bb is not None and bb0 is not None:boot.append([float(bb0[1]/scales[0]*10),float(bb[1]/scales[0]*10)])
    report['valid_bootstrap_samples']=len(boot)
    if len(boot)<.8*settings.get('bootstrap_samples',1000):report['warnings'].append('Too many resamples were rank-deficient; uncertainty estimates are unavailable.')
    ci=np.quantile(boot,[.025,.975],axis=0).T if len(boot)>=.8*settings.get('bootstrap_samples',1000) else None
    for j,(name,design,coef) in enumerate([('unadjusted',simple,b0),('adjusted',x,b)]):
        residual=y-design@coef;total=((y-y.mean())**2).sum()
        report[name]={'difference_pp_per_10pp':float(coef[1]/scales[0]*10),'ci95_pp':ci[j].tolist() if ci is not None else None,
                      'in_sample_r_squared':float(1-(residual**2).sum()/total) if total>0 else None,
                      'in_sample_rmse_pp':float(np.sqrt(np.mean(residual**2))*100)}
    report['controls']=controls;report['status']='ok';report['effect_units']='Next-year outcome percentage-point difference associated with a 10-percentage-point higher predictor.'
    if not controls:report['warnings'].append('No controls selected: the adjusted fit equals the unadjusted fit.')
    if settings.get('pool')=='research':report['warnings'].append('All-history research may include previously used validation/test observations; it is not fresh model evaluation.')
    return report

def distance_to_start(user,weights,r):
    user={k:v for k,v in user.items() if v is not None}
    if 'revenue' in user:user['log_revenue']=math.log(user.pop('revenue'))
    selected=[k for k in FEATURES if k in user and weights.get(k,1)>0]
    common=[k for k in selected if finite(r.get(k))];total=sum(weights.get(k,1) for k in selected)
    coverage=sum(weights.get(k,1) for k in common)/total if total else 0
    if len(common)<3 or coverage<.8:return None
    p=MODEL['preprocessing']
    def z(k,v):
        i=FEATURES.index(k);return (min(max(v,p['low'][i]),p['high'][i])-p['mean'][i])/p['scale'][i]
    return math.sqrt(sum(weights.get(k,1)*(z(k,user[k])-z(k,r[k]))**2 for k in common)/sum(weights.get(k,1) for k in common))

def strategy(settings,path=DB):
    with connect(path) as c:
        events={r['event_id']:json.loads(r['event_json']) for r in c.execute('SELECT * FROM events')}
        event_id=settings.get('event_id','all')
        if event_id=='custom':event={'event_id':'custom','name':settings.get('event_name') or 'Custom research context','start':settings['event_start'],'end':settings['event_end'],'source_url':None}
        elif event_id=='all':event={'event_id':'all','name':'All historical spending years','start':'2000-01-01','end':'2026-10-23','source_url':None}
        elif event_id in events:event=events[event_id]
        else:raise ValueError('Unknown event identifier.')
        changes=[dict(r) for r in c.execute('SELECT * FROM observed_changes WHERE metric=?',(settings['action_metric'],))]
    data=records(path);lookup={r['row_id']:r for r in data};by_period={(r['company_id'],r['period_end']):r for r in data};following=settings['outcome_timing']=='following';threshold=settings.get('threshold_pp',2)/100
    candidates=[];overlap_count=0
    for change in changes:
        current,previous=lookup[change['row_id']],lookup[change['previous_row_id']]
        if not sample_filter(current,settings,follow=following):continue
        if current['company_id']==settings.get('exclude_company_id'):continue
        if not (current['period_start']<=event['end'] and current['period_end']>=event['start']):continue
        if previous['feature_available_date']>=current['period_end']:continue
        outcome_growth=current['target_revenue_growth'] if following else current['revenue_growth'];outcome_margin=current['target_operating_margin'] if following else current['operating_margin']
        if not finite(outcome_growth) or not finite(outcome_margin):continue
        overlap_count+=1
        distance=distance_to_start(settings['profile'],settings.get('weights') or {},previous)
        if distance is None or distance>settings.get('max_distance',1):continue
        action=change['change'];group='increased' if action>threshold else 'reduced' if action< -threshold else 'held'
        dollars='sales_marketing' if settings['action_metric']=='sales_marketing_ratio' else 'research_development'
        dollar_change=current[dollars]-previous[dollars] if finite(current.get(dollars)) and finite(previous.get(dollars)) else None
        outcome_source=by_period.get((current['company_id'],current.get('target_period_end'))) if following else current
        candidates.append({'row_id':current['row_id'],'company_id':current['company_id'],'company_name':current['company_name'],'ticker':current['ticker'],
                           'starting_row_id':previous['row_id'],'starting_period_end':previous['period_end'],'starting_disclosed':previous['feature_available_date'],
                           'starting_revenue':previous['revenue'],'starting_growth':previous['revenue_growth'],'starting_operating_margin':previous['operating_margin'],
                           'spending_period_start':current['period_start'],'spending_period_end':current['period_end'],'spending_disclosed':current['feature_available_date'],
                           'starting_ratio':previous[settings['action_metric']],'spending_ratio':current[settings['action_metric']],
                           'action_change_pp':action*100,'expense_dollar_change':dollar_change,'group':group,'distance':distance,
                           'outcome_period_end':current['target_period_end'] if following else current['period_end'],'outcome_growth':outcome_growth,'outcome_margin':outcome_margin,
                           'starting_source_urls':previous.get('source_urls'),'source_urls':current.get('source_urls'),'outcome_source_urls':outcome_source.get('source_urls') if outcome_source else None})
    candidates.sort(key=lambda r:(r['distance'],r['row_id']));groups=[];rng=np.random.default_rng(827)
    for name in ['increased','held','reduced']:
        seen=set();members=[]
        for r in candidates:
            if r['group']==name and r['company_id'] not in seen:members.append(r);seen.add(r['company_id'])
        n=len(members);growth=[r['outcome_growth'] for r in members];margin=[r['outcome_margin'] for r in members];intervals=None
        if n>=10:
            a=np.array([growth,margin]).T;indices=rng.integers(0,n,size=(1000,n));draws=np.median(a[indices],axis=1)
            intervals={'growth':np.quantile(draws[:,0],[.025,.975]).tolist(),'margin':np.quantile(draws[:,1],[.025,.975]).tolist()}
        groups.append({'group':name,'companies':n,'observations':n,'median_growth':median(growth) if n>=5 else None,'median_margin':median(margin) if n>=5 else None,
                       'median_action_change_pp':median([r['action_change_pp'] for r in members]) if members else None,
                       'median_ci95':intervals,'status':'ok' if n>=5 else 'sparse','rows':members})
    return {'settings':settings,'snapshot':'2026-10-23','event':event,'event_overlap_rows':overlap_count,'similar_spending_rows':len(candidates),'groups':groups,
            'method':'Match starting financial profiles before grouping observed actions. One closest observation per company per action group; group medians require five companies and median bootstrap intervals require ten.',
            'warnings':['Historical group differences are not causal strategy effects. Companies may differ in demand, products, accounting or financing.',
                        'Fiscal-period overlap is calendar context, not verified company exposure or AI adoption. Event windows are research choices, not a live news feed.',
                        'The same company can appear in different action groups in different years; group results are not independent.',
                        'Starting financials precede the spending year by fiscal period, but their public disclosure can occur after that spending year began. This is retrospective research, not a point-in-time decision backtest.',
                        'A ratio can rise when revenue falls. Inspect the actual expense-dollar change alongside the ratio change.',
                        'Outcome timing is explicit: during the spending year or the annual period following it. No missing outcomes are filled.']}

def export_csv(report,kind):
    rows=report['rows'] if kind=='relationship' else [r for g in report['groups'] for r in g['rows']]
    keys=list(dict.fromkeys(k for r in rows for k in r));out=io.StringIO()
    if not keys:return 'No eligible observations\n'
    writer=csv.DictWriter(out,fieldnames=keys);writer.writeheader();writer.writerows(rows);return out.getvalue()
