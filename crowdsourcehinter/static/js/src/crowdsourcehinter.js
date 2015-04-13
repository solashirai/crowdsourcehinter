function CrowdsourceHinter(runtime, element, data){
    //switching units back to a previous question will make a second hinter start up.
    //executeHinter is used to disable the hinter after switching units in an edX course.
    var executeHinter = true;
    $(".crowdsourcehinter_block", element).hide();

    if(!executeHinter){
        return;
    }

    var isShowingHintFeedback = false;
    var voted = false;
    var correctSubmission = false;

    function stopScript(){
    //This function is used to prevent a particular instance of the hinter from acting after
    //switching between edX course's units. 
        executeHinter = false;
    }
    Logger.listen('seq_next', null, stopScript);
    Logger.listen('seq_prev', null, stopScript);
    Logger.listen('seq_goto', null, stopScript);

    //send student answer data and receive a hint from ajax call.
    //pass data to showHint to actually show hint to student
    function get_hint(data){
        $(".crowdsourcehinter_block", element).show();
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'get_hint'),
            data: JSON.stringify({"submittedanswer": unescape(data[0])}),
            success: showHint
        });
    }

    //first step to starting student feedback for hints
    //this function will be called after student correctly answers question
    function start_feedback(){
        $('.csh_correct', element).show();
        $(".csh_hint_reveal", element).hide();
        //send empty data for ajax call because not having a data field causes error
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'get_feedback'),
            data: JSON.stringify({}),
            success: showStudentContribution
        });
    }

    //This function will determine whether or not the student correctly answered the question.
    //if incorrect, call function to get hint to show to student
    //if correct, call function to start student feedback on hints
    function onStudentSubmission(){ return function(event_type, data, element){
        //search method of correctness of problem is brittle due to checking for a class within
        //the problem block.
        if (data[1].search(/class="correct/) === -1){
            get_hint(data);
        } else { //if the correct answer is submitted
            start_feedback();
        }
    }}
    Logger.listen('problem_graded', data.hinting_element, onStudentSubmission());

    function showHint(result){
    //Show a hint to the student after an incorrect answer is submitted.
        $('.csh_Hints', element).attr('student_answer', result.StudentAnswer);
        $('.csh_Hints', element).attr('hint_received', result.Hints);
        $('.csh_Hints', element).text("Hint: " + result.Hints);
        Logger.log('crowd_hinter.showHint', {"student_answer": result.StudentAnswer, "hint_received": result.Hints});
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

    function showStudentSubmissionHistory(student_answers){
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

    function showStudentContribution(result){
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
                showStudentSubmissionHistory(value);
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

    function create_text_input(){ return function(clicked){
    //create text input area for contributing a new hint
        $('.csh_student_hint_creation', element).each(function(){
            $(clicked.currentTarget).show();
        });
        $('.csh_student_text_input', element).remove();
        $('.csh_submit_new', element).remove();
        $(clicked.currentTarget).hide();
        student_answer = $(clicked.currentTarget).parent().parent().find('.csh_answer_text').attr('answer');
        $(".csh_student_answer", element).each(function(){
            if ($('.csh_answer_text', element).attr('answer') == student_answer){
                var html = "";
                $(function(){
                    var template = $('#student_hint_creation').html();
                    var data = {student_answer: student_answer};
                    html = Mustache.render(template, data); 
                });
                $(this).append(html);
            }
        });
    }}
    $(element).on('click', '.csh_student_hint_creation', create_text_input($(this)));

    function submit_new_hint(){ return function(clicked){
    //add the newly created hint to the hinter's pool of hints
        if($('.csh_student_text_input', element).val().length > 0){
            var answerdata = unescape(clicked.currentTarget.attributes['answer'].value);
            var newhint = unescape($('.csh_student_text_input').val());
            $('.csh_submitbutton', element).show();
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'add_new_hint'),
                data: JSON.stringify({"submission": newhint, "answer": answerdata}),
                success: Logger.log('crowd_hinter.submit_new.click.event', {"student_answer": answerdata, "new_hint_submission": newhint})
            });
            $('.csh_student_text_input', element).remove();
            $(clicked.currentTarget).remove();
        }
    }}
    $(element).on('click', '.csh_submit_new', submit_new_hint($(this)));

    function rate_hint(){ return function(clicked){
    //send info to hinter indicating whether the hint was upvoted, downvoted, or reported
        rating = clicked.currentTarget.attributes['data-rate'].value;
        if(!voted || rating=="report"){
            if (rating == "report"){
                alert("This hint has been reported for review.");
            }
            hint = $('.csh_Hints', element).attr('hint_received');
            student_answer = $('.csh_Hints', element).attr('student_answer');
            $.ajax({
                type: "POST",
                url: runtime.handlerUrl(element, 'rate_hint'),
                data: JSON.stringify({"student_rating": rating, "hint": hint, "student_answer": student_answer}),
                success: Logger.log('crowd_hinter.rate_hint.click.event', {"hint": hint, "student_answer": student_answer, "rating": rating})
            });
            voted = true;
            }
    }}
    $(element).on('click', '.csh_rate_hint', rate_hint($(this)));

    function removeFeedback(){
    //remove a hint from the staff feedback area after a staff member has
    //returned the hint to the hint pool or removed it permanently
        $('.csh_hint_value', element).each(function(){
            if($(this).attr('value') == hint){
                $(this).remove();
            }
        });
    }

    function staff_rate_hint(){ return function(clicked){
    //Staff "rating" removes or returns a reported hint from/to the hinter's pool of hints
        hint = $(clicked.currentTarget).parent().find(".csh_hint").text();
        rating = clicked.currentTarget.attributes['data-rate'].value
        student_answer = "Reported";
        Logger.log('crowd_hinter.staff_rate_hint.click.event', {"hint": hint, "student_answer": student_answer, "rating": rating});
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'rate_hint'),
            data: JSON.stringify({"student_rating": rating, "hint": hint, "student_answer": student_answer}),
            success: removeFeedback()
        });
    }}
    $(element).on('click', '.csh_staff_rate', staff_rate_hint($(this)));

}
