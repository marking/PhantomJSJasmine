describe("assemble.models", function () {

    it("exists", function () {
        expect(assemble.models).toBeNotNull();
    });


    describe("EditModelModalView", function () {

        it("exists", function () {
            expect(assemble.models.EditModelModalView).toBeNotNull();
        });

        it("instantiates", function () {
            //arrange
            var model = new assemble.models.Model({ id: 1, Name: "My Model", Description: "My Description" });
            var parentView = { model: model };
            var config = { view: parentView };

            //act
            var modal = new assemble.models.EditModelModalView(config);
            
            //assert
            expect(modal.config).toBe(config);
        });

        it("renders", function () {
            //arrange
            var baseApplicationUrl = "http://www.assembletesturl.org/";
            var baseHelpUrl = "http://www.help.com/";
            var defaultHelpUrl = "http://help.com/default";
            var helpItems = [
                { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                { Key: 333, PathRegEx: "/rest2/path/.*", Url: "/help/about3.htm"}];
            var helpConfig = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });


            var model = new assemble.models.Model({ id: 1, Name: "My Model", Description: "My Description" });
            var parentView = { model: model };
            var config = { view: parentView };
            var modal = new assemble.models.EditModelModalView(config);
            var ajaxMock = sinon.mock($).expects("ajax").once().yieldsTo("success", "<div id=\"properDivId\"></div>");
            var modalMock = sinon.mock($.fn).expects("modal").once();
            assemble.help.mainrepository = {};
            assemble.help.mainrepository.load = sinon.stub().callsArgWith(0, helpConfig);

            //act
            modal.render();

            //assert
            expect(modal.$el.attr("id")).toBe("properDivId");
            modalMock.verify();
            ajaxMock.verify();

            //clean up
            $.ajax.restore();
            $.fn.modal.restore();
            assemble.help.mainrepository = null;
        });
    });

});