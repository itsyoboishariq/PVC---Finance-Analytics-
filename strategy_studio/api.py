"""Phases 1–5: histories, matching, relationships and event-period strategy research."""
from pathlib import Path
from typing import Literal
from datetime import date
import json,math
from fastapi import FastAPI,HTTPException,Query
from fastapi.responses import FileResponse,Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel,Field,ConfigDict,model_validator
from database import ROOT,DB,build_database,connect
import service
import analysis
import reasoning
import httpx

class Profile(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    revenue:float|None=Field(None,gt=0,le=1e12,description='Annual USD revenue, not millions.')
    revenue_growth:float|None=Field(None,ge=-1,le=10)
    operating_margin:float|None=Field(None,ge=-5,le=1)
    gross_margin:float|None=Field(None,ge=0,le=1)
    sales_marketing_ratio:float|None=Field(None,ge=0,le=3)
    rd_ratio:float|None=Field(None,ge=0,le=3)

class MatchRequest(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    profile:Profile
    weights:dict[str,float]=Field(default_factory=dict)
    limit:int=Field(10,ge=1,le=50)
    stage_only:bool=True
    one_per_company:bool=True
    pool:Literal['research','train']='research'
    start_year:int|None=Field(None,ge=2000,le=2035)
    end_year:int|None=Field(None,ge=2000,le=2035)
    available_by:date|None=None
    exclude_company_id:str|None=Field(None,pattern=r'^\d{10}$')

    @model_validator(mode='after')
    def validate_request(self):
        if self.start_year and self.end_year and self.start_year>self.end_year:raise ValueError('Start year must not exceed end year.')
        if any(k not in service.FEATURES or not math.isfinite(v) or not 0<=v<=10 for k,v in self.weights.items()):raise ValueError('Weights must name supported features and range from 0 to 10.')
        profile=self.profile.model_dump(exclude_none=True);present=set(profile)
        if 'revenue' in present:present.remove('revenue');present.add('log_revenue')
        if sum(self.weights.get(k,1)>0 for k in present)<3:raise ValueError('At least three positive-weight financial inputs are required.')
        return self

class ResearchFilters(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    pool:Literal['train','research']='train'
    stage_only:bool=True
    start_year:int|None=Field(None,ge=2000,le=2035)
    end_year:int|None=Field(None,ge=2000,le=2035)
    available_by:date|None=None

    @model_validator(mode='after')
    def check_years(self):
        if self.start_year and self.end_year and self.start_year>self.end_year:raise ValueError('Start year must not exceed end year.')
        return self

class RelationshipRequest(ResearchFilters):
    predictor:str='sales_marketing_ratio'
    target:Literal['target_revenue_growth','target_operating_margin']='target_revenue_growth'
    controls:list[str]=Field(default_factory=lambda:['revenue_growth','log_revenue'],max_length=4)
    bootstrap_samples:int=Field(1000,ge=200,le=2000)

    @model_validator(mode='after')
    def check_measures(self):
        if self.predictor not in analysis.PREDICTORS:raise ValueError('Unsupported predictor.')
        if any(k not in analysis.CONTROLS for k in self.controls):raise ValueError('Unsupported regression control.')
        if len(set(self.controls))!=len(self.controls) or self.predictor in self.controls:raise ValueError('Controls must be distinct and cannot repeat the predictor.')
        return self

class StrategyRequest(ResearchFilters):
    profile:Profile
    weights:dict[str,float]=Field(default_factory=dict)
    pool:Literal['train','research']='research'
    exclude_company_id:str|None=Field(None,pattern=r'^\d{10}$')
    action_metric:Literal['sales_marketing_ratio','rd_ratio']='sales_marketing_ratio'
    threshold_pp:float=Field(2,ge=.1,le=20)
    max_distance:float=Field(1,ge=.05,le=5)
    outcome_timing:Literal['during','following']='following'
    event_id:Literal['all','pandemic','rates','ai','custom']='rates'
    event_name:str=Field('Custom research context',max_length=180)
    event_start:date|None=None
    event_end:date|None=None

    @model_validator(mode='after')
    def check_strategy(self):
        MatchRequest(profile=self.profile,weights=self.weights)
        if self.event_id=='custom' and (not self.event_start or not self.event_end or self.event_start>self.event_end):raise ValueError('Custom events require an ordered start and end date.')
        return self

class ReasoningRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    company_id:str=Field(pattern=r'^\d{10}$')
    period_end:date
    question:str=Field(min_length=3,max_length=2000)
    live_research:bool=False
    relationship:RelationshipRequest=Field(default_factory=RelationshipRequest)

class WorkspaceRequest(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    profile:Profile
    decisions:list[Literal['sales_marketing_ratio','rd_ratio']]=Field(min_length=1,max_length=2)
    proposed_ratios:dict[str,float]=Field(default_factory=dict)
    objective:Literal['growth','profitability']='growth'
    event_id:Literal['all','pandemic','rates','ai']='all'
    question:str=Field('',max_length=2000)
    use_ai:bool=False
    @model_validator(mode='after')
    def validate_flow(self):
        MatchRequest(profile=self.profile)
        if len(set(self.decisions))!=len(self.decisions):raise ValueError('Use distinct decisions.')
        if any(k not in self.decisions or not math.isfinite(v) or v<0 or v>3 for k,v in self.proposed_ratios.items()):raise ValueError('Proposed ratios must match decisions and range from 0 to 3.')
        if any(getattr(self.profile,k) is None for k in self.decisions):raise ValueError('Supply the current ratio for every decision.')
        return self

class AgentContext(BaseModel):
    model_config=ConfigDict(extra='forbid')
    screen:str=Field('',max_length=120)
    visible_analysis:str=Field('',max_length=14000)
    profile:Profile|None=None
    metric:Literal['sales_marketing_ratio','rd_ratio','cfo_margin']='sales_marketing_ratio'
    @model_validator(mode='after')
    def valid_profile(self):
        if self.profile:MatchRequest(profile=self.profile)
        return self
class AgentTurn(BaseModel):
    role:Literal['user','assistant']
    content:str=Field(max_length=4000)
class AgentRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    message:str=Field(min_length=1,max_length=2000)
    context:AgentContext
    messages:list[AgentTurn]=Field(default_factory=list,max_length=8)

def make_app(db_path=DB):
    db_path=Path(db_path)
    if not db_path.exists():build_database(db_path)
    app=FastAPI(title='SaaS Research API',version='2.0.0',description='Company histories, financial peers, adjusted relationship analysis and historical strategy/event comparisons. Ratios are fractions; monetary values are USD. Snapshot 2026-10-23.')

    @app.post('/api/workspace/analyze')
    def workspace(request:WorkspaceRequest):
        import workspace
        try:return workspace.analyze(request.model_dump(mode='json'),db_path)
        except ValueError as exc:raise HTTPException(503,str(exc)) from exc
        except httpx.HTTPError as exc:raise HTTPException(502,'The AI connection failed. Run evidence only or retry.') from exc
        except RuntimeError as exc:raise HTTPException(502,str(exc)) from exc

    @app.get('/strategy')
    def strategy_workspace():return FileResponse(ROOT/'static/workspace.html')

    @app.post('/api/agent/chat')
    def agent_chat(request:AgentRequest):
        import side_agent
        try:return side_agent.chat(request.message,request.context.model_dump(mode='json'),[m.model_dump() for m in request.messages],db_path)
        except ValueError as exc:raise HTTPException(503,'Analyst configuration or response is invalid.') from exc
        except httpx.HTTPError as exc:raise HTTPException(502,'Could not reach the analyst. Check API credits or retry.') from exc
        except RuntimeError as exc:raise HTTPException(502,str(exc)) from exc

    # Keep long AI work independent of a single browser connection.
    from concurrent.futures import ThreadPoolExecutor
    from threading import Lock
    import time,uuid
    executor=ThreadPoolExecutor(max_workers=2)
    jobs={}
    job_lock=Lock()
    def submit_job(fn,request):
        with job_lock:
            now=time.monotonic()
            for key in list(jobs):
                if now-jobs[key][0]>900 and jobs[key][1].done():del jobs[key]
            if len(jobs)>=64 or sum(not f.done() for _,f in jobs.values())>=4:raise HTTPException(429,'Analysis is busy. Wait for your current request to finish.')
            key=uuid.uuid4().hex
            jobs[key]=(now,executor.submit(fn,request))
        return {'job_id':key}
    @app.post('/api/jobs/workspace')
    def workspace_job(request:WorkspaceRequest):return submit_job(workspace,request)
    @app.post('/api/jobs/agent')
    def agent_job(request:AgentRequest):return submit_job(agent_chat,request)
    @app.get('/api/jobs/{key}')
    def job_result(key:str):
        with job_lock:item=jobs.get(key)
        if item is None:raise HTTPException(404,'This analysis expired or the app restarted. Run it again.')
        future=item[1]
        if not future.done():return {'status':'running'}
        try:return {'status':'complete','result':future.result()}
        except HTTPException:raise
        except Exception as exc:raise HTTPException(500,'Analysis could not finish. Check your inputs and retry.') from exc

    @app.get('/api/summary')
    def summary():return service.summary(db_path)

    @app.get('/api/companies')
    def companies(q:str=Query('',max_length=120),scope:Literal['core','all']='core',limit:int=Query(30,ge=1,le=116),offset:int=Query(0,ge=0)):
        return service.search_companies(q,scope,limit,offset,db_path)

    @app.get('/api/companies/{cid}/history')
    def history(cid:str,start_year:int|None=Query(None,ge=2000,le=2035),end_year:int|None=Query(None,ge=2000,le=2035)):
        if start_year and end_year and start_year>end_year:raise HTTPException(422,'Start year must not exceed end year.')
        try:return service.history(cid,start_year,end_year,db_path)
        except KeyError as exc:raise HTTPException(404,str(exc)) from exc

    @app.get('/api/periods/{row_id}/sources')
    def sources(row_id:str,metric:str|None=None):
        try:return service.sources(row_id,metric,db_path)
        except KeyError as exc:raise HTTPException(404,str(exc)) from exc

    @app.get('/api/compare')
    def compare(row_ids:list[str]=Query(...,min_length=1,max_length=3)):
        if len(set(row_ids))!=len(row_ids):raise HTTPException(422,'Choose distinct company periods.')
        try:return service.compare(row_ids,db_path)
        except KeyError as exc:raise HTTPException(404,str(exc)) from exc

    @app.post('/api/similar-companies')
    def matches(request:MatchRequest):return service.similar(request.model_dump(mode='json'),db_path)

    @app.post('/api/export/matches')
    def export_matches(request:MatchRequest):
        result=service.similar(request.model_dump(mode='json'),db_path)
        return Response(service.rows_csv(result['items']),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="peer_matches.csv"'})

    @app.get('/api/export/companies/{cid}/history')
    def export_history(cid:str):
        try:return Response(service.rows_csv(service.history(cid,path=db_path)['periods']),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="company_history.csv"'})
        except KeyError as exc:raise HTTPException(404,str(exc)) from exc

    @app.get('/api/metrics')
    def metrics():
        with connect(db_path) as c:return {'items':[json.loads(r[0]) for r in c.execute('SELECT definition_json FROM dictionary ORDER BY metric')]}

    @app.get('/api/events')
    def events():
        with connect(db_path) as c:return {'items':[json.loads(r[0]) for r in c.execute('SELECT event_json FROM events')],'note':'Historical calendar contexts, not live news or verified company exposures. Strategy comparisons use fiscal-period overlap.'}

    @app.post('/api/analysis/relationship')
    def relationship(request:RelationshipRequest):return analysis.relationship(request.model_dump(mode='json'),db_path)

    @app.post('/api/analysis/strategy-comparison')
    def strategy(request:StrategyRequest):return analysis.strategy(request.model_dump(mode='json'),db_path)

    @app.post('/api/export/analysis/relationship')
    def relationship_export(request:RelationshipRequest):
        report=analysis.relationship(request.model_dump(mode='json'),db_path)
        return Response(analysis.export_csv(report,'relationship'),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="relationship_observations.csv"'})

    @app.post('/api/export/analysis/strategy-comparison')
    def strategy_export(request:StrategyRequest):
        report=analysis.strategy(request.model_dump(mode='json'),db_path)
        return Response(analysis.export_csv(report,'strategy'),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="strategy_observations.csv"'})

    @app.get('/api/ai/status')
    def ai_status():return reasoning.status()

    @app.post('/api/ai/analyze')
    def ai_analyze(request:ReasoningRequest):
        try:return reasoning.explain(request.company_id,request.period_end.isoformat(),request.question,request.relationship.model_dump(mode='json'),db_path,request.live_research)
        except ValueError as exc:raise HTTPException(503,str(exc)) from exc
        except KeyError as exc:raise HTTPException(404,'Company or period not found.') from exc
        except httpx.HTTPStatusError as exc:
            code=exc.response.json().get('error',{}).get('code','provider_error')
            raise HTTPException(502,'OpenAI request failed: '+str(code)) from exc
        except httpx.HTTPError as exc:raise HTTPException(502,'Connection to OpenAI failed. Please retry.') from exc
        except RuntimeError as exc:raise HTTPException(502,str(exc)) from exc

    @app.get('/advanced')
    def advanced():return FileResponse(ROOT/'static/index.html')

    @app.get('/')
    def home():return FileResponse(ROOT/'static/dashboard.html')
    app.mount('/static',StaticFiles(directory=ROOT/'static'),name='static')
    return app

app=make_app()

