
//my coding attemps start here i guess
    /*this.url = this.el.data('url');
    Logger.listen('problem_graded', this.el.data('child-id'), this.capture_problem);
    this.render();*/
    /*function capture_problem(event_type, data, element) {
      var answers, response,
        _this = this;
      answers = data[0];
      response = data[1];*/ //use this snippet for actual code? maybe?

function CrowdXBlock(runtime, element){
    var WrongAnswer = [];
    var HintUsed = [];
    $("#pair0").hide();
    $("#pair3").hide();
    $("#pair2").hide();
    $("#pair1").hide();
    $("#answer").hide();
    $(".problem").hide();

    function seehint(result){//use html to show these results somewhere i guess
        $('.HintsToUse', element).text(result.HintsToUse); //text(result.self.hints?)
    }

    function getfeedback(result){
        $("#answer").show();
        $(".problem").show();
	if(result.wngans0 != undefined){
	    $("#pair0").show();
	}if(result.wngans1 != undefined){
	    $("#pair1").show();
	}if(result.wngans2 != undefined){
	    $("#pair2").show();
	}if(result.wngans3 != undefined){
	    $("#pair3").show();
	}
        $('.WrongAnswer0', element).text("For your incorrect answer of: " + result.wngans0);
        $('.HintUsed0', element).text("You recieved the hint: " + result.hntusd0);
        $('.WrongAnswer1', element).text("For your incorrect answer of: " + result.wngans1);
        $('.HintUsed1', element).text("You recieved the hint: " + result.hntusd1);
        $('.WrongAnswer2', element).text("For your incorrect answer of: " + result.wngans2);
        $('.HintUsed2', element).text("You recieved the hint: " + result.hntusd2);
        $('.WrongAnswer3', element).text("For your incorrect answer of: " + result.wngans3);
        $('.HintUsed3', element).text("You recieved the hint: " + result.hntusd3);
	
    }


    $('#pair0', element).click(function(eventObject) { //upvote pair0
	$.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"rating": 1, "ansnum": 0}),
            success: finish
        });})
    $('#pair1', element).click(function(eventObject) { //upvote pair0
	$.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"rating": 1, "ansnum": 1}),
            success: finish
        });})
    $('#pair2', element).click(function(eventObject) { //upvote pair0
	$.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"rating": 1, "ansnum": 2}),
            success: finish
        });})
    $('#pair3', element).click(function(eventObject) { //upvote pair0
	$.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"rating": 1, "ansnum": 3}),
            success: finish
        });})
    $('#submit', element).click(function(eventObject) {
	$.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'give_hint'),
            data: JSON.stringify({"submission": $('#answer').val()}), //give hin for first incorrect answer
            success: finish
        });
	$("#answer").val('');})

    $('#caus', element).click(function(eventObject) {
	console.debug("ca working");
	$.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'clear_states'),
            data: JSON.stringify({"hello": "world"}), //give hin for first incorrect answer
            success: clearstates
        });
	$("#studentsubmit").val('');
	$("#answer").val('');})
    function finish(){
        $("#pair0").hide();
        $("#pair3").hide();
        $("#pair2").hide();
        $("#pair1").hide();
	$('.Thankyou', element).text("Thankyou for your help!");
	$('.correct', element).hide();
    }
    function clearstates(){
	$("#pair0").hide();
        $("#pair3").hide();
        $("#pair2").hide();
        $("#pair1").hide();
        $("#answer").hide();
        $(".problem").hide();
        $('.WrongAnswer0', element).text();
        $('.HintUsed0', element).text();
        $('.WrongAnswer1', element).text();
        $('.HintUsed1', element).text();
        $('.WrongAnswer2', element).text();
        $('.HintUsed2', element).text();
        $('.WrongAnswer3', element).text();
        $('.HintUsed3', element).text();
    }

    function checkreply(result){
	if(result.correct == 1){ 
        console.debug("yay");
	$('.correct', element).text("You're correct! Please choose the best hint, or provide us with one of your own!");
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'get_feedback'),
            data: JSON.stringify({"hello": "world"}), 
            success: getfeedback
        });
        }else{
	console.debug("nay");
	seehint(result)
        }
    }
    $('#studentanswer', element).click(function(eventObject) { //for test //when answer is incorrect        /*response.search(/class="correct/) === -1*/
	console.debug($('#studentsubmit').val()); //currently data is passed to python and then returned whether it is correct or not
        $.ajax({                                  //that probably will be changed once i use response.search or something?
            type: "POST",                         //if/when that is changed, remove checkreply and uncomment the else statement below
            url: runtime.handlerUrl(element, 'get_hint'),
            data: JSON.stringify({"submittedanswer": $('#studentsubmit').val()}), //return student's incorrect answer here
            success: checkreply
        });
        $("#studentsubmit").val('');
     /* } else { //answer is correct
	$('.correct', element).text("You're correct! Please choose the best hint, or provide us with one of your own!");
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'get_feedback'),
            data: JSON.stringify({"hello": "world"}), 
            success: getfeedback
        });
      };*/
    }
)}
