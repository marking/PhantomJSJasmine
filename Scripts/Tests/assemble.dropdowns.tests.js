describe("assemble.dropdowns", function () {

    describe("list style dropdown with defaults", function () {
        beforeEach(function () {
            var config = {
                collection: [{ id: 1, name: "Sarah" }, { id: 2, name: "Dave" }, { id: 5, name: "John"}]
            };

            this.dropdown = (new assemble.dropdowns.SelectorListView(config)).render();
        });

        afterEach(function () {
            this.dropdown.unload();
        });

        it("updates when selection is made", function () {
            var changeEventCallback = sinon.spy();
            this.dropdown.on('change', changeEventCallback);
            this.dropdown.$('[data-id=1]').click();

            expect(changeEventCallback.calledOnce).toBe(true);
            expect(this.dropdown.val()).toBe(1);
            expect(this.dropdown.text()).toBe("Sarah");
        });

        it("updates when value is set, not selected", function () {
            var changeEventCallback = sinon.spy();
            this.dropdown.on('change', changeEventCallback);
            this.dropdown.val(2);

            expect(changeEventCallback.calledOnce).toBe(true);
            expect(this.dropdown.val()).toBe(2);
            expect(this.dropdown.text()).toBe("Dave");
        });

        it("changes to no value selected if invalid value is set", function () {
            var changeEventCallback = sinon.spy();
            this.dropdown.on('change', changeEventCallback);
            this.dropdown.val(1);
            this.dropdown.val(10);

            expect(changeEventCallback.calledOnce).toBe(true);
            expect(this.dropdown.val()).toBe(this.dropdown.noValue);
            expect(this.dropdown.text()).toBe(this.dropdown.defaultText);
        });

        it("doesn't trigger change event when value is set with silent option", function () {
            var changeEventCallback = sinon.spy();
            this.dropdown.on('change', changeEventCallback);
            this.dropdown.val(2, false);

            expect(!changeEventCallback.called).toBe(true);
            expect(this.dropdown.val()).toBe(2);
            expect(this.dropdown.text()).toBe("Dave");
        });

        it("is not a searchable dropdown", function () {
            expect(this.dropdown.$('.search-box').length).toBe(0);
        });

        it("updates list and selection when an item is changed", function () {
            this.dropdown.val(1);

            var changeEventCallback = sinon.spy();
            this.dropdown.on('change', changeEventCallback);
            this.dropdown.collection.get(1).set('name', 'Sara');

            expect(changeEventCallback.called).toBe(false);
            expect(this.dropdown.$('.dropdown-menu [data-id=1]').text()).toBe('Sara');
            expect(this.dropdown.val()).toBe(1);
            expect(this.dropdown.text()).toBe('Sara');
        });

        it("updates list and selection when an item is removed", function () {
            this.dropdown.val(1);

            var changeEventCallback = sinon.spy();
            this.dropdown.on('change', changeEventCallback);
            this.dropdown.collection.remove(1);

            expect(changeEventCallback.called).toBe(false);
            expect(this.dropdown.$('[data-id=1]').length).toBe(0);
            expect(this.dropdown.val()).toBe(this.dropdown.noValue);
            expect(this.dropdown.text()).toBe(this.dropdown.defaultText);
        });

        it("updates list and selection when an item is added", function () {
            this.dropdown.val(1);

            var changeEventCallback = sinon.spy();
            this.dropdown.on('change', changeEventCallback);
            this.dropdown.collection.add({ id: 12, name: "Joe Bob" });

            expect(changeEventCallback.called).toBe(false);
            expect(this.dropdown.$('.dropdown-menu [data-id=12]').text()).toBe("Joe Bob");
            expect(this.dropdown.val()).toBe(1);
            expect(this.dropdown.text()).toBe("Sarah");
        });

        it("updates list and selection when collection is reset", function () {
            this.dropdown.val(1);
            this.dropdown.collection.reset([{ id: 12, name: "Joe Bob" }, { id: 13, name: "Hello, Ma' Dolly"}]);

            expect(this.dropdown.collection.length).toBe(2);
            expect(this.dropdown.val()).toBe(this.dropdown.noValue);
            expect(this.dropdown.text()).toBe(this.dropdown.defaultText);
        });

        it("starts with no value", function () {
            expect(this.dropdown.val()).toBe(this.dropdown.noValue);
            expect(this.dropdown.$('.selected').length).toBe(0);
            expect(this.dropdown.text()).toBe(this.dropdown.defaultText);
        });

        it("shows empty message when no items exist", function () {
            this.dropdown.collection.reset([]);

            expect(this.dropdown.$el.hasClass('empty')).toBe(true);
        });

        it("can be reset to its initial state", function () {
            this.dropdown.val(1);
            this.dropdown.reset();

            expect(this.dropdown.val()).toBe(this.dropdown.noValue);
            expect(this.dropdown.text()).toBe(this.dropdown.defaultText);
        });

        // still need to test keypress selection and enter selection on close

    });

    describe("list style dropdown with options", function () {
        beforeEach(function () {
            this.collection = [{ id: 1, name: "Sarah" }, { id: 2, name: "Dave" }, { id: 5, name: "John"}];
        });

        it("can use an existing collection", function () {
            var collection = new Backbone.Collection(this.collection);
            var dropdown = new assemble.dropdowns.SelectorListView({ collection: collection });

            dropdown.render().val(1);

            expect(dropdown.val()).toBe(1);
            expect(collection === dropdown.collection).toBe(true);
        });

        it("adds dividers that are not returned as selectable", function () {
            var collection = new Backbone.Collection(this.collection);
            var dropdown = new assemble.dropdowns.SelectorListView({
                collection: collection,
                dividerBefore: [2]
            });
            dropdown.render();

            expect($(dropdown.$('li:not(.empty-message)')[1]).hasClass('divider')).toBe(true);
            expect(dropdown.getSelectableItems().length).toBe(3);
        });

        it("can use other properties for id and name", function () {
            var collection = [{ idProp: 1, userName: 'john' }, { idProp: 4, userName: 'bob'}];
            var dropdown = new assemble.dropdowns.SelectorListView({
                collection: collection,
                idProperty: 'idProp',
                nameProperty: 'userName'
            });
            dropdown.render().val(1);
            expect(dropdown.val()).toBe(1);

            dropdown.$('[data-id=4]').click();
            expect(dropdown.val()).toBe(4);

            expect(dropdown.text()).toBe('bob');
        });

        it("can have different default text and no value", function () {
            var dropdown = new assemble.dropdowns.SelectorListView({
                collection: this.collection,
                noValue: -1,
                defaultText: 'absolutely nothing'
            });
            dropdown.render();

            expect(dropdown.val()).toBe(-1);
            expect(dropdown.text()).toBe('absolutely nothing');
        });

        it("can have different empty message", function () {
            var dropdown = new assemble.dropdowns.SelectorListView({
                collection: this.collection,
                emptyMessage: "Ain't no thang"
            });
            dropdown.render();

            expect(dropdown.$('.empty-message').text()).toBe("Ain't no thang");
        });
    });

    describe("searchable list style dropdown", function () {
        beforeEach(function () {
            var self = this,
                config = {
                    searchable: true,
                    collection: [{ id: 1, name: "Sarah" }, { id: 2, name: "Dave" }, { id: 5, name: "John"}]
                };
            this.dropdown = (new assemble.dropdowns.SelectorListView(config)).render();

            this.selectableItems = function (visible) {
                visible = visible || visible === undefined ? true : false;

                var items = self.dropdown.$('li')
                    .filter(function () {
                        if (visible)
                            items = $(this).css('display') != 'none'
                        else
                            items = $(this).css('display') == 'none'

                        return items;
                    })
                    .not('.empty-message')
                    .not('.divider');

                return items;
            };

            this.searchFor = function (search) {
                var searchSpy = sinon.spy(this.dropdown, "search");
                runs(function () {
                    this.dropdown.searchInput.val(search).trigger({
                        type: 'keydown'
                    });
                });

                waitsFor(function () {
                    return searchSpy.called;
                }, "searched for '" + search + "'", 10);
            };

        });

        it("shows all items when search is empty", function () {
            expect(this.selectableItems().length).toBe(this.dropdown.collection.length);
        });

        it("shows only items that match the search", function () {
            this.searchFor('sa');

            runs(function () {
                expect(this.selectableItems(true).length).toBe(1);
                expect(this.selectableItems(false).length).toBe(2);
            });
        });

        it("resets to no search when reopened", function () {
            this.searchFor('sa');

            runs(function () {
                this.dropdown.$el.trigger('opened');

                expect(this.dropdown.searchInput.val()).toBe('');
                expect(this.selectableItems(true).length).toBe(this.dropdown.collection.length);
                expect(this.selectableItems(false).length).toBe(0);
            });
        });

    });

    describe("free text entry style dropdown", function () {

    });

});