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
    correctanswer = String(default="42", scope=Scope.content)
    hints = Dict(default={"75": {"hint12":10, "hint22":0, "hints32":0}, "1": {"hint1":1, "hint2":1, "hint3":0}, "roflcopter": {"HighFyve":1000}}, scope=Scope.content) #All hints. sorted by type of mistake. type_of_incorrect_answer{"hint":rating, "hint":rating}
    HintsToUse = Dict(default={}, scope=Scope.user_state) #Dict of hints to provide user
    WrongAnswers = List(default=[], scope=Scope.user_state) #List of mistakes made by user
    DefaultHints = Dict(default={"hint": 100, "hinttwo": 10, "hintthree": 0, "hintasdf": 50, "aas;dklfj?": 1000, "SuperDuperBestHint": 10000}, scope=Scope.content) #Default hints in case no incorrect answers in hints match the user's mistake
    Used = List(default=[], scope=Scope.user_state)#List of used hints from HintsToUse
    Voted = Integer(default=0, scope=Scope.user_state)

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
		print("HI HEllO")
		self.HintsToUse = {}
		self.HintsToUse.update(ast.literal_eval(temphints))
		for key in self.HintsToUse:
		    if key not in self.Used:
         		hintsarehere = 1
	if hintsarehere == 0:
	    print("PLSDONTHAPPENDOE")
            self.HintsToUse.update(self.DefaultHints) #Use DefaultHints if there aren't enough other hints
	if str(data["submittedanswer"]) not in self.hints:
	    self.hints[str(data["submittedanswer"])] = {} #add user's incorrect answer to WrongAnswers
	if max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0] not in self.Used:
            self.Used.append(max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0]) #Highest rated hint is shown first
	    return {'HintsToUse': max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0]}
	else:
	    NotUsed = random.choice(self.HintsToUse.keys())
	    if len(NotUsed) != len(self.Used):
   	        while NotUsed in self.Used:
		    NotUsed = random.choice(self.HintsToUse.keys()) #Choose random hint that hasn't already been Used
	    self.Used.append(NotUsed)
	    return {'HintsToUse': NotUsed} #note to self dont let python get into endless notused loop
   
    @XBlock.json_handler
    def get_feedback(self, data, suffix=''): #start feedback, sent hint/answer data 
	feedbackdict = {}
	if len(self.WrongAnswers) == 0:
	    return #Do nothing if no mistakes were made
	else:      #lenth of Used will be used to dictate flow of feedback
	    for i in range(0, len(self.Used)):
		ans = str('wngans' + str(i))
		hnt = str('hntusd' + str(i))
		feedbackdict[ans] = str(self.WrongAnswers[i])
		feedbackdict[hnt] = str(self.Used[i])
	    return feedbackdict
    
    @XBlock.json_handler #add 1 or -1 to rating of a hint
    def rate_hint(self, data, suffix=''):
	if self.Voted == 0:
            for key in self.DefaultHints:	
                if key == self.Used[int(data['ansnum'])]: #rating for hints in DefaultHints
	            self.DefaultHints[str(key)] += int(data["rating"])
		    self.Voted = 1
		    print str(self.DefaultHints)
		    return
            for key in self.hints:
	        tempdict = str(self.hints[str(key)]) #rate hint that is in hints 
	        tempdict = (ast.literal_eval(tempdict))
	        if str(key) == str(self.WrongAnswers[data['ansnum']]): #ansnum will the the answer/hint pair that is selected 
		    tempdict[self.Used[int(data['ansnum'])]] += int(data["rating"])
		    self.hints[str(key)] = tempdict
		    print("TESTING AGAIN HI")
		    print("hints are " + str(self.hints[str(key)]))
		    print("otherstuff " + str(self.hints))
		    self.Voted = 1

    @XBlock.json_handler
    def give_hint(self, data, suffix=''): #add student-made hint into hints
	if self.Voted == 0:
            for key in self.hints:
	        if str(key) == str(self.WrongAnswers[0]):
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
		        self.hints[str(key)[str(data['submission'])]] += 1
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
