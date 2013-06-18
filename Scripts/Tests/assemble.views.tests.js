describe("assemble.views", function () {

    assemble.loadFixture('fixtures/viewsTemplates.html');

    describe("view in view list", function () {

        beforeEach(function () {
            assemble.explorer = assemble.explorer || {};
            assemble.explorer.view = assemble.explorer.View || { state: 'model:view' };
            this.view = new assemble.views.View({ model: new assemble.views.Model({ Id: 1, Name: "Estimate Prep" }) });
            this.view.render();
        });

        afterEach(function () {
            this.view.unload();
        });

        it("is rendered", function () {
            expect(this.view.$(".view-name").text()).toBe("Estimate Prep");
        });

        it("is selected when clicked", function () {
            var selectionEventCallback = jasmine.createSpy();
            this.view.on('select', selectionEventCallback);
            this.view.$('.model-view').click();

            expect(selectionEventCallback).toHaveBeenCalled();
            expect(this.view.$el.hasClass('active')).toBe(true);
        });

        it("is not selected when slide menu is clicked", function () {
            var selectionEventCallback = sinon.spy();
            this.view.on('select', selectionEventCallback);
            this.view.$('.slide-menu').click();

            expect(selectionEventCallback.called).toBe(false);
            expect(this.view.$el.hasClass('active')).toBe(false);
        });

        it("is deleted when deletion is confirmed", function () {
            /* ajax response needs to be faked
            var destroySpy = spyOn(this.view.model, 'destroy');

            this.view.$('[data-action=delete]').click();
            expect(destroySpy).wasNotCalled();
            $('#delete_view_modal').find('.confirm-delete-view').click();
            expect(destroySpy).toHaveBeenCalled(); */
        });

        it("does not delete when deletion is canceled", function () {
            var destroySpy = spyOn(this.view.model, 'destroy');

            this.view.$('[data-action=delete]').click();

            $('#delete_view_modal').find('[data-dismiss="modal"]').click();
            expect(destroySpy).wasNotCalled();
        });

        it("can be renamed", function () {
            /* ajax response needs to be faked
            var changeEventCallback = jasmine.createSpy(),
            newName = "New View Name";

            // stop ajax from going
            this.view.model.on('change:Name', changeEventCallback);
            this.view.$('[data-for-mode="edit"] input').val(newName);
            this.view.$('[data-for-mode="edit"] .btn-primary').click();

            expect(changeEventCallback).toHaveBeenCalled();
            expect(this.view.$(".view-name").text()).toBe(newName);
            expect(this.view.model.get("Name")).toBe(newName);*/
        });

        it("is reset to read mode and is not renamed when rename is canceled", function () {
            var changeEventCallback = jasmine.createSpy(),
                newName = "New View Name";

            this.view.model.on('change:Name', changeEventCallback);
            this.view.$('[data-for-mode="edit"] input').val(newName);
            this.view.$('[data-for-mode="edit"] .btn-cancel').click();

            expect(changeEventCallback).wasNotCalled();
            expect(this.view.$(".view-name").text()).toBe("Estimate Prep");
            expect(this.view.model.get("Name")).toBe("Estimate Prep");
            expect(this.view.$el.attr('data-mode')).toBe("normal");
            expect(this.view.$('[data-for-mode="edit"] input').val()).toBe("Estimate Prep");
        });

        it("cannot have a blank name", function () {
            /*var changeEventCallback = jasmine.createSpy();

            this.view.model.on('change:Name', changeEventCallback);
            this.view.$('[data-action=edit]').click();
            this.view.$('input').val("");
            this.view.$('[data-for-mode="edit"] .btn-primary').click();

            expect(changeEventCallback).wasNotCalled();
            expect(this.view.$(".view-name").text()).toBe("Estimate Prep");
            expect(this.view.model.get("Name")).toBe("Estimate Prep");*/
        });

    });

});