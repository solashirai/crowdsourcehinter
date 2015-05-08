function CrowdsourceHinterStudio(runtime, element, data){
/**
    //:TODO for self, figure out why Mustache isn't working (anonymous funciton (what?) Mustache Not Defined (why?))
    //Initialize html with current generic hints, initial hints, and problem element
    //var showSettingsUX = $(Mustache.render($('#show_settings_UX').html(), {generic: data.generic, initial: data.initial,  problem_element: data.problem_element}));
    //$('.crowdsourcehinter_edit_block', element).append(showSettingsUX);
**/
    //set text area values to be what is currently in the hinter. to be replaced by above code.
    $('.csh_initial_hints', element).val(data.initial);
    $('.csh_generic_hints', element).val(data.generic);
    $('.csh_hinting_element', element).val(data.element);

    /**
     * Apply settings for initial hints, generic hints, and the element for which the hinter is
     * working.
     */    
    function apply_settings(){ return function(apply_settings_button){
        var initial = unescape($('.csh_initial_hints').val());
        var generic = unescape($('.csh_generic_hints').val());
        var hinting_element = unescape($('.csh_hinting_element').val());
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'set_initial_settings'),
            data: JSON.stringify({"initial_hints": initial, "generic_hints": generic, "element": hinting_element}),
            success: function(){
                console.log("success");
            }
        });
    }}

    $(element).on('click', '.csh_apply_settings', apply_settings($(this)));
}
