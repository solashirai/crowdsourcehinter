function CrowdXBlock(runtime, element){
    //use executionFunctions to prevent old initializations of hinter from working after switching units
    var executeFunctions = true;
    if(executeFunctions){

    var isStaff = false;
    $(".HintsToUse", element).text("");

    function stopScript(){
        executionFunctions = false;
    }
    Logger.listen('seq_next', null, stopScript);
    Logger.listen('seq_prev', null, stopScript);
    Logger.listen('seq_goto', null, stopScript);

    function logError(details) {
        $.ajax({
            type: 'POST',
            url: '/home/sola/crowdxblock',
            data: JSON.stringify({context: navigator.userAgent, details: details}),
            contentType: 'application/json; charset=utf-8'
        });
    }

    //read the data from the problem_graded event here
    function get_event_data(event_type, data, element){
        check_correct(event_type, data, element);
    }
    Logger.listen('problem_graded', null, get_event_data);

    function check_correct(var_event_type, var_data, var_element){
        //check that problem wasn't correctly answered
        if (var_data[1].search(/class="correct/) === -1){
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'get_hint'),
                data: JSON.stringify({"submittedanswer": unescape(var_data[0])}),
                success: seehint
            });
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
                "<div> <d1 role=\"button\" class=\"rate_hint\" data-rate=\"upvote\" data-icon=\"arrow-u\" aria-label=\"upvote\"><b>↑</b></d1>" +
                "<d2 role=\"button\" class=\"rate_hint\" data-rate=\"flag\" data-icon=\"flag\" aria-label=\"flag\"><b>!</b></d2></div>"+
                "<div><d3 class = \"rating\">" + result.rating + "</d3>"+
                "<d4 class=\"hint_used\">" + ""+result.hint_used+"</d4></div>" +
                "<div> <d5 role=\"button\" class=\"rate_hint\" data-rate=\"downvote\" aria-label=\"downvote\"><b>↓</b></div> </d5></div>"));
            }
        });
    }

    //appendFlagged is only for staff - shows all hints that are flagged
    function appendFlagged(result){
        $(".flagged_hints", element).append("<div class=\"hint_value\" value = \"" + result.hint_used + "\">" +
                "<div role=\"button\" class=\"staff_rate\" data-rate=\"unflag\" aria-label=\"unflag\"><b>O</b></div>" +
                "<div class=\"hint_used\">" + ""+result.hint_used+"</div>" +
                "<div role=\"button\" class=\"staff_rate\" data-rate=\"remove\" aria-label=\"remove\"><b>X</b></div> </div>");
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
        //check if <div> for a student answer already exists, if not create the first one
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
        //if an answer doesn't have any hints to display, "There are no hints for"+student_answer is received
        //as the hint. use substring to determine if that is the case.
        if(hint_used.substring(0, 22) == "There are no hints for"){
            $(".student_answer", element).each(function(){
                if ($(this).find("span").text() == student_answer){
                    $(this).append("<div class=\"hint_value\" value=\"There are no answer-specific hints for this answer.\"></div>");
                }
            });
        }
        //flagged hints have their corresponding answer set to "Flagged"
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
        //remove all other hint inputs and replace
        $('.math').remove();
        $('.submit_new').remove();
        student_answer = $(this).parent().parent().find("span").text();
        $(".student_answer", element).each(function(){
            if ($(this).find("span").text() == student_answer){
                $(this).append("<p><input type=\"text\" name=\"studentinput\" class=\"math\" size=\"40\"><input id=\""+student_answer+"\" type=\"button\" class=\"submit_new\" value=\"Submit Hint\"> </p>");
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
                data: JSON.stringify({"submission": newhint, "answer": answerdata}),
            });
            $(this).parent('p').remove();
        }
    })

    $(document).on('click', '.rate_hint', function(){
        used_hint = $(this).parent().find(".hint_used").text();
        student_answer = $(this).parent().parent().find("span").text();
        Logger.log('rate_hint.click.event', {"used_hint": used_hint, "student_answer": student_answer, "rating": $(this).attr('data-rate')});
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "used_hint": used_hint, "student_answer": student_answer}),
            success: function (result){
                    if(result.rating == "flagged"){
                        console.log("flagged");
                        $(this).parent().hide();
                        $(this).parent().remove();
                    }
                    else if(result.rating != "voted"){
                        $(".hint_used", element).each(function(){
                            if ($(this).parent().find(".hint_used").text() == used_hint && $(this).parent().parent().find("span").text() == student_answer){
                                $(this).parent().find('.rating').text(result.rating);
                            }
                    })
                }
            }
        });
    })

    //staff ratings are the removal or unflagging of flagged hints from the database
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
}}
