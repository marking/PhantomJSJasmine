describe("assemble.groupBy", function () {

    beforeEach(function () {
        Handlebars.templates.groupBy = { deleteModal: function () { return $('<div class="modal"><div class="modal-footer"><a class="remove-groupby">Yes, delete</a></div></div>')[0]; } };
    });

    afterEach(function () {
        delete Handlebars.templates.groupBy;
    });

    var chooserHtml = '<div id="chooser" class="group-by-chooser">' +
        '<ul id="group_by_list" class="scroll-at-large group-by-list">' +
            '</ul>' +
            '<ul class="actions">' +
                '<li><a href="#" id="create_group_by" class="create-group-by" data-help-key="10002"><i class="icon-plus"></i> Create&hellip;</a></li>' +
                '<li><a href="#" id="edit_current_group_by" class="edit-group-by" data-help-key="10004"><i class="icon-pencil"></i> Edit Level&hellip;</a></li>' +
                '<li><a href="#" id="delete_current_group_by" class="confirm-remove-groupby delete-group-by" data-confirm-modal="delete_groupby_modal"><i class="icon-remove"></i> Delete Level&hellip;</a></li>' +
            '</ul>' +
        '</div>';



    describe("chooser", function () {

        describe("initialize", function () {

            it("properties", function () {
                var $chooserDom = $(chooserHtml);
                $("body").append($chooserDom);
                var config = { element: ".group-by-chooser" };
                var view = new assemble.groupBy.chooserView(config);
                expect(view.config).toBeNotNull();
                expect(view.config).toEqual(config);
                $chooserDom.remove();
            });

            it("from class selector", function () {
                var $chooserDom = $(chooserHtml);
                $("body").append($chooserDom);
                var view = new assemble.groupBy.chooserView({ element: ".group-by-chooser" });
                expect(view.el).toBeNotNull();
                expect(view.$el).toBeNotNull();
                expect(view.el).toBe(view.$el[0]);
                $chooserDom.remove();
            });

            it("from id", function () {
                var $chooserDom = $(chooserHtml);
                $("body").append($chooserDom);
                var view = new assemble.groupBy.chooserView({ element: "#chooser" });
                expect(view.el).toBeNotNull();
                expect(view.$el).toBeNotNull();
                expect(view.el).toBe(view.$el[0]);
                $chooserDom.remove();
            });

            it("from jquery", function () {
                var $chooserDom = $(chooserHtml);
                var view = new assemble.groupBy.chooserView({ element: $chooserDom });
                expect(view.el).toBeNotNull();
                expect(view.$el).toBeNotNull();
                expect(view.el).toBe(view.$el[0]);
            });

            it("from element", function () {
                var chooserDom = $(chooserHtml)[0];
                var view = new assemble.groupBy.chooserView({ element: chooserDom });
                expect(view.el).toBeNotNull();
                expect(view.$el).toBeNotNull();
                expect(view.el).toBe(view.$el[0]);
            });

            it("sets primary DOM properties", function () {
                var $chooserDom = $(chooserHtml);
                var view = new assemble.groupBy.chooserView({ element: $chooserDom });
                expect(view.groupByDropDownList).toBeNotNull();
                expect(view.createGroupByButton).toBeNotNull();
                expect(view.editGroupByButton).toBeNotNull();
                expect(view.deleteGroupByButton).toBeNotNull();
            });
        });

        it("createGroupByButton click instantiates createGroupByView", function () {
            assemble.mvcRoutes = {};
            assemble.mvcRoutes.groupByCreate = function () { return ""; };
            var modalShowStub = sinon.stub(assemble.modal, "show", function () { });
            var $chooserDom = $(chooserHtml);
            var view = new assemble.groupBy.chooserView({ element: $chooserDom });
            window.event = { preventDefault: function () { } };
            view.createGroupByButton.click();
            expect(view.currentCreateGroupByView).toBeNotNull();
            expect(view.currentCreateGroupByView).toBeInstanceOf(assemble.groupBy.createGroupByView);
            window.event = undefined;
            assemble.modal.show.restore();
        });

        it("editGroupByButton click instantiates editGroupByView", function () {
            assemble.mvcRoutes = {};
            assemble.mvcRoutes.groupByEdit = function () { return ""; };
            var modalShowStub = sinon.stub(assemble.modal, "show", function () { });
            var $chooserDom = $(chooserHtml);
            var view = new assemble.groupBy.chooserView({ element: $chooserDom });
            window.event = { preventDefault: function () { } };
            view.editGroupByButton.click();
            expect(view.currentEditGroupByView).toBeNotNull();
            expect(view.currentEditGroupByView).toBeInstanceOf(assemble.groupBy.editGroupByView);
            window.event = undefined;
            assemble.modal.show.restore();
        });

        it("deleteGroupByButton click instantiates deleteGroupByView", function () {
            var $chooserDom = $(chooserHtml);
            var view = new assemble.groupBy.chooserView({ element: $chooserDom });
            Handlebars.templates.groupBy = { deleteModal: function () { return $("<div></div>")[0]; } };
            var fetchMock = sinon.stub(view, "fetch", function () {
                this.groupBys = [{ Id: '99', Name: "NinetyNine", AllowEditing: true}];
            });
            view.render({ selectedGrouping: 99 });
            view.$el.find("a[data-id='99']").click();
            window.event = { preventDefault: function () { } };
            view.deleteGroupByButton.click();
            expect(view.currentDeleteGroupByView).toBeNotNull();
            expect(view.currentDeleteGroupByView).toBeInstanceOf(assemble.groupBy.deleteGroupByView);
            expect(view.currentDeleteGroupByView.config.name).toEqual("NinetyNine");
            expect(view.currentDeleteGroupByView.config.id).toEqual("99");
            window.event = undefined;
            $chooserDom.remove();
        });

        describe("render", function () {

            it("fetches", function () {
                var $chooserDom = $(chooserHtml);
                $("body").append($chooserDom);
                var config = { element: ".group-by-chooser" };
                var view = new assemble.groupBy.chooserView(config);
                var fetchMock = sinon.mock(view).expects("fetch").once().returns([]);
                view.render({ selectedGrouping: 99 });
                fetchMock.verify();
                view.fetch.restore();
                $chooserDom.remove();
            });

            it("makes new selection li", function () {
                var $chooserDom = $(chooserHtml);
                $("body").append($chooserDom);
                var config = { element: ".group-by-chooser" };
                var view = new assemble.groupBy.chooserView(config);
                var fetchMock = sinon.stub(view, "fetch", function () {
                    this.groupBys = [{ Id: '99', Name: "NinetyNine"}];
                });
                view.render({ selectedGrouping: 99 });
                expect(view.$el.find("a[data-id='99']").length).toEqual(1);
                view.fetch.restore();
                $chooserDom.remove();
            });

        });

        describe("group by choice", function () {

            it("modifies curret when selected", function () {
                var $chooserDom = $(chooserHtml);
                $("body").append($chooserDom);
                var config = { element: ".group-by-chooser" };
                var view = new assemble.groupBy.chooserView(config);
                var fetchMock = sinon.stub(view, "fetch", function () {
                    this.groupBys = [{ Id: '99', Name: "NinetyNine" }, { Id: '100', Name: "OneHundred"}];
                });
                view.render({ selectedGrouping: 99 });
                view.$el.find("a[data-id='99']").click();
                expect(view.current).toEqual("99");
                $chooserDom.remove();
            });

            it("publishs change event when selected", function () {
                var publishedValue = { groupBy: 'notagoodvalue' };
                var $chooserDom = $(chooserHtml);
                $("body").append($chooserDom);
                var config = { element: ".group-by-chooser" };
                var view = new assemble.groupBy.chooserView(config);
                var fetchMock = sinon.stub(view, "fetch", function () {
                    this.groupBys = [{ Id: '99', Name: "NinetyNine" }, { Id: '100', Name: "OneHundred"}];
                });
                view.render({ selectedGrouping: 99 });
                view.on("groupBy.changed", function (val) { publishedValue = val; });
                view.$el.find("a[data-id='99']").click();
                expect(publishedValue.groupBy).toEqual("99");
            });

        });

    });

    describe("deleteGroupByView", function () {

        it("renders and passes values", function () {
            assemble.mvcRoutes = {};
            assemble.mvcRoutes.groupByDelete = function (config) {
                return "";
            };
            var view = new assemble.groupBy.deleteGroupByView({ name: "NinetyNine", id: "99" });
            expect(view.config.id).toEqual("99");
            expect(view.config.name).toEqual("NinetyNine");
            var modalMock = sinon.mock(view.$el).expects("modal").once().returns($(Handlebars.templates.groupBy.deleteModal()));
            view.render();
            modalMock.verify();
            view.$el.modal.restore();
            assemble.mvcRoutes = null;
        });

        it("calls destroy when delete 'ok' button clicked", function () {
            assemble.mvcRoutes = {};
            assemble.mvcRoutes.groupByDelete = function (config) {
                return "";
            };
            var destoryedEventTriggered = false;
            var view = new assemble.groupBy.deleteGroupByView({ name: "NinetyNine", id: "99" });
            view.on("destroyed", function () { destoryedEventTriggered = true; });
            var modalMock = sinon.mock(view.$el).expects("modal").once().returns($(Handlebars.templates.groupBy.deleteModal()));
            view.render();
            view.$el.modal.restore();
            modalMock = sinon.mock(view.$el).expects("modal").withArgs('hide').once();
            var ajaxMock = sinon.mock($).expects("ajax").once().yieldsTo("success");
            view.$el.find(".remove-groupby").click();
            ajaxMock.verify();
            modalMock.verify();
            assemble.mvcRoutes = null;
            view.$el.modal.restore();
            $.ajax.restore();
            expect(destoryedEventTriggered).toBe(true);
        });
    });

});