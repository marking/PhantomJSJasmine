describe("assemble.help", function () {

    it("exists", function () {
        expect(assemble.help).toBeNotNull();
    });

    describe("model", function () {
        it("exists", function () {
            expect(assemble.help.Model).toBeNotNull();
        });

        it("instantiates", function () {
            var baseApplicationUrl = "http://www.assembletesturl.org/";
            var baseHelpUrl = "http://www.help.com/";
            var defaultHelpUrl = "http://help.com/default";
            var helpItems = [{ Key: 111, PathRegEx: "/rest/path/4", Url: "/help/about.htm"}];
            var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });
            
            expect(model.get("BaseApplicationUrl")).toBe(baseApplicationUrl);
            expect(model.get("HelpItems")).toBe(helpItems);
        });

        it("throws if ini data not good", function () {
            expect(function () {
                var x = new assemble.help.Model();
            }).toThrow();
        });

        it("retrieves item by key", function () {
            var baseApplicationUrl = "http://www.assembletesturl.org/";
            var baseHelpUrl = "http://www.help.com/";
            var defaultHelpUrl = "http://help.com/default";
            var helpItems = [
                { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                { Key: 333, PathRegEx: "/rest2/path/.*", Url: "/help/about3.htm"}];
            var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });

            expect(model.itemByKey(222)).toBe(helpItems[1]);
        });

        it("retrieves item by path", function () {
            var baseApplicationUrl = "http://www.assembletesturl.org/";
            var baseHelpUrl = "http://www.help.com/";
            var defaultHelpUrl = "http://help.com/default";
            var helpItems = [
                { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                { Key: 333, PathRegEx: "/rest3/path/.*", Url: "/help/about3.htm"}];
            var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });

            expect(model.itemByPath("/rest2/path/99")).toBe(helpItems[1]);
        });

        it("get help url from page url", function () {
            var baseApplicationUrl = "http://www.assembletesturl.org";
            var baseHelpUrl = "http://www.help.com";
            var defaultHelpUrl = "http://help.com/default";
            var helpItems = [
                { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                { Key: 333, PathRegEx: "/rest3/path/.*", Url: "/help/about3.htm"}];
            var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });

            expect(model.getHelpUrlFromPageUrl("http://www.assembletesturl.org/rest2/path/99")).toBe("http://www.help.com/help/about2.htm");
        });

        it("returns a default url if the items cannot be found", function () {
            var baseApplicationUrl = "http://www.assembletesturl.org";
            var baseHelpUrl = "http://www.help.com";
            var defaultHelpUrl = "http://help.com/default";
            var helpItems = [
                { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                { Key: 333, PathRegEx: "/rest3/path/.*", Url: "/help/about3.htm"}];
            var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });

            expect(model.getHelpUrlFromPageUrl("http://www.assembletesturl.org/some/weird/path/44")).toBe(defaultHelpUrl);
        });

        it("returns a help url based on a key", function () {
            var baseApplicationUrl = "http://www.assembletesturl.org";
            var baseHelpUrl = "http://www.help.com";
            var defaultHelpUrl = "http://help.com/default";
            var helpItems = [
                { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                { Key: 333, PathRegEx: "/rest3/path/.*", Url: "/help/about3.htm"}];
            var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });

            expect(model.getHelpUrlFromKey(222)).toBe("http://www.help.com/help/about2.htm");
        });

    });

    describe("views", function () {
        describe("NavigationView", function () {

            it("exists", function () {
                expect(assemble.help.NavigationView).toBeNotNull();
            });

            it("instantiates with the correct element", function () {
                var baseApplicationUrl = "http://www.assembletesturl.org";
                var baseHelpUrl = "http://www.help.com";
                var defaultHelpUrl = "http://help.com/tacos";
                var helpItems = [
                    { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                    { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                    { Key: 333, PathRegEx: "/rest3/path/.*", Url: "/help/about3.htm"}];
                var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });
                var $el = $("<a href=\"#\" >Help Link</a>");
                var navigationView = new assemble.help.NavigationView({ model: model, el: $el[0] });

                expect(navigationView.el).toBeNotNull();
                expect(navigationView.$el.attr("href")).toBe("#");
            });

            it("calls correct url", function () {
                var baseApplicationUrl = "http://www.assembletesturl.org";
                var baseHelpUrl = "http://www.help.com";
                var defaultHelpUrl = "http://help.com/default";
                var helpItems = [
                { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                { Key: 333, PathRegEx: "/rest3/path/.*", Url: "/help/about3.htm"}];
                var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });
                var $el = $("<a href=\"#\" >Help Link</a>");
                var navigationView = new assemble.help.NavigationView({ model: model, el: $el[0] });
                var getCurrentUrlMock = sinon.mock(navigationView).expects("getCurrentUrl").once().returns("http://www.assembletesturl.org/rest2/path/99");
                var displayHelpTopicMock = sinon.mock(navigationView).expects("displayHelpTopic").once().withExactArgs("http://www.help.com/help/about2.htm");
                $el.click();
                getCurrentUrlMock.verify();
                displayHelpTopicMock.verify();
            });

        });
        
        describe("KeyView", function () {

            it("exists", function () {
                expect(assemble.help.KeyView).toBeNotNull();
            });

            it("instantiates with the correct element", function () {
                var baseApplicationUrl = "http://www.assembletesturl.org";
                var baseHelpUrl = "http://www.help.com";
                var defaultHelpUrl = "http://help.com/tacos";
                var helpItems = [
                    { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                    { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                    { Key: 333, PathRegEx: "/rest3/path/.*", Url: "/help/about3.htm"}];
                var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });
                var $el = $("<a href=\"#\" >Help Link</a>");
                var navigationView = new assemble.help.KeyView({ model: model, el: $el[0], key: 555 });

                expect(navigationView.el).toBeNotNull();
                expect(navigationView.$el.attr("href")).toBe("#");
            });

            it("calls correct url with key", function () {
                var baseApplicationUrl = "http://www.assembletesturl.org";
                var baseHelpUrl = "http://www.help.com";
                var defaultHelpUrl = "http://help.com/default";
                var helpItems = [
                { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                { Key: 333, PathRegEx: "/rest3/path/.*", Url: "/help/about3.htm"}];
                var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });
                var $el = $("<a href=\"#\" >Help Link</a>");
                var navigationView = new assemble.help.KeyView({ model: model, el: $el[0], key: 222 });
                var displayHelpTopicMock = sinon.mock(navigationView).expects("displayHelpTopic").once().withExactArgs("http://www.help.com/help/about2.htm");
                $el.click();
                displayHelpTopicMock.verify();
            });

            it("calls default url without key", function () {
                var baseApplicationUrl = "http://www.assembletesturl.org";
                var baseHelpUrl = "http://www.help.com";
                var defaultHelpUrl = "http://help.com/default";
                var helpItems = [
                { Key: 111, PathRegEx: "/rest1/path/.*", Url: "/help/about1.htm" },
                { Key: 222, PathRegEx: "/rest2/path/.*", Url: "/help/about2.htm" },
                { Key: 333, PathRegEx: "/rest3/path/.*", Url: "/help/about3.htm"}];
                var model = new assemble.help.Model({ BaseApplicationUrl: baseApplicationUrl, HelpItems: helpItems, BaseHelpUrl: baseHelpUrl, DefaultHelpUrl: defaultHelpUrl });
                var $el = $("<a href=\"#\" >Help Link</a>");
                var navigationView = new assemble.help.KeyView({ model: model, el: $el[0] });
                var displayHelpTopicMock = sinon.mock(navigationView).expects("displayHelpTopic").once().withExactArgs("http://help.com/default");
                $el.click();
                displayHelpTopicMock.verify();
            });

        });
    });
});

