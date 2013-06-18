(function($) {
    var defaultHighlighter = $.validator.defaults.highlight, defaultUnhighlighter = $.validator.defaults.unhighlight;
    $.validator.setDefaults({
        highlight: function (element, errorClass, validClass) {
            defaultHighlighter.call(this, element, errorClass, validClass);
            $(element).parents('.control-group').addClass('error');
        },
        unhighlight: function (element, errorClass, validClass) {
            defaultUnhighlighter.call(this, element, errorClass, validClass);
            $(element).parents('.control-group').removeClass('error');
        }
    });
    // override the usual validator number method to allow leading decimal without leading 0
    $.validator.addMethod("number", function (value, element) {
        return this.optional(element) || /^-?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/.test(value);
    }, "Please enter a valid number.");
})(jQuery);