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
    vare = String;
    varet = String;
    vard = String;
    $(".HintsToUse", element).text("Hints are enabled for this problem!");
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
        vare = element;
        varet = event_type;
        vard = data;
        senddata(varet, vard, vare);
        }
    }

    $(document).on('click', '.check.Check', function(){
        repeating = 0;
    });

    function senddata(varet, vard, vare){
        if (vard[1].search(/class="correct/) === -1){
        $.ajax({ //that probably will be changed once i use response.search or something?
            type: "POST", //if/when that is changed, remove checkreply and uncomment the else statement below
            url: runtime.handlerUrl(element, 'get_hint'),
            data: JSON.stringify({"submittedanswer": vard[0]}), //return student's incorrect answer here
            //from vard[1] check id (long thing) and get class (correct or incorrect)
            success: seehint
        });
      }else{
        $('.correct', element).show();
        $('.correct', element).text("You're correct! Please help us improve our hints by voting on them, or submit your own hint!");
        $(".HintsToUse", element).text(" ");
        console.debug("this should also only show up once...");
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
        $('.HintsToUse', element).text("Hint:" + " " + result.HintsToUse); //text(result.self.hints?)
        console.debug('hint:' + ' ' + result.HintsToUse);
    }

    function getfeedback(result){
        $("#answer").show();
        $(".problem").show();
        $("#feedback").show();
        $.each(result, function(index, value) {
        valueid = value.replace(/\./g, 'ddeecciimmaallppooiinntt');
        indexid = index.replace(/\./g, 'ddeecciimmaallppooiinntt');
        valueid = valueid.replace(/\:/g, 'ccoolloonn');
        indexid = indexid.replace(/\:/g, 'ccoolloonn');
        valueid = valueid.replace(/\;/g, 'sseemmiiccoolloonn');
        indexid = indexid.replace(/\;/g, 'sseemmiiccoolloonn');
        valueid = valueid.replace(/\=/g, 'eeqquuaallss');
        indexid = indexid.replace(/\=/g, 'eeqquuaallss');
        if($("#submit"+valueid).length == 0){
            $('.hintansarea').append("<p id=\"submit" + valueid + "\" class=\"hintsarea\"> </p>");
            $('#submit'+valueid).append("<p> </p><b>Incorrect Answer: \b" + " " + value + "<p> <input id=\"submitbuttonfor" + valueid + "\" style=\"float: right; float: top;\" type=\"button\" class=\"submitbutton\" value=\"Submit a hint\"> <p id=\"hintstoshow" + valueid + "\"> <b><u>Hints in the Data Base:</u>\b </p></div>");
            }
          if(indexid.slice(0,22) != "There are no hints for"){
              if($.inArray(index, HintUsed) == -1){
                if($.inArray(index, HintShown) == -1){
                console.log('yis.'); //style=\"float: left;\" 
                $('#hintstoshow'+valueid).append("<p \" id =\"thisparagraph" + indexid + "\">" + "<span style=\"display: inline-block;  \"><input data-value=\"" + valueid + "\" id=\"" + indexid + "\" style=\"width:20px; height:35px;padding-top: 3px;\" type=\"button\" class=\"hintbutton\" data-rate=\"1\" data-icon=\"arrow-u\" value=\"^\"><input data-value=\"" + valueid + "\" id=\"" + indexid + "\" style=\"width:20px; height:35px; padding-top: 3px;\" type=\"button\" class=\"hintbutton\" data-rate=\"-1\" value=\"v\"><input data-value=\"" + valueid + "\" id=\"" + indexid + "\" style=\"width:20px; height:35px;padding-top: 3px;\" type=\"button\" class=\"hintbutton\" data-rate=\"0\" value=\"!\"></span>" + index + "</p>");
                HintShown.push(index);}
              }else{ 
                if($.inArray(index, HintShown) == -1){
                console.log('index is is' + indexid);
                $('#hintstoshow'+valueid).prepend("<p \" id =\"thisparagraph" + indexid + "\">" + "<span style=\"display: inline-block;\"><input data-value=\"" + valueid + "\" id=\"" + indexid + "\" type=\"button\" style=\"padding-top: 3px;width:20px; height:35px;\" class=\"hintbutton\" data-rate=\"1\" value=\"^\"><input data-value=\"" + valueid + "\" id=\"" + indexid + "\" style=\"padding-top: 3px;width:20px; height:35px;\" type=\"button\" class=\"hintbutton\" data-rate=\"-1\" value=\"v\"><input data-value=\"" + valueid + "\" style=\"padding-top: 3px;width:20px; height:35px;\" id=\"" + indexid + "\" type=\"button\" class=\"hintbutton\" data-rate=\"0\" value=\"!\"></span><font color=\"blue\">" + index + "</font></p>");      
                HintShown.push(index);
              }}}else{
              $('#hintstoshow'+valueid).empty();
              console.log('index id is:' + indexid);
              $('#hintstoshow'+valueid).append("<p style = \"color: blue;\" id=\"hintstoshow" + valueid + "\"data-value=\"" + valueid + "\"> <b>No hints exist in the database. (You received a default hint)</p> <p id=\"" + indexid + "\"data-value=\"" + valueid + "\" </p>");
          }
        });
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
          console.log('valueidworks' + valueid);
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

    $(document).on('click', '.hintbutton', function(){ //upvote
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
        console.log(idtouse)
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
            $(this).prepend("<div><p style=\"float: left;\"><b> This hint's rating is:" + " " + " " + hint_rating + "</p></div>");
          }if (hint_rating == "You have already voted on this hint!"){
            $(this).prepend("<div><p style=\"float: left;\"><b> You have already voted on this hint.</p></div>");
          }if (hint_rating == 999){
            $(this).prepend("<div><p style=\"float: left;\"><b><font color=\"red\"> This hint has been flagged for moderation.</font></p></div>");}
        }
        });}
    }
}



