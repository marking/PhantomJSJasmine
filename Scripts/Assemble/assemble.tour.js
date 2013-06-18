(function ($) {
    var tour = assemble.tour = {};

    tour.setup = function (options) {
        options = options || { };

        guidely.add({
            attachTo: '#TakeoffGrid_AssembleName',
            title: 'Your Model Inventory',
            text: "<p>This table shows your entire model inventory. Instances are grouped by type and then by any property you choose.</p><p>The Quantity column is the sum total of all underlying instances. It is also used for total and unit costs, so you can get quick estimates based on this measure. You can change which quantity to use by editing details for selected instances.</p>",
            anchor: 'bottom-right'
        });

        guidely.add({
            attachTo: '#group_by_chooser',
            title: 'Group to Organize',
            text: '<p>Group by object parameters to better organize your inventory. Edit existing Group Bys to add, remove and reorder groupings. The following grouping would show you objects by level, grouped by their Category (e.g. Level 1 > Windows):<div class=\"mtl\"><img src=\"/Content/images/tours/groupbys.png\" class=\"fancy-img light-fancy-img\" /></div></p>',
            anchor: 'bottom-left'
        });

        guidely.add({
            attachTo: '#add_remove_columns',
            title: 'Add Columns',
            text: 'You can add a column for any object property in your model, like Width, Fire Rating, or Assembly Code—even your custom parameters.<div class=\"mtm\"><img src=\"/Content/images/tours/columns.png\" class=\"fancy-img\" /></div>',
            anchor: 'bottom-left'
        });

        guidely.add({
            attachTo: '#layout_chooser',
            title: 'Change the Layout',
            text: 'Choose the way you lay out the 3d viewer and the grid. To maximize space pop out the viewer to a second screen. <div class=\"mtm\"><img src=\"/Content/images/tours/viewerLayoutSelector.png\" class=\"fancy-img\" /></div>',
            anchor: 'bottom-left'
        });

        guidely.add({
            attachTo: '#show_details',
            title: 'Show and Edit Details',
            text: 'Use the checkboxes in the grid to select items you want to edit, and then click here to show and edit details of those selected objects. <span class="meta">(Details panel not available when comparing versions.)</span><div class=\"mtl\"><img src=\"/Content/images/tours/edit.png\" class=\"fancy-img light-fancy-img\" /></div>',
            anchor: 'bottom-left'
        });

        guidely.add({
            attachTo: '#view_filters',
            title: 'Filter Instances',
            text: "<p>Use filters to isolate items of interest. The example below would show just Doors and Windows for all levels except Level&nbsp;1:<div class=\"mtm\"><img src=\"/Content/images/tours/filters.png\" class=\"fancy-img\" /></div></p>",
            anchor: 'top-right'
        });

        guidely.add({
            attachTo: '#model_views_list .save-text',
            title: 'Save',
            text: 'Once you have organized your inventory with filters, a group by, and the columns you need, save the view so you can come back to it later. Click <em>Import</em> to find views from other models to use with this model. <div class=\"mtm\"><img src=\"/Content/images/tours/views.png\" class=\"fancy-img\" /></div>',
            anchor: 'top-right'
        });

        guidely.add({
            attachTo: '#view_version',
            title: 'Select and Compare Versions',
            text: '<p>Each time you publish a model, Assemble creates a new version of that model. Once you have more than one version, you can switch between them without having to leave the current view. You can also compare versions to see what’s changed.<div class=\"mtl\"><img src=\"/Content/images/tours/compare.png\" class=\"fancy-img light-fancy-img\" /></div><div class=\"mts\" style="text-align: center"><img src=\"/Content/images/tours/down-arrow.png\" /></div><div class=\"mts\"><img src=\"/Content/images/tours/comparing.png\" class=\"fancy-img light-fancy-img\" /></div></p>',
            anchor: 'bottom-right'
        });

        if (!assemble.browser.ipad) {
            guidely.add({
                attachTo: '#export_tools',
                title: 'Export',
                text: 'Quickly export what you see here to Microsoft Excel for easy sharing and reporting, or create Navisworks Search Sets that enable visualization and clash detection.',
                anchor: 'top-right'
            });
        }

        guidely.add({
            attachTo: '#tutorial_start',
            title: 'Come Back, Any Time',
            text: 'You can always relaunch the tour from here.',
            anchor: 'middle-left'
        });

        guidely.init(_.extend({
            welcome: true,
            welcomeTitle: "Guided Tour",
            welcomeText: '<div class="media"><img src="/Content/images/tours/hello.png" class="img slight-rotation mrm" /><div class="bd pts">Assemble gives you a look into your model\'s inventory like you\'ve never seen before. Take this tour to learn powerful ways to organize and view model data, track changes over time, and much more.</div></div>',
            startTrigger: false,
            showOnStart: false
        }, options));

    };

    tour.start = function (options) {
        if (!guidely._guides.length) {
            tour.setup(options);
        }
        assemble.app.trigger('tour.start');
        guidely.start();
        if (!assemble.accounts.currentUser.get('HasSeenGuide')) {
            assemble.accounts.currentUser.save({ HasSeenGuide: true });
        }
    };

    tour.unload = function () {
        guidely.close();
        guidely._clear();
    };

} ($))