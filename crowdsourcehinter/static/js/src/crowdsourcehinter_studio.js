function CrowdsourceHinterStudio(runtime, element, data){

    //set text area values to be what is currently in the hinter
    $('.csh_initial_hints', element).val(data.initial);
    $('.csh_generic_hints', element).val(data.generic);
    $('.csh_target_problem', element).val(data.target_problem);

    /**
     * Apply settings for initial hints, generic hints, and the element for which the hinter is
     * working.
     */    
    function apply_settings(){ return function(apply_settings_button){
        var initial = $('.csh_initial_hints').val();
        var generic = $('.csh_generic_hints').val();
        var target_problem = $('.csh_target_problem').val();
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'set_initial_settings'),
            data: JSON.stringify({"initial_hints": initial, "generic_hints": generic, "target_problem": target_problem}),
            success: function(result){
                if(result.success){
                    $('.csh_check_success', element).text('hints successfully added to the database');
                } else {
                    $('.csh_check_success', element).text('there was a problem adding your hints to the database. check the format on your hints.');
                }
                Logger.log('crowd_hinter.staff_edit_hinter', {"generic_hints": generic, "initial_hint": initial, "target_problem": target_problem, "successfully_set_hints": result.success});
            }
        });
    }}

    $(element).on('click', '.csh_apply_settings', apply_settings($(this)));
}
