(function ($) {
    var projects = assemble.projects = {};

    projects.Model = Backbone.Model.extend({

    });

    projects.DashboardView = Backbone.View.extend({
        initialize: function (config) {
            this.project = config.project;
            this.projectSettings = config.projectSettings;
        },

        render: function () {
            this.modelsSidebar = new assemble.models.ListView({ el: $('#project_models'), collection: this.project.get('models') });
            this.modelsSidebar.on('select', this.navigateModel, this);
            this.modelsSidebar.render();

            $('#project_dashboard_body').append(Handlebars.templates.projects.gettingStarted({ isProjectAdministrator: assemble.accounts.currentUser.IsProjectAdministrator() }));
            this.teamMembersList = (new projects.TeamMembersView({ collection: this.projectSettings.activeUsers, project: this.project })).render();

            return this;
        },

        hide: function () {
            this.$el.hide();
        },

        show: function () {
            this.$el.show();
        },

        navigateModel: function (model) {
            assemble.router.navigate(encodeURI("Models/" + model.get('id')), { trigger: true });
        }
    });

    projects.TeamMembersView = Backbone.View.extend({

        initialize: function (config) {
            this.project = config.project;
            this.collection = config.collection;
            this.collection.on('add', this.addOne, this);
        },

        events: {
            'click .manage-users': 'manage'
        },

        render: function () {
            this.setElement($(Handlebars.templates.projects.dashboardContainer({ title: 'Team Members' })));
            $('#project_dashboard_body').append(this.$el);

            if (assemble.accounts.currentUser.IsProjectAdministrator(this.project.id))
                this.$('.actions').append('<a href="#" class="manage-users">Manage</a>');

            this.addAll();

            return this;
        },

        addAll: function () {
            var self = this;
            this.collection.each(function (item) {
                self.addOne(item);
            });
        },

        addOne: function (item) {
            var view = new projects.TeamMemberView({ model: item });
            this.$('.list-container').append(view.render().$el);
        },

        manage: function (e) {
            e.preventDefault();
            assemble.router.navigate('Settings/TeamMembers', { trigger: true });
        }

    });

    projects.TeamMemberView = Backbone.View.extend({

        initialize: function () {
            this.model.on('change', this.render, this);
            this.model.on('destroy', this.unload, this);
        },

        render: function () {
            var config = _.extend(this.model.toJSON(), { isAdmin: this.model.get('role') == "Project Administrator" }),
                el = $(Handlebars.templates.projects.teamMemberListItem(config));
            this.$el.replaceWith(el);
            this.setElement(el);
            return this;
        },

        unload: function () {
            this.$el.remove();
        }
    });



    // from here on down is edit, index, and details page js
    // Public Initialize method to be called from view (if necessary)
    // TODO: backbone this stuff, make the event handling better, it really sucks
    projects.initialize = function (action) {
        if (action == "index") {
            setupCards();
        }

        setupColorPicker();
        setupRemoveImage();
        return this;
    };

    var setupCards = function () {
        //card clicking behavior
        $(".create-card").click(function (event) {
            event.stopPropagation();
            event.preventDefault();
            var $this = $(this);
            assemble.modal.show($this.attr('data-url'), this);
        });

        $('.project-card').click(function (event) {
            var target = $(event.target),
                path;

            // if dropdown was clicked don't short-circuit and open project details
            if (target.hasClass('dropdown') || target.parents('.dropdown').length) {
                return;
            }

            path = $(this).attr('data-url');
            if (path) {
                window.location = path;
            }
        });

        $(document).on("click", ".remove-card", function (event) {
            event.preventDefault();
            destroy(this);
        });

        $(document).on("click", ".confirm-remove-card", function (event) {
            event.preventDefault();
            confirmRemove(this);
        });
    };

    var setupRemoveImage = function () {
        $(document).delegate('.remove-image', 'click', function (event) {
            $(this).closest('.existing-image-container').remove();
            $('#IsImageDeleted').val('True');
            event.preventDefault();
        });
    };

    var setupColorPicker = function () {
        $(document).delegate('.color-picker-color', 'click', function (e) {
            e.preventDefault();
            selectColor($(this));
        });

        var selectColor = function (clickedEl) {
            var color = clickedEl.html();
            var $colorPickerElement = clickedEl.parents(".color-picker");

            clickedEl.radioClass('selected');
            $colorPickerElement
                .find(".color-picker-preview")
                    .css('border-left-color', color);
            $colorPickerElement
                .find('.color-picker-value')
                    .val(color);
        };
    };

    var destroy = function (element) {
        var href = element.href;

        $.post(href, {}, function (data, message, response) {
            removeElement(data);
            $(element).parents('.modal').modal('hide');
            assemble.status.update(data.message, data.messageType);
        });
    };

    var confirmRemove = function (element) {
        var name = $(element).parents('.card').find('.project-name').text(),
            url = element.href,
            modal = $(Handlebars.templates.projects.confirmDeleteModal({ name: name, url: url }));

        modal.modal({ backdrop: 'static' })
             .on('hidden', function () { $(this).remove(); });
    };

    // Private method to handle the success of the Ajax call
    var removeElement = function (data) {
        $("#project_" + data.id).fadeOut(700, 'linear', function () {
            $(this).remove();
            if (!$('.card').length) {
                $('.empty-page-message').show();
            }
        });
    };

} (jQuery));