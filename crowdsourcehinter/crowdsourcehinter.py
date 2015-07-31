import ast
import logging
import operator
import pkg_resources
import random
import json
import copy

from xblock.core import XBlock
from xblock.fields import Scope, Dict, List, Boolean, String
from xblock.fragment import Fragment

log = logging.getLogger(__name__)


class CrowdsourceHinter(XBlock):
    """
    This is the Crowdsource Hinter XBlock. This Xblock seeks to provide students with hints
    that specifically address their mistake. Additionally, the hints that this Xblock shows
    are created by the students themselves. This doc string will probably be edited later.
    """
    # Database of hints. hints are stored as such: {"incorrect_answer": {"hint": rating}}. each key (incorrect answer)
    # has a corresponding dictionary (in which hints are keys and the hints' ratings are the values).
    #
    # Example: {"computerr": {"You misspelled computer, remove the last r.": 5}}
    hint_database = Dict(default={}, scope=Scope.user_state_summary)
    # Database of initial hints, set by the course instructor. hint_database will receive the hints inputted
    # in initial_hints. Initial hints have a default rating of 0.
    #
    # Example: {"Jeorge Washington": "You spelled his first name wrong."}
    initial_hints = Dict(default={}, scope=Scope.content)
    # This is a list of incorrect answer submissions made by the student. this list is mostly used for
    # when the student starts rating hints, to find which incorrect answer's hint a student voted on.
    #
    # Example: ["personal computer", "PC", "computerr"]
    incorrect_answers = List([], scope=Scope.user_state)
    # A dictionary of generic_hints. default hints will be shown to students when there are no matches with the
    # student's incorrect answer within the hint_database dictionary (i.e. no students have made hints for the
    # particular incorrect answer)
    #
    # Example: ["Make sure to check your answer for simple mistakes like typos!"]
    generic_hints = List(default=[], scope=Scope.content)
    # List of which hints have been shown to the student
    # this list is used to prevent the same hint from showing up to a student (if they submit the same incorrect answers
    # multiple times)
    #
    # Example: ["You misspelled computer, remove the last r."]
    used = List([], scope=Scope.user_state)
    # This is a dictionary of hints that have been reported. the values represent the incorrect answer submission, and the
    # keys are the hints the corresponding hints. hints with identical text for differing answers will all not show up for the
    # student.
    #
    # Example: {"desk": "You're completely wrong, the answer is supposed to be computer."}
    reported_hints = Dict(default={}, scope=Scope.user_state_summary)
    # This String represents the xblock element for which the hinter is running. It is necessary to manually
    # set this value in the XML file under the format "hinting_element": "i4x://edX/DemoX/problem/Text_Input" .
    # Setting the element in the XML file is critical for the hinter to work.
    #
    # TODO: probably should change the name from Element (problem_element? hinting_element?). Trying to
    # just change the name didn't seem to operate properly, check carefully what is changed
    Element = String(default="", scope=Scope.content)

    def studio_view(self, context=None):
        """
        This function defines a view for editing the XBlock when embedding it in a course. It will allow
        one to define, for example, which problem the hinter is for. It is unfinished and does not currently
        work.
        """
        html = self.resource_string("static/html/crowdsourcehinterstudio.html")
        frag = Fragment(html)
        frag.add_javascript_url('//cdnjs.cloudflare.com/ajax/libs/mustache.js/0.8.1/mustache.min.js')
        frag.add_css(self.resource_string("static/css/crowdsourcehinter.css"))
        frag.add_javascript(self.resource_string("static/js/src/crowdsourcehinter_studio.js"))
        frag.initialize_js('CrowdsourceHinterStudio', {'initial': str(self.initial_hints), 'generic': str(self.generic_hints), 'element': str(self.Element)})
        return frag

    @XBlock.json_handler
    def set_initial_settings(self, data, suffix=''):
        """
        Set intial hints, generic hints, and problem element from the studio view.
        """
        initial = ast.literal_eval(str(data['initial_hints']))
        generic = ast.literal_eval(str(data['generic_hints']))
        if type(generic) is list and type(initial) is dict:
            self.initial_hints = initial
            self.generic_hints = generic
            self.Element = str(data['element'])
            return {'success': True}
        return {'success': False}

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
        being defined. However, It's the only way to get the data right now.
        """
        return self.xmodule_runtime.user_is_staff

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
        frag.initialize_js('CrowdsourceHinter', {'hinting_element': self.Element, 'isStaff': self.xmodule_runtime.user_is_staff})
        return frag

    @XBlock.json_handler
    def get_hint(self, data, suffix=''):
        """
        Returns hints to students. Hints with the highest rating are shown to students unless the student has already
        submitted the same incorrect answer previously.
        Args:
          data['submittedanswer']: The string of text that the student submits for a problem.
        returns:
          'BestHint': the highest rated hint for an incorrect answer
                        or another random hint for an incorrect answer
                        or 'Sorry, there are no hints for this answer.' if no hints exist
          'StudentAnswer': the student's incorrect answer
        """
        # populate hint_database with hints from initial_hints if there are no hints in hint_database.
        # this probably will occur only on the very first run of a unit containing this block.
        for answers in self.initial_hints:
            if answers not in self.hint_database:
                self.hint_database[answers] = {}
            if self.initial_hints[answers] not in self.hint_database[answers]:
                self.hint_database[answers].update({self.initial_hints[answers]: 0})
        answer = str(data["submittedanswer"])
        # put the student's answer to lower case so that differences in capitalization don't make
        # different groups of hints. this is sloppy and the execution should probably be changed.
        answer = answer.lower()
        found_equal_sign = 0
        remaining_hints = int(0)
        best_hint = ""
        # the string returned by the event problem_graded is very messy and is different
        # for each problem, but after all of the numbers/letters there is an equal sign, after which the
        # student's input is shown. I use the function below to remove everything before the first equal
        # sign and only take the student's actual input.
        #
        # TODO: figure out better way to directly get text of student's answer
        if "=" in answer:
            if found_equal_sign == 0:
                found_equal_sign = 1
                eqplace = answer.index("=") + 1
                answer = answer[eqplace:]
        remaining_hints = str(self.find_hints(answer))
        if remaining_hints != str(0):
            for hint in self.hint_database[str(answer)]:
                if hint not in self.reported_hints.keys():
                    # if best_hint hasn't been set yet or the rating of hints is greater than the rating of best_hint
                    if best_hint == "" or self.hint_database[str(answer)][hint] > self.hint_database[str(answer)][str(best_hint)]:
                        best_hint = hint
            self.used.append(best_hint)
            return {'BestHint': best_hint, "StudentAnswer": answer}
        # find generic hints for the student if no specific hints exist
        if len(self.generic_hints) != 0:
            generic_hint = random.choice(self.generic_hints)
            self.used.append(generic_hint)
            return {'BestHint': generic_hint, "StudentAnswer": answer}
        else:
            # if there are no hints in either the database or generic hints
            self.used.append(str("There are no hints for" + " " + answer))
            return {'BestHint': "Sorry, there are no hints for this answer.", "StudentAnswer": answer}

    def find_hints(self, answer):
        """
        This function is used to check that an incorrect answer has available hints to show.
        It will also add the incorrect answer test to self.incorrect_answers.
        Args:
          answer: This is equal to answer from get_hint, the answer the student submitted
        Returns 0 if no hints to show exist
        """
        isreported = []
        self.incorrect_answers.append(str(answer))
        if str(answer) not in self.hint_database:
            # add incorrect answer to hint_database if no precedent exists
            self.hint_database[str(answer)] = {}
            return str(0)
        for hint_keys in self.hint_database[str(answer)]:
            for reported_keys in self.reported_hints:
                if hint_keys == reported_keys:
                    isreported.append(hint_keys)
        if (len(self.hint_database[str(answer)]) - len(isreported)) > 0:
            return str(1)
        else:
            return str(0)

    @XBlock.json_handler
    def get_used_hint_answer_data(self, data, suffix=''):
        """
        This function helps to facilitate student rating of hints and contribution of new hints.
        Specifically this function is used to send necessary data to JS about incorrect answer
        submissions and hints. It also will return hints that have been reported, although this
        is only for Staff.
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
                used_hint_answer_text[key] = str("Reported")
        if len(self.incorrect_answers) == 0:
            return used_hint_answer_text
        else:
            for index in range(0, len(self.used)):
                # each index is a hint that was used, in order of usage
                if str(self.used[index]) in self.hint_database[self.incorrect_answers[index]]:
                    # add new key (hint) to used_hint_answer_text with a value (incorrect answer)
                    used_hint_answer_text[str(self.used[index])] = str(self.incorrect_answers[index])
                    self.incorrect_answers = []
                    self.used = []
                    return used_hint_answer_text
                else:
                    # if the student's answer had no hints (or all the hints were reported and unavailable) return None
                    used_hint_answer_text[None] = str(self.incorrect_answers[index])
                    self.incorrect_answers = []
                    self.used = []
                    return used_hint_answer_text
        self.incorrect_answers = []
        self.used = []
        return used_hint_answer_text

    @XBlock.json_handler
    def rate_hint(self, data, suffix=''):
        """
        Used to facilitate hint rating by students.
        Hint ratings in hint_database are updated and the resulting hint rating (or reported status) is returned to JS.
        Args:
          data['student_answer']: The incorrect answer that corresponds to the hint that is being rated
          data['hint']: The hint that is being rated
          data['student_rating']: The rating chosen by the student.
        Returns:
          'rating': the new rating of the hint, or the string 'reported' if the hint was reported
          'hint': the hint that had its rating changed
        """
        answer_data = data['student_answer']
        data_rating = data['student_rating']
        data_hint = data['hint']
        if data_hint == 'Sorry, there are no hints for this answer.':
            return {"rating": None, 'hint': data_hint}
        if data['student_rating'] == 'unreport':
            for reported_hints in self.reported_hints:
                if reported_hints == data_hint:
                    self.reported_hints.pop(data_hint, None)
                    return {'rating': 'unreported'}
        if data['student_rating'] == 'remove':
            for reported_hints in self.reported_hints:
                if data_hint == reported_hints:
                    self.hint_database[self.reported_hints[data_hint]].pop(data_hint, None)
                    self.reported_hints.pop(data_hint, None)
                    return {'rating': 'removed'}
        if data['student_rating'] == 'report':
            # add hint to Reported dictionary
            self.reported_hints[str(data_hint)] = answer_data
            return {"rating": 'reported', 'hint': data_hint}
        rating = self.change_rating(data_hint, data_rating, answer_data)
        return {"rating": str(rating), 'hint': data_hint}

    def change_rating(self, data_hint, data_rating, answer_data):
        """
        This function is used to change the rating of a hint when students vote on its helpfulness.
        Initiated by rate_hint. The temporary_dictionary is manipulated to be used
        in self.rate_hint
        Args:
          data_hint: This is equal to the data['hint'] in self.rate_hint
          data_rating: This is equal to the data['student_rating'] in self.rate_hint
          answer_data: This is equal to the data['student_answer'] in self.rate_hint
        Returns:
          The rating associated with the hint is returned. This rating is identical
          to what would be found under self.hint_database[answer_string[hint_string]]
        """
        if any(data_hint in generic_hints for generic_hints in self.generic_hints):
            return
        if data_rating == 'upvote':
            self.hint_database[str(answer_data)][str(data_hint)] += 1
            return self.hint_database[str(answer_data)][str(data_hint)]
        else:
            self.hint_database[str(answer_data)][str(data_hint)] -= 1
            return self.hint_database[str(answer_data)][str(data_hint)]

    @XBlock.json_handler
    def add_new_hint(self, data, suffix=''):
        """
        This function adds a new hint submitted by the student into the hint_database.
        Args:
          data['submission']: This is the text of the new hint that the student has submitted.
          data['answer']: This is the incorrect answer for which the student is submitting a new hint.
        """
        submission = data['submission']
        answer = data['answer']
        if str(submission) not in self.hint_database[str(answer)]:
            self.hint_database[str(answer)].update({submission: 0})
            return
        else:
            # if the hint exists already, simply upvote the previously entered hint
            if str(submission) in self.generic_hints:
                return
            else:
                self.hint_database[str(answer)][str(submission)] += 1
                return

    @XBlock.json_handler
    def studiodata(self, data, suffix=''):
        """
        This function serves to return the dictionary of reported hints to JS. This is intended for use in
        the studio_view, which is under construction at the moment
        """
        return self.reported_hints

    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("CrowdsourceHinter",
                """
                    <verticaldemo>
                        <crowdsourcehinter>
                            {"generic_hints": "Make sure to check for basic mistakes like typos", "initial_hints": {"michiganp": "remove the p at the end.", "michigann": "too many Ns on there."}, "hinting_element": "i4x://edX/DemoX/problem/Text_Input"}
                        </crowdsourcehinter>
                     </verticaldemo>
                """
            )
        ]

    @classmethod
    def parse_xml(cls, node, runtime, keys, _id_generator):
        """
        A minimal working test for parse_xml
        """
        block = runtime.construct_xblock_from_class(cls, keys)
        xmlText = ast.literal_eval(str(node.text))
        if xmlText:
            block.generic_hints.append(str(xmlText["generic_hints"]))
            block.initial_hints = copy.copy(xmlText["initial_hints"])
            block.Element = str(xmlText["hinting_element"])
        return block
