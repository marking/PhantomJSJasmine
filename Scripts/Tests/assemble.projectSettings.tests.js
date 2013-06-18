describe("assemble.projectSettings", function () {

    assemble.loadFixture('fixtures/projectSettingsTemplates.html');

    describe("CodesView", function () {

        var config;
        var assemblyList = null;
        this.filtersList = null;

        beforeEach(function () {
            this.filtersList = [
                {
                    name: "All",
                    id: 0
                },
                {
                    name: "Category 1",
                    id: -1
                },
                {
                    name: "Category 2",
                    id: -2
                },
                {
                    name: "Category 3",
                    id: -3
                },
                {
                    name: "Category 4",
                    id: -4
                },
                {
                    name: "Category 5",
                    id: -5
                }
            ];

            var self = this;

            sinon.stub(assemble.trees.categoriesFactory, "get", function () { return self.filterList; });

            assemble.mvcRoutes = {};
            assemble.mvcRoutes.assemblyCodeCategories = function () { return "assemblyCodeCategories"; };

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

            config = {
                project: { id: 1 },
                assemblyCodesInfo: { FileDescription: "This is the file description", UploadedBy: "Nacho Libre", UploadedOn: "Tuesday" }
            };

            assemble.mvcRoutes = {};
            assemble.mvcRoutes.uploadAssemblyCodeFile = function () { return "uploadAssemblyCodeFile"; };
            assemble.mvcRoutes.assemblyCodeFileDisplay = function () { return "assemblyCodeFileDisplay"; };
            assemble.mvcRoutes.assemblyCodeFileInfo = function () { return "assemblyCodeFileInfo"; };
            assemble.mvcRoutes.assemblyList = function () { return "assemblyList"; };
            assemble.mvcRoutes.downloadAssemblyCodeFile = function () { return "downloadAssemblyCodeFile"; };
        });

        afterEach(function () {
            delete assemble.mvcRoutes;
            assemble.trees.categoriesFactory.get.restore();
        });

        it("can instantiate", function () {
            var view = new assemble.projectSettings.CodesView(config);
        });

        it("can render", function () {
            sinon.mock($).expects("ajax").once().yieldsTo("success", assemblyList);

            var view = new assemble.projectSettings.CodesView(config);
            var reloadDescriptionMock = sinon.mock(view).expects("reloadDescription").once();
            view.render();

            expect(view.$el.find("#AssemblyFileDescription").html()).toBe("This is the file description");

            reloadDescriptionMock.verify();
            view.reloadDescription.restore();
            $.ajax.restore();
        });

        it("can reload file", function () {
            sinon.mock($).expects("ajax").once().yieldsTo("success", assemblyList);
            var view = new assemble.projectSettings.CodesView(config);
            view.render();
            $.ajax.restore();
            sinon.mock($).expects("ajax").once().yieldsTo("success", assemblyList);

            view.reloadFile();

            $.ajax.restore();
        });

        it("can reload description", function () {
            sinon.mock($).expects("ajax").once().yieldsTo("success", assemblyList);
            var view = new assemble.projectSettings.CodesView(config);
            view.render();
            $.ajax.restore();
            sinon.mock($).expects("ajax").once().yieldsTo("success", { FileDescription: "Some other description" });

            view.reloadDescription();

            expect(view.$el.find("#AssemblyFileDescription").html()).toBe("Some other description");

            $.ajax.restore();
        });

        it("displays revert on render", function () {
            sinon.mock($).expects("ajax").once().yieldsTo("success", assemblyList);
            var view = new assemble.projectSettings.CodesView(config);
            var reloadDescriptionMock = sinon.mock(view).expects("reloadDescription").once();
            view.render();
            $("body").prepend(view.$el);

            expect(view.$el.find("#RevertAssemblyTree").is(":visible")).toBe(true);

            reloadDescriptionMock.verify();
            view.reloadDescription.restore();
            $.ajax.restore();
            view.$el.remove();
        });

        it("redisplays revert on update", function () {
            sinon.mock($).expects("ajax").once().yieldsTo("success", assemblyList);
            config.UploadedOn = config.UploadedBy = null;
            var view = new assemble.projectSettings.CodesView(config);
            view.render();
            $("body").prepend(view.$el);

            $.ajax.restore();
            sinon.mock($).expects("ajax").once().yieldsTo("success", { FileDescription: "Some other description", UploadedOn: "Wednesday", UploadedBy: "Taco Libre" });
            view.reloadDescription();

            expect(view.$el.find("#RevertAssemblyTree").is(":visible")).toBe(true);

            $.ajax.restore();
            view.$el.remove();
        });

        it("hides revert on render", function () {
            sinon.mock($).expects("ajax").once().yieldsTo("success", assemblyList);
            config.assemblyCodesInfo.UploadedOn = config.assemblyCodesInfo.UploadedBy = null;
            var view = new assemble.projectSettings.CodesView(config);
            view.render();
            $("body").prepend(view.$el);

            expect(view.$el.find("#RevertAssemblyTree").is(":visible")).toBe(false);

            $.ajax.restore();
            view.$el.remove();
        });

        it("hides revert on update", function () {
            sinon.mock($).expects("ajax").once().yieldsTo("success", assemblyList);
            config.UploadedOn = config.UploadedBy = null;
            var view = new assemble.projectSettings.CodesView(config);
            view.render();
            $("body").prepend(view.$el);

            $.ajax.restore();
            sinon.mock($).expects("ajax").once().yieldsTo("success", { FileDescription: "Some other description", UploadedOn: null, UploadedBy: null });
            view.reloadDescription();

            expect(view.$el.find("#RevertAssemblyTree").is(":visible")).toBe(false);

            $.ajax.restore();
            view.$el.remove();
        });

    });


    describe("CodesUploadModal", function () {

        var config;

        beforeEach(function () {
            config = { project: { id: 1} };
            assemble.mvcRoutes = {};
            assemble.mvcRoutes.uploadAssemblyCodeFile = function () { return "uploadAssemblyCodeFile"; };
            
        });

        afterEach(function () {
            delete assemble.mvcRoutes;
        });

        it("can instatiate", function () {
            var view = new assemble.projectSettings.CodesUploadModal(config);
        });

        it("sets project value correctly", function () {
            var view = new assemble.projectSettings.CodesUploadModal(config);
            expect(view.project).toBe(config.project);
        });

        it("can render", function () {
            var view = new assemble.projectSettings.CodesUploadModal(config);
            view.render();

            view.$el.remove();
        });

        it("renders modal", function () {

            sinon.spy(assemble.modal, "create");

            var view = new assemble.projectSettings.CodesUploadModal(config);
            view.render();

            expect(assemble.modal.create.calledOnce).toBe(true);
            assemble.modal.create.restore();
            view.$el.remove();
        });

        it("renders content in modal", function () {
            var view = new assemble.projectSettings.CodesUploadModal(config);
            view.render();
            expect(view.$el.find("#codes_upload_modal_content").length).toEqual(1);
            view.$el.remove();
        });

        it("file input change triggers change event", function () {
            var view = new assemble.projectSettings.CodesUploadModal(config);
            var fileChangedMock = sinon.mock(view).expects("fileChanged").once();
            view.render();

            var $assemblyFile = view.$el.find(".assembly-file");
            $assemblyFile.val("new value").change();

            fileChangedMock.verify();
            view.fileChanged.restore();
            view.$el.remove();
        });

        it("sets form target to iframe", function () {
            var view = new assemble.projectSettings.CodesUploadModal(config);
            view.render();
            expect(view.$el.find("#AssemblyFileUploadForm")[0].target).toEqual("AssemblyFileUploadTarget");
            view.$el.remove();
        });

    });

    describe("CodesDownloadModal", function () {
        var config;

        beforeEach(function () {
            config = { project: { id: 1 } };
            assemble.mvcRoutes = {};
            assemble.mvcRoutes.downloadAssemblyCodeFile = function () {
                return "downloadAssemblyCodeFile";
            };
        });

        afterEach(function () {
            delete assemble.mvcRoutes;
        });

        it("can instantiate", function () {
            var view = new assemble.projectSettings.CodesDownloadModal(config);
        });

        it("sets projectId", function () {
            var view = new assemble.projectSettings.CodesDownloadModal(config);
            expect(view.project.id).toBe(1);
        });

        it("renders", function () {
            var view = new assemble.projectSettings.CodesDownloadModal(config);
            view.render();

            expect(view.$(".modal-body").length).toBe(1);
            expect(view.$('input[name="DownloadFormat"]').length).toBe(2);
            
            view.$el.remove();
        });

        it("calls download when Download clicked", function () {
            var view = new assemble.projectSettings.CodesDownloadModal(config);
            view.render();
            var mock = sinon.mock(view).expects("callServerDownload").once();

            view.$(".btn-primary").click();

            mock.verify();

            view.callServerDownload.restore();
            view.$el.remove();
        });

        it("calls download when Download with default values", function () {
            var view = new assemble.projectSettings.CodesDownloadModal(config);
            view.render();
            var mock = sinon.mock(view).expects("callServerDownload").once().withArgs(false, false);

            view.$(".btn-primary").click();

            mock.verify();

            view.callServerDownload.restore();
            view.$el.remove();
        });

        it("calls download when Download with set values", function () {
            var view = new assemble.projectSettings.CodesDownloadModal(config);
            view.render();
            view.$('input[value="extended"]').click();
            view.$('input[value="excel"]').click();
            var mock = sinon.mock(view).expects("callServerDownload").once().withArgs(true, true);

            view.$(".btn-primary").click();

            mock.verify();

            view.callServerDownload.restore();
            view.$el.remove();
        });
    });
});