# pylint: disable=line-too-long
# pylint: disable=unused-argument

import ast
import logging
import operator
import pkg_resources
import random

from xblock.core import XBlock
from xblock.fields import Scope, Dict, List
from xblock.fragment import Fragment

log = logging.getLogger(__name__)

class CrowdsourceHinter(XBlock):
    """
    This is the Crowd Sourced Hinter XBlock. This Xblock seeks to provide students with hints
    that specifically address their mistake. Additionally, the hints that this Xblock shows
    are created by the students themselves. This doc string will probably be edited later.
    """
    # Database of hints. hints are stored as such: {"incorrect_answer": {"hint": rating}}. each key (incorrect answer)
    # has a corresponding dictionary (in which hints are keys and the hints' ratings are the values).
    # TODO: Remove default values once done testing
    hint_database = Dict(default={'answer': {'Try doing something new': 5, 'you should go review that lesson again': 0}, "answer2": {'new answer hint': 3, "You should go look in your notes": 6, "This is a hint that should be flagged": -4}}, scope=Scope.user_state_summary)
    # This is a list of incorrect answer submissions made by the student. this list is mostly used for
    # feedback, to find which incorrect answer's hint a student voted on.
    WrongAnswers = List([], scope=Scope.user_state)
    # A dictionary of default hints. default hints will be shown to students when there are no matches with the
    # student's incorrect answer within the hint_database dictionary (i.e. no students have made hints for the
    # particular incorrect answer)
    DefaultHints = Dict(default={'default_hint': 0}, scope=Scope.content)
    # List of which hints have been shown to the student
    # this list is used to prevent the same hint from showing up to a student (if they submit the same incorrect answers
    # multiple times)
    Used = List([], scope=Scope.user_state)
    # This list is used to prevent students from voting multiple times on the same hint during the feedback stage.
    # i believe this will also prevent students from voting again on a particular hint if they were to return to
    # a particular problem later
    Voted = List(default=[], scope=Scope.user_state)
    # This is a dictionary of hints that have been flagged. the keys represent the incorrect answer submission, and the
    # values are the hints the corresponding hints. even if a hint is flagged, if the hint shows up for a different
    # incorrect answer, i believe that the hint will still be able to show for a student
    Flagged = Dict(default={"answer2": "This is a hint that should be flagged"}, scope=Scope.user_state_summary)
    # This string determines whether or not to show only the best (highest rated) hint to a student
    # When set to 'True' only the best hint will be shown to the student.
    # Details on operation when set to 'False' are to be finalized.
    # TODO: make this into a boolean instead of a dict
    show_best = Dict(default={'showbest': 'True'}, scope=Scope.user_state_summary)

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
        frag.initialize_js('CrowdsourceHinter')
        return frag

    def studio_view(self, context=None):
        """
        This function defines a view for editing the XBlock when embedding it in a course. It will allow
        one to define, for example, which problem the hinter is for. It is unfinished and does not currently
        work.
        """
        html = self.resource_string("static/html/crowdsourcehinterstudio.html")
        frag = Fragment(html.format(self=self))
        frag.add_javascript_url('//cdnjs.cloudflare.com/ajax/libs/mustache.js/0.8.1/mustache.min.js')
        frag.add_css(self.resource_string("static/css/crowdsourcehinter.css"))
        frag.add_javascript(self.resource_string("static/js/src/crowdsourcehinter.js"))
        frag.initialize_js('CrowdsourceHinter')
        return frag

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

    @XBlock.json_handler
    def is_user_staff(self, _data, _suffix=''):
        """
        Return whether the user is staff.
        Returns:
        is_user_staff: indicator for whether the user is staff
        """
        result = {'is_user_staff': self.get_user_is_staff()}
        return result

    @XBlock.json_handler
    def get_hint(self, data, suffix=''):
        """
        Returns hints to students. Hints with the highest rating are shown to students unless the student has already
        submitted the same incorrect answer previously.

        Args:
          data['submittedanswer']: The string of text that the student submits for a problem.

        returns:
          'HintsToUse': the highest rated hint for an incorrect answer
                        or another random hint for an incorrect answer
                        or 'Sorry, there are no more hints for this answer.' if no more hints exist
        """
        answer = str(data["submittedanswer"])
        answer = answer.lower() # for analyzing the student input string I make it lower case.
        found_equal_sign = 0
        remaining_hints = int(0)
        best_hint = ""
        # the string returned by the event problem_graded is very messy and is different
        # for each problem, but after all of the numbers/letters there is an equal sign, after which the
        # student's input is shown. I use the function below to remove everything before the first equal
        # sign and only take the student's actual input.
        if "=" in answer:
            if found_equal_sign == 0:
                found_equal_sign = 1
                eqplace = answer.index("=") + 1
                answer = answer[eqplace:]
        remaining_hints = str(self.find_hints(answer))
        if remaining_hints != str(0):
            best_hint = max(self.hint_database[str(answer)].iteritems(), key=operator.itemgetter(1))[0]
            if self.show_best['showbest'] == 'True':
                if best_hint not in self.Flagged.keys():
                    self.Used.append(best_hint)
                    return {'HintsToUse': best_hint}
            if best_hint not in self.Used:
                # choose highest rated hint for the incorrect answer
                if best_hint not in self.Flagged.keys():
                    self.Used.append(best_hint)
                    return {'HintsToUse': best_hint}
            else:
                # choose another random hint for the answer.
                temporary_hints_list = []
                for hint_keys in self.hint_database[str(answer)]:
                    if hint_keys not in self.Used:
                        if hint_keys not in self.Flagged:
                            temporary_hints_list.append(str(hint_keys))
                            not_used = random.choice(temporary_hints_list)
        else:
            if best_hint not in self.Used:
                # choose highest rated hint for the incorrect answer
                if best_hint not in self.Flagged.keys():
                    self.Used.append(best_hint)
                    return {'HintsToUse': best_hint}
            else:
                temporary_hints_list = []
                for hint_keys in self.DefaultHints:
                    if hint_keys not in self.Used:
                        temporary_hints_list.append(str(hint_keys))
                    if len(temporary_hints_list) != 0:
                        not_used = random.choice(temporary_hints_list)
                    else:
                        # if there are no more hints left in either the database or defaults
                        self.Used.append(str("There are no hints for" + " " + answer))
                        return {'HintsToUse': "Sorry, there are no more hints for this answer."}
        self.Used.append(not_used)
        return {'HintsToUse': not_used}

    def find_hints(self, answer):
        """
        This function is used to find all appropriate hints that would be provided for
        an incorrect answer.

        Args:
          answer: This is equal to answer from get_hint, the answer the student submitted
        """
        isflagged = []
        isused = 0
        self.WrongAnswers.append(str(answer)) # add the student's input to the temporary list
        if str(answer) not in self.hint_database:
            # add incorrect answer to hint_database if no precedent exists
            self.hint_database[str(answer)] = {}
            return str(0)
        for hint_keys in self.hint_database[str(answer)]:
            for flagged_keys in self.Flagged:
                if str(hint_keys) == str(flagged_keys):
                    isflagged.append(hint_keys)
            if str(hint_keys) in self.Used:
                isused += 1
        if (len(self.hint_database[str(answer)]) - len(isflagged) - isused) > 0:
            return str(1)
        else:
            return str(0)

    @XBlock.json_handler
    def get_feedback(self, data, suffix=''):
        """
        This function is used to facilitate student feedback to hints. Specifically this function
        is used to send necessary data to JS about incorrect answer submissions and hints.

        Returns:
          feedback_data: This dicitonary contains all incorrect answers that a student submitted
                         for the question, all the hints the student recieved, as well as two
                         more random hints that exist for an incorrect answer in the hint_database
        """
        # feedback_data is a dictionary of hints (or lack thereof) used for a
        # specific answer, as well as 2 other random hints that exist for each answer
        # that were not used. The keys are the used hints, the values are the
        # corresponding incorrect answer
        feedback_data = {}
        number_of_hints = 0
        # TODO: possibly simply check here whether or not user is staff
        if data['isStaff'] == 'true':
            for answer_keys in self.hint_database:
                if str(len(self.hint_database[str(answer_keys)])) != str(0):
                    for hints in self.hint_database[str(answer_keys)]:
                        if len(self.Flagged) != 0:
                            for flagged_hints in self.Flagged:
                                if str(hints) != self.Flagged[flagged_hints]:
                                    feedback_data[str(hints)] = str(answer_keys)
                                else:
                                    feedback_data[str(hints)] = str("Flagged")
                        else:
                            feedback_data[str(hints)] = str(answer_keys)
                else:
                    feedback_data[None] = str(answer_keys)
        elif len(self.WrongAnswers) == 0:
            return
        else:
            for index in range(0, len(self.Used)):
                # each index is a hint that was used, in order of usage
                for answer_keys in self.hint_database:
                    if str(self.Used[index]) in self.hint_database[str(answer_keys)]:
                        # add new key (hint) to feedback_data with a value (incorrect answer)
                        feedback_data[str(self.Used[index])] = str(self.WrongAnswers[index])
                for answer_keys in self.hint_database:
                    if str(answer_keys) == str(self.WrongAnswers[index]):
                        # for answes in self.hint_database, if the len of the answer's corresponding
                        # hints is not zero...
                        if str(len(self.hint_database[str(answer_keys)])) != str(0):
                            number_of_hints = 0
                            hint_key_shuffled = self.hint_database[str(answer_keys)].keys()
                            # shuffle keys so that random hints won't repeat. probably can be done better.
                            random.shuffle(hint_key_shuffled)
                            for random_hint_key in hint_key_shuffled:
                                if str(random_hint_key) not in self.Flagged.keys():
                                    if number_of_hints < 3:
                                        number_of_hints += 1
                                        # add random unused hint to feedback_data's keys
                                        # with the value as the incorrect answer
                                        feedback_data[str(random_hint_key)] = str(self.WrongAnswers[index])
                                        self.WrongAnswers.append(str(self.WrongAnswers[index]))
                                        self.Used.append(str(random_hint_key))
                        else:
                            self.no_hints(index)
                            feedback_data[None] = str(self.WrongAnswers[index])
        self.WrongAnswers=[]
        self.Used=[]
        return feedback_data

    def no_hints(self, index):
        """
        This function is used when no hints exist for an answer. The feedback_data within
        get_feedback is set to "there are no hints for" + " " + str(self.WrongAnswers[index])
        """
        self.WrongAnswers.append(str(self.WrongAnswers[index]))
        self.Used.append(str("There are no hints for" + " " + str(self.WrongAnswers[index])))

    @XBlock.json_handler
    def get_ratings(self, data, suffix=''):
        """
        This function is used to return the ratings of hints during hint feedback.

        data['student_answer'] is the answer for the hint being displayed
        data['hint'] is the hint being shown to the student

        returns:
            hint_rating: the rating of the hint as well as data on what the hint in question is
        """
        hint_rating = {}
        if data['student_answer'] == 'Flagged':
            hint_rating['rating'] = 0
            hint_rating['student_ansxwer'] = 'Flagged'
            hint_rating['hint'] = data['hint']
            return hint_rating
        temporary_dictionary = str(self.hint_database[data['student_answer']])
        temporary_dictionary = (ast.literal_eval(temporary_dictionary))
        hint_rating['rating'] = temporary_dictionary[data['hint']]
        hint_rating['student_answer'] = data['student_answer']
        hint_rating['hint'] = data['hint']
        return hint_rating

    @XBlock.json_handler
    def rate_hint(self, data, suffix=''):
        """
        Used to facilitate hint rating by students.

        Hint ratings in hint_database are updated and the resulting hint rating (or flagged status) is returned to JS.

        Args:
          data['student_answer']: The incorrect answer that corresponds to the hint that is being voted on
          data['hint']: The hint that is being voted on
          data['student_rating']: The rating chosen by the student.

        Returns:
          "rating": The rating of the hint.
        """
        answer_data = data['student_answer']
        # answer_data is manipulated to remove symbols to prevent errors that
        # might arise due to certain symbols. I don't think I have this fully working but am not sure.
        data_rating = data['student_rating']
        data_hint = data['hint']
        if data['student_rating'] == 'unflag':
            for flagged_hints in self.Flagged:
                if self.Flagged[str(flagged_hints)] == data_hint:
                    del self.Flagged[flagged_hints]
                    return {'rating': 'unflagged'}
        if data['student_rating'] == 'remove':
            for flagged_answer in self.Flagged:
                if self.Flagged[flagged_answer] == data_hint:            
                    temporary_dict = str(self.hint_database[str(flagged_answer)])
                    temporary_dict = (ast.literal_eval(temporary_dict))
                    temporary_dict.pop(data_hint, None)
                    self.hint_database[str(flagged_answer)] = temporary_dict
                    del self.Flagged[flagged_answer] 
                    return {'rating': 'removed'}
        if data['student_rating'] == 'flag':
            # add hint to Flagged dictionary
            self.Flagged[str(answer_data)] = data_hint
            return {"rating": 'flagged', 'hint': data_hint}
        if str(data_hint) not in self.Voted:
            self.Voted.append(str(data_hint)) # add data to Voted to prevent multiple votes
            rating = self.change_rating(data_hint, data_rating, answer_data) # change hint rating
            if str(rating) == str(0):
                return {"rating": str(0), 'hint': data_hint}
            else:
                return {"rating": str(rating), 'hint': data_hint}
        else:
            return {"rating": str('voted'), 'hint': data_hint}
        self.Flagged[str(data_hint)] = str(answer_data)

    def change_rating(self, data_hint, data_rating, answer_data):
        """
        This function is used to change the rating of a hint when it is voted on.
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
        temporary_dictionary = str(self.hint_database[str(answer_data)])
        temporary_dictionary = (ast.literal_eval(temporary_dictionary))
        if data_rating == 'upvote':
            temporary_dictionary[str(data_hint)] += 1
        else:
            temporary_dictionary[str(data_hint)] -= 1
        self.hint_database[str(answer_data)] = temporary_dictionary
        return str(temporary_dictionary[str(data_hint)])

    def remove_symbols(self, answer_data):
        """
        For removing colons and such from answers to prevent weird things from happening. Not sure if this is properly functional.

        Args:
          answer_data: This is equal to the data['answer'] in self.rate_hint

        Returns:
          answer_data: This is equal to the argument answer_data except that symbols have been
                       replaced by text (hopefully)
        """
        answer_data = answer_data.replace('ddeecciimmaallppooiinntt', '.')
        answer_data = answer_data.replace('qquueessttiioonnmmaarrkk', '?')
        answer_data = answer_data.replace('ccoolloonn', ':')
        answer_data = answer_data.replace('sseemmiiccoolloonn', ';')
        answer_data = answer_data.replace('eeqquuaallss', '=')
        answer_data = answer_data.replace('qquuoottaattiioonnmmaarrkkss', '"')
        return answer_data

    @XBlock.json_handler
    def moderate_hint(self, data, suffix=''):
        """
        UNDER CONSTRUCTION, intended to be used for instructors to remove hints from the database after hints
        have been flagged.
        """
        flagged_hints = {}
        flagged_hints = self.Flagged
        if data['rating'] == "dismiss":
            flagged_hints.pop(data['answer_wrong'], None)
        else:
            flagged_hints.pop(data['answer_wrong'], None)
            for answer_keys in self.hint_database:
                if str(answer_keys) == data['answ']:
                    for hint_keys in self.hint_database[str(answer_keys)]:
                        if str(hint_keys) == data['hint']:
                            temporary_dict = str(self.hint_database[str(answer_keys)])
                            temporary_dict = (ast.literal_eval(temporary_dict))
                            temporary_dict.pop(hint_keys, None)
                            self.hint_database[str(answer_keys)] = temporary_dict

    @XBlock.json_handler
    def give_hint(self, data, suffix=''):
        """
        This function adds a new hint submitted by the student into the hint_database.

        Args:
          data['submission']: This is the text of the new hint that the student has submitted.
          data['answer']: This is the incorrect answer for which the student is submitting a new hint.
        """
        submission = data['submission']
        answer = data['answer']
        if str(submission) not in self.hint_database[str(answer)]:
            temporary_dictionary = str(self.hint_database[str(answer)])
            temporary_dictionary = (ast.literal_eval(temporary_dictionary))
            temporary_dictionary.update({submission: 0})
            # once again, manipulating temporary_dictionary and setting
            # self.hint_database equal to it due to being unable to directly
            # edit self.hint_databse. Most likely scope error
            self.hint_database[str(answer)] = temporary_dictionary
            return
        else:
            # if the hint exists already, simply upvote the previously entered hint
            if str(submission) in self.DefaultHints:
                self.DefaultHints[str(submission)] += 1
                return
            else:
                temporary_dictionary = str(self.hint_database[str(answer)])
                temporary_dictionary = (ast.literal_eval(temporary_dictionary))
                temporary_dictionary[str(submission)] += 1
                self.hint_database[str(answer)] = temporary_dictionary
                return

    @XBlock.json_handler
    def studiodata(self, data, suffix=''):
        """
        This function serves to return the dictionary of flagged hints to JS. This is intended for use in
        the studio_view, which is under construction at the moment
        """
        return self.Flagged

    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("CrowdsourceHinter",
             """<vertical_demo>
<crowdsourcehinter/>
</vertical_demo>
"""),
        ]
