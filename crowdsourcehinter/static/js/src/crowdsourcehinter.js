function CrowdsourceHinter(runtime, element, data){
    //switching units back to a previous question will make a second hinter start up.
    //executeHinter is used to disable the hinter after switching units in an edX course.
    var executeHinter = true;
    $(".crowdsourcehinter_block", element).hide();

    if(executeHinter){
    var isShowingHintFeedback = false;
    var voted = false;
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
    //directly passing data to onStudentSubmission does not appear to work
    function get_event_data(event_type, data, element){
        onStudentSubmission(data);
    }
    Logger.listen('problem_graded', data.hinting_element, get_event_data);

    function onStudentSubmission(problem_graded_event_data){
    //This function will determine whether or not the student correctly answered the question.
    //If it was correctly answered it will begin the process for giving feedback on hints.
        if (problem_graded_event_data[1].search(/class="correct/) === -1){
            $(".crowdsourcehinter_block", element).show();
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'get_hint'),
                data: JSON.stringify({"submittedanswer": unescape(problem_graded_event_data[0])}),
                success: seehint
            });
        }else{
            $('.csh_correct', element).show();
            $(".csh_hint_reveal", element).hide();
            //send empty data for ajax call because not having a data field causes error
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'get_feedback'),
                data: JSON.stringify({}),
                success: getFeedback
            });
        }  
    }

    function seehint(result){
    //Show a hint to the student after an incorrect answer is submitted.
        $('.csh_HintsToUse', element).attr('student_answer', result.StudentAnswer);
        $('.csh_HintsToUse', element).attr('hint_received', result.HintsToUse);
        $('.csh_HintsToUse', element).text("Hint: " + result.HintsToUse);
        Logger.log('crowd_hinter.seehint', {"student_answer": result.StudentAnswer, "hint_received": result.HintsToUse});

    }

    function showHintFeedback(hint, student_answer){
    //Append answer-specific hints for each student answer during the feedback stage.
    //This appended div includes upvote/downvote/reporting buttons, the hint, and the hint's rating
        $(".csh_student_answer", element).each(function(){
            if ($(this).find('.csh_answer_text').attr('answer') == student_answer){
                var html = "";
                $(function(){
                    var data = {
                        hint: hint
                    };
                    html = Mustache.render($("#show_hint_feedback").html(), data);
                });
                $(this).append(html);
                var html = "";
                var template = $('#add_hint_creation').html();
                var data = {};
                html = Mustache.render(template, data);
                $(this).append(html);
            }
        });
    }

    function showReportedFeedback(result){
    //For staff use, shows hints that have been reporteded by students and allows for the hints' unreporting/removal.
        var html = "";
        $(function(){
            var template = $('#show_reported_feedback').html();
            var data = {
                hint: result
            };
            html = Mustache.render(template, data);
        });
        $(".csh_reported_hints", element).append(html);
    }

    function setStudentAnswers(student_answers){
    //Append new divisions into html for each answer the student submitted before correctly 
    //answering the question. showHintFeedback appends new hints into these divs.
    //When the hinter is set to show best, only one div will be created
        var html = "";
        var template = $('#show_answer_feedback').html();
        var data = {
            answer: student_answers
        };
        html = Mustache.render(template, data);
        $(".csh_feedback", element).append(html);
    }

    function getFeedback(result){
    //Set up the student feedback stage. Each student answer and all answer-specific hints for that answer are shown
    //to the student, as well as an option to create a new hint for an answer.
        if(data.isStaff){
            $('.crowdsourcehinter_block', element).attr('class', 'crowdsourcehinter_block_is_staff');
            $.each(result, function(index, value) {
                if(value == "Reported") {
                    //index represents the reported hint's text
                    showReportedFeedback(index);
                }
            });
        }
        if(!isShowingHintFeedback){
            $.each(result, function(index, value) {
              if(value != "Reported"){
                setStudentAnswers(value);
                student_answer = value;
                hint = index;
                //hints return null if no answer-specific hints exist
                if(hint === "null"){
                    $(".csh_student_answer", element).each(function(){
                        if ($(this).find('.csh_answer_text').attr('answer') == student_answer){
                            var html = "";
                            var template = $('#show_no_hints').html();
                            var data = {};
                            html = Mustache.render(template, data);
                            $(this).append(html);
                            var html = "";
                            var template = $('#add_hint_creation').html();
                            var data = {};
                            html = Mustache.render(template, data);
                            $(this).append(html);
                        }
                    });
                }
                //reported hints have their corresponding answer set to "Reported"
                else{
                    showHintFeedback(hint, student_answer);
                }
              }
            });
            isShowingHintFeedback = true;
        }
    }

    $(element).on('click', '.csh_student_hint_creation', function(){
    //create text input area for contributing a new hint
        $('.csh_student_hint_creation', element).each(function(){
            $(this).show();
        });
        $('.csh_student_text_input', element).remove();
        $('.csh_submit_new', element).remove();
        $(this).hide();
        student_answer = $(this).parent().parent().find('.csh_answer_text').attr('answer');
        $(".csh_student_answer", element).each(function(){
            if ($(this).find('.csh_answer_text').attr('answer') == student_answer){
                var html = "";
                $(function(){
                    var template = $('#student_hint_creation').html();
                    var data = {student_answer: student_answer};
                    html = Mustache.render(template, data); 
                });
                $(this).append(html);
            }
        });
    })

    $(element).on('click', '.csh_submit_new', function(){
    //add the newly created hint to the hinter's pool of hints
        if($(this).parent().parent().find('.csh_student_text_input').val().length > 0){
            var answerdata = unescape($(this).attr('answer'));
            var newhint = unescape($('.csh_student_text_input').val());
            $('.csh_submitbutton', element).show();
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'add_new_hint'),
                data: JSON.stringify({"submission": newhint, "answer": answerdata}),
                success: Logger.log('crowd_hinter.submit_new.click.event', {"student_answer": answerdata, "new_hint_submission": newhint})
            });
            $(this).parent().parent().find('.csh_student_text_input').remove();
            $(this).remove();
        }
    })

    $(element).on('click', '.csh_rate_hint', function(){
    //send info to hinter indicating whether the hint was upvoted, downvoted, or reported
    if(!voted || $(this).attr('data-rate')=="report"){
        if ($(this).attr('data-rate') == "report"){
            alert("This hint has been reported for review.");
        }
        hint = $('.csh_HintsToUse', element).attr('hint_received');
        student_answer = $('.csh_HintsToUse', element).attr('student_answer');
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "hint": hint, "student_answer": student_answer}),
            success: Logger.log('crowd_hinter.rate_hint.click.event', {"hint": hint, "student_answer": student_answer, "rating": $(this).attr('data-rate')})
        });
        voted = true;
        }
    });

    function removeFeedback(){
    //remove a hint from the staff feedback area after a staff member has
    //returned the hint to the hint pool or removed it permanently
        $('.csh_hint_value', element).each(function(){
            if($(this).attr('value') == hint){
                $(this).remove();
            }
        });
    }

    $(element).on('click', '.csh_staff_rate', function(){
    //Staff "rating" removes or returns a reported hint from/to the hinter's pool of hints
        hint = $(this).parent().find(".csh_hint").text();
        student_answer = "Reported";
        Logger.log('crowd_hinter.staff_rate_hint.click.event', {"hint": hint, "student_answer": student_answer, "rating": $(this).attr('data-rate')});
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "hint": hint, "student_answer": student_answer}),
            success: removeFeedback()
        });
    })

}}
