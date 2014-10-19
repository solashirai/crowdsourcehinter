var canhint = 0;

function CrowdXBlock(runtime, element){
    var isStaff = false;
    $(".HintsToUse", element).text("");
    //use to determine whether or not to initialize hint feedback
    var hasReceivedHint = false;

    Logger.listen('seq_next', null, stopScript);
    Logger.listen('seq_goto', null, stopScript);
    //stop this script if units are switched to prevent data errors/duplication
    function stopScript(event_type, data, element){
        return;
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
        check_correct(event_type, data, element);
    }

    function check_correct(var_event_type, var_data, var_element){
        //check that problem wasn't correctly answered
        if (var_data[1].search(/class="correct/) === -1){
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'get_hint'),
                data: JSON.stringify({"submittedanswer": unescape(var_data[0])}),
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
                $(this).append(unescape("<div class=\"hint_value\" value = \"" + result.hint_used + "\">" +
                "<div role=\"button\" class=\"rate_hint\" data-rate=\"1\" data-icon=\"arrow-u\" aria-label=\"upvote\"><b>↑</b></div>" +
                "<div class = \"rating\">" + result.rating + "</div><div class=\"hint_used\">" + ""+result.hint_used+"</div>" +
                "<div role=\"button\" class=\"rate_hint\" data-rate=\"-1\" aria-label=\"downvote\"><b>↓</b></div> </div>"));
            }
        });
    }

    function appendFlagged(result){
        $(".flagged_hints", element).append("<div class=\"hint_value\" value = \"" + result.hint_used + "\">" +
                "<div role=\"button\" class=\"staff_rate\" data-rate=\"2\" aria-label=\"unflag\"><b>O</b></div>" +
                "<div class=\"hint_used\">" + ""+result.hint_used+"</div>" +
                "<div role=\"button\" class=\"staff_rate\" data-rate=\"-2\" aria-label=\"remove\"><b>X</b></div> </div>");
    }

    function getFeedback(result){
        console.log("feedback");
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
            if($('.student_answer', element).length == 0){
                $('.feedback', element).append("<div class=\"student_answer\"><span><b>"+student_answer+"</b></span>"+
                    "<div><input type =\"button\" class=\"student_hint_creation\" value=\"Submit a new hint for this answer.\" </input></div></div>");
            }
            else {
                //cycle through each .student_answer to check if this answer has been accounted for
                answerShown = false;
                $(".student_answer", element).each(function(){
                    if($(this).find("span").text() == student_answer){
                        answerShown = true;
                    }
                });
                if (answerShown == false){
                    $('.feedback', element).append("<div class=\"student_answer\"><span><b>"+student_answer+"</b></span>"+
                    "<div><input type =\"button\" class=\"student_hint_creation\"value=\"Submit a new hint for this answer.\" </input></div></div>");
                }
            }
        }
        //check first part of the hint to see if a hint was actually used
        if(hint_used.substring(0, 22) == "There are no hints for"){
            $(".student_answer", element).each(function(){
                if ($(this).find("span").text() == student_answer){
                    $(this).append("<div class=\"hint_value\" value=\"There are no answer-specific hints for this answer.\"></div>");
                }
            });
        }
        else if(student_answer != "Flagged"){
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

    $(document).on('click', '.student_hint_creation', function(){
        $('.math').remove();
        $('.submit_new').remove();
        student_answer = $(this).parent().parent().find("span").text();
        $(".student_answer", element).each(function(){
            if ($(this).find("span").text() == student_answer){
                $(this).prepend("<p><input type=\"text\" name=\"studentinput\" class=\"math\" size=\"40\"><input id=\""+student_answer+"\" type=\"button\" class=\"submit_new\" value=\"Submit Hint\"> </p>");
            }
        });
    })

    $(document).on('click', '.submit_new', function(){
        if($(this).parent().find('.math').val() != null){
            var answerdata = unescape($(this).attr('id'));
            var newhint = unescape($('.math').val());
            $('.submitbutton').show();
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'give_hint'),
                data: JSON.stringify({"submission": newhint, "answer": answerdata}), //give hin for first incorrect answer
                //success: finish
            });
            $(this).parent('p').remove();
            //$('.math').remove();
            }
    })

    $(document).on('click', '.rate_hint', function(){
        used_hint = $(this).parent().find(".hint_used").text();
        student_answer = $(this).parent().parent().find("span").text();
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "used_hint": used_hint, "student_answer": student_answer}),
            success: function (result){
                    if(result.rating != "voted"){
                        $(".hint_used", element).each(function(){
                            if ($(this).parent().find(".hint_used").text() == used_hint && $(this).parent().parent().find("span").text() == student_answer){
                                $(this).parent().find('.rating').text(result.rating);
                            }
                    })
                }
            }
        });
    })

    $(document).on('click', '.staff_rate', function(){
        used_hint = $(this).parent().find(".hint_used").text();
        student_answer = $(this).parent().parent().find("span").text();
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "used_hint": used_hint, "student_answer": student_answer}),
            success: function (result){
                    $('.hint_value', element).each(function(){
                        if($(this).attr('value') == used_hint){
                            $(this).remove();
                        }
                    });
            }
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
