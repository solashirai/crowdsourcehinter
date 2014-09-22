var repeating = 0;
var repeatcounter = 0;
var canhint = 0;
var issubmitting = 0;
var issubmittinghint = 0;

function CrowdXBlock(runtime, element){
    var WrongAnswer = [];
    var HintUsed = [];
    var HintShown = [];
    $("#answer").hide();
    $(".problem").hide();
    $("#feedback").hide();
    var_element = String;
    var_event_type = String;
    var_data = String;
    //$(".HintsToUse", element).text("Hints are enabled for this problem!");
    clearvariables();
    repeatcounter += 1;
    console.debug(repeatcounter);

    Logger.listen('seq_next', null, clearingvariables);
    Logger.listen('seq_goto', null, clearingvariables);
    function clearingvariables(event_type, data, element){
        clearvariables(data);
    }

    function clearvariables(data){
        HintUsed = [];
        WrongAnswer = [];
        repeating = 0;
    }    

    Logger.listen('problem_graded', null, dostuff);
    function dostuff(event_type, data, element){
        repeating += 1;
        if(repeating != repeatcounter){
        console.debug(repeating);
        }else{
        $("#studentsubmit").val('');
        var_element = element;
        var_event_type = event_type;
        var_data = data;
        senddata(var_event_type, var_data, var_element);
        }
    }

    $(document).on('click', '.check.Check', function(){
        repeating = 0;
    });

    function senddata(var_event_type, var_data, var_element){
        if (var_data[1].search(/class="correct/) === -1){
        $.ajax({ //that probably will be changed once i use response.search or something?
            type: "POST", //if/when that is changed, remove checkreply and uncomment the else statement below
            url: runtime.handlerUrl(element, 'get_hint'),
            data: JSON.stringify({"submittedanswer": var_data[0]}), //return student's incorrect answer here
            //from var_data[1] check id (long thing) and get class (correct or incorrect)
            success: seehint
        });
      }else{
        $('.correct', element).show();
        $('.correct', element).text("You're correct! Please help us improve our hints by voting on them, or submit your own hint!");
        $(".HintsToUse", element).text(" ");
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'get_feedback'),
            data: JSON.stringify({"hello": "world"}),
            success: getfeedback
        });}
        }

     $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'studiodata'),
            data: JSON.stringify({"hello": "world"}),
            success: studiodata
       });

    function studiodata(result){
      $(".xblock-editor").append("confirm_working");
      if($(".xblock-editor").length != 0){
        $.each(result, function(index, value) {
          console.debug(index);
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

    function seehint(result){//use html to show these results somewhere i guess
        console.debug('seehint');
        HintUsed.push(result.HintsToUse);
        $('.HintsToUse', element).text(result.HintsToUse);
    }

    function getfeedback(result){
        $("#answer").show();
        $(".problem").show();
        $("#feedback").show();
        $.each(result, function(index, value) {
        student_answer = value.replace(/\./g, 'ddeecciimmaallppooiinntt');
        hint_used = index.replace(/\./g, 'ddeecciimmaallppooiinntt');
        student_answer = student_answer.replace(/\:/g, 'ccoolloonn');
        hint_used = hint_used.replace(/\:/g, 'ccoolloonn');
        student_answer = student_answer.replace(/\;/g, 'sseemmiiccoolloonn');
        hint_used = hint_used.replace(/\;/g, 'sseemmiiccoolloonn');
        student_answer = student_answer.replace(/\=/g, 'eeqquuaallss');
        hint_used = hint_used.replace(/\=/g, 'eeqquuaallss');
        if($("#submit"+student_answer).length == 0){
            $('.hintansarea').append("<p id=\"submit" + student_answer + "\" class=\"hintsarea\"> </p>");
            $('#submit'+student_answer).append("<p> </p><b>Answer-specific hints for \b" + " " + student_answer + "<p> <p id=\"hintstoshow" + student_answer + "\"> </p></div>");
            }
          if(hint_used.slice(0,22) != "There are no hints for"){
            $('#hintstoshow'+student_answer).append("<p \" id =\"thisparagraph" + hint_used + "\">" + "<div data-value=\"" + student_answer + "\" id=\"" + hint_used + "\" role=\"button\" class=\"upvote_hint\" data-rate=\"1\" data-icon=\"arrow-u\"  aria-label=\"upvote\"><b>↑</b></div><div class = \"" + hint_used + "rating\">" + hint_used + "</div> <div data-value=\"" + student_answer + "\" id=\"" + hint_used + "\" role=\"button\" class=\"downvote_hint\" data-rate=\"-1\" aria-label=\"downvote\"><b>↓</b></div> </p>");
          //<div data-value=\"" + student_answer + "\" id=\"" + hint_used + "\" role=\"button\" class=\"flag_hint\" data-rate=\"0\" aria-label=\"report\"><b>!</b></div>
          $.ajax({
              type: "POST",
              url: runtime.handlerUrl(element, 'get_ratings'),
              data: JSON.stringify({"student_answer": student_answer, "hint_used": hint_used}),
              success: show_ratings
          });
            HintShown.push(index);
          }else{
              $('#hintstoshow'+student_answer).empty();
              $('#hintstoshow'+student_answer).append("<p id=\"hintstoshow" + student_answer + "\"data-value=\"" + student_answer + "\"> <b>No hints exist in the database. (You received a default hint)</p> <p id=\"" + hint_used + "\"data-value=\"" + student_answer + "\" </p>");
          }
        });
    }

    function show_ratings(result) {
        $.each(result, function(index, value) {
        $("."+index+"rating").prepend(value + " ");})
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
        $('#hintstoshow' + id).prepend("<p><input type=\"text\" name=\"studentinput\" id=\"" + id + "\" class=\"math\" size=\"40\"><input id=\"submit\" type=\"button\" data-is=\"" + id + "\" class=\"button\" value=\"Submit Hint\"> </p>");
    }})

    $(document).on('click', '#submit', function(){
        issubmittinghint += 1;
        if(issubmittinghint == repeatcounter){
        if($('.math').val() != null){
          var answerdata = String;
          var valueid = String;
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
          //data_value = document.getElementById(valueid).getAttribute('data-value');
           data_value = String('hintstoshow' + answerdata);
          $(this).remove();
          $('.math').remove();
          document.getElementById("submitbuttonfor" + answerdata).remove();
          $('#submitbuttonfor' + answerdata).remove();
          $('#'+answerdata).remove();
          //value = document.getElementById(id).getAttribute('data-value');
          //$('#hintstoshow' + value).prepend("<p> Thankyou! </p>");
          $('#submit'+answerdata).prepend('Thankyou for your hint!');
        }}})

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
        idtouse = String('thisparagraph' + result.used_hint);
        hint_rating = result.rating;
        if(result.rating == "zzeerroo"){
            hint_rating = 0;
        }if(result.rating == "thiswasflagged"){
            hint_rating = 999;
        }
        //idtouse = idtouse.replace('ddeecciimmaallppooiinntt', /\./g);
        //idtouse = idtouse.replace('ccoolloonn', /\:/g);
        //idtouse = idtouse.replace('sseemmiiccoolloonn', /\;/g);
        //idtouse = idtouse.replace('eeqquuaallss', /\=/g);
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
}



