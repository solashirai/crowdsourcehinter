/* Javascript for CrowdXBlock. */
function CrowdXBlock(runtime, element) {
    function Hinter(element) {
      var _this = this;
      this.set_bottom_links = function() {
        return Hinter.prototype.set_bottom_links.apply(_this, arguments);
      };
      this.answer_choice_handle = function(eventObj) {
        return Hinter.prototype.answer_choice_handle.apply(_this, arguments);
      };
      this.wizard_link_handle = function(eventObj) {
        return Hinter.prototype.wizard_link_handle.apply(_this, arguments);
      };
      this.clear_default_text = function(eventObj) {
        return Hinter.prototype.clear_default_text.apply(_this, arguments);
      };
      this.submit_hint = function(eventObj) {
        return Hinter.prototype.submit_hint.apply(_this, arguments);
      };
      this.vote = function(eventObj) {
        return Hinter.prototype.vote.apply(_this, arguments);
      };
      this.expand = function(eventObj) {
        return Hinter.prototype.expand.apply(_this, arguments);
      };
      this.bind = function() {
        return Hinter.prototype.bind.apply(_this, arguments);
      };
      this.capture_problem = function(event_type, data, element) {
        return Hinter.prototype.capture_problem.apply(_this, arguments);
      };
      this.el = $(element).find('.crowdsource-wrapper');
      this.url = this.el.data('url');
      Logger.listen('problem_graded', this.el.data('child-id'), this.capture_problem);
      this.render();
    }
    
    Hinter.prototype.capture_problem = function(event_type, data, element) {
      var answers, response,
        _this = this;
      answers = data[0];
      response = data[1];
      if (response.search(/class="correct/) === -1) {
        return $.postWithPrefix("" + this.url + "/get_hint", answers, function(response) {
          return _this.render(response.contents);
        });
      } else {
        return $.postWithPrefix("" + this.url + "/get_feedback", answers, function(response) {
          return _this.render(response.contents);
        });
      }
    };

    Hinter.prototype.$ = function(selector) {
      return $(selector, this.el);
    };

    Hinter.prototype.bind = function() {
      this.$('input.vote').click(this.vote);
      this.$('input.submit-hint').click(this.submit_hint);
      this.$('.custom-hint').click(this.clear_default_text);
      this.$('.expand').click(this.expand);
      this.$('.wizard-link').click(this.wizard_link_handle);
      return this.$('.answer-choice').click(this.answer_choice_handle);
    };

    Hinter.prototype.expand = function(eventObj) {
      var target;
      target = this.$('#' + this.$(eventObj.currentTarget).data('target'));
      if (this.$(target).css('crowdxblock') === 'none') {
        this.$(target).css('crowdxblock', 'block');
      } else {
        this.$(target).css('crowdxblock', 'none');
      }
      return this.set_bottom_links();
    };

    Hinter.prototype.submit_hint = function(eventObj) {
      var post_json, textarea,
        _this = this;
      textarea = $('.custom-hint');f
      if (this.answer === '') {
        return;
      }
      post_json = {
        'answer': this.answer,
        'hint': textarea.val()
      };

var post_json = {}
post_json['answer'] = this.answer;
post_json[]
JSON.stringify(post_json)
      return $.postWithPrefix("" + this.url + "/submit_hint", post_json, function(response) {
        return _this.render(response.contents);
      });
    };
/*        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({"hello": "world"}),
            success: updateCount
        });*/


    Hinter.prototype.clear_default_text = function(eventObj) {
      var target;
      target = this.$(eventObj.currentTarget);
      if (target.data('cleared') === void 0) {
        target.val('');
        return target.data('cleared', true);
      }
    };

    Hinter.prototype.wizard_link_handle = function(eventObj) {
      var target;
      target = this.$(eventObj.currentTarget);
      return this.go_to(target.attr('dest'));
    };

    Hinter.prototype.answer_choice_handle = function(eventObj) {
      this.answer = this.$(eventObj.target).attr('value');
      this.$('#blank-answer').html(this.answer);
      return this.go_to('p3');
    };

    Hinter.prototype.set_bottom_links = function() {
      var viewbox_height;
      this.$('.bottom').css('margin-top', '0px');
      viewbox_height = parseInt(this.$('.wizard-viewbox').css('height'), 10);
      return this.$('.bottom').each(function(index, obj) {
        var view_height;
        view_height = parseInt($(obj).parent().css('height'), 10);
        return $(obj).css('margin-top', (viewbox_height - view_height) + 'px');
      });
    };

    Hinter.prototype.render = function(content) {
      var hints_exist, styles,
        _this = this;
      if (content) {
        content = content.trim();
      }
      if (content) {
        this.el.html(content);
        this.el.show();
        JavascriptLoader.executeModuleScripts(this.el, function() {
          return _this.bind();
        });
        this.$('#previous-answer-0').css('crowdxblock', 'inline');
      } else {
        this.el.hide();
      }
      this.answer = '';
      styles = document.body.style;
      if (styles.WebkitTransform === '' || styles.transform === '') {
        this.go_to = this.transform_go_to;
      } else {
        this.go_to = this.legacy_go_to;
      }
      hints_exist = this.$('#hints-exist').html() === 'True';
      if (hints_exist) {
        return this.go_to('p1');
      } else {
        return this.go_to('p2');
      }
    };

    Hinter.prototype.transform_go_to = function(view_id) {
      var id_to_index, translate_string;
      id_to_index = {
        'p1': 0,
        'p2': 1,
        'p3': 2
      };
      translate_string = 'translateX(' + id_to_index[view_id] * -1 * parseInt($('#' + view_id).css('width'), 10) + 'px)';
      this.$('.wizard-container').css('transform', translate_string);
      this.$('.wizard-container').css('-webkit-transform', translate_string);
      return this.set_bottom_links();
    };

    Hinter.prototype.legacy_go_to = function(view_id) {
      this.$('.wizard-view').css('display', 'none');
      this.$('#' + view_id).css('display', 'block');
      return this.set_bottom_links();
    };

    return Hinter;

  })();

}).call(this);


/*
    function updateCount(result) {
        $('.count', element).text(result.count);
    }
    function checktheanswer(result) {
        // capture the information from server and render your screen to show the submission result
        $('.studentanswer', element).text(result.studentanswer);
    }

    var handlerUrl = runtime.handlerUrl(element, 'increment_count');
    var handlerUrlcheck = runtime.handlerUrl(element, 'checkanswer');

    $('#check').click(function(eventObject) {
	capture what the user types


        $.ajax({
            type: "POST",
            url: handlerUrlcheck,
            data: JSON.stringify({"submittedanswer": $('#answer').val()}),
            success: checktheanswer
        });
        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({"hello": "world"}),  // pass what user types to server
            success: updateCount 
        });
    });
*/
