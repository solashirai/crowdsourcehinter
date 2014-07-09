
/*
    function updateCount(result) {
        $('.count', element).text(result.count);
    }
    function checktheanswer(result) {
        // capture the information from server and render your screen to show the submission result
        $('.studentanswer', element).text(result.studentanswer);
    }

    var handlerUrl = runtime.handlerUrl(element, 'increment_count');
    var handlerUrlcheck = runtime.handlerUrl(element, 'checkanswer');

    $('#check').click(function(eventObject) {
	capture what the user types


        $.ajax({
            type: "POST",
            url: handlerUrlcheck,
            data: JSON.stringify({"submittedanswer": $('#answer').val()}),
            success: checktheanswer
        });
        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({"hello": "world"}),  // pass what user types to server
            success: updateCount 
        });
    });
*/

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
    var a = 0 //test
    var howmany = 0.0;
    var whichanswer = 0.0;
    var WrongAnswer = [];
    var HintUsed = [];

    function seehint(result){//use html to show these results somewhere i guess
        $('.HintsToUse', element).text(result.HintsToUse); //text(result.self.hints?)
    }

    function getfeedback(result){
        $('.WrongAnswer0', element).text("For your incorrect answer of: " + result.wngans0);
        $('.HintUsed0', element).text("You recieved the hint: " + result.hntusd0);
        $('.WrongAnswer1', element).text("For your incorrect answer of: " + result.wngans1);
        $('.HintUsed1', element).text("You recieved the hint: " + result.hntusd1);
        $('.WrongAnswer2', element).text("For your incorrect answer of: " + result.wngans2);
        $('.HintUsed2', element).text("You recieved the hint: " + result.hntusd2);
        $('.WrongAnswer3', element).text("For your incorrect answer of: " + result.wngans3);
        $('.HintUsed3', element).text("You recieved the hint: " + result.hntusd3);
	
    }

    function morefeedback(result){
	    if(whichanswer != (howmany - 1)){
		whichanswer += 1;
	    }
	    console.log(howmany);
	    console.log(whichanswer);
	    $('.WrongAnswer', element).text("For your incorrect answer of: " + result.wngans);
	    $('.HintUsed', element).text("You recieved the hint: " + result.hntusd);
	    $('.Thankyou', element).text("Thankyou for your help!");
 	}

    $('#upvote', element).click(function(eventObject) {
	if(whichanswer != howmany){
	$.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"rating": 1, "ansnum": whichanswer}), //return answer data to py /*answers*/
            success: morefeedback
        });} else{
		$('.WrongAnswer', element).text();
		$('.HintUsed', element).text();
		$('.Thankyou', element).text("You're all done.");}
    })
    $('#downvote', element).click(function(eventObject) {
	if(whichanswer != howmany){
	$.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"rating": -1, "ansnum": whichanswer}), //return answer data to py /*answers*/
            success: morefeedback
        });} else{
		$('.WrongAnswer', element).text();
		$('.HintUsed', element).text();
		$('.Thankyou', element).text("You're all done.");}
    })
    $('#submit', element).click(function(eventObject) {
	if(whichanswer != howmany){
	$.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'give_hint'),
            data: JSON.stringify({"submission": $('#answer').val(), "ansnum": whichanswer}), //return answer data to py /*answers*/
            success: morefeedback
        });} else{
		$('.WrongAnswer', element).text();
		$('.HintUsed', element).text();
		$('.Thankyou', element).text("You're all done.");}
    })

    $('p', element).click(function(eventObject) { //for test
      a += 1 
      if (a != 4) { //when answer is incorrect        /*response.search(/class="correct/) === -1*/
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'get_hint'),
            data: JSON.stringify({"submittedanswer": a}), //return student's incorrect answer here
            success: seehint
        });
      } else { //answer is correct
	$('.correct', element).text("You're correct.");
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'get_feedback'),
            data: JSON.stringify({"hello": "world"}), 
            success: getfeedback
        });
      };
    }
)}
