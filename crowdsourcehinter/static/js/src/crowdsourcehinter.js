
function CrowdsourceHinter(runtime, element){
    //executeHinter is used to disable the hinter after switching units in an edX course
    //If the code is not made to stop running, the hinter will act up after switching from and back to
    //a certain unit.
    var executeHinter = true;
    $(".crowdsourcehinter_block", element).hide();

    if(executeHinter){
    var isShowingHintFeedback = false;
    var hinting_element;
    var isStaff = false;
    $(".csh_HintsToUse", element).text("");
    $.ajax({
        type: "POST",
        url: runtime.handlerUrl(element, 'get_element'),
        data: JSON.stringify("helloworld"),
        success: function(result){
            console.log("hinting_element being set", result);
            hinting_element = result;
        }
    });

    function stopScript(){
    //This function is used to prevent a particular instance of the hinter from acting after
    //switching between edX course's units. 
        executeHinter = false;
        console.log("executeHinter set to false");
    }
    Logger.listen('seq_next', null, stopScript);
    Logger.listen('seq_prev', null, stopScript);
    Logger.listen('seq_goto', null, stopScript);

    //data about the problem obtained from Logger.listen('problem_graded') is passed on to the onStudentSubmission.
    //directly passing data to onStudentSubmission does not appear to work
    function get_event_data(event_type, data, element){
        //onStudentSubmission(data);
        console.log("gradedevent listen");
    }
    Logger.listen('problem_graded', hinting_element, function(){console.log("test")});
    Logger.listen('problem_graded', 'i4x://edX/DemoX/problem/Text_Input', function(){console.log("test2")});

    function get_event_data_temp(event_type, data, element){
        console.log("checkevent listen");
        console.log(hinting_element);
        console.log(typeof('i4x://edX/DemoX/problem/Text_Input'));
    }
    Logger.listen('problem_check', null, get_event_data_temp);

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
        $('.csh_HintsToUse', element).attr('student_answer', result.StudentAnswer);
        $('.csh_HintsToUse', element).attr('hint_received', result.HintsToUse);
        $('.csh_HintsToUse', element).text("Hint: " + result.HintsToUse);
        Logger.log('crowd_hinter.seehint', {"student_answer": result.StudentAnswer, "hint_received": result.HintsToUse});

    }

    function showHintFeedback(hint, student_answer){
    //Append answer-specific hints for each student answer during the feedback stage.
    //This appended div includes upvote/downvote/flagging buttons, the hint, and the hint's rating
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

    function showFlaggedFeedback(result){
    //For staff use, shows hints that have been flagged by students and allows for the hints' unflagging/removal.
        var html = "";
        $(function(){
            var template = $('#show_flagged_feedback').html();
            var data = {
                hint: result
            };
            html = Mustache.render(template, data);
        });
        $(".csh_flagged_hints", element).append(html);
    }

    function setStudentAnswers(student_answers){
    //Append divs for each answer the student submitted before correctly answering the question.
    //showHintFeedback appends new hints into these divs.
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
        if(isStaff){
            $('.crowdsourcehinter_block').attr('class', 'crowdsourcehinter_block_is_staff');
            $.each(result, function(index, value) {
                if(value == "Flagged") {
                    //index represents the flagged hint's text
                    showFlaggedFeedback(index);
                }
            });
        }
        if(!isShowingHintFeedback){
            $.each(result, function(index, value) {
              if(value != "Flagged"){
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
                //flagged hints have their corresponding answer set to "Flagged"
                else{
                    showHintFeedback(hint, student_answer);
                }
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
    //Click event to submit a new hint for an answer. 
        if($(this).parent().find('.csh_student_text_input').val() != null){
            var answerdata = unescape($(this).attr('answer'));
            var newhint = unescape($('.csh_student_text_input').val());
            Logger.log('crowd_hinter.submit_new.click.event', {"student_answer": answerdata, "new_hint_submission": newhint});
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
                            success: showHintFeedback(newhint, answerdata)
                        });
                    }
            });
            $(this).parent().find('.csh_student_text_input').remove();
            $(this).remove();
        }
    })

    $(element).on('click', '.csh_rate_hint', function(){
        if ($(this).attr('data-rate') == "flag"){
            alert("This hint has been flagged for review.");
        }
        hint = $('.csh_HintsToUse', element).attr('hint_received');
        student_answer = $('.csh_HintsToUse', element).attr('student_answer');
        Logger.log('crowd_hinter.rate_hint.click.event', {"hint": hint, "student_answer": student_answer, "rating": $(this).attr('data-rate')});
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": $(this).attr('data-rate'), "hint": hint, "student_answer": student_answer}),
            success: console.log($(this).attr('data-rate'))
        });
    });

    $(element).on('click', '.csh_staff_rate', function(){
    //Staff ratings are the removal or unflagging of flagged hints from the database. The attribute 'data-rate' is used
    //to determine whether to unflag or delete the hint.
        hint = $(this).parent().find(".csh_hint").text();
        student_answer = "Flagged";
        Logger.log('crowd_hinter.staff_rate_hint.click.event', {"hint": hint, "student_answer": student_answer, "rating": $(this).attr('data-rate')});
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
