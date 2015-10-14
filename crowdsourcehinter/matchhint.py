"""
For hinting, we have two stages for figuring out whether answers
should correspond to the same hint:

* Transformation to a canonical format
* Comparison

For example, in the case of numberic answers, we would like to bring
any equation into a canonical form:
* 0.333 ==> 0.33
* 1/3 ==> 0.3333333
* 1-2/3 ==> 0.333333

For comparisons, we would like 0.33 and 0.33333 to compare as
equivalent. Note that this is not transitive. If we have a 0.01
tolerance, 0.33 ~= 0.335, 0.335 ~= 0.34, and 0.34 ~= 0.345, but 
0.33 is not equivalent to 0.345.

This is quite broad: 
* For open-ended responses, we can canonicalize to a feature vector,
  and compare the distance between those vectors.
* For code responses, we can canonicalize to an AST (or other
  tree-like representations), and compare ASTs.

Note that we may be comparing from *many* hints, so comparison should
be fast (and in all cases we've worked through, it is). In contrast,
canonicalization is often quite slow -- this is true for extracting
feature vectors, for code, etc.

This isn't intended to give 100% coverage of the types of hints we
would like to deliver. Duolingo has a relatively complex
language-specific hinting frameworks, which would *not* fit into this
model, it does surprisingly well in a large range of cases.

The signature of a canonizalizer is:
def canonicalize(answer, params=None):
  return canonicalized_answer

The signature of a comparator is:
def compare(answer_a, answer_b, params=None):
  if answer_a == answer_b
    return True
  else:
    return False

`params` is an optoinal JSON object for now. For numerical answers, it
might be {'threshold' : 0.01, 'comparison' : 'absolute'}.
"""

def canonicalize(answer, params = None):
    function_name = params['function']
    function = _canonicalizers[function_name]
    return function(answer, params)

def compare(answer_a, answer_b, params = None):
    function_name = params['function']
    function = _comparators[function_name]
    return function(answer_a, answer_b, params)

class InvalidParameterException(ValueError):
    pass

def canonicalizer(*args):
    def wrapper(f):
        _canonicalizers[_clean_name(f)] = f
        return f
    return wrapper

def comparator(*args):
    def wrapper(f):
        _comparators[_clean_name(f)] = f
        return f
    return wrapper

def _clean_name(f):
    name = f.func_name
    name = name.replace('_', ' ')
    name = name.strip()
    return name

## Internal implementation, and sample canonicalizers and comparators
_canonicalizers = {}
_comparators = {}

@canonicalizer()
def _identity(answer, params=None):
    '''
    Default canonizalization function -- just return the submission.
    '''
    return answer

@canonicalizer()
def _string_case(answer, params=None):
    '''
    Canonicalization function for strings which compares them without
    case.
    '''
    return answer.lower()

@comparator()
def _exact(answer_a, answer_b, params=None):
    """
    Comparison function for any submission which requires an exact
    match.
    """
    return answer_a == answer_b

@comparator()
def _numerical_tolerance(answer_a, answer_b, params=None):
    """
    Comparison function for numerical submissions which compares with
    tolerance.
    """
    if params == None:
        params = {}
    threshold = params.get('threshold', 0.01)
    comparison = params.get('comparison', 'absolute').lower()
    if comparison == 'absolute':
        return abs(answer_a-answer_b) < threshold
    elif comparison == 'relative':
        return 2.0*abs(answer_a-answer_b)/(abs(answer_a)+abs(answer_b)) < threshold
    else:
        raise InvalidParameterException()

### Test cases

if __name__ == '__main__':
    assert compare("hello", "hello", {'function':'exact'})
    assert not compare("hello", "Hello", {'function':'exact'})
    assert compare(canonicalize("hello", {'function': 'string case'}), canonicalize("Hello", {'function': 'string case'}), {'function':'exact'})
    assert not compare(canonicalize("hello", {'function': 'string case'}), canonicalize("Hello!", {'function': 'string case'}), {'function':'exact'})
    assert compare(3, 3.01, {'function':'numerical tolerance'})
    assert not compare(3., 4., {'function':'numerical tolerance'})
    assert compare(3, 3.01, {'function':'numerical tolerance', 'threshold':0.05, 'comparison':'relative'})
    assert compare(3., 4., {'function':'numerical tolerance', 'threshold':2.0})
    assert not compare(3., 4., {'function':'numerical tolerance', 'threshold':0.5, 'comparison':'absolute'})
    print "All tests pass!"
