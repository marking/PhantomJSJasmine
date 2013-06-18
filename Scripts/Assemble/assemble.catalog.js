(function ($) {

    var catalog = {};
    assemble.catalog = catalog;

    catalog.EstimateWindow = Backbone.View.extend({
        initialize: function (config) {
            this.modelVersion = config.modelVersion;
        },

        render: function () {
            var self = this;
            this.modal = assemble.modal.create({ id: "estimate_window_modal", title: "Create or Update Estimate", primaryButtonText: "Create Estimate" });
            this.setElement(this.modal);
            var data = this.modelVersion.attributes;
            this.$el.find(".modal-body").append(Handlebars.templates.catalog.estimateWindow(data));
            this.$("#estimate_window_content_audit").html(Handlebars.templates.catalog.estimateWindowAudit(data));
            this.$el.append(Handlebars.templates.details.loadMask({ message: "Estimating..." }));
            this.$(".load-mask").hide();
            this.$("#estimate_window_audit_history").hide();
            this.$("#estimate_window_content_success").hide();
            this.$("#estimate_window_content_error").hide();
            this.$("#estimate_window_remaining_area").hide();

            assemble.help.mainrepository.load(function (helpConfig) {
                self.helpLink = new assemble.help.KeyView({ model: helpConfig, el: self.modal.find(".help-link")[0], key: "14002" });
            });
        },

        events: {
            'click .btn-primary': 'estimateButtonHandler',
            'click #show_estimate_window_audit_history': 'showAuditHandler',
            'click #estimate_window_project_settings': 'settingsHandler'
        },

        settingsHandler: function() {
            this.modal.modal('hide');
        },

        showAuditHandler: function (evt) {
            if (evt)
                evt.preventDefault();

            this.showAudit();
        },

        showAudit: function() {
            this.$("#estimate_window_audit_history").toggle('fast');
            var $button = this.$('#show_estimate_window_audit_history');

            if ($button.html() == "see all")
                $button.html("hide all");
            else
                $button.html("see all");
        },

        estimateButtonHandler: function (evt) {
            if (evt)
                evt.preventDefault();

            this.estimate();
        },

        estimate: function () {
            var self = this;
            self.trigger("estimate:start");
            this.$(".load-mask").show();
            this.$(".btn-primary").hide();
            $.ajax({
                type: 'POST',
                url: assemble.mvcRoutes.estimate(),
                data: {
                    id: this.modelVersion.get("id"),
                    overwrite: this.$('input[name="EstimateType"]:checked').val() == 'overwrite'
                },
                success: function (result) {
                    self.trigger("estimate:complete");
                    self.$("#estimate_window_content_instructions").hide();
                    self.$("#estimate_window_content_success").show();
                    self.$(".load-mask").hide();
                    self.$("a.cancel").html("Close");

                    if (result.data) {
                        if (result.data.length > 0) {
                            self.$("#estimate_window_remaining_area").show();
                            var dataHtml = _.reduce(result.data, function (memo, line) { return '<div class="truncate">' + memo + line + '</div>'; }, '');
                            self.$("#estimate_window_remaining").html(dataHtml);
                        }
                        else {
                            self.$("#estimate_window_remaining_area").hide();
                        }
                    }

                    $.ajax({
                        type: 'GET',
                        url: assemble.mvcRoutes.modelVersionDetails({ id: self.modelVersion.get("id") }),
                        success: function (data) {
                            self.modelVersion.set(data);
                            self.$("#estimate_window_content_audit").html(Handlebars.templates.catalog.estimateWindowAudit(data));
                            self.$("#estimate_window_audit_history").hide();
                        }
                    });
                },
                error: function (response) {
                    self.$("#estimate_window_content_instructions").hide();
                    self.$("#estimate_window_content_error").show();
                    self.$("a.cancel").html("Close");
                    self.$(".load-mask").hide();
                }
            });
        },
    });
})(jQuery);