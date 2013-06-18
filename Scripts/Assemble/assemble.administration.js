// Extend the existing assemble javascript "namespace" ...
(function (assemble, $, undefined) {
    var administration = { };

    administration.testEmailSettings = function (event) {
        event.preventDefault();
        var $status = $("#test_email_results"),
            $button = $(this),
            $form = $button.parents('form');

        // don't test the email settings if they're not even valid!
        if (!$form.valid()) { return; }

        $button.attr("disabled", true);

        $.post($button.attr('data-url'),
            { data: $button.parents('form').serialize() },
            function (data, textStatus, jqXHR) {
                $status.html(assemble.messaging.createMessage(data));
                $button.attr("disabled", false);
            }
        );
    };

    assemble.administration = administration;
} (window.assemble = window.assemble || {}, jQuery));