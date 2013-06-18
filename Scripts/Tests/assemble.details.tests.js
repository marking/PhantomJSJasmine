describe("assemble.details", function () {

    assemble.loadFixture('fixtures/detailsTemplates.html');

    Factory.define('detail.plain', assemble.details.Model, {
        "name": "property",
        "value": "Hello",
        "label": "property label",
        "type": "plain",
        "selectValues": [],
        "validations": {},
        "reloadGrid": true,
        "multipleValues": false,
        "isPriority": false,
        mask: null

    });

    Factory.define('detail.assemblyTree', assemble.details.Model, {
        "name": "AssemblyCode",
        "value": "A",
        "label": "Assembly Code",
        "type": "assemblyTree",
        "selectValues": [],
        "validations": {},
        "reloadGrid": true,
        "multipleValues": false,
        "isPriority": false,
        mask: null

    });

    Factory.define('detail.select', Factory.get('detail.plain'), {
        "value": "Count",
        "type": "select",
        "selectValues": [{ "id": "Count", "name": "Count (EA)" }, { "id": "Depth", "name": "Depth (LF)" }, { "id": "Height", "name": "Height (LF)" }, { "id": "Width", "name": "Width (LF)"}]
    });

    describe("plain detail", function () {
        describe("with a value", function () {
            beforeEach(function () {
                this.view = (new assemble.details.FieldView({ model: Factory.create('detail.plain') })).render();
                spyOn(this.view.input, 'valid').andReturn(true);
                assemble.help.mainrepository = {};
                assemble.help.mainrepository.load = function () { };
            });

            afterEach(function () {
                this.view.unload();
            });

            it("is rendered as a textbox with the right value", function () {
                expect(this.view.$('input.incognito-field[type=text]').length).toBe(1);
                expect(this.view.$el.hasClass('empty')).toBe(false);
                expect(this.view.getValue()).toBe('Hello');
            });

            it("can be x'd out and reset", function () {
                this.view.$('.close').click();
                expect(this.view.getValue()).toBe('');
                expect(this.view.$el.hasClass('empty')).toBe(true);

                this.view.resetValue();
                expect(this.view.getValue()).toBe('Hello');
                expect(this.view.$el.hasClass('empty')).toBe(false);
            });

            it("can be changed and reset", function () {
                this.view.input.val('John');
                this.view.input.blur();
                expect(this.view.model.get('value')).toBe('John');

                this.view.resetValue();
                expect(this.view.getValue()).toBe('Hello');
            });

        });

        describe("with multiple values", function () {
            beforeEach(function () {
                this.view = new assemble.details.FieldView({
                    model: Factory.create('detail.plain', {
                        "value": '<Multiple Values>',
                        "multipleValues": true
                    })
                }).render();
                spyOn(this.view.input, 'valid').andReturn(true);
                assemble.help.mainrepository = {};
                assemble.help.mainrepository.load = function () { };
            });

            it("is rendered as having multiple values", function () {
                expect(this.view.$el.hasClass('has-multiple-values')).toBe(true);
                expect(this.view.$el.hasClass('keep-multiple-values')).toBe(true);
                expect(this.view.model.get('value')).toBe('<Multiple Values>');
            });

            it("can be changed to a value and saved", function () {
                this.view.$('.keep-multiple-values-message').click();

                // after message is clicked, should show multiple values styling, but not the message
                expect(this.view.$el.hasClass('has-multiple-values')).toBe(true);
                expect(this.view.$el.hasClass('keep-multiple-values')).toBe(false);
                expect(this.view.model.get('value')).toBe('');

                // change the value
                this.view.input.val('hello');
                this.view.input.blur();

                // persist the change
                this.view.model.change();
                this.view.reset();

                // shouldn't have multiple-values styling anymore
                expect(this.view.$el.hasClass('has-multiple-values')).toBe(false);
            });

            it("can be change to a value then back to multiple values", function () {
                this.view.$('.keep-multiple-values-message').click();

                // change the value
                this.view.input.val('hello');
                this.view.input.blur();

                // change back to multiple values
                this.view.$('.keep-multiple-values-link').click();
                expect(this.view.$el.hasClass('has-multiple-values')).toBe(true);
                expect(this.view.model.get('value')).toBe('<Multiple Values>');
            });
        });

        describe("when required", function () {
            beforeEach(function () {
                this.view = new assemble.details.FieldView({ model: Factory.create("detail.plain", { validations: { required: "This field is required" } }) }).render();
                assemble.help.mainrepository = {};
                assemble.help.mainrepository.load = function () { };
            });

            it("renders as required", function () {
                expect(this.view.$el.hasClass('required')).toBe(true);
            });

        });

    });

    describe("select detail", function () {
        describe("renders", function () {
            beforeEach(function () {
                this.view = new assemble.details.FieldView({ model: Factory.create('detail.select') }).render();
                assemble.help.mainrepository = {};
                assemble.help.mainrepository.load = function () { };
            });

            it("as a dropdown", function () {
                expect(this.view.input.constructor).toBe(assemble.dropdowns.SelectorListView);
            });

            it("with the correct value in the dropdown", function () {
                expect(this.view.input.val()).toBe('Count');
            });
        });
    });

    describe("assembly tree detail", function () {

        describe("with single value", function () {

            describe("renders", function () {

                var view = null;
                var assemblyList = null;
                var filtersList = null;
                assemble.help.mainrepository = {};
                assemble.help.mainrepository.load = function () { };

                beforeEach(function () {
                    filtersList = [
                        {
                            Name: "All",
                            Id: 0
                        },
                        {
                            Name: "Category 1",
                            Id: -1
                        },
                        {
                            Name: "Category 2",
                            Id: -2
                        },
                        {
                            Name: "Category 3",
                            Id: -3
                        },
                        {
                            Name: "Category 4",
                            Id: -4
                        },
                        {
                            Name: "Category 5",
                            Id: -5
                        }
                    ];
                    assemblyList = [
                        {
                            title: "A Substructure",
                            description: "Substructure",
                            key: "A",
                            children: [
                                {
                                    title: "A10 Foundations",
                                    description: "Foundations",
                                    key: "A10",
                                    children: null
                                },
                                {
                                    title: "A20 Basement Construction",
                                    description: "Basement Construction",
                                    key: "A20",
                                    children: null
                                }
                            ]
                        },
                        {
                            title: "B Shell",
                            description: "Shell",
                            key: "B",
                            children: null
                        }
                    ];

                    sinon.mock(assemble.trees.categoriesFactory).expects("get").once().returns(filtersList);
                    sinon.mock(assemble.details.AssemblyListFactory).expects("get").once().returns(assemblyList);
                    view = new assemble.details.FieldView({ model: Factory.create('detail.assemblyTree'), project: { id: 1 } });
                    view.render();
                });

                afterEach(function () {
                    view.$el.remove();
                    assemble.details.AssemblyListFactory.get.restore();
                    assemble.trees.categoriesFactory.get.restore();
                });

                it("as an assembly tree modal", function () {
                    expect(view.input.constructor).toBe(assemble.trees.AssemblyCodeTreeModal);
                });

                it("has an assemble list", function () {
                    expect(view.input.assembleList).not.toBeNull();
                });

            });

        });
    });
});