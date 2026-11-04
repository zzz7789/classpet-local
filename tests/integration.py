#!/usr/bin/env python3
"""API acceptance tests. Creates separate test-only teacher accounts and classes."""
import argparse, concurrent.futures, http.cookiejar, json, secrets, urllib.request, urllib.error, uuid
class Client:
    def __init__(self, base):
        self.base=base.rstrip('/')
        self.jar=http.cookiejar.CookieJar()
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
    def call(self,path,body=None,headers=None):
        h={'Origin':self.base,**(headers or {})}
        data=None
        if body is not None: h['Content-Type']='application/json';data=json.dumps(body,ensure_ascii=False).encode()
        request=urllib.request.Request(self.base+path,data=data,headers=h)
        try:
            with self.opener.open(request,timeout=30) as r:return r.status,json.load(r)
        except urllib.error.HTTPError as e:
            raw=e.read()
            try:content=json.loads(raw)
            except ValueError:content={'error':raw.decode(errors='replace')[:500]}
            return e.code,content
    def action(self,action,**body):
        key=body.pop('_key',str(uuid.uuid4()))
        return self.call('/api/action',{'action':action,**body},{'Idempotency-Key':key})
    def state(self,cid='',sid=''):
        return self.call('/api/state'+('?classId='+cid+('&seatId='+sid if sid else '') if cid else ''))
def ok(result,status=200):
    assert result[0]==status,result
    return result[1]
