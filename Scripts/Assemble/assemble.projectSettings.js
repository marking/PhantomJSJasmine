(function ($) {
    var settings = assemble.projectSettings = {};

    settings.View = Backbone.View.extend({
        initialize: function (config) {
            this.pages = {};
            this.activeUsers = config.activeUsers;
            this.inactiveUsers = config.inactiveUsers;
            this.assemblyCodesInfo = config.assemblyCodesInfo;
        },

        events: {
            'click .nav li': 'navToPage'
        },

        render: function () {
            this.setElement($(Handlebars.templates.projectSettings.frame({})));

            this.nav = this.$('.nav');
            this.body = this.$('#project_settings_body');
            $(".explorer-body").append(this.$el.hide());

            return this;
        },

        navToPage: function (event) {
            event.preventDefault();

            assemble.router.navigate("Settings/" + $(event.currentTarget).attr('data-page'), { trigger: true });
        },

        selectPage: function (page) {
            page = page || 'TeamMembers';
            this.nav.find('[data-page="' + page + '"]').radioClass('active');
            this.pages[page] = new settings[page + "View"]({ project: this.model, activeUsers: this.activeUsers, inactiveUsers: this.inactiveUsers, assemblyCodesInfo: this.assemblyCodesInfo });
            this.body.html(this.pages[page].render().$el);
        },

        show: function (page) {
            this.selectPage(page);
            this.$el.show();
            assemble.explorer.view.breadcrumbs.selectSettings(true);
        },

        hide: function () {
            this.$el.hide();
            assemble.explorer.view.breadcrumbs.selectSettings(false);
        },

        unload: function () {

        }
    });

    settings.TeamMembersView = Backbone.View.extend({
        initialize: function (config) {
            this.project = config.project;
            this.collection = config.activeUsers;
            this.inactiveUsers = config.inactiveUsers;
            this.memberViews = {};

            this.collection.on('destroy', this.addUnauthorizedUser, this);
        },

        render: function () {
            this.setElement($(Handlebars.templates.projectSettings.teamMembers({})));
            this.addUserLink = this.$('.add-user');
            this.chooseUser = this.$('.choose-user');

            this.userSelector = new assemble.dropdowns.SelectorListView({
                searchable: true,
                idProperty: 'userId', nameProperty: 'userName',
                collection: this.inactiveUsers,
                defaultText: 'Add a user',
                emptyMessage: "All users have access"
            });
            this.chooseUser.append(this.userSelector.render().$el.css('display', 'inline-block'));
            this.userSelector.on('change', this.create, this);
            this.table = this.$('.table');
            this.addAll();

            return this;
        },

        addAll: function () {
            var self = this;
            this.collection.each(function (item) {
                self.addOne(item);
            });
        },

        addOne: function (item, toTop) {
            var view = this.memberViews[item.userId] = new settings.TeamMemberView({ model: item, project: this.project, collection: this.collection });
            if (toTop) {
                view.render().$el.insertAfter(this.table.find('tr:first'));
            } else {
                this.table.append(view.render().$el);
            }

            return view;
        },

        create: function () {
            var val = parseInt(this.userSelector.val());
            var inactiveUser = _.first(this.userSelector.collection.where({ userId: val }));
            this.userSelector.collection.remove(inactiveUser, { silent: true });
            this.chooseUser.hide();
            this.$('.add-user .loading-message').html('Adding ' + this.userSelector.text() + '&hellip;').show();

            inactiveUser.set({ id: null, roleId: 2 });

            // TODO: finish hooking this up for reals
            // add the access record to the collection here
            // TODO: change this line to be wait: true, so we don't make the change in the UI before we're sure everything is good to go
            // { projectId: this.project.get('id'), userId: val, roleId: 2, userName: this.userSelector.text() }
            var newRecord = this.collection.create(inactiveUser, { wait: false });
            //    after the record is added, insert it into the table using this.addOne(newModel, true);
            //    return should include extra info needed for the model, like user's email address, maybe also the right role if we want to make that decision on the backend
            //    also this change in the collection should rerender the project dashboard table when we get that in there
            this.addOne(newRecord, false).$el.effect("highlight", { color: '#fcf8e3' }, 2000);
            this.resetAdd();
        },

        resetAdd: function () {
            this.chooseUser.show();
            this.userSelector.reset();
            this.$('.add-user .loading-message').hide();
        },

        addUnauthorizedUser: function (user, collection, response) {
            user.set({ id: null, roleId: 2 });
            this.userSelector.addOne(user);
            this.inactiveUsers.add(user);
        },

        show: function () {

        },

        hide: function () {
            console.log("hide");
        },

        unload: function () {

        }
    });

    // show row in table for team member access record
    settings.TeamMemberView = Backbone.View.extend({
        initialize: function (config) {
            this.project = config.project;
            this.model = config.model;
            this.model.bind('destroy', this.unload, this);
        },

        events: {
            'click .remove-me': 'remove'
        },

        render: function () {
            this.setElement($(Handlebars.templates.projectSettings.teamMember(this.model.toJSON())));

            if (this.model.get('isAssembleAdministrator')) {
                // don't show as dropdown selector if can't change
                //   if somehow this can change in the page, we should rerender the entire table row
                this.$('.user-role').html('Project Administrator');
            } else {
                this.roleSelector = new assemble.dropdowns.SelectorListView({
                    collection: [{ id: 1, name: "Project Administrator" }, { id: 2, name: "Team Member"}],
                    defaultText: 'Select one',
                    noValue: ""
                }).render();

                this.roleSelector.select(this.model.get('roleId'));
                this.roleSelector.on('change', this.roleChanged, this);
                this.$('.user-role').html(this.roleSelector.$el);
            }

            return this;
        },

        roleChanged: function (options) {
            this.model.set("roleId", options.id);
            this.model.save();
        },

        remove: function (event) {
            event.preventDefault();
            this.model.destroy();
        },

        unload: function (event) {
            this.$el.fadeOut(1050);
        }
    });

    settings.CodesView = Backbone.View.extend({
        initialize: function (config) {
            this.project = config.project;
            this.assemblyCodesInfo = config.assemblyCodesInfo;
            this.fileLoaded = false;
        },

        events:  {
            'click #ImportAssemblyTree': 'importFile',
            'click #RevertAssemblyTree': 'revertHandler',
            'click #AssemblyCodeFileDownload' : 'downloadHandler'
        },

        render: function () {
            this.loadFile();
            this.filters = assemble.trees.categoriesFactory.get(this.project.id);
            this.setElement($(Handlebars.templates.projectSettings.codes(this.assemblyCodesInfo)));
            this.assemblyTree = new assemble.trees.AssemblyCodeTree({ assemblyList: this.assemblyList, filters: this.filters });
	    this.downloadModal = new assemble.projectSettings.CodesDownloadModal({ project: this.project });
            this.downloadModal = new assemble.projectSettings.CodesDownloadModal({ project: this.project });
            this.assemblyTree.render();
            this.$(".assembly-tree-host").prepend(this.assemblyTree.$el);
            this.setupRevert();
            this.reloadDescription();
            return this;
        },

        downloadHandler: function (evt) {

            if (evt)
                evt.preventDefault();

            this.downloadModal.render();
        },

        setupRevert : function() {
            var $revert = this.$el.find("#RevertAssemblyTree");

            if (this.assemblyCodesInfo.UploadedOn == null) {
                $revert.hide();
            }
            else {
                $revert.show();
            }
        },

        importFile: function () {
            var self = this;
            var importModal = new assemble.projectSettings.CodesUploadModal({ project: this.project, uploadComplete: function () { self.reloadInfo.apply(self); } });
            importModal.show();
        },

        reloadInfo: function() {
            this.reloadFile();          
            this.reloadDescription();
        },

        reloadFile: function () {
            this.fileLoaded = false;
            assemble.details.AssemblyListFactory.flush(this.project.id);
            assemble.trees.categoriesFactory.flush(this.project.id);
            return this.loadFile();
        },

        loadFile: function () {
            if (!this.fileLoaded) {
                this.assemblyList = assemble.details.AssemblyListFactory.get(this.project.id);
                this.filters = assemble.trees.categoriesFactory.get(this.project.id);
                this.assemblyTree = new assemble.trees.AssemblyCodeTree({ assemblyList: this.assemblyList, filters: this.filters });
                this.assemblyTree.render();
                this.$el.find(".assembly-tree-host").empty().prepend(this.assemblyTree.$el);
            }
        },

        reloadDescription: function () {
            var self = this;
            return $.ajax({
                url: assemble.mvcRoutes.assemblyCodeFileInfo({ id: this.project.id }),
                type: 'GET',
                success: function (data) {
                    self.$el.find("#AssemblyFileDescription").html(data.FileDescription);
                    self.assemblyCodesInfo = data;
                    self.setupRevert();
                }
            });
        },

        revertHandler: function (event) {

            if (event)
                event.preventDefault();

            if (confirm("Are you sure you wish to delete the current file and revert to the default?")) {
                this.revert();
            }
        },

        revert: function () {
            var self = this;
            $.ajax({
                url: assemble.mvcRoutes.revertAssemblyCodeFile({ id: this.project.id }),
                type: 'GET',
                success: function () {
                    self.reloadFile();
                    self.reloadDescription();
                }
            });
        },

        show: function (page) {

        },

        hide: function () {

        },

        unload: function () {

        }
    });


    settings.CodesDownloadModal = Backbone.View.extend({
        initialize: function (config) {
            this.project = config.project;
        },

        events: {
            "click .btn-primary" : "downloadClickHandler"
        },

        render: function () {
            this.modal = assemble.modal.create({ id: "codes_download_modal", title: "Export Assembly Codes & Unit Costs", primaryButtonText: "Export" });
            this.setElement(this.modal);
            this.$(".modal-body").append(Handlebars.templates.projectSettings.codesDownloadModal());
            var self = this;
            assemble.help.mainrepository.load(function (helpConfig) {
                self.helpLink = new assemble.help.KeyView({ model: helpConfig, el: self.modal.find(".help-link")[0], key: "14003" });
            });
        },

        downloadClickHandler: function (evt) {
            if (evt) {
                evt.preventDefault();
            }

            this.download();
        },

        download: function() {
            var isExtended = this.$('input[name="DownloadFormat"]:checked').val() == "excel";
            var isExcel = isExtended;
            this.callServerDownload(isExtended, isExcel);
            this.$el.modal("hide");
        },

        callServerDownload: function (isExtended, isExcel) {
            var url = assemble.mvcRoutes.downloadAssemblyCodeFile({ id: this.project.id, includeExtendedProperties: isExtended, inExcelFormat: isExcel });
            window.location.href = url.replace(/&amp;/g, '&');;
        },
    });


    settings.CodesUploadModal = Backbone.View.extend({
        initialize: function (config) {
            this.project = config.project;
            this.rendered = false;
            this.uploadCompleteCallback = config.uploadComplete;
        },

        events: {
            'change input.assembly-file': 'fileChanged',
            'submit form': 'uploading'
        },

        render: function () {
            if (!this.rendered) {
                var self = this;
                this.modal = assemble.modal.create({ id: "codes_upload_modal", title: "Import Assembly Codes", primaryButtonText: "Import" });
                this.setElement(this.modal);
                this.$(".modal-body").append(Handlebars.templates.projectSettings.codesUploadModal());

                this.$form = this.$el.find("#AssemblyFileUploadForm");
                this.$form.attr("target", "AssemblyFileUploadTarget").attr("action", assemble.mvcRoutes.uploadAssemblyCodeFile(this.project.id));
                this.$("input[name='ProjectId']").val(this.project.id);
                this.$(".assembly-code-part").hide();
                this.$(".assembly-code-part-browse").show();
                this.$(".btn-primary").hide();

                var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
                this.$("#chooseFile").toggle(isChrome);
                this.$("#browseFile").toggle(!isChrome);

                assemble.help.mainrepository.load(function (helpConfig) {
                    self.helpLink = new assemble.help.KeyView({ model: helpConfig, el: self.modal.find(".help-link")[0], key: "14003" });
                });

                this.rendered = true;
            }
        },

        fileChanged: function () {
            this.uploading();
            this.$form[0].submit();
            var self = this;
            setTimeout(function () { self.pollResultReturned.apply(self); }, 1000); //IE doesn't handle load event correctly so poll instead
        },

        uploading: function () {
            this.$el.find(".assembly-code-part").hide();
            this.$el.find(".assembly-code-part-uploading").show();
            this.$el.find(".cancel,.close").addClass('invisible');
        },

        pollResultReturned: function () {
            if (this.$el.find("#AssemblyFileUploadTarget").contents().find("#UploadResult").length > 0) {
                this.resultReturned();
            }
            else {
                var self = this;
                setTimeout(function () { self.pollResultReturned.apply(self); }, 1000); //IE doesn't handle load event correctly
            }
        },

        resultReturned: function () {
            var html = this.$el.find("#AssemblyFileUploadTarget").contents().find("#UploadResult").html();

            if (html.indexOf("{") !== -1) {

                try
                {
                    var result = JSON.parse(html);
                }
                catch (ex) {
                    alert(ex);
                }

                this.$el.find(".assembly-code-part").hide();
                this.$el.find(".cancel,.close").removeClass('invisible');

                if (result.success == 'true') {
                    this.$el.find(".assembly-code-part-success").show();
                    this.$el.find(".cancel").html("Close");

                    if (this.uploadCompleteCallback != null) {
                        this.uploadCompleteCallback();
                    }
                }
                else {
                    this.$el.find(".assembly-code-part-error, .assembly-code-part-browse").show();
                }

                this.$el.find("#AssemblyFileUploadTarget").contents().html("");
            }
        },

        show: function () {
            this.render();
            this.modal.modal("show");
        },

        hide: function () {
            this.modal.modal("hide");
        }

    });

} (jQuery));