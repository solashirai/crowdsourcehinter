import ast
import logging
import operator
import pkg_resources
import random
import json
import copy
from copy import deepcopy
from eventtracking import tracker

from xblock.core import XBlock
from xblock.fields import Scope, Dict, List, Boolean
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
    #
    # Example: {"computerr": {"You misspelled computer, remove the last r.": 5}}
    hint_database = Dict(default={}, scope=Scope.user_state_summary)
    # Database of initial hints, set by the course instructor. If initial hints are set by the instructor, hint_database's contents
    # will become identical to initial_hints. The datastructure for initial_hints is the same as for hint_databsae, 
    # {"incorrect_answer": {"hint": rating}} 
    initial_hints = Dict(default={}, scope=Scope.content)
    # This is a list of incorrect answer submissions made by the student. this list is mostly used for
    # feedback, to find which incorrect answer's hint a student voted on.
    #
    # Example: ["personal computer", "PC", "computerr"]
    WrongAnswers = List([], scope=Scope.user_state)
    # A dictionary of generic_hints. default hints will be shown to students when there are no matches with the
    # student's incorrect answer within the hint_database dictionary (i.e. no students have made hints for the
    # particular incorrect answer)
    #
    # Example: ["Make sure to check your answer for simple mistakes, like spelling or spaces!"]
    generic_hints = List(default=[], scope=Scope.content)
    # List of which hints have been shown to the student
    # this list is used to prevent the same hint from showing up to a student (if they submit the same incorrect answers
    # multiple times)
    #
    # Example: ["You misspelled computer, remove the last r."]
    Used = List([], scope=Scope.user_state)
    # This list is used to prevent students from voting multiple times on the same hint during the feedback stage.
    # i believe this will also prevent students from voting again on a particular hint if they were to return to
    # a particular problem later
    Voted = List(default=[], scope=Scope.user_state)
    # This is a dictionary of hints that have been flagged. the values represent the incorrect answer submission, and the
    # keys are the hints the corresponding hints. hints with identical text for differing answers will all not show up for the
    # student.
    #
    # Example: {"desk": "You're completely wrong, the answer is supposed to be computer."}
    Flagged = Dict(default={}, scope=Scope.user_state_summary)
    # This string determines whether or not to show only the best (highest rated) hint to a student
    # When set to 'True' only the best hint will be shown to the student.
    # Details on operation when set to 'False' are to be finalized.
    show_best = Boolean(default = True, scope=Scope.user_state_summary)

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
        # populate hint_database with hints from initial_hints if there are no hints in hint_database.
        # this probably will occur only on the very first run of a unit containing this block.
        if not bool(self.hint_database):
            #TODO: Figure out why temporarydict = self.initial_hints doesn't work.
            
            self.hint_database = copy.copy(self.initial_hints)
        answer = str(data["submittedanswer"])
        answer = answer.lower() # for analyzing the student input string I make it lower case.
        found_equal_sign = 0
        remaining_hints = int(0)
        best_hint = ""
        # the string returned by the event problem_graded is very messy and is different
        # for each problem, but after all of the numbers/letters there is an equal sign, after which the
        # student's input is shown. I use the function below to remove everything before the first equal
        # sign and only take the student's actual input. This is not very clean.
        if "=" in answer:
            if found_equal_sign == 0:
                found_equal_sign = 1
                eqplace = answer.index("=") + 1
                answer = answer[eqplace:]
        remaining_hints = str(self.find_hints(answer))
        if remaining_hints != str(0):
            best_hint = max(self.hint_database[str(answer)].iteritems(), key=operator.itemgetter(1))[0]
            if self.show_best:
                # if set to show best, only the best hint will be shown. Different hitns will not be shown
                # for multiple submissions/hint requests
                if best_hint not in self.Flagged.keys():
                    self.Used.append(best_hint)
                    tracker.emit('get_hint', answer, best_hint, 'best hint')
                    return {'HintsToUse': best_hint, "StudentAnswer": answer}
            if best_hint not in self.Used:
                # choose highest rated hint for the incorrect answer
                if best_hint not in self.Flagged.keys():
                    self.Used.append(best_hint)
                    tracker.emit('get_hint', answer, best_hint, 'best hint')
                    return {'HintsToUse': best_hint, "StudentAnswer": answer}
            # choose another random hint for the answer.
            temporary_hints_list = []
            for hint_keys in self.hint_database[str(answer)]:
                if hint_keys not in self.Used:
                    if hint_keys not in self.Flagged:
                        temporary_hints_list.append(str(hint_keys))
                        not_used = random.choice(temporary_hints_list)
                        self.Used.append(not_used)
                        tracker.emit('get_hint', answer, not_used, 'unused hint')
                        return {'HintsToUse': not_used, "StudentAnswer": answer}
        else:
            if len(self.generic_hints) != 0:
                not_used = random.choice(self.generic_hints)
                self.Used.append(not_used)
                tracker.emit('get_hint', answer, not_used, 'generic hint')
                return {'HintsToUse': not_used, "StudentAnswer": answer}
            else:
                # if there are no more hints left in either the database or defaults
                self.Used.append(str("There are no hints for" + " " + answer))
                return {'HintsToUse': "Sorry, there are no hints for this answer.", "StudentAnswer": answer}

    def find_hints(self, answer):
        """
        This function is used to find all appropriate hints that would be provided for
        an incorrect answer.

        Args:
          answer: This is equal to answer from get_hint, the answer the student submitted
        
        Returns 0 if no hints to show exist
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
                if hint_keys == flagged_keys:
                    isflagged.append(hint_keys)
            if str(hint_keys) in self.Used:
                if self.show_best is False:
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
        if data['isStaff'] == 'true':
            if len(self.Flagged) != 0:
                for answer_keys in self.hint_database:
                    if str(len(self.hint_database[str(answer_keys)])) != str(0):
                        for hints in self.hint_database[str(answer_keys)]:
                            for flagged_hints in self.Flagged:
                                if str(hints) == flagged_hints:
                                    feedback_data[str(hints)] = str("Flagged")
        if len(self.WrongAnswers) == 0:
            return
        else:
            for index in range(0, len(self.Used)):
                # each index is a hint that was used, in order of usage
                if str(self.Used[index]) in self.hint_database[self.WrongAnswers[index]]:
                    # add new key (hint) to feedback_data with a value (incorrect answer)
                    feedback_data[str(self.Used[index])] = str(self.WrongAnswers[index])
                    self.WrongAnswers=[]
                    self.Used=[]
                    return feedback_data
                else:
                    # if the student's answer had no hints (or all the hints were flagged and unavailable) return None
                    feedback_data[None] = str(self.WrongAnswers[index])
                    self.WrongAnswers=[]
                    self.Used=[]
                    return feedback_data
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
        hint_rating['rating'] = self.hint_database[data['student_answer']][data['hint']]
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
        data_rating = data['student_rating']
        data_hint = data['hint']
        if data['student_rating'] == 'unflag':
            for flagged_hints in self.Flagged:
                if flagged_hints == data_hint:
                    self.Flagged.pop(data_hint, None)
                    tracker.emit('rate_hint', data, 'unflagged')
                    return {'rating': 'unflagged'}
        if data['student_rating'] == 'remove':
            for flagged_hints in self.Flagged:
                if data_hint == flagged_hints:
                    self.hint_database[self.Flagged[data_hint]].pop(data_hint, None)
                    self.Flagged.pop(data_hint, None)   
                    tracker.emit('rate_hint', data, 'removed')        
                    return {'rating': 'removed'}
        if data['student_rating'] == 'flag':
            # add hint to Flagged dictionary
            self.Flagged[str(data_hint)] = answer_data
            tracker.emit('rate_hint', data, 'flagged')
            return {"rating": 'flagged', 'hint': data_hint}
        if str(data_hint) not in self.Voted:
            self.Voted.append(str(data_hint)) # add data to Voted to prevent multiple votes
            rating = self.change_rating(data_hint, data_rating, answer_data) # change hint rating
            tracker.emit('rate_hint', data, 'rating changed')
            if str(rating) == str(0):
                return {"rating": str(0), 'hint': data_hint}
            else:
                return {"rating": str(rating), 'hint': data_hint}
        else:
            return {"rating": str('voted'), 'hint': data_hint}

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
        if data_rating == 'upvote':
            self.hint_database[str(answer_data)][str(data_hint)] += 1
        else:
            self.hint_database[str(answer_data)][str(data_hint)] -= 1
        print("Ratings changed : " + str(self.hint_database))

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
        tracker.emit('give_hint', answer, submission)
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
        This function serves to return the dictionary of flagged hints to JS. This is intended for use in
        the studio_view, which is under construction at the moment
        """
        return self.Flagged

    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("CrowdsourceHinter",
            """
                <verticaldemo>
                    <crowdsourcehinter>
                        "Hello world!"
                        Hello World!
                        {"initial_hint_answer": "michigann", "initial_hint_text": "you have an extra n", "generic_hint": "make sure to chekc your spelling"}
                    </crowdsourcehinter>
                 </verticaldemo>
            """
            ),
        ]

    @classmethod
    def parse_xml(cls, node, runtime, keys, _id_generator):
        """
        A minimal working test for parse_xml
        """
        block = runtime.construct_xblock_from_class(cls, keys)
        import pdb; pdb.set_trace()
        #['__class__', '__contains__', '__copy__', '__deepcopy__', '__delattr__', '__delitem__', '__doc__', '__format__', '__getattribute__', '__getitem__', '__hash__', '__init__', '__iter__', '__len__', '__module__', '__new__', '__nonzero__', '__reduce__', '__reduce_ex__', '__repr__', '__reversed__', '__setattr__', '__setitem__', '__sizeof__', '__slots__', '__str__', '__subclasshook__', '_filter', '_init', 'addnext', 'addprevious', 'append', 'attrib', 'base', 'blacklist', 'clear', 'extend', 'find', 'findall', 'findtext', 'get', 'getchildren', 'getiterator', 'getnext', 'getparent', 'getprevious', 'getroottree', 'index', 'insert', 'items', 'iter', 'iterancestors', 'iterchildren', 'iterdescendants', 'iterfind', 'itersiblings', 'itertext', 'keys', 'makeelement', 'nsmap', 'prefix', 'remove', 'replace', 'set', 'sourceline', 'tag', 'tail', 'text', 'values', 'xpath']

        print(node.tag)
        print(node.tail)
        print(node.values)
        print(node.xpath)
        print(node.items)
        print(node.iterchildren)
        print(node.itertext)
        print(node.keys)
        print(node.makeelement)
        print(node.sourceline)
        print(node.tag)
        print(node.text)
        print type(node)
        block.generic_hints = ["Make sure to check your answer for basic mistakes like spelling!"]
        block.initial_hints = {"michigann": {"You have an extra N in your answer": 1}}
        return block
