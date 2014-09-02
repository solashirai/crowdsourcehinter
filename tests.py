def test_rate_hint(self):
    '''
    This test should test the rate_hint in crowdxblock,
    in the event that the rating increases by 1.
    '''
    resp = self.call_event(
        'rate_hint', {
            'student_rating': 1,
            'value': 'hint',
            'answer': 'answer
        }
    )
    self.assertEqual(resp['Success'], True)
    self.assertEqual(resp['rating'], 2)
