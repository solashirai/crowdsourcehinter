import pkg_resources
import logging
import operator
import random
import ast

from xblock.core import XBlock
from xblock.fields import Scope, Integer, Boolean, String, Dict, List
from xblock.fragment import Fragment

log = logging.getLogger(__name__)

#get_hint and get_feedback are in 
class CrowdXBlock(XBlock):
    correctanswer = String(default="42", scope=Scope.content) #should be irrelevant for completed version
    hints = Dict(default={"2": {"hint6for2":0, "hint5for2":0, "hint4for2":0, "hint1for2":0, "hint2for2":0, "hint3for2":0}, "1": {"hint1for1":0, "hint2for1":0, "hint3for1":0}, "3": {"hint1for3":0, "hint2for3":0, "hint3for3":0}}, scope=Scope.content)
#All hints. sorted by type of mistake. type_of_incorrect_answer{"hint":rating, "hint":rating}
    HintsToUse = Dict(default={}, scope=Scope.user_state) #Dict of hints to provide user
    WrongAnswers = List(default=[], scope=Scope.user_state) #List of mistakes made by user
    DefaultHints = Dict(default={"defaulthint1": 0, "defaulthint2": 0, "defaulthint3": 0, "defaulthint4": 0, "defaulthint5": 0, "bestdefaulthint": 3}, scope=Scope.content) #Default hints in case no incorrect answers in hints match the user's mistake
    Used = List(default=[], scope=Scope.user_state)#List of used hints from HintsToUse
    Voted = Integer(default=0, scope=Scope.user_state)#prevent multiple votes/hint submission

    def student_view(self, context=None):
        html = self.resource_string("static/html/crowdxblock.html")
        frag = Fragment(html.format(self=self))
        frag.add_css(self.resource_string("static/css/crowdxblock.css"))
        frag.add_javascript(self.resource_string("static/js/src/crowdxblock.js"))
        frag.initialize_js('CrowdXBlock')
        return frag

    def studio_view(self, context=None):
        html = self.resource_string("static/html/studioview.html")

    def resource_string(self, path):
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    @XBlock.json_handler
    def get_hint(self, data, suffix=''): #get hints into HintsToUse dict, pass on to user
        answer = str(data["submittedanswer"])
        if str(data["submittedanswer"]) == self.correctanswer:
            return{"correct": 1}
        hintsarehere = 0
        self.WrongAnswers.append(str(data["submittedanswer"])) #add user's incorrect answer to WrongAnswers
        for key in self.hints:
            temphints = str(self.hints[str(key)]) #perhaps a better way to do this exists, but for now this works
            if str(key) == str(data["submittedanswer"]):
                print("HI HEllO")
                self.HintsToUse = {}
                self.HintsToUse.update(ast.literal_eval(temphints))
        for key in self.HintsToUse:
            if key not in self.Used:
                 hintsarehere = 1
                 print("hints are here doe")
        if hintsarehere == 0:
            self.HintsToUse.update(self.DefaultHints) #Use DefaultHints if there aren't enough other hints
        if str(data["submittedanswer"]) not in self.hints:
            self.hints[str(data["submittedanswer"])] = {} #add user's incorrect answer to WrongAnswers
            self.HintsToUse = {}
            self.HintsToUse.update(self.DefaultHints)
        if max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0] not in self.Used:
            self.Used.append(max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0]) #Highest rated hint is shown first
            return {'HintsToUse': max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0]}
        else:
            NotUsed = random.choice(self.HintsToUse.keys())
            print(len(self.HintsToUse) + len(self.Used))
            if len(self.HintsToUse) != len(self.Used):
                print(len(self.HintsToUse) + len(self.Used))
                while NotUsed in self.Used:
                    NotUsed = random.choice(self.HintsToUse.keys()) #Choose random hint that hasn't already been Used
            elif len(self.Used) > 0:
                return {'HintsToUse': random.choice(self.HintsToUse.keys())}
            self.Used.append(NotUsed)
            return {'HintsToUse': NotUsed} #note to self dont let python get into endless notused loop
   
    @XBlock.json_handler
    def get_feedback(self, data, suffix=''): #start feedback, sent hint/answer data 
        feedbackdict = {}
        feedbacklist = []
        if len(self.WrongAnswers) == 0:
            return #Do nothing if no mistakes were made
        else:      #lenth of Used will be used to dictate flow of feedback
            for i in range(0, len(self.Used)):
                ans = str('wngans' + str(i))
                hnt = str('hntusd' + str(i))
                feedbackdict[str(self.Used[i])] = str(self.WrongAnswers[i])
                feedbacklist.append(str(self.Used[i]))
                for key in self.hints:
                    if str(key) == str(self.WrongAnswers[i]):
                        if len(self.hints[str(key)]) > 2:
                            thiskeycount = 0
                            while thiskeycount < 2:
                                nextkey = random.choice(self.hints[key].keys())
                                if str(nextkey) not in feedbacklist:
                                    thiskeycount += 1
                                    feedbacklist.append(str(nextkey))
                                    feedbackdict[str(nextkey)] = str(self.WrongAnswers[i])
                            if thiskeycount == 2:
                                    feedbacklist = []
                        else:
                            thiskeycount = 0
                            while thiskeycount < 2:
                                nextkey = random.choice(self.DefaultHints.keys())
                                if str(nextkey) not in feedbacklist:
                                    thiskeycount += 1
                                    feedbacklist.append(str(nextkey))   
                                    feedbackdict[str(nextkey)] = str(self.WrongAnswers[i])
                            if thiskeycount == 2:
                                    feedbacklist = []
                if str(self.WrongAnswers[i]) not in self.hints:
                    feedbackdict[str(random.choice(self.DefaultHints.keys()))] = str(self.WrongAnswers[i])
            print ("feedback : " + str(feedbackdict))
            return feedbackdict
    
    @XBlock.json_handler #add 1 or -1 to rating of a hint
    def rate_hint(self, data, suffix=''):
        for usdkey in self.Used:
            if str(usdkey) == str(data['ansnum']):
                ansnum = self.Used.index(str(data['ansnum']))
                print("ansnum is" +  str(ansnum))
                if self.Voted == 0:
                    for key in self.DefaultHints:	
                        if key == self.Used[int(ansnum)]: #rating for hints in DefaultHints
                            self.DefaultHints[str(key)] += int(data["rating"])
                            self.Voted = 1
                            print str(self.DefaultHints)
                            return
                    for key in self.hints:
                        tempdict = str(self.hints[str(key)]) #rate hint that is in hints 
                        tempdict = (ast.literal_eval(tempdict))
                        if str(key) == str(self.WrongAnswers[ansnum]): #ansnum will the the answer/hint pair that is selected 
                            tempdict[self.Used[int(ansnum)]] += int(data["rating"])
                            self.hints[str(key)] = tempdict
                            print("TESTING AGAIN HI")
                            print("hints are " + str(self.hints[str(key)]))
                            print("otherstuff " + str(self.hints))
                            self.Voted = 1
                            return
        for key in self.hints:
            if str(key) == str(data['value']):
                for nextkey in self.hints[key]:
                    if str(nextkey) == str(data['ansnum']):
                        ansnum = self.hints[str(key)[str(nextkey)]]
                        tempdict = str(self.hints[str(key)]) #rate hint that is in hints 
                        tempdict = (ast.literal_eval(tempdict))
                        tempdict[self.hints[str(key)[ansnum]]] += 1
                        selff.hints[str(key)] = tempdict
                        self.Voted = 1
                        return

    @XBlock.json_handler
    def give_hint(self, data, suffix=''): #add student-made hint into hints
        if self.Voted == 0:
            for key in self.hints:
                print(str(key))
                print("still working here")
                if str(key) == self.WrongAnswers[self.Used.index(str(data['id']))]:
                    if str(data['submission']) not in self.hints[str(key)]:
                        tempdict = str(self.hints[str(key)]) #rate hint that is in hints 
                        tempdict = (ast.literal_eval(tempdict))
                        tempdict.update({data['submission']: 0})
                        self.hints[str(key)] = tempdict
                        self.Voted = 1
                        print("TESTING AGAIN HI")
                        print("hints are " + str(self.hints[str(key)]))
                        print("otherstuff " + str(self.hints))
                    else:
                        ansnum = self.Used.index(data['submission'])
                        for key in self.DefaultHints:	
                            if key == self.Used[int(ansnum)]: #rating for hints in DefaultHints
                                self.DefaultHints[str(key)] += int(1)
                                self.Voted = 1
                                print str(self.DefaultHints)
                                return
                        for key in self.hints:
                            tempdict = str(self.hints[str(key)]) #rate hint that is in hints 
                            tempdict = (ast.literal_eval(tempdict))
                            if str(key) == str(self.WrongAnswers[int(ansnum)]): #ansnum will the the answer/hint pair that is selected 
                                tempdict[self.Used[int(ansnum)]] += int(1)
                                self.hints[str(key)] = tempdict
                                print("TESTING AGAIN HI")
                                print("hints are " + str(self.hints[str(key)]))
                                print("otherstuff " + str(self.hints))
                                self.Voted = 1

    @XBlock.json_handler
    def clear_states(self, data, suffix=''):
        print("used: " + str(self.Used))
        print("wronganswers: " + str(self.WrongAnswers))
        print("hints: " + str(self.hints))
        print("defaults: " + str(self.DefaultHints))
        self.Used = []
        self.HintsToUse = {}
        self.Voted = 0
        self.WrongAnswers = []

    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("CrowdXBlock",
             """<vertical_demo>
                <crowdxblock/>
                </vertical_demo>
             """),
        ]
'''
		print ("answer" + str(data["submittedanswer"]))
   	        for keys in self.hints[key]:
		    print ("other key" + y)
		    self.HintsToUse[keys] = self.hints[key[keys]] #If the user's incorrect answre has precedence in hints, add hints listed under
     		    print("hintstouse: " + str(self.HintsToUse[keys]))'''
