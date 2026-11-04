"""Consistent, reproducible SQLite import of the supplied SEC financial snapshot."""
from pathlib import Path
import csv,json,sqlite3,math,hashlib,datetime,os

ROOT=Path(__file__).resolve().parent
DB=ROOT/'data/research.sqlite3'
METRICS='cash accounts_receivable inventory total_assets accounts_payable current_liabilities current_assets retained_earnings equity deferred_revenue total_debt revenue cost_of_revenue gross_profit sales_marketing general_administrative research_development operating_income net_income da operating_cash_flow capex financing_cash_flow stock_based_compensation fcf revenue_growth operating_margin gross_margin sales_marketing_ratio rd_ratio cfo_margin ga_ratio sbc_ratio fcf_margin current_ratio cash_ratio deferred_revenue_growth dso runway_months rule_of_40_fcf'.split()

def read_csv(path):
    with Path(path).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))

def numeric(v):
    try:
        n=float(v)
        return n if math.isfinite(n) else None
    except (TypeError,ValueError):return None

def company_id(cik):return str(int(float(cik))).zfill(10)

def flag(v):return str(v) in ['1','1.0','True']

class ClosingConnection(sqlite3.Connection):
    def __exit__(self,*args):
        try:return super().__exit__(*args)
        finally:self.close()

def connect(path=DB):
    c=sqlite3.connect(path,factory=ClosingConnection);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');return c

