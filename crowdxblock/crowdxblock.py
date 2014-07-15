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
    correctanswer = String(default="2.0", scope=Scope.content) #should be irrelevant for completed version
    hints = Dict(default={"2": {"Keep significant figures in mind.":1, "So close yet so far.":0, "Try adding a .0.":0}, "8.6": {"You might have added all of the horizontal forces together to equal a total of 21 for the horizontal component of this object's force. The two forces are facing opposite direction, so you need to subtract them.":1, "Try 12-9 for the total horizontal force.":0}, "1.2": {"Did you remember to add in the vertical component of force for this object?":0}}, scope=Scope.content)
#All hints. sorted by type of mistake. type_of_incorrect_answer{"hint":rating, "hint":rating}
    HintsToUse = Dict(default={}, scope=Scope.user_state) #Dict of hints to provide user
    WrongAnswers = List(default=[], scope=Scope.user_state) #List of mistakes made by user
    DefaultHints = Dict(default={"Start with the equation F=ma":2, "This object has horizontal and vertical components of force. Solve for the total force in each direction, then compare it to the final acceleration":1, "A small example: If an object has a force of 10N applied to it in an upward direction and it's acceleration is 1m/s^2, the mass of that object is 10.0 kg. F=ma, 10N=m*(1m/s^2), m=10/1, m=10.":1}, scope=Scope.content) #Default hints in case no incorrect answers in hints match the user's mistake
    Used = List(default=[], scope=Scope.user_state)#List of used hints from HintsToUse
    Voted = Integer(default=0, scope=Scope.user_state)#prevent multiple votes/hint submission

    def student_view(self, context=None):
        html = self.resource_string("static/html/crowdxblock.html")
        frag = Fragment(html.format(self=self))
        frag.add_css(self.resource_string("static/css/crowdxblock.css"))
        frag.add_javascript(self.resource_string("static/js/src/crowdxblock.js"))
        frag.initialize_js('CrowdXBlock')
        return frag

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
                self.HintsToUse = {}
                self.HintsToUse.update(ast.literal_eval(temphints))
        for key in self.HintsToUse:
            if key not in self.Used:
                 hintsarehere = 1
        if hintsarehere == 0:
            self.HintsToUse.update(self.DefaultHints) #Use DefaultHints if there aren't enough other hints
        if str(data["submittedanswer"]) not in self.hints:
            self.hints[str(data["submittedanswer"])] = {} #add user's incorrect answer to WrongAnswers
            self.HintsToUse = {}
            self.HintsToUse.update(self.DefaultHints)
        print str(self.hints)
        if max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0] not in self.Used:
            self.Used.append(max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0]) #Highest rated hint is shown first
            return {'HintsToUse': max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0]}
        else:
            NotUsed = random.choice(self.HintsToUse.keys())
            if len(self.HintsToUse) != len(self.Used):
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
        else: #lenth of Used will be used to dictate flow of feedback
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
                                    print(str(nextkey))
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
            print("feedbackdict is: " + str(feedbackdict))
            return feedbackdict
    
    @XBlock.json_handler #add 1 or -1 to rating of a hint
    def rate_hint(self, data, suffix=''):
        data['ansnum'] = data['ansnum'].replace('ddeecciimmaallppooiinntt', '.')
        data['ansnum'] = data['ansnum'].replace('qquueessttiioonnmmaarrkk', '?')
        for usdkey in self.Used:
            if str(usdkey) == str(data['ansnum']):
                ansnum = self.Used.index(str(data['ansnum']))
                if self.Voted == 0:
                    for key in self.DefaultHints:	
                        if key == self.Used[int(ansnum)]: #rating for hints in DefaultHints
                            self.DefaultHints[str(key)] += int(data["rating"])
                            self.Voted = 1
                            return
                    for key in self.hints:
                        tempdict = str(self.hints[str(key)]) #rate hint that is in hints
                        tempdict = (ast.literal_eval(tempdict))
                        if str(key) == str(self.WrongAnswers[ansnum]): #ansnum will the the answer/hint pair that is selected
                            tempdict[self.Used[int(ansnum)]] += int(data["rating"])
                            self.hints[str(key)] = tempdict
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
        data['submission'] = data['submission'].replace('ddeecciimmaallppooiinntt', '.')
        data['id'] = data['id'].replace('ddeecciimmaallppooiinntt', '.')
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
                        print ('this went through fine')
                        return
                    else:
                        ansnum = self.Used.index(data['submission'])
                        for key in self.DefaultHints:	
                            if key == self.Used[int(ansnum)]: #rating for hints in DefaultHints
                                self.DefaultHints[str(key)] += int(1)
                                self.Voted = 1
                                return
                        for key in self.hints:
                            tempdict = str(self.hints[str(key)]) #rate hint that is in hints
                            tempdict = (ast.literal_eval(tempdict))
                            if str(key) == str(self.WrongAnswers[int(ansnum)]): #ansnum will the the answer/hint pair that is selected
                                tempdict[self.Used[int(ansnum)]] += int(1)
                                self.hints[str(key)] = tempdict
                                self.Voted = 1

    @XBlock.json_handler
    def clear_states(self, data, suffix=''):
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
