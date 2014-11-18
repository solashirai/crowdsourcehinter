function CrowdsourceHinter(runtime, element){
    //executeHinter is used to disable the hinter after switching units in an edX course
    //If the code is not made to stop running, the hinter will act up after switching from and back to
    //a certain unit.
    var executeHinter = true;

    if(executeHinter){
    var isShowingHintFeedback = false;
    var isStaff = false;
    $(".csh_HintsToUse", element).text("");

    function stopScript(){
    //This function is used to prevent a particular instance of the hinter from acting after
    //switching between edX course's units. 
        executeHinter = false;
    }
    Logger.listen('seq_next', null, stopScript);
    Logger.listen('seq_prev', null, stopScript);
    Logger.listen('seq_goto', null, stopScript);

    //data about the problem obtained from Logger.listen('problem_graded') is passed on to the onStudentSubmission.
    //directly passing data to onStudentSubmission does not work for unknown reasons (to be fixed?)
    function get_event_data(event_type, data, element){
        onStudentSubmission(data);
    }
    Logger.listen('problem_graded', null, get_event_data);

    function onStudentSubmission(problem_graded_event_data){
    //This function will determine whether or not the student correctly answered the question.
    //If it was correctly answered it will begin the process for giving feedback on hints.
        if (problem_graded_event_data[1].search(/class="correct/) === -1){
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'get_hint'),
                data: JSON.stringify({"submittedanswer": unescape(problem_graded_event_data[0])}),
                success: seehint
            });
        }else{
            $('.csh_correct', element).show();
            $('.csh_correct', element).text("You're correct! Please help us improve our hints by voting on them, or submit your own hint!");
            $(".csh_HintsToUse", element).text(" ");
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
    //Show a hint to the student after an incorrect answer is submitted.
        $('.csh_HintsToUse', element).text(result.HintsToUse);
    }

    function showHintFeedback(result){
    //Append answer-specific hints for each student answer during the feedback stage.
    //This appended div includes upvote/downvote/flagging buttons, the hint, and the hint's rating
        $(".csh_student_answer", element).each(function(){
            if ($(this).find("span").text() == result.student_answer){
                var html = "";
                $(function(){
                    var data = {
                        hint: result.hint,
                        rating: result.rating
                    };
                    html = Mustache.render($("#show_hint_feedback").html(), data);
                });
                $(this).append(html);
            }
        });
    }

    function showFlaggedFeedback(result){
    //For staff use, shows hints that have been flagged by students and allows for the hints' unflagging/removal.
        var html = "";
        $(function(){
            var template = $('#show_flagged_feedback').html();
            var data = {
                hint: result.hint
            };
            html = Mustache.render(template, data);
            console.log(html);
        });
        $(".csh_flagged_hints", element).append(html);
    }

    function setStudentAnswers(student_answers){
    //Append divs for each answer the student submitted before correctly answering the question.
    //showHintFeedback appends new hints into these divs.
        for(var i = 0; i < student_answers.length; i++){
            var html = "";
            $(function(){
                var template = $('#show_answer_feedback').html();
                var data = {
                    answer: student_answers[i]
                };
                html = Mustache.render(template, data); 
            });
            $(".csh_feedback", element).append(html);
        }
    }

    function getFeedback(result){
    //Set up the student feedback stage. Each student answer and all answer-specific hints for that answer are shown
    //to the student, as well as an option to create a new hint for an answer.
        if(isStaff){
            $('.crowdsourcehinter_block').attr('class', 'crowdsourcehinter_block_is_staff');
        }
        if(!isShowingHintFeedback){
            var student_answers = [];
            $.each(result, function(index, value) {
                answer = value;
                if($.inArray(answer, student_answers) === -1 && answer != "Flagged"){
                    student_answers.push(answer);
                }
            });
            setStudentAnswers(student_answers);
            $.each(result, function(index, value) {
                student_answer = value;
                hint = index;
                //hints return null if no answer-specific hints exist
                if(hint === "null"){
                    $(".csh_student_answer", element).each(function(){
                        if ($(this).find("span").text() == student_answer){
                            $(this).append("<div class=\"csh_hint_value\" value=\"There are no answer-specific hints for this answer.\"></div>");
                        }
                    });
                }
                //flagged hints have their corresponding answer set to "Flagged"
                else if(student_answer != "Flagged"){
                    $.ajax({
                        type: "POST",
                        url: runtime.handlerUrl(element, 'get_ratings'),
                        data: JSON.stringify({"student_answer": student_answer, "hint": hint}),
                        success: showHintFeedback
                    });
                }
                else{
                    $.ajax({
                        type: "POST",
                        url: runtime.handlerUrl(element, 'get_ratings'),
                        data: JSON.stringify({"student_answer": student_answer, "hint": hint}),
                        success: showFlaggedFeedback
                    });
                }
            });
            isShowingHintFeedback = true;
        }
    }
    
    $(element).on('click', '.csh_student_hint_creation', function(){
    //Click event for the creation of a new hint. This button will bring up the text input.
        $('.csh_student_hint_creation').each(function(){
            $(this).show();
        });
        $('.csh_student_text_input').remove();
        $('.csh_submit_new').remove();
        $(this).hide();
        student_answer = $(this).parent().parent().find("span").text();
        $(".csh_student_answer", element).each(function(){
            if ($(this).find("span").text() == student_answer){
                $(this).append("<p><input type=\"text\" name=\"studentinput\" class=\"csh_student_text_input\" size=\"40\"><input answer=\""+student_answer+"\" type=\"button\" class=\"csh_submit_new\" value=\"Submit Hint\"> </p>");
            }
        });
    })

    $(element).on('click', '.csh_submit_new', function(){
    //Click event to submit a new hint for an answer. 
        if($(this).parent().find('.csh_student_text_input').val() != null){
            var answerdata = unescape($(this).attr('answer'));
            var newhint = unescape($('.csh_student_text_input').val());
            Logger.log('submit_new.click.event', {"student_answer": answerdata, "new_hint_submission": newhint});
            $('.csh_submitbutton').show();
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'give_hint'),
                data: JSON.stringify({"submission": newhint, "answer": answerdata}),
                success: function(result){
                        $.ajax({
                            type: "POST",
                            url: runtime.handlerUrl(element, 'get_ratings'),
                            data: JSON.stringify({"student_answer": answerdata, "hint": newhint}),
                            success: showHintFeedback
                        });
                    }
            });
            $(this).parent().find('.csh_student_text_input').remove();
            $(this).remove();
        }
    })

    $(element).on('click', '.csh_rate_hint', function(){
    //Click event to change the rating/flag a hint. The attribute 'data-rate' within each .rate_hint button is used
    //to determine whether the student is upvoting, downvoting, or flagging the hint. 
        hint = $(this).parent().find(".csh_hint").text();
        student_answer = $(this).parent().parent().find("span").text();
        Logger.log('crowd_hinter.rate_hint.click.event', {"hint": hint, "student_answer": student_answer, "rating": $(this).attr('data-rate')});
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "hint": hint, "student_answer": student_answer}),
            success: function (result){
                    if(result.rating == "flagged"){
                        $(this).parent().hide();
                        $(this).parent().remove();
                    }
                    else if(result.rating != "voted"){
                        $(".csh_hint", element).each(function(){
                            if ($(this).parent().find(".csh_hint").text() == hint && $(this).parent().parent().find("span").text() == student_answer){
                                $(this).parent().find('.csh_rating').text(result.rating);
                            }
                    })
                }
            }
        });
    })

    $(element).on('click', '.csh_staff_rate', function(){
    //Staff ratings are the removal or unflagging of flagged hints from the database. The attribute 'data-rate' is used
    //to determine whether to unflag or delete the hint.
        hint = $(this).parent().find(".csh_hint").text();
        student_answer = $(this).parent().parent().find("span").text();
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "hint": hint, "student_answer": student_answer}),
            success: function (result){
                    $('.csh_hint_value', element).each(function(){
                        if($(this).attr('value') == hint){
                            $(this).remove();
                        }
                    });
            }
        });
    })
}}
