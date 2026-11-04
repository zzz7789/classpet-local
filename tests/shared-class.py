#!/usr/bin/env python3
"""Shared-class API acceptance checks; creates isolated accounts and a class."""
import argparse
import concurrent.futures
import secrets
import threading
import uuid

from integration import Client, ok


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://localhost:8080')
    args = parser.parse_args()
    owner, collaborator, outsider = [Client(args.url) for _ in range(3)]
    tag = secrets.token_hex(6)
    usernames = ['shared_' + role + '_' + tag for role in ('owner', 'co', 'other')]
    for client, username in zip((owner, collaborator, outsider), usernames):
        ok(client.call('/api/account', {
            'action': 'register', 'username': username, 'password': 'Shared-test-' + tag,
        }))

    cid = ok(owner.action('createClass', name='协作验收班 ' + tag))['classId']
    ok(owner.action('importStudents', classId=cid, names='小林\n小周'))
    initial = ok(owner.state(cid))['data']
    sid = initial['members'][0]['id']
    owner_id = initial['current']['owner_id']
    ok(collaborator.state(cid), 403)
    ok(owner.action('addTeacher', classId=cid, username='missing_' + tag), 400)
    ok(owner.action('addTeacher', classId=cid, username=usernames[1]))
    shared = ok(collaborator.state(cid))['data']
    co_id = next(t['id'] for t in shared['teachers'] if t['username'] == usernames[1])
    assert {t['id'] for t in shared['teachers']} == {owner_id, co_id}, shared['teachers']
    assert shared['current']['owner_id'] == owner_id, shared['current']
    assert any(c['id'] == cid and c['owner_id'] == owner_id for c in shared['classes'])
    assert shared['members'] == initial['members'], 'Collaborator sees a different roster'
    ok(owner.action('addTeacher', classId=cid, username=usernames[1]), 400)
    ok(owner.action('removeTeacher', classId=cid, teacherId=owner_id), 400)
    ok(collaborator.action('addTeacher', classId=cid, username=usernames[2]), 403)
    ok(collaborator.action('removeTeacher', classId=cid, teacherId=co_id), 403)
    print('PASS: shared class discovery, roster, owner identity and owner-only teacher management')

    ok(outsider.state(cid), 403)
    assert all(c['id'] != cid for c in ok(outsider.state())['data']['classes'])
    ok(outsider.action('award', classId=cid, ids=[sid], delta=10, reason='越权'), 403)
    ok(outsider.action('addTeacher', classId=cid, username=usernames[2]), 403)
    ok(outsider.call('/api/state?export=1&classId=' + cid), 403)
    print('PASS: unrelated teacher cannot discover, read, export or mutate the shared class')

    ok(collaborator.action('importStudents', classId=cid, names='小吴'))
    assert len(ok(owner.state(cid))['data']['members']) == 3
    award_key = str(uuid.uuid4())
    ok(collaborator.action('award', classId=cid, ids=[sid], delta=20, reason='协作奖励', _key=award_key))
    assert ok(owner.state(cid, sid))['data']['selected']['seat']['balance'] == 20
    # Each new student receives starter food; verify a shared inventory mutation.
    before = ok(owner.state(cid, sid))['data']['selected']
    starter = next(item for item in before['inventory'] if item['quantity'] > 0)
    item_id = starter['item']
    ok(collaborator.action('feed', classId=cid, seatId=sid, item=item_id))
    after = ok(owner.state(cid, sid))['data']['selected']
    assert after['seat']['xp'] > before['seat']['xp'], 'Shared feeding did not increase growth'
    assert after == ok(collaborator.state(cid, sid))['data']['selected']
    backup = ok(collaborator.call('/api/state?export=1&classId=' + cid))
    assert backup['format'] == 'classpet-local-v1' and len(backup['members']) == 3, backup
    print('PASS: collaborator import, reward, feeding and export visible to both accounts')

    task_id = ok(collaborator.action('createTask', classId=cid, title='协作数学作业', reward=10))['taskId']
    assert any(t['id'] == task_id for t in ok(owner.state(cid))['data']['tasks'])
    balance = ok(owner.state(cid, sid))['data']['selected']['seat']['balance']
    ready = threading.Barrier(2)

    def complete(client):
        ready.wait(timeout=10)
        return client.action('completeTasks', classId=cid, taskId=task_id, ids=[sid])

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(complete, (owner, collaborator)))
    for result in results:
        ok(result)
    completed = ok(owner.state(cid, sid))['data']
    assert completed['selected']['seat']['balance'] == balance + 10, completed['selected']
    assert len([c for c in completed['completions'] if c['task_id'] == task_id]) == 1
    ok(collaborator.action('closeTask', classId=cid, taskId=task_id))
    other_sid = next(m['id'] for m in completed['members'] if m['id'] != sid)
    ok(owner.action('completeTasks', classId=cid, taskId=task_id, ids=[other_sid]), 400)
    print('PASS: concurrent completion across two teachers grants one reward; shared task closing')

    ok(owner.action('removeTeacher', classId=cid, teacherId=co_id))
    ok(collaborator.action('award', classId=cid, ids=[sid], delta=20, reason='协作奖励', _key=award_key), 403)
    ok(collaborator.state(cid), 403)
    ok(collaborator.call('/api/state?export=1&classId=' + cid), 403)
    ok(collaborator.action('award', classId=cid, ids=[sid], delta=10, reason='已撤权'), 403)
    ok(collaborator.action('createTask', classId=cid, title='撤权数学作业', reward=10), 403)
    assert all(c['id'] != cid for c in ok(collaborator.state())['data']['classes'])
    final = ok(owner.state(cid, sid))['data']
    assert {t['id'] for t in final['teachers']} == {owner_id}, final['teachers']
    assert final['selected']['seat']['balance'] == balance + 10, 'Denied award changed balance'
    print('PASS: removal immediately revokes read, export and action permissions in existing session')
    print('ALL SHARED-CLASS API CHECKS PASSED')


if __name__ == '__main__':
    main()
