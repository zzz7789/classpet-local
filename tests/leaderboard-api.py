#!/usr/bin/env python3
"""Leaderboard API regression checks using isolated teacher accounts and classes."""
import argparse
import secrets
import uuid

from integration import Client, ok


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://localhost:8080')
    args = parser.parse_args()
    owner, outsider, anonymous = [Client(args.url) for _ in range(3)]
    tag = secrets.token_hex(6)
    for client, role in ((owner, 'owner'), (outsider, 'other')):
        ok(client.call('/api/account', {
            'action': 'register', 'username': 'rank_' + role + '_' + tag,
            'password': 'Leaderboard-test-' + tag,
        }))

    cid = ok(owner.action('createClass', name='排行榜验收班 ' + tag))['classId']
    ok(owner.action('importStudents', classId=cid, names='小林\n小周\n小吴'))
    initial = ok(owner.state(cid))['data']
    ids = [s['id'] for s in initial['members']]
    sid = ids[0]
    assert all(s['points'] == 0 for s in initial['members']), initial['members']

    def student():
        return ok(owner.state(cid, sid))['data']['selected']['seat']

    key = str(uuid.uuid4())
    award = dict(classId=cid, ids=[sid], delta=100, reason='课堂表现', _key=key)
    ok(owner.action('award', **award))
    ok(owner.action('award', **award))
    assert student()['points'] == 100, 'Idempotent award counted twice'
    ok(owner.action('award', classId=cid, ids=[sid], delta=-10, reason='积分纠正'))
    assert student()['points'] == 90, 'Teacher deduction missing from points'
    ok(owner.action('buy', classId=cid, seatId=sid, item='cookie'))
    ok(owner.action('buyDecoration', classId=cid, seatId=sid, item='rug'))
    seat = student()
    assert seat['balance'] == 40 and seat['points'] == 90, seat
    ok(owner.action('feed', classId=cid, seatId=sid, item='cookie'))
    seat = student()
    assert seat['xp'] == 5 and seat['points'] == 90, seat
    print('PASS: zero points, awards, idempotency, deductions and spending-independent score')

    task_id = ok(owner.action('createTask', classId=cid, title='数学练习', reward=7))['taskId']
    for _ in range(2):
        ok(owner.action('completeTasks', classId=cid, taskId=task_id, ids=[sid]))
    assert student()['points'] == 97, 'Homework reward counted incorrectly'
    assert len(ok(owner.state(cid))['data']['completions']) == 1

    # Three students per batch exceed the recent 200-entry window with 69 writes.
    for _ in range(69):
        ok(owner.action('award', classId=cid, ids=ids, delta=1, reason='排行榜窗口验收'))
    state = ok(owner.state(cid))['data']
    assert len(state['ledger']) == 200, 'Recent ledger window unexpectedly changed'
    points = {s['id']: s['points'] for s in state['members']}
    assert points == {sid: 166, ids[1]: 69, ids[2]: 69}, points
    recent = sum(l['delta'] for l in state['ledger'] if l['student_id'] == sid)
    assert recent < points[sid], 'Fixture did not exclude earlier reward entries'
    ok(owner.action('toggleStudent', classId=cid, seatId=sid))
    removed = next(s for s in ok(owner.state(cid))['data']['members'] if s['id'] == sid)
    assert not removed['is_active'] and removed['points'] == 166, removed
    ok(owner.state(cid, sid), 404)
    ok(owner.action('toggleStudent', classId=cid, seatId=sid))
    assert student()['is_active'] and student()['points'] == 166
    print('PASS: homework once, full-history totals beyond 200 rows and remove/restore preservation')

    other_cid = ok(owner.action('createClass', name='同老师隔离班 ' + tag))['classId']
    ok(owner.action('importStudents', classId=other_cid, names='小林'))
    other_sid = ok(owner.state(other_cid))['data']['members'][0]['id']
    ok(owner.action('award', classId=other_cid, ids=[other_sid], delta=100, reason='其他班奖励'))
    other_state = ok(owner.state(other_cid))['data']
    assert [(s['id'], s['points']) for s in other_state['members']] == [(other_sid, 100)]
    assert student()['points'] == 166, 'Same-name student in another class affected score'
    ok(owner.state(other_cid, sid), 404)
    ok(outsider.state(cid), 403)
    ok(outsider.state(cid, sid), 403)
    ok(outsider.action('award', classId=cid, ids=[sid], delta=100, reason='越权'), 403)
    ok(anonymous.state(cid), 401)
    assert all(c['id'] != cid for c in ok(outsider.state())['data']['classes'])
    print('PASS: same-owner class isolation, unrelated teacher denial and authentication')
    print('ALL LEADERBOARD API CHECKS PASSED')


if __name__ == '__main__':
    main()
