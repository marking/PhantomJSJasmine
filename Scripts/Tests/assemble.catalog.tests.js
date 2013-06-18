describe("assemble.catalog", function () {

    assemble.loadFixture('fixtures/catalogTemplates.html');

	describe("EstimateWindow", function () {

	    var ModelClass = Backbone.Model.extend();
		var config = {};

		beforeEach(function () {
		    config = { modelVersion: new ModelClass({ id: 1, name: "One" }) };
			assemble.mvcRoutes = {};
			assemble.mvcRoutes.estimate = function () { return "estimate"; };
			assemble.mvcRoutes.modelVersionDetails = function () { return "modelVersionDetails"; };
			assemble.help.mainrepository = {};
			assemble.help.mainrepository.load = function () { };
		});

		it("instantiates", function () {
			var view = new assemble.catalog.EstimateWindow(config);
		});

		it("sets model version", function () {
			var view = new assemble.catalog.EstimateWindow(config);
			expect(view.modelVersion).toBe(config.modelVersion);
		});

		it("renders", function () {
			var view = new assemble.catalog.EstimateWindow(config);
			view.render();
			expect(view.$("#estimate_window_content").length).toBe(1);
			view.$el.remove();
		});

		it("renders version name", function () {
			var view = new assemble.catalog.EstimateWindow(config);
			view.render();
			expect(view.$("#estimate_window_version_name").html()).toBe(config.modelVersion.get('name'));
			view.$el.remove();
		});

		it("primary button fires estimate", function () {
			var view = new assemble.catalog.EstimateWindow(config);
			view.render();
			var estimateMock = sinon.mock(view).expects("estimate").once();
			view.$(".btn-primary").click();
			estimateMock.verify();
			view.estimate.restore();
			view.$el.remove();
		});

		it("estimate:complete fired when button clicked", function () {
			var fired = false;
			sinon.stub($, 'ajax').yieldsTo("success", {});
			var view = new assemble.catalog.EstimateWindow(config);
			view.render();
			view.on("estimate:complete", function () {
				fired = true;
			});
			view.$(".btn-primary").click();
			expect(fired).toBe(true);
			$.ajax.restore();
			view.$el.remove();
		});

		it("ajax called when button clicked", function () {
			var mock = sinon.mock($).expects('ajax').once();
			var view = new assemble.catalog.EstimateWindow(config);
			view.render();
			view.$(".btn-primary").click();
			mock.verify();
			$.ajax.restore();
			view.$el.remove();
		});

		it("uses fill estimate as default", function () {
		    var mock = sinon.mock($).expects('ajax').twice().yieldsTo("success", {});
			var view = new assemble.catalog.EstimateWindow(config);
			view.render();
			view.$(".btn-primary").click();
			mock.verify();
			sinon.assert.calledWith(mock, sinon.match({ data: { id: 1, overwrite: false } }));
			$.ajax.restore();
			view.$el.remove();
		});

		it("use overwrite when selected", function () {
		    var mock = sinon.mock($).expects('ajax').twice().yieldsTo("success", {});
		    var view = new assemble.catalog.EstimateWindow(config);
		    view.render();
		    view.$('input[name="EstimateType"][value="overwrite"]').click();
		    view.$(".btn-primary").click();
		    mock.verify();
		    sinon.assert.calledWith(mock, sinon.match({ data: { id: 1, overwrite: true } }));
		    $.ajax.restore();
		    view.$el.remove();
		});

		it("displays remaining data", function () {
		    var mock = sinon.mock($).expects('ajax').twice().yieldsTo("success", { data: ['One', 'Two', 'Three'] });
		    var view = new assemble.catalog.EstimateWindow(config);
		    view.render();
		    view.$(".btn-primary").click();
		    var html = view.$("#estimate_window_remaining").html();
		    expect(html.indexOf("One") > -1).toBe(true);
		    expect(html.indexOf("Two") > -1).toBe(true);
		    expect(html.indexOf("Three") > -1).toBe(true);
		    $.ajax.restore();
		    view.$el.remove();
		});
	});

});