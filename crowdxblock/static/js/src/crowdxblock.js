
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
    $("#answer").hide();
    $(".problem").hide();
    $("#feedback").hide();

    function seehint(result){//use html to show these results somewhere i guess
        $('.HintsToUse', element).text(result.HintsToUse); //text(result.self.hints?)
    }

    function getfeedback(result){
        $("#answer").show();
        $(".problem").show();
        $("#feedback").show();
        $.each(result, function(index, value) {
        valueid = value.replace(/\./g, 'ddeecciimmaallppooiinntt');
        indexid = index.replace(/\./g, 'ddeecciimmaallppooiinntt');
        if($("#submit"+valueid).length == 0){
            $('.hintansarea').append("<p id=\"submit" + valueid + "\" class=\"hintsarea\"> </p>");
            $('#submit'+valueid).append("For your incorrect answer of:" + " " + value + " <p id=\"hintstoshow" + valueid + "\"> The following hints exist: </p><p> <input id=\"" + indexid + "\" type=\"button\" class=\"submitbutton\" value=\"Submit a hint for this problem\">");
            }
          if(indexid.slice(0,22) != "There are no hints for"){
            $('#hintstoshow'+valueid).append("<p>" + index + "<input data-value=\"" + valueid + "\" id=\"" + indexid + "\" type=\"button\" class=\"hintbutton\" value=\"Upvote this Hint\"></p>");
            }else{
              $('#hintstoshow'+valueid).empty();
              $('#hintstoshow'+valueid).append("<p id=\"hintstoshow" + valueid + "\"> No hints exist in the database.</p> <p data-value=\"" + valueid + "\" id=\"" + indexid + "\"</p>");
          }
        });
    }

    $(document).on('click', '.submitbutton', function(){ //upvote
        id = this.id;
        value = document.getElementById(this.id).getAttribute('data-value');
        $(this).hide();
        $('#submit' + value).append("<p><input type=\"text\" name=\"studentinput\" id=\"" + id + "\" class=\"math\" size=\"40\"><<input id=\"submit\" type=\"button\" class=\"button\" value=\"Submit Hint\"> </p>");})
    $(document).on('click', '#submit', function(){
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'give_hint'),
            data: JSON.stringify({"submission": $('.math').val(), "id": $(".math").attr('id')}), //give hin for first incorrect answer
            success: finish
        });
        $("#answer").val('');})

    $(document).on('click', '.hintbutton', function(){ //upvote
        id = this.id;
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"rating": 1, "ansnum": $(this).attr('id'), "value": $(this).attr('data-value')}),
            success: finish
        });})

    $('#caus', element).click(function(eventObject) {
        console.debug("ca working this is edited");
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'clear_states'),
            data: JSON.stringify({"hello": "world"}), //give hin for first incorrect answer
            success: clearstates
        });
        $("#studentsubmit").val('');
        $("#answer").val('');})
    function finish(){
        $('.Thankyou', element).text("Thankyou for your help!");
        $('.correct', element).hide();
        $( ".hintansarea" ).empty();
    }
    function clearstates(){
        $('.Thankyou', element).text();
        $('.correct', element).hide();
        $( ".hintansarea" ).empty();
        $("#answer").hide();
        $(".problem").hide();
    }

    function checkreply(result){

    if(result.correct == 1){
        console.debug("yay");
        $('.correct', element).show();
        $('.correct', element).text("You're correct! Please choose the best hint, or provide us with one of your own!");
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'get_feedback'),
            data: JSON.stringify({"hello": "world"}),
            success: getfeedback
        });
        }else{
        seehint(result)
        }
    }
    $('#studentanswer', element).click(function(eventObject) { //for test //when answer is incorrect /*response.search(/class="correct/) === -1*/
        console.debug($('#studentsubmit').val()); //currently data is passed to python and then returned whether it is correct or not
        $.ajax({ //that probably will be changed once i use response.search or something?
            type: "POST", //if/when that is changed, remove checkreply and uncomment the else statement below
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



