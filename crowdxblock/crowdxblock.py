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

    hints = Dict(default={"1": {"hint1":10, "hint2":0, "hint3":0, "hint4":0}, "2": {"hint12":10, "hint22":0, "hints32":0}}, scope=Scope.content) #All hints. sorted by type of mistake. type_of_incorrect_answer{"hint":rating, "hint":rating}
    HintsToUse = Dict(default={}, scope=Scope.user_state) #Dict of hints to provide user
    WrongAnswers = List(default=[], scope=Scope.user_state) #List of mistakes made by user
    DefaultHints = Dict(default={"hint": 100, "hinttwo": 10, "hintthree": 0, "hintasdf": 50, "aas;dklfj?": 1000, "SuperDuperBestHint": 10000}, scope=Scope.content) #Default hints in case no incorrect answers in hints match the user's mistake
    Used = List(default=[], scope=Scope.user_state)#List of used hints from HintsToUse

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
	answer = data["submittedanswer"]
	if data["submittedanswer"] not in self.WrongAnswers:
	    self.WrongAnswers.append(data["submittedanswer"]) #add user's incorrect answer to WrongAnswers
	if data["submittedanswer"] not in self.hints:
	    self.hints[data["submittedanswer"]] = {} #add user's incorrect answer to WrongAnswers
        for key in self.hints:
	    try:
    	        print("key" + str(key))
	        temphints = str(self.hints[str(key)[0]]) #perhaps a better way to do this exists, but for now this works
	        if str(key) == str(data["submittedanswer"]):
		    self.HintsToUse = {}
		    self.HintsToUse.update(ast.literal_eval(temphints))
	    except:
		self.HintsToUse = {}
		self.HintsToUse.update(self.DefaultHints)
        if len(self.HintsToUse) <= 2:                         #incorrect answer to HintsToUse
            self.HintsToUse.update(self.DefaultHints) #Use DefaultHints if there aren't enough other hints
	#else:
         #   self.HintsToUse = self.DefaultHints.copy()
	if max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0] not in self.Used:
            self.Used.append(max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0]) #Highest rated hint is shown first
	    print self.HintsToUse
	    return {'HintsToUse': max(self.HintsToUse.iteritems(), key=operator.itemgetter(1))[0]}
	else:
	    NotUsed = random.choice(self.HintsToUse.keys())
	    if len(NotUsed) != len(self.Used):
   	        while NotUsed in self.Used:
		    NotUsed = random.choice(self.HintsToUse.keys()) #Choose random hint that hasn't already been Used
	    self.Used.append(NotUsed)
	    print self.HintsToUse
	    return {'HintsToUse': NotUsed} #note to self dont let python get into endless notused loop
   
    @XBlock.json_handler
    def get_feedback(self, data, suffix=''): #feedback, either rating or making a hint, starts here
	if len(self.WrongAnswers) == 0:
	    return #Do nothing if no mistakes were made
	else:      #lenth of Used will be used to dictate flow of feedback
	    return {'lenused': int(len(self.Used))}
    
    @XBlock.json_handler #add 1 or -1 to rating of a hint
    def rate_hint(self, data, suffix=''):
        for key in self.hints:
	    tempdict = str(self.hints[str(key)[0]]) #rate hint that is in hints 
	    tempdict = (ast.literal_eval(tempdict))
	    if key == self.WrongAnswers[data['ansnum']]: #ansnum will the the answer/hint pair that is selected 
		tempdict[self.Used[data['ansnum']]] += int(data["rating"])
		self.hints[str(key)[0]] = tempdict
        for key in self.DefaultHints:	
            if key == self.Used[data['ansnum']]: #rating for hints in DefaultHints
	        self.DefaultHints[key] += int(data["rating"])
	return {'wngans': self.WrongAnswers[data["ansnum"]], 'hntusd': self.Used[data["ansnum"]]}#

    @XBlock.json_handler
    def get_data(self, data, suffix=''): #pass hint/answer text to js to see in html
	return {'wngans': self.WrongAnswers[data["ansnum"]], 'hntusd': self.Used[data["ansnum"]]}

    @XBlock.json_handler
    def give_hint(self, data, suffix=''): #add student-made hint into hints
	for key in self.hints:
	    if key == self.WrongAnswers[data['ansnum']]:
                for y in self.hints[self.WrongAnswers[data['ansnum']]]:
                    if y == data['submission']: #if the exact hint already exists, +1 rate
	                self.hints[self.WrongAnswers[data['ansnum']][y]] += int(data["rating"])
			return {'wngans': self.WrongAnswers[data["ansnum"]], 'hntusd': self.Used[data["ansnum"]]}
	            else:
                        self.hints[key[data['submission']]] = 0 #add with default rating of 0
                        return {'wngans': self.WrongAnswers[data["ansnum"]], 'hntusd': self.Used[data["ansnum"]]}
	return {'wngans': self.WrongAnswers[data["ansnum"]], 'hntusd': self.Used[data["ansnum"]]}

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
