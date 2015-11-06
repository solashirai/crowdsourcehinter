import logging
import operator
import pkg_resources
import random
import json
import copy

import urllib
import HTMLParser

from xblock.core import XBlock
from xblock.fields import Scope, Dict, List, Boolean, String
from xblock.fragment import Fragment

log = logging.getLogger(__name__)
html_parser = HTMLParser.HTMLParser()

class CrowdsourceHinter(XBlock):
    """
    This is the Crowdsource Hinter XBlock. This Xblock provides
    students with hints that specifically address their
    mistake. The hints are crowdsourced from the students.
    """

    # Database of hints. hints are stored:
    #   {"incorrect_answer": {"hint": rating}}.
    # Each key (incorrect answer) has a corresponding dictionary (in
    # which hints are keys and the hints' ratings are the values).
    # For example:
    #   {"computerr": {"You misspelled computer, remove the last r.": {'upvotes':5, 'downvotes':3}}}
    hint_database = Dict(default={}, scope=Scope.user_state_summary)

    # Database of initial hints, set by the course
    # instructor. hint_database will receive the hints inputted in
    # initial_hints. Initial hints have a default rating of 0.
    #
    # For example:
    #  {"Jeorge Washington": "You spelled his first name wrong."}
    initial_hints = Dict(default={}, scope=Scope.content)

    # This is a list of incorrect answer submissions made by the
    # student. this list is used when the student starts rating hints,
    # to find which incorrect answer's hint a student voted on.
    #
    # For example:
    #  ["personal computer", "PC", "computerr"]
    incorrect_answers = List([], scope=Scope.user_state)

    # A dictionary of generic_hints. default hints will be shown to
    # students when there are no matches with the student's incorrect
    # answer within the hint_database dictionary (i.e. no students
    # have made hints for the particular incorrect answer)
    #
    # For example:
    #  ["Make sure to check your answer for simple mistakes like typos!"]
    generic_hints = List(default=[], scope=Scope.content)

    # This is a list hints have been shown to the student. We'd like
    # to avoid showing the same hint from showing up to a student (if
    # they submit the same incorrect answers multiple times), and we
    # may like to know this after the students submits a correct
    # answer (if we want to e.g. vet hints)
    #
    # For example:
    #   ["You misspelled computer, remove the last r."]
    used = List([], scope=Scope.user_state)

    # This is a dictionary of hints that have been flagged or reported
    # as malicious (spam, profanity, give-aways, etc.). The values
    # represent incorrect answer submissions. The keys are the hints
    # the corresponding hints. hints with identical text for differing
    # answers will all not show up for the student.
    #
    # For example:
    #  {"desk": "You're completely wrong, the answer is supposed to be computer."}
    # TODO: It's not clear how this data structure will manage multiple
    # reported hints for the same wrong answer.
    reported_hints = Dict(default={}, scope=Scope.user_state_summary)

    # This String represents the xblock target problem element for
    # which the hinter is delivering hints. It is necessary to
    # manually set this value in the XML file under the format
    # "target_problem": "i4x://edX/DemoX/problem/Text_Input"
    target_problem = String(default="", scope=Scope.content)

    def studio_view(self, context=None):
        """
        This function defines a view for editing the XBlock when embedding
        it in a course. It will allow one to define, for example,
        which problem the hinter is for.

        It is currently incomplete -- we still need to finish building the
        authoring view.
        """
        html = self.resource_string("static/html/crowdsourcehinterstudio.html")
        frag = Fragment(html)
        frag.add_javascript_url('//cdnjs.cloudflare.com/ajax/libs/mustache.js/0.8.1/mustache.min.js')
        frag.add_css(self.resource_string("static/css/crowdsourcehinter.css"))
        frag.add_javascript(self.resource_string("static/js/src/crowdsourcehinter_studio.js"))
        frag.initialize_js('CrowdsourceHinterStudio',
                           {'initial': json.dumps(self.initial_hints),
                            'generic': json.dumps(self.generic_hints),
                            'target_problem': self.target_problem})
        return frag

    @XBlock.json_handler
    def set_initial_settings(self, data, suffix=''):
        """
        Set intial hints, generic hints, and problem element from the
        studio view.

        The Studio view is not yet complete.

        TODO: How do we make this handler Studio-specific? We don't
        want students being able to call this.
        """
        initial_hints = json.loads(data['initial_hints'])
        generic_hints = json.loads(data['generic_hints'])

        # Validate input
        if not isinstance(generic_hints, list):
            return {'success': False,
                    'error': 'Generic hints should be a list.'}
        if not isinstance(initial_hints, dict):
            return {'success': False,
                    'error' : 'Initial hints should be a dict.'}

        self.initial_hints = initial_hints
        self.generic_hints = generic_hints
        if len(data['target_problem']) > 1:
            self.target_problem = data['target_problem']
        return {'success': True}

    def student_view(self, context=None):
        """
        This view renders the hint view to the students. The HTML has the hints templated
        in, and most of the remaining functionality is in the JavaScript.
        """
        html = self.resource_string("static/html/crowdsourcehinter.html")
        frag = Fragment(html)
        frag.add_javascript_url('//cdnjs.cloudflare.com/ajax/libs/mustache.js/0.8.1/mustache.min.js')
        frag.add_css(self.resource_string("static/css/crowdsourcehinter.css"))
        frag.add_javascript(self.resource_string("static/js/src/crowdsourcehinter.js"))
        frag.initialize_js('CrowdsourceHinter',
                           {'target_problem': self.target_problem,
                            'isStaff': self.get_user_is_staff()})
        return frag

    def extract_student_answers(self, answers):
        """
        We find out what the student submitted by listening to a
        client-side event. This event is a little bit messy. This
        function cleans up the event into a dictionary mapping
        input IDs to answers submitted.
        """
        # First, we split this into the submission
        answers = [a.split('=') for a in answers.split("&")]
        # Next, we decode the HTML escapes
        answers = [(a[0], urllib.unquote_plus(a[1])) for a in answers]
        return dict(answers)

    def limit_hint_storage(self):
        """
        Remove hints so that any particular answer in hint_database
        doesn't have more than 10 hints. The method of deciding which
        hints to remove probably will need to be reevaluated at a
        later time.
        """
        for answer in self.hint_database:
            while len(self.hint_database[answer]) > 10:
                rating_dict = {}
                for hint in self.hint_database[answer]:
                    rating_dict.update({hint: (self.hint_database[answer][hint]["upvotes"] - self.hint_database[answer][hint]["downvotes"])})
                del self.hint_database[answer][(min(rating_dict, key=rating_dict.get))]
                    

    def compare_ratings(self, answer, hint, best):
        """
        Determine if the rating of a hint is better than the current
        "best" hint. 
        """
        return (self.hint_database[answer][hint]["upvotes"] - self.hint_database[answer][hint]["downvotes"]) > (self.hint_database[answer][best]["upvotes"] - self.hint_database[answer][best]["downvotes"])

    @XBlock.json_handler
    def get_hint(self, data, suffix=''):
        """
        Returns hints to students. Hints with the highest rating are shown
        to students unless the student has already submitted the same
        incorrect answer previously.

        Args:
          data['submittedanswer']: The string of text that the student submits for a problem.
        returns:
          'BestHint': the highest rated hint for an incorrect answer
                        or another random hint for an incorrect answer
                        or 'Sorry, there are no hints for this answer.' if no hints exist
          'StudentAnswer': the student's incorrect answer
          'HintCategory': Either a string for the type of hint, or False
              if no hints
        """
        # Populate hint_database with hints from initial_hints if
        # there are no hints in hint_database. This probably will
        # occur only on the very first run of a unit containing this
        # block, but the logic is a little bit more complex since
        # we'd like to be able to add additional hints if instructors
        # chose to do so.
        for answers in self.initial_hints:
            if answers not in self.hint_database:
                self.hint_database[answers] = {}
            for hints in self.initial_hints[answers]:
                if hints not in self.hint_database[answers]:
                    self.hint_database[answers].update({hints: {"upvotes": 0, "downvotes": 0}})

        # We will remove excess hints at this point so that issues
        # won't arise later due to a hint being removed
        # (e.x. upvoting a hint that has been removed)
        # Initial hints will have the opportunity to be added back
        # into hint_database if the other hints have bad ratings.
        # This is a temporary solution, and its location or method
        # of limitation probably should be improved later.
        self.limit_hint_storage()

        answer = self.extract_student_answers(data["submittedanswer"])

        # HACK: For now, we assume just one submission, a string, and
        # case insensitive
        #
        # TODO: We should replace this with a generic canonicalization
        # function
        answer = answer.values()[0].lower()

        # Put the student's answer to lower case so that differences
        # in capitalization don't make different groups of
        # hints. TODO: We should replace this with a .
        best_hint = ""  # TODO: What is this?

        if self.hints_available(answer):
            for hint in self.hint_database[answer]:
                if hint not in self.reported_hints.keys():
                    # if best_hint hasn't been set yet or if a hint's rating is greater than the rating of best_hint
                    if best_hint == "" or self.compare_ratings(answer, hint, best_hint):
                        best_hint = hint
            self.used.append(best_hint)
            return {'BestHint': best_hint,
                    "StudentAnswer": answer,
                    "HintCategory": "ErrorResponse"}
        # find generic hints for the student if no specific hints exist
        if self.generic_hints:
            generic_hint = random.choice(self.generic_hints)
            self.used.append(generic_hint)
            return {'BestHint': generic_hint,
                    "StudentAnswer": answer,
                    "HintCategory": "Generic"}
        else:
            # if there are no hints in either the database or generic hints
            self.used.append("There are no hints for" + " " + answer)
            return {"BestHint": "Sorry, there are no hints for this answer.",
                    "StudentAnswer": answer,
                    "HintCategory": False}

    def hints_available(self, answer):
        """
        This function is used to check that an incorrect answer has
        available hints to show.  It will also add the incorrect
        answer test to self.incorrect_answers.

        Args:
          answer: This is equal to answer from get_hint, the answer 
            the student submitted
        Returns:
           False if there are no hints to show exist. In the future, this
             may change to another falsey value (e.g. zero or an empty
             list)
           True if there are hints to show. In the future, this may change
             to another truthy value (e.g. the hints themselves, or number
             of hints, or similar)
        """
        isreported = []
        self.incorrect_answers.append(answer)
        if answer not in self.hint_database:
            # add incorrect answer to hint_database if no precedent exists
            self.hint_database[answer] = {}
            return False
        for hint_keys in self.hint_database[answer]:
            if hint_keys in self.reported_hints:
                isreported.append(hint_keys)
        if (len(self.hint_database[answer]) - len(isreported)) > 0:
            return True
        else:
            return False

    @XBlock.json_handler
    def get_used_hint_answer_data(self, data, suffix=''):
        """
        This function helps to facilitate student rating of hints and
        contribution of new hints.  Specifically this function is used
        to send necessary data to JS about incorrect answer
        submissions and hints. It also will return hints that have
        been reported, although this is only for Staff.

        Returns:
          used_hint_answer_text: This dicitonary contains reported hints/answers (if the user is staff) and the
                         first hint/answer pair that the student submitted for a problem.

        """
        # used_hint_answer_text is a dictionary of hints (or lack thereof) used for a
        # specific answer, as well as 2 other random hints that exist for each answer
        # that were not used. The keys are the used hints, the values are the
        # corresponding incorrect answer
        used_hint_answer_text = {}
        if self.get_user_is_staff():
            for key in self.reported_hints:
                used_hint_answer_text[key] = u"Reported"
        if len(self.incorrect_answers) == 0:
            return used_hint_answer_text
        else:
            # for the time being only the first answer/hint pair will be shown to the studen
            if self.used[0] in self.hint_database[self.incorrect_answers[0]]:
                # add new key (hint) to used_hint_answer_text with a value (incorrect answer)
                used_hint_answer_text[self.used[0]] = self.incorrect_answers[0]
            else:
                # if the student's answer had no hints (or all the hints were reported and unavailable) return None
                used_hint_answer_text[None] = self.incorrect_answers[0]
        self.incorrect_answers = []
        self.used = []
        return used_hint_answer_text

    @XBlock.json_handler
    def rate_hint(self, data, suffix=''):
        """
        Used to facilitate hint rating by students.
        Hint ratings in hint_database are updated and the resulting
        hint rating (or reported status) is returned to JS.

        Args:
          data['student_answer']: The incorrect answer that corresponds to the hint that is being rated
          data['hint']: The hint that is being rated
          data['student_rating']: The rating chosen by the student.
        Returns:
          'rating': the new rating of the hint, or the string 'reported' if the hint was reported
          'hint': the hint that had its rating changed

        TODO: Break out into independent functions, or make generic in some way
        """
        answer_data = data['student_answer']
        data_rating = data['student_rating']
        data_hint = data['hint']

        if any(data_hint in generic_hints for generic_hints in self.generic_hints):
            return # TODO: Figure out how to manage generic hints

        if data['student_rating'] == 'unreport':
            if data_hint in self.reported_hints:
                self.reported_hints.pop(data_hint, None)
                return {'rating': 'unreported'}

        elif data['student_rating'] == 'remove':
            if data_hint in self.reported_hints:
                self.hint_database[self.reported_hints[data_hint]].pop(data_hint, None)
                self.reported_hints.pop(data_hint, None)
                return {'rating': 'removed'}

        elif data['student_rating'] == 'report':
            # add hint to Reported dictionary
            self.reported_hints[data_hint] = answer_data
            return {"rating": 'reported', 'hint': data_hint}

        elif data_rating == 'upvote':
            self.hint_database[answer_data][data_hint]["upvotes"] += 1
            return {'success':True}

        elif data_rating == 'downvote':
            self.hint_database[answer_data][data_hint]["downvotes"] += 1
            return {'success': True}

        else:
            return {'success':False, 'error': 'Unrecognized operation'}



    @XBlock.json_handler
    def add_new_hint(self, data, suffix=''):
        """
        This function adds a new hint submitted by the student into the hint_database.
        Args:
          data['new_hint_submission']: This is the text of the new hint that the student has submitted.
          data['answer']: This is the incorrect answer for which the student is submitting a new hint.
        """
        submission = data['new_hint_submission']
        answer = data['answer']

        # If we don't have the hint already, add it
        if submission not in self.hint_database[answer]:
            self.hint_database[answer].update({submission: {'upvotes':0, 'downvotes':0}})
            return {'success':True,
                    'result': 'Hint added'}
        return {'success':True,
                'result': 'We already had this hint. We gave it an upvote'}

    @XBlock.json_handler
    def studiodata(self, data, suffix=''):
        """
        This function serves to return the dictionary of reported hints to JS. This is intended for use in
        the studio_view, which is under construction at the moment
        """
        return self.reported_hints

    @staticmethod
    def workbench_scenarios():
        """
        A canned scenario for display in the workbench.
        """
        return [
            ("CrowdsourceHinter",
             """
             <vertical_demo>
               <crowdsourcehinter>
                 {"generic_hints": "Make sure to check for basic mistakes like typos", "initial_hints": {"michiganp": "remove the p at the end.", "michigann": "too many Ns on there."}, "target_problem": "i4x://edX/DemoX/problem/Text_Input"}
               </crowdsourcehinter>
             </vertical_demo>""")
        ]

    @classmethod
    def parse_xml(cls, node, runtime, keys, _id_generator):
        """
        A minimal working test for parse_xml
        """
        block = runtime.construct_xblock_from_class(cls, keys)
        if node.text:
            xmlText = json.loads(node.text)
        else:
            xmlText = None
        if xmlText:
            block.generic_hints.append(xmlText["generic_hints"])
            block.initial_hints = copy.copy(xmlText["initial_hints"])
            block.target_problem = xmlText["target_problem"]
        return block

    # Generic functions/workarounds for XBlock API limitations and incompletions.
    def resource_string(self, path):
        """
        This function is used to get the path of static resources.
        """
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    def get_user_is_staff(self):
        """
        Return self.xmodule_runtime.user_is_staff
        This is not a supported part of the XBlocks API. User data is still
        being defined. However, it's the only way to get the data right now.
        """
        xmodule_runtime = getattr(self, "xmodule_runtime", None)
        if xmodule_runtime:
            return self.xmodule_runtime.user_is_staff
        else:
            return False