def main():
    p=argparse.ArgumentParser();p.add_argument('--url',default='http://localhost:8080');args=p.parse_args()
    a,b,anon=Client(args.url),Client(args.url),Client(args.url)
    tag=secrets.token_hex(4);name='test_a_'+tag;password='Test-password-'+tag
    ok(anon.state(),401)
    ok(a.call('/api/account',{'action':'register','username':name,'password':password}))
    ok(b.call('/api/account',{'action':'register','username':'test_b_'+tag,'password':password}))
    cid=ok(a.action('createClass',name='自动化测试班'))['classId']
    ok(a.action('importStudents',classId=cid,names='小林\n小周\n小吴'))
    state=ok(a.state(cid))['data'];students=state['members'];assert len(students)==3
    assert all(s['species'] and s['balance']==0 and s['xp']==0 for s in students)
    sid,other=students[0]['id'],students[1]['id']
    assert ok(a.state(cid,sid))['data']['selected']['inventory'][0]['quantity']==1
    ok(b.state(cid),403);ok(b.action('award',classId=cid,ids=[sid],delta=100,reason='越权'),403)
    print('PASS: registration, independent teachers, roster, automatic pets, access isolation')
    for _ in range(5):ok(a.action('award',classId=cid,ids=[sid],delta=3,reason='课堂回答',classroom=True))
    ok(a.action('award',classId=cid,ids=[sid],delta=3,reason='课堂回答',classroom=True),400)
    assert ok(a.state(cid,sid))['data']['selected']['seat']['balance']==15
    key=str(uuid.uuid4());body=dict(classId=cid,ids=[sid],delta=50,reason='课堂表现',_key=key)
    ok(a.action('award',**body));ok(a.action('award',**body))
    assert ok(a.state(cid,sid))['data']['selected']['seat']['balance']==65
    ok(a.action('award',**{**body,'delta':60}),409)
    ok(a.action('buy',classId=cid,seatId=sid,item='milk'))
    feedkey=str(uuid.uuid4());ok(a.action('feed',classId=cid,seatId=sid,item='milk',_key=feedkey));ok(a.action('feed',classId=cid,seatId=sid,item='milk',_key=feedkey))
    selected=ok(a.state(cid,sid))['data']['selected'];assert selected['seat']['balance']==45 and selected['seat']['xp']==12
    catalog=ok(a.state(cid))['data']['species']
    added={'leaf-rabbit','moon-fox','ice-penguin','star-owl','mushroom-bear','cloud-cat'}
    assert added.issubset({s['id'] for s in catalog})
    for sp in catalog:
        with a.opener.open(a.base+sp['image'],timeout=10) as image:
            content=image.read()
            assert image.status==200 and content[:4]==b'RIFF' and content[8:12]==b'WEBP',sp
    for sp in catalog:
        ok(a.action('changeSpecies',classId=cid,seatId=sid,species=sp['id']))
        changed=ok(a.state(cid,sid))['data']['selected']
        assert changed['seat']['species']==sp['id'] and changed['seat']['pet_name']==sp['name']
        assert all(changed['seat'][key]==selected['seat'][key] for key in ('balance','xp','energy','mood'))
        assert changed['inventory']==selected['inventory']
    ok(a.action('changeSpecies',classId=cid,seatId=sid,species='unknown-pet'),400)
    nursery=ok(a.action('createClass',name='伙伴种类验收班'))['classId']
    ok(a.action('importStudents',classId=nursery,names='\n'.join('伙伴测试'+str(i) for i in range(len(catalog)))))
    assigned=ok(a.state(nursery))['data']['members']
    assert {s['species'] for s in assigned}=={s['id'] for s in catalog}
    print('PASS: all pet assets, species assignment, switching and preserved progress/inventory')
    ok(a.action('award',classId=cid,ids=[sid],delta=-10,reason='纠正'))
    ok(a.action('award',classId=cid,ids=[sid],delta=-100,reason='不允许负余额'),400)
    print('PASS: daily classroom limit, ledger, correction, idempotency, shop and feeding')
    task=ok(a.action('createTask',classId=cid,title='今日数学作业',reward=10))['taskId']
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:a.action('completeTasks',classId=cid,taskId=task,ids=[sid]),range(2)))
    for r in results:ok(r)
    assert ok(a.state(cid,sid))['data']['selected']['seat']['balance']==45
    assert len([x for x in ok(a.state(cid))['data']['completions'] if x['task_id']==task])==1
    ok(a.action('createTask',classId=cid,title='积极回答问题',reward=3),400)
    ok(a.action('closeTask',classId=cid,taskId=task));ok(a.action('completeTasks',classId=cid,taskId=task,ids=[other]),400)
    print('PASS: direct homework confirmation, concurrency and no duplicate task reward')
    ok(a.action('award',classId=cid,ids=[other],delta=10,reason='测试余额'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:a.action('buy',classId=cid,seatId=other,item='cookie'),range(2)))
    assert sorted(r[0] for r in results)==[200,400],results
    ok(a.action('feed',classId=cid,seatId=other,item='cookie'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:a.action('feed',classId=cid,seatId=other,item='cookie'),range(2)))
    assert sorted(r[0] for r in results)==[200,400],results
    other_state=ok(a.state(cid,other))['data']['selected'];assert other_state['seat']['balance']==0 and other_state['seat']['xp']==10
    ok(a.action('toggleStudent',classId=cid,seatId=other));ok(a.state(cid,other),404);ok(a.action('toggleStudent',classId=cid,seatId=other))
    print('PASS: concurrent purchase/feeding, nonnegative inventory/balance, remove and restore')
    raw=a.call('/api/state?export=1&classId='+cid);backup=ok(raw);assert backup['format']=='classpet-local-v1' and len(backup['members'])==3
    ok(b.call('/api/state?export=1&classId='+cid),403)
    ok(a.call('/api/action',{'action':'renameClass','classId':cid,'name':'CSRF'},{'Origin':'https://evil.invalid','Idempotency-Key':str(uuid.uuid4())}),403)
    extra=Client(args.url);ok(extra.call('/api/account',{'action':'login','username':name,'password':password}))
    ok(a.call('/api/account',{'action':'changePassword','currentPassword':password,'password':password+'-new'}));ok(extra.state(),401)
    ok(extra.call('/api/account',{'action':'login','username':name,'password':password}),401)
    ok(extra.call('/api/account',{'action':'login','username':name,'password':password+'-new'}));assert any(c['id']==cid for c in ok(extra.state())['data']['classes'])
    ok(a.call('/api/account',{'action':'logout'}));ok(a.state(),401)
    print('PASS: full export, CSRF protection, password change, session revocation and logout')
    print('ALL API CHECKS PASSED')
if __name__=='__main__':main()
