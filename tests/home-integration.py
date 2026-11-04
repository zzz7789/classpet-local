#!/usr/bin/env python3
"""Isolated-account decoration regression. --receipt saves test credentials only;
--resume receipt.json verifies persisted state after an operator restarts backend.
Never selects or mutates existing classrooms/students.
"""
import argparse, concurrent.futures, json, secrets, uuid
from pathlib import Path
from integration import Client, ok

def main():
    p=argparse.ArgumentParser();p.add_argument('--url',default='http://localhost:8080');p.add_argument('--receipt');p.add_argument('--resume');args=p.parse_args()
    a=Client(args.url)
    if args.resume:
        r=json.loads(Path(args.resume).read_text())
        ok(a.call('/api/account',dict(action='login',username=r['username'],password=r['password'])))
        state=ok(a.state(r['cid'],r['sid']))['data']
        assert state['selected']['seat']['balance']==90
        assert sorted(x['id'] for x in state['selected']['decorations'])==['bed','plant']
        assert state['selected']['seat']['decor']==['plant']
        print('PASS: saved inventory, balance and equipment persist after restart');return
    tag=secrets.token_hex(5);username='home_test_'+tag;password='Home-test-'+tag
    ok(a.call('/api/account',dict(action='register',username=username,password=password)))
    cid=ok(a.action('createClass',name='装扮隔离验收'))['classId'];ok(a.action('importStudents',classId=cid,names='装扮测试'))
    state=ok(a.state(cid))['data'];sid=state['members'][0]['id']
    assert {x['id']:x['price'] for x in state['decorations']}==dict(bed=80,rug=40,plant=30,scarf=60)
    def act(action,**kwargs):return a.action(action,classId=cid,seatId=sid,**kwargs)
    ok(act('buyDecoration',item='bed'),400)
    for _ in range(2):ok(a.action('award',classId=cid,ids=[sid],delta=100,reason='隔离测试'))
    key=str(uuid.uuid4());ok(act('buyDecoration',item='bed',price=0,_key=key));ok(act('buyDecoration',item='bed',price=0,_key=key))
    ok(act('buyDecoration',item='bed'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:act('buyDecoration',item='plant'),range(2)))
    for result in results:ok(result)
    state=ok(a.state(cid,sid))['data'];assert state['selected']['seat']['balance']==90
    assert set(state['selected']['seat']['decor'])=={'bed','plant'}
    assert len([x for x in state['selected']['ledger'] if x['delta']<0])==2
    ok(act('equipDecoration',item='scarf',equipped=True),400)
    ok(act('equipDecoration',item='bed'),400)
    ok(act('equipDecoration',item='bed',equipped=False));ok(act('equipDecoration',item='bed',equipped=True))
    ok(act('equipDecoration',item='bed',equipped=False))
    ok(act('buyDecoration',item='missing'),400)
    b=Client(args.url);ok(b.call('/api/account',dict(action='register',username='home_other_'+tag,password=password)))
    ok(b.action('buyDecoration',classId=cid,seatId=sid,item='rug'),403)
    other=ok(a.action('createClass',name='另一个隔离班'))['classId']
    ok(a.action('buyDecoration',classId=other,seatId=sid,item='rug'),404)
    export=ok(a.call('/api/state?export=1&classId='+cid));assert len(export['decorations'])==2
    fresh=Client(args.url);ok(fresh.call('/api/account',dict(action='login',username=username,password=password)))
    assert ok(fresh.state(cid,sid))['data']['selected']['seat']['decor']==['plant']
    if args.receipt:Path(args.receipt).write_text(json.dumps(dict(username=username,password=password,cid=cid,sid=sid)))
    print('PASS: server prices, insufficient balance, idempotent/concurrent purchase, permanent inventory, equip/unload, authorization, export and fresh-session persistence')
if __name__=='__main__':main()
