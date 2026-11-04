#!/usr/bin/env python3
"""Create a separate demo classroom through the normal API, never reset existing accounts."""
import argparse, json, secrets, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests'))
from integration import Client, ok

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',default='http://127.0.0.1:8080')
    parser.add_argument('--prefix',default='demo_teacher')
    args=parser.parse_args()
    accounts=[];clients=[]
    for index in (1,2):
        username=f'{args.prefix}_{index}';password=secrets.token_urlsafe(15)
        client=Client(args.url)
        result=client.call('/api/account',{'action':'register','username':username,'password':password})
        if result[0]!=200:
            raise RuntimeError(f'{username}: {result[1]}; existing accounts are never changed. Use a new --prefix.')
        accounts.append({'username':username,'password':password});clients.append(client)
        # Print immediately so a later failure cannot hide the credentials of an account already created.
        print(json.dumps({'createdAccount':accounts[-1]},ensure_ascii=False),flush=True)
    owner,coteacher=clients
    cid=ok(owner.action('createClass',name='示例班级 · 星光三班'))['classId']
    ok(owner.action('addTeacher',classId=cid,username=accounts[1]['username']))
    names='陈星禾 林沐阳 王知夏 李乐言 张予安 刘思齐 赵云舒 黄若溪 周向晨 吴书宁 徐一诺 孙可欣 胡景行 朱念初 高明轩 梁语桐 郭嘉禾 何以宁 马星野 罗清越 郑子墨 宋安然 谢雨桐 唐亦辰 韩乐知 曹沐晴 许承宇 邓书瑶 萧云帆 冯悦宁'.split()
    ok(owner.action('importStudents',classId=cid,names='\n'.join(names)))
    students=ok(owner.state(cid))['data']['members']
    ids=[s['id'] for s in students]
    ok(owner.action('award',classId=cid,ids=ids,delta=80,reason='示例初始积分'))
    for index,student in enumerate(students):
        sid=student['id']
        if index%3==0:
            ok(owner.action('buy',classId=cid,seatId=sid,item='cake'))
            ok(owner.action('feed',classId=cid,seatId=sid,item='cake'))
        else:
            ok(owner.action('feed',classId=cid,seatId=sid,item='cookie'))
    task=ok(owner.action('createTask',classId=cid,title='阅读十分钟',description='示例作业：读一段喜欢的故事。',reward=10))['taskId']
    ok(coteacher.action('createTask',classId=cid,title='数学练习',description='示例作业：完成今日练习。',reward=10))
    ok(coteacher.action('completeTasks',classId=cid,taskId=task,ids=ids[:10]))
    shared=ok(coteacher.state(cid))['data']
    assert len(shared['members'])==30 and len(shared['teachers'])==2
    print(json.dumps({'classId':cid,'className':shared['current']['name'],'students':30,'teachers':2,'note':'All student names are fictional. Keep the generated passwords locally.'},ensure_ascii=False))

if __name__=='__main__':main()