def build_database(path=DB,source=ROOT/'data'):
    """Import into a sibling temporary file and atomically replace only on success."""
    path=Path(path);source=Path(source);temp=path.with_suffix('.building.sqlite3')
    manifest=json.loads((source/'manifest.json').read_text())
    for name,digest in manifest['sha256'].items():
        if hashlib.sha256((source/name).read_bytes()).hexdigest()!=digest:raise ValueError('Source checksum mismatch: '+name)
    if temp.exists():temp.unlink()
    c=connect(temp)
    try:
        c.executescript('''
        CREATE TABLE companies(company_id TEXT PRIMARY KEY,ticker TEXT UNIQUE NOT NULL,name TEXT NOT NULL,strict_include INTEGER NOT NULL,metadata_json TEXT NOT NULL);
        CREATE TABLE periods(row_id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(company_id),period_start TEXT,period_end TEXT NOT NULL,available_date TEXT,stage INTEGER NOT NULL,split TEXT,fields_json TEXT NOT NULL,UNIQUE(company_id,period_end));
        CREATE INDEX period_company_date ON periods(company_id,period_end);
        CREATE TABLE metric_values(row_id TEXT REFERENCES periods(row_id),metric TEXT,value REAL,missing INTEGER NOT NULL,status TEXT,PRIMARY KEY(row_id,metric));
        CREATE TABLE source_facts(id INTEGER PRIMARY KEY,row_id TEXT REFERENCES periods(row_id),metric TEXT NOT NULL,value REAL,source_json TEXT NOT NULL);
        CREATE INDEX source_row_metric ON source_facts(row_id,metric);
        CREATE TABLE targets(row_id TEXT PRIMARY KEY REFERENCES periods(row_id),target_period_end TEXT,revenue_growth REAL,operating_margin REAL,available_date TEXT,eligible INTEGER);
        CREATE TABLE observed_changes(row_id TEXT REFERENCES periods(row_id),previous_row_id TEXT REFERENCES periods(row_id),metric TEXT,change REAL,PRIMARY KEY(row_id,metric));
        CREATE TABLE events(event_id TEXT PRIMARY KEY,event_json TEXT NOT NULL);
        CREATE TABLE dictionary(metric TEXT PRIMARY KEY,definition_json TEXT NOT NULL);
        CREATE TABLE import_info(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        ''')
        ticker_ids={}
        for m in read_csv(source/'company_metadata.csv'):
            cid=company_id(m['cik']);ticker_ids[m['ticker']]=cid
            c.execute('INSERT INTO companies VALUES(?,?,?,?,?)',(cid,m['ticker'],m['company_name'],int(flag(m['strict_cohort_include'])),json.dumps(m)))
        labels={(r['ticker'],r['period_end']):r for r in read_csv(source/'target_labels.csv')}
        rows=read_csv(source/'company_year_panel.csv');lookup={};ordered={}
        for r in rows:
            cid=company_id(r['cik'])
            if ticker_ids.get(r['ticker'])!=cid:raise ValueError('Issuer identity mismatch: '+r['ticker'])
            rid=cid+'_'+r['period_end'];lookup[(r['ticker'],r['period_end'])]=rid
            r.update(labels.get((r['ticker'],r['period_end']),{}));r['row_id']=rid;r['company_id']=cid
            # Null and zero have distinct meanings. Metadata strings are preserved.
            for key in METRICS:r[key]=numeric(r.get(key))
            for key in ['target_revenue_growth','target_operating_margin']:r[key]=numeric(r.get(key))
            r['log_revenue']=math.log(r['revenue']) if r['revenue'] is not None and r['revenue']>0 else None
            split=r.get('suggested_split','not_eligible');r['model_use']=split if split in ['train','validation','test'] else 'exclude_from_model'
            c.execute('INSERT INTO periods VALUES(?,?,?,?,?,?,?,?)',(rid,cid,r.get('period_start'),r['period_end'],r.get('feature_available_date'),int(flag(r.get('growth_stage_period'))),r['model_use'],json.dumps(r,allow_nan=False)))
            c.executemany('INSERT INTO metric_values VALUES(?,?,?,?,?)',[(rid,k,r[k],int(r[k] is None),r.get(k+'_status') or ('available' if r[k] is not None else 'unavailable_or_undefined')) for k in METRICS])
            c.execute('INSERT INTO targets VALUES(?,?,?,?,?,?)',(rid,r.get('target_period_end'),numeric(r.get('target_revenue_growth')),numeric(r.get('target_operating_margin')),r.get('target_available_date'),int(flag(r.get('strict_training_eligible')))))
            ordered.setdefault(cid,[]).append(r)
        for r in read_csv(source/'financial_sources.csv'):
            rid=lookup.get((r['ticker'],r['period_end']))
            if rid is None:raise ValueError('Unmatched financial source.')
            c.execute('INSERT INTO source_facts(row_id,metric,value,source_json) VALUES(?,?,?,?)',(rid,r['metric'],numeric(r['value']),json.dumps(r)))
        for history in ordered.values():
            history.sort(key=lambda r:r['period_end'])
            for previous,current in zip(history,history[1:]):
                days=(datetime.date.fromisoformat(current['period_end'])-datetime.date.fromisoformat(previous['period_end'])).days
                if not 330<=days<=380:continue
                if previous.get('feature_available_date','')>current.get('feature_available_date',''):continue
                for metric in ['sales_marketing_ratio','rd_ratio','sales_marketing','research_development','revenue_growth','operating_margin']:
                    a,b=previous.get(metric),current.get(metric)
                    if a is not None and b is not None:c.execute('INSERT INTO observed_changes VALUES(?,?,?,?)',(current['row_id'],previous['row_id'],metric,b-a))
        for e in json.loads((source/'events.json').read_text()):c.execute('INSERT INTO events VALUES(?,?)',(e['event_id'],json.dumps(e)))
        for d in read_csv(source/'data_dictionary.csv'):c.execute('INSERT OR REPLACE INTO dictionary VALUES(?,?)',(d['column'],json.dumps(d)))
        c.execute('INSERT INTO import_info VALUES(?,?)',('manifest',json.dumps(manifest)))
        c.execute('INSERT INTO import_info VALUES(?,?)',('schema_version','1'))
        violations=c.execute('PRAGMA foreign_key_check').fetchall()
        if violations:raise ValueError('Foreign key validation failed.')
        if c.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('Database integrity check failed.')
        c.commit()
    except Exception:
        c.close()
        if temp.exists():temp.unlink()
        raise
    c.close();os.replace(temp,path)
    return path

if __name__=='__main__':print(build_database())
