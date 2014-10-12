var repeating = 0;
var repeatcounter = 0;
var canhint = 0;
var issubmitting = 0;
var issubmittinghint = 0;

function CrowdXBlock(runtime, element){
    var isStaff = false;
    $(".HintsToUse", element).text("");
    clearvariables();
    //repeat counter is used to counteract a bug caused by switching units
    //after switching units all logger.listen events would trigger multiple times
    repeatcounter += 1;
    //use to determine whether or not to initialize hint feedback
    var hasReceivedHint = false;

    Logger.listen('seq_next', null, clearingvariables);
    Logger.listen('seq_goto', null, clearingvariables);
    function clearingvariables(event_type, data, element){
        clearvariables(data);
    }

    function clearvariables(data){
        repeating = 0;
    }    

    function logError(details) {
        $.ajax({
            type: 'POST',
            url: '/home/sola/crowdxblock',
            data: JSON.stringify({context: navigator.userAgent, details: details}),
            contentType: 'application/json; charset=utf-8'
        });
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
        }else{
            $('.correct', element).show();
            $('.correct', element).text("You're correct! Please help us improve our hints by voting on them, or submit your own hint!");
            $(".HintsToUse", element).text(" ");
            //send empty data for ajax call because not having a data field causes error
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'is_user_staff'),
                data: JSON.stringify({}),
                success: function(result) {
                    if (result['is_user_staff']) {
                        isStaff = true;
                        $.ajax({
                            type: "POST",
                            url: runtime.handlerUrl(element, 'get_feedback'),
                            data: JSON.stringify({"isStaff":"true"}),
                            success: getFeedback
                        });
                    } else {
                        $.ajax({
                            type: "POST",
                            url: runtime.handlerUrl(element, 'get_feedback'),
                            data: JSON.stringify({"isStaff":"false"}),
                            success: getFeedback
                        });
                    }
                }
            });
        }  
    }

    function seehint(result){
        //show hint to student
        $('.HintsToUse', element).text(result.HintsToUse);
    }
   
    function appendHint(result){
        $(".student_answer", element).each(function(){
            if ($(this).find("span").text() == result.student_answer){
                $(this).append("<div class=\"hint_value\" value = \"" + result.hint_used + "\">" +
                "<div role=\"button\" class=\"upvote_hint\" data-rate=\"1\" data-icon=\"arrow-u\" aria-label=\"upvote\"><b>↑</b></div>" +
                "<div class = \"rating\">" + result.rating + "</div><div class=\"hint_used\">" + ""+result.hint_used+"</div>" +
                "<div role=\"button\" class=\"downvote_hint\" data-rate=\"-1\" aria-label=\"downvote\"><b>↓</b></div> </div>");
            }
        });
    }

    function appendFlagged(result){
        $(".flagged_hints", element).append("<div class=\"hint_value\" value = \"" + result.hint_used + "\">" +
                "<div role=\"button\" class=\"upvote_hint\" data-rate=\"1\" data-icon=\"arrow-u\" aria-label=\"upvote\"><b>↑</b></div>" +
                "<div class = \"rating\">" + result.rating + "</div><div class=\"hint_used\">" + ""+result.hint_used+"</div>" +
                "<div role=\"button\" class=\"downvote_hint\" data-rate=\"-1\" aria-label=\"downvote\"><b>↓</b></div> </div>");
    }


    function getFeedback(result){
        if(isStaff){
            $('.feedback', element).append("<div class=\"flagged_hints\"><span>Flagged</span></div>");
        }
        $.each(result, function(index, value) {
        //data of student answer and hints are stored in the paragraphs/buttons
        //so that when a button is clicked, the answer and hint can be sent to the python script
        student_answer = value;
        hint_used = index;
        //check if div for a student answer already exists (if length = 0, it doesn't)
        if(student_answer != "Flagged"){
            if($(".student_answer", element).find("span").text() != student_answer){
                $('.feedback', element).append("<div class=\"student_answer\"><span>"+student_answer+"</span></div>");
            }
        }
        if(student_answer != "Flagged"){
            $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'get_ratings'),
            data: JSON.stringify({"student_answer": student_answer, "hint_used": hint_used}),
            success: appendHint
            });
        }
        else{
            $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'get_ratings'),
            data: JSON.stringify({"student_answer": student_answer, "hint_used": hint_used}),
            success: appendFlagged
            });
        }
        });
    }

    function show_ratings(result) {
        $.each(result, function(index, value) {
            $("."+index+"rating").append(value + " " + index);
        })
    }

    $(document).on('click', '.submitbutton', function(){ //upvote
        issubmittinghint = 0;
        issubmitting += 1;
        if(issubmitting == repeatcounter){
            id = this.id;
            //the id of the button is "submitbuttonfor"+student_answer
            //slice to determine which answer for which a submission is being made
            //this should be made more dynamic
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

    $(document).on('click', '.upvote_hint', function(){
        used_hint = $(this).parent().find(".hint_used").text();
        student_answer = $(this).parent().parent().find("span").text();
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "used_hint": used_hint, "student_answer": student_answer}),
            success: finish
        });
    })

    $(document).on('click', '.downvote_hint', function(){
        canhint = 0;
        id = this.id;
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "used_hint": $(this).attr('id'), "student_answer": $(this).attr('data-value')}),
            success: finish
        });
    })

    $(document).on('click', '.flag_hint', function(){
        canhint = 0;
        id = this.id;
        $('.hintbutton').each(function(){
            if($(this).attr('id') == String(id)){
                $(this).hide();
            }
        });
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "used_hint": $(this).attr('id'), "student_answer": $(this).attr('data-value')}),
            success: finish
        });
    })


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
