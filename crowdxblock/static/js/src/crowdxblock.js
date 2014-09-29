var repeating = 0;
var repeatcounter = 0;
var canhint = 0;
var issubmitting = 0;
var issubmittinghint = 0;

function CrowdXBlock(runtime, element){
    $(".HintsToUse", element).text("");
    clearvariables();
    //repeat counter is used to counteract a bug caused by switching units
    //after switching units all logger.listen events would trigger multiple times
    repeatcounter += 1;
    //use to determine whether or not to initialize hint feedback
    var hasReceivedHint = false;
    var is_staff = false;

    var check_staff = $('#staffstatus').val();
    if(check_staff == 'staff view');
    {
        console.log(check_staff);
        console.log("is_staff");
        is_staff = true;
    }

    Logger.listen('seq_next', null, clearingvariables);
    Logger.listen('seq_goto', null, clearingvariables);
    function clearingvariables(event_type, data, element){
        clearvariables(data);
    }

    function clearvariables(data){
        repeating = 0;
    }    

    Logger.listen('problem_graded', null, get_event_data);

    //read the data from the problem_graded event here
    function get_event_data(event_type, data, element){
        repeating += 1;
        if(repeating != repeatcounter){
        console.debug(repeating);
        }else{
        check_correct(event_type, data, element);
        }
    }

    $(document).on('click', '.check.Check', function(){
        repeating = 0;
    });

    function check_correct(var_event_type, var_data, var_element){
        //check that problem wasn't correctly answered
        if (var_data[1].search(/class="correct/) === -1){
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'get_hint'),
                data: JSON.stringify({"submittedanswer": var_data[0]}),
                success: seehint
            });
            hasReceivedHint = true;
        }else if(hasReceivedHint == true){
            $('.correct', element).show();
            $('.correct', element).text("You're correct! Please help us improve our hints by voting on them, or submit your own hint!");
            $(".HintsToUse", element).text(" ");
            //send empty data for ajax call because not having a data field causes error
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'get_feedback'),
                data: JSON.stringify(""),
                success: getFeedback
            });
        }else{
            $(".HintsToUse", element).text("");
        }    
    }

    function seehint(result){
        //show hint to student
        $('.HintsToUse', element).text(result.HintsToUse);
    }

    function getFeedback(result){
        $.each(result, function(index, value) {
        //data of student answer and hints are stored in the paragraphs/buttons
        //so that when a button is clicked, the answer and hint can be sent to the python script
        student_answer = value;
        hint_used = index;
        if($(".submit"+student_answer).length == 0){
            $('.feedback', element).append("<p class=\"submit" + student_answer + "\"</p>");
            $(".submit"+student_answer, element).append("<b>Answer-specific hints for \b" + " " + student_answer + "<p><input id=\"submitbuttonfor" + student_answer + "\" style=\"float: right; float: top;\" type=\"button\" class=\"submitbutton\" value=\"Submit a hint\"><p class=\"showHintsFor" + student_answer + "\"> </p></div>");
        }
        if(hint_used.slice(0,22) != "There are no hints for"){
            $('.showHintsFor'+student_answer, element).append(
                "<p \" class =\"votingFor" + hint_used + "\">" +
                "<div data-value=\"" + student_answer + "\" id=\"" + hint_used +"\" role=\"button\" class=\"upvote_hint\"" +
                    "data-rate=\"1\" data-icon=\"arrow-u\" aria-label=\"upvote\"><b>↑</b></div>" +
                "<div class = \"" + hint_used + "rating\">" + hint_used + "</div>" +
                "<div data-value=\"" + student_answer + "\" id=\"" + hint_used + "\" role=\"button\" class=\"downvote_hint\"" +
                    "data-rate=\"-1\" aria-label=\"downvote\"><b>↓</b>" +
                "</div> </p>");
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'get_ratings'),
                data: JSON.stringify({"student_answer": student_answer, "hint_used": hint_used}),
                success: show_ratings
            });
        }else{
            $('.showHintsFor'+student_answer).empty();
            $('.showHintsFor'+student_answer).append("<p class=\".showHintsFor" + student_answer + "\"data-value=\"" + student_answer + "\"> <b>No hints exist in the database. (You received a default hint)</p> <p id=\"" + hint_used + "\"data-value=\"" + student_answer + "\" </p>");
        }
        });
    }

    function show_ratings(result) {
        $.each(result, function(index, value) {
            console.log(index);
            console.log(value);
            $("."+index+"rating").append(value + " " + index);
        })
    }

    $(document).on('click', '.submitbutton', function(){ //upvote
        issubmittinghint = 0;
        issubmitting += 1;
        if(issubmitting == repeatcounter){
            id = this.id;
            id = id.slice(15);
            //value = document.getElementById(id).getAttribute('data-value');
            $('.submitbutton').show();
            $('.math').remove();
            $('#submit').remove();
            $(this).hide();
            $('.showHintsFor'+id, element).prepend("<p><input type=\"text\" name=\"studentinput\" id=\"" + id + "\" class=\"math\" size=\"40\"><input id=\"submit\" type=\"button\" data-is=\"" + id + "\" class=\"button\" value=\"Submit Hint\"> </p>");
        }
    })

    $(document).on('click', '#submit', function(){
        issubmittinghint += 1;
        if(issubmittinghint == repeatcounter){
        if($('.math').val() != null){
            var answerdata = String;
            issubmitting = 0;
            $('#submit').each(function(){
                answerdata = $('.math').attr('id');
            });
            $('.submitbutton').show();
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'give_hint'),
                data: JSON.stringify({"submission": $('.math').val(), "answer": answerdata}), //give hin for first incorrect answer
                //success: finish
            });
            $("#answer").val('');
            $(this).remove();
            $('.math').remove();
            document.getElementById("submitbuttonfor" + answerdata).remove();
            $('#submitbuttonfor' + answerdata).remove();
            $('#'+answerdata).remove();
            $('#submit'+answerdata).prepend('Thankyou for your hint!');
            }
        }
    })

    $(document).on('click', '.upvote_hint', function(){ //upvote
        canhint = 0;
        id = this.id;
        $(this).hide();
        $('.hintbutton').each(function(){
          if($(this).attr('id') == String(id)){
            $(this).hide();}
        });
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "used_hint": $(this).attr('id'), "student_answer": $(this).attr('data-value')}),
            success: finish
        });})

    $(document).on('click', '.downvote_hint', function(){ //upvote
        canhint = 0;
        id = this.id;
        $(this).hide();
        $('.hintbutton').each(function(){
          if($(this).attr('id') == String(id)){
            $(this).hide();}
        });
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "used_hint": $(this).attr('id'), "student_answer": $(this).attr('data-value')}),
            success: finish
        });})

    $(document).on('click', '.flag_hint', function(){ //upvote
        canhint = 0;
        id = this.id;
        $(this).hide();
        $('.hintbutton').each(function(){
          if($(this).attr('id') == String(id)){
            $(this).hide();}
        });
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "used_hint": $(this).attr('id'), "student_answer": $(this).attr('data-value')}),
            success: finish
        });})


    function finish(result){
        if(canhint == 0){
        canhint = 1;
        $('.Thankyou', element).text("Thankyou for your help!");
        idtouse = String('votingFor' + result.used_hint);
        hint_rating = result.rating;
        if(result.rating == "zzeerroo"){
            hint_rating = 0;
        }if(result.rating == "thiswasflagged"){
            hint_rating = 999;
        }
        $('p').each(function(){
          if($(this).attr('id') == idtouse){
            if(hint_rating != "You have already voted on this hint!" && hint_rating != 999){
          $.ajax({
              type: "POST",
              url: runtime.handlerUrl(element, 'get_ratings'),
              data: JSON.stringify({"student_answer": student_answer, "hint_used": hint_used}),
              success: show_ratings
          });
          }if (hint_rating == "You have already voted on this hint!"){
            $(this).prepend("<div><p style=\"float: left;\"><b> You have already voted on this hint.</p></div>");
          }if (hint_rating == 999){
            $(this).prepend("<div><p style=\"float: left;\"><b><font color=\"red\"> This hint has been flagged for moderation.</font></p></div>");}
        }
        });}
    }


    $.ajax({
        type: "POST",
        url: runtime.handlerUrl(element, 'studiodata'),
        data: JSON.stringify(""),
        success: studiodata
    });

    function studiodata(result){
        if($(".xblock-editor").length != 0){
            $.each(result, function(index, value) {
                $('.xblock-editor').append("<p id=\"" + value + "\"> The hint<b>" + " " + index + " " + "</b>was flagged for the submission<b>" + " " + value + "</b></p>");
                $('#'+value).prepend("<input data-value=\"" + value + "\" id=\"" + index + "\" style=\"height:35px;padding-top: 3px;\" type=\"button\" class=\"flagbutton\" data-rate=\"dismiss\" value=\"Dismiss Hint\"><input data-value=\"" + value + "\" id=\"" + index + "\" style=\"height:35px; padding-top: 3px;\" type=\"button\" class=\"flagbutton\" data-rate=\"purge\" value=\"Purge Hint\">");
            });
        }
    }

    $(document).on('click', '.flagbutton', function(){
        answer_wrong = $(this).attr('id');
        hint = $(this).attr('data-value');
        rating = $(this).attr('data-rate');
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'moderate_hint'),
            data: JSON.stringify({"answer_wrong":answer_wrong, "hint": hint, "rating":rating}),
       });
    });
}
