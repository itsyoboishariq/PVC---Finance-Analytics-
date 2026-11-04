import argparse,webbrowser,threading
from database import ROOT,DB,build_database

def main():
    parser=argparse.ArgumentParser(description='Launch the local SaaS research application.')
    parser.add_argument('--port',type=int,default=8771)
    parser.add_argument('--no-browser',action='store_true')
    parser.add_argument('--rebuild',action='store_true')
    args=parser.parse_args()
    if args.rebuild or not DB.exists():build_database()
    import uvicorn
    url=f'http://127.0.0.1:{args.port}'
    print('SaaS Research: '+url+' | API documentation: '+url+'/docs',flush=True)
    if not args.no_browser:threading.Timer(1.5,lambda:webbrowser.open(url)).start()
    uvicorn.run('api:app',host='127.0.0.1',port=args.port,log_level='warning',app_dir=str(ROOT))

if __name__=='__main__':main()
