(function (assemble, $, undefined) {

    var grid = assemble.grid = _.extend({ state: {} }, Backbone.Events);

    grid.userStorage = new assemble.UserStorage();
    grid.lastXhr = null;
    grid.headerRow = null;
    grid.config = {};

    grid.initialize = function (config) {
        if (!grid.$grid) grid.$grid = $('#' + config.id);

        grid.config = config;

        grid.selectionHeader = (new grid.SelectionHeader()).render();
        grid.on('selectionChanged rowUpdates', grid.selectionHeader.update, grid.selectionHeader);

        grid.$grid.on('click', '.row-type-group [aria-describedby="TakeoffGrid_AssembleName"] .cell-wrapper, .row-type-item [aria-describedby="TakeoffGrid_AssembleName"] .cell-wrapper,.row-type-instance [aria-describedby="TakeoffGrid_AssembleName"] .cell-wrapper', function (e) {
            var row = grid.findRowDataForEl($(this));

            grid.trigger('showDetails');
            selection.selectOne(row);
            e.stopPropagation();
        });

        grid.$grid.on('click', '[aria-describedby="TakeoffGrid_IsSelected"]', function (e) {
            var row = grid.findRowDataForEl($(this));
            if (row.RowType == 'detail') return;

            if (e.shiftKey) {
                selection.allTo($(this).parents('tr'));
            } else {
                selection.toggleState(row);
            }
            e.stopPropagation();
        });

        grid.$grid.on('click', 'tr', function (e) {
            var row = grid.$grid.getRowData($(this)[0].id);
            if (row.RowType == 'detail') return;

            selection.selectOne(row);
        });

        grid.$grid.setGridParam({
            loadComplete: function (data) {
                grid.lastXhr = null;
                if (undefined !== data) formatRows(data.rows);
                grid.trigger("loadComplete");
            },
            resizeStop: grid.resizeColumn
        });

        grid.config = config;

        this.splitRatio = 0.5;
        this.showSplitter = false;

        grid.resize();
        //grid.isReady is a sentinel value used by Integration tests
        //in product code, use the 'loadComplete' event
        grid.isReady = false;
        grid.on('loadComplete', function () {
            grid.isReady = true;
        });

        return grid;
    };

    grid.loaded = function () {        
        if (!grid.$grid) grid.$grid = $(this);        

        if (!grid.selectionCacheInitialized) {
            selectionCache.initialize();
        }

        if (!grid.initialized) {
            
            // we only want to run this the first time
            // subsequent data loads are handled using the loadComplete event
            formatRows(grid.$grid.getRowData());
            if (grid.config.usingCompare) {
                grid.resize();
                $('.jqg-second-row-header').children('th').addClass('group-edge');
            }

            grid.trigger("loadComplete");
        }

        if (grid.dataFiltered) {
            grid.trigger("dataFiltered");
        }
        grid.initialized = true;
        grid.selectionCacheInitialized = true;
        grid.dataFiltered = false;
    };

    grid.findRowDataForEl = function ($el) {
        return grid.$grid.getRowData($el.parents('tr')[0].id);
    };

    grid.rowElify = function (rowInfo) {
        // accepts a string row id, object of rowData from jqgrid, the el itself, or a jQuery object of the el
        var rowEl;

        if (typeof rowInfo == 'string') {
            rowEl = $('#' + rowInfo);
        } else if (rowInfo.Id) {
            // this means it's a row object from the jqGrid
            rowEl = $('#' + rowInfo.Id);
        } else if (rowInfo.nodeType) {
            // pure dom element
            rowEl = $(rowInfo);
        } else {
            rowEl = rowInfo;
        }

        return rowEl;
    };

    grid.setNewlyCreatedView = function (view) {
        grid.config.viewId = view.id;
        grid.saveColumnSizes();
    };

    grid.generateColumnSizingKey = function (viewId, modelId, usingCompare) {
        return "GridColumnSizingKey UserId:" + assemble.accounts.currentUser.id + " viewId:" + viewId + " modelId:" + modelId + " usingCompare:" + usingCompare;
    };

    grid.resizeColumn = function (event, index) {
        grid.saveColumnSizes();
    };

    grid.saveColumnSizes = function () {
        var key = grid.generateColumnSizingKey(grid.config.viewId, grid.config.modelId, grid.config.usingCompare);
        var colModel = grid.$grid.jqGrid("getGridParam", "colModel");
        var columnSizes = grid.userStorage.getObject(key, {});

        for (var i = 0; i < colModel.length; i++) {
            var column = colModel[i];

            if (column.name)
                columnSizes[column.name] = column.width;
        }

        grid.userStorage.setObject(key, columnSizes);
    };

    grid.toggleAllSelected = function (checked) {
        var rowIds = grid.$grid.jqGrid('getDataIDs');
        $.each(rowIds, function (index, value) {
            grid.$grid.setCell(value, 'IsSelected', checked);
        });
    };

    /***START Grid Data Load Canceling **/

    grid.loadBeforeSend = function (xhr) {
        grid.lastXhr = xhr;
        grid.isReady = false;
    };

    grid.cancelLoad = function () {
        if (grid.lastXhr)
            grid.lastXhr.abort();
    };

    /***END Grid Data Load Canceling **/

    grid.reload = function (config) {
        config = config || {};
        if (config.clearSelection) {
            grid.lastGridState = undefined;
            grid.selectionHeader.clear();            
        } else {
            grid.lastGridState = selection.getFullSelectionState();
        }
        
        if (config.clearSelectionCache) {
            grid.selectionCacheInitialized = false;
        }
        
        if (config.dataFiltered) {
            grid.dataFiltered = true;
        }
               
        grid.$grid.trigger('reloadGrid');
    };

    grid.destroy = function () {
        grid.isReady = false;
        grid.initialized = false;
        grid.dataFiltered = false;
        grid.selectionCacheInitialized = false;
        grid.config = {};
        grid.off();
        delete grid.lastGridState;
        grid.selectionHeader.off();
        if (grid.$grid) {
            grid.$grid.GridDestroy();
            grid.$grid = undefined;
        }
    };

    grid.loadDataError = function (response) {
        grid.lastXhr = null;
        assemble.status.updateFromResponseError(response);
    };

    grid.expandToLevel = function (level) {
        _.each(grid.$grid.getDataIDs(), function (rowId) {
            var position = grid.$grid[0].p._index[rowId];
            var row = grid.$grid[0].p.data[position];
            if (row.tree_level < level) {
                grid.$grid.expandRow(row);
                grid.$grid.expandNode(row);
            }
        });
    };

    grid.collapseToLevel = function (level) {
        _.each(grid.$grid.getDataIDs(), function (rowId) {
            var position = grid.$grid[0].p._index[rowId];
            var row = grid.$grid[0].p.data[position];
            if (row.tree_level >= level) {
                // is there a way to do these both in one call?
                grid.$grid.collapseRow(row);
                grid.$grid.collapseNode(row);
            } else {
                grid.$grid.expandRow(row);
                grid.$grid.expandNode(row);
            }
        });
    };

    grid.resize = function () {
        //can't use grid.$grid.offset().top because of when we scroll the grid data table 
        //starts having a negative offset.  The header table is frozen so lets offset by that
        //grid.$grid.parents(".ui-jqgrid-view").find(".ui-jqgrid-hbox")

        var gridPane = $("#grid_pane"),

        //height calculation    
        entireHeight = gridPane.outerHeight(),
        viewerHeader = gridPane.find(".takeoff-header").outerHeight(),
        gridHeader = gridPane.find(".ui-jqgrid-hbox").outerHeight(),
        bottomBar = gridPane.find(".bottom-toolbar").outerHeight(),
        height = entireHeight - viewerHeader - gridHeader - bottomBar;

        var gridBox = $("#takeoff_grid_container");
        var width = gridBox.width();

        grid.$grid.setGridHeight(height);
        grid.$grid.setGridWidth(width);
    };

    var formatRows = function (rows) {
        if (grid.lastGridState) selection.reselectLastSelection();
        
        for (var i = 0; i < rows.length; i++) {
            var rowData = rows[i],
                $row = grid.rowElify(rowData),
                rowType = rowData.RowType,
                cssClass = "row-type-" + rowType,
                parentEl = grid.rowElify(rowData.tree_parent),
                ie = assemble.browser.ie;

            $row.addClass(cssClass);

            if (rowType == 'detail' && rowData.IsActiveTakeoffQuantity == 'True') {
                $row.addClass('active-takeoff-quantity');
            }

            if (rowType == 'instance') {
                var instanceId = selectionCache.getSourceIdFromRowId(rowData.Id),
                    selected = selectionCache.instanceLookup[instanceId].selected;
                selectionCache.instanceLookup[instanceId].loaded = true;
                
                selection.setElState($row, selected ? 'yes' : 'no');
            } else if (parentEl.length && selection.isSelected(parentEl)) {
                selection.select(rowData, { skipParent: true, skipChildren: true, silent: true });
            } else if (!$row.attr('data-selected')) {
                selection.setElState($row, 'no');
                if (ie) $row.find('[aria-describedby="TakeoffGrid_IsSelected"]').on('selectstart', function () { return false; });
            }

            // may be the subject of a recent edit, so make sure the cache has the most recent data
            if (selection.isSelected(rowData)) selectionCache.updateData(rowData);
        }

        grid.trigger("rowUpdates");
        grid.resize();
    };

    grid.jqGridFriendlyObj = function (row) {
        return _.extend(row, { _id_: row.Id });
    };

    grid.FitNesse = {     //Helper (super secret) for extracting data for use in FitNesse data verification tests

        fitData: [],

        tokens: [
        { value: " ", token: /SPACETOKEN/g },
        { value: "|", token: /PIPETOKEN/g },
        { value: "[", token: /OPENBRACKETTOKEN/g },
        { value: "]", token: /CLOSEBRACKETTOKEN/g },
        { value: "{", token: /PIPETOKEN/g },
        { value: "}", token: /PIPETOKEN/g },
        { value: "/", token: /FORWARDSLASHTOKEN/g },
        { value: "\\", token: /BACKSLASHTOKEN/g },
        { value: "&", token: /AMPERSANDTOKEN/g },
        { value: ".", token: /PERIODTOKEN/g },
        { value: "-", token: /HYPHENTOKEN/g },
        { value: ",", token: /COMMATOKEN/g },
        { value: "(", token: /LEFTPARENTOKEN/g },
        { value: ")", token: /RIGHTPARENTOKEN/g },
        { value: "#", token: /HASHTOKEN/g },
        { value: "!", token: /EXCLAMATIONTOKEN/g },
        { value: "$", token: /DOLLARTOKEN/g },
        { value: "@", token: /ATSYMBOLTOKEN/g },
        { value: "%", token: /PERCENTTOKEN/g },
        { value: "*", token: /STARTOKEN/g },
        { value: "^", token: /CARETTOKEN/g },
        { value: "+", token: /PLUSTOKEN/g },
        { value: "\"", token: /DOUBLEQUOTETOKEN/g },
        { value: "'", token: /SINGLEQUOTETOKEN/g },
        { value: ":", token: /COLONTOKEN/g },
        { value: ";", token: /SEMICOLTOKEN/g },
        { value: ">", token: /GREATERTOKEN/g },
        { value: "<", token: /LESSERTOKEN/g },
        { value: "°", token: /DEGREETOKEN/g },
        { value: "=", token: /EQUALSTOKEN/g },
        { value: "_", token: /UNDERSCORETOKEN/g },
        { value: "\r\n", token: /NEWLINETOKEN/g }
        ],

        detokenize: true,

        exportToWiki: function (options) {
            this.fitData = [];
            options = options || {};
            var skipDefaults = !!options.skipDefaults;
            var isVariance = !!options.isVariance;
            var defaultColumnIds = [grid.config.id + "_Name", grid.config.id + "_TakeoffQuantity", grid.config.id + "_TakeoffUnitAbbreviation"];
            var self = this;
            var htable = grid.$grid.parents('.ui-jqgrid-view').find('.ui-jqgrid-htable');
            var table = grid.$grid.first("table"); //jqgrid table

            //headers
            var hrow = [];
            htable
                .find('th')
                .each(function () {
                    var isId = this.id == grid.config.id + '_Id';
                    var isVarianceDifference = isVariance && this.id == grid.config.id + '_InstanceDifference';
                    if (($(this).css('display') != 'none') && (!skipDefaults || defaultColumnIds.indexOf(this.id) === -1))
                        hrow.push(self._formatData($(this).html()));
                    else if (isId) {
                        hrow.push("Id");
                    }
                    else if (isVarianceDifference) {
                        hrow.push("Variance Status");
                    }
                });
            self._rowToWiki(hrow);

            //data
            table.find('tr')
                .each(function () {
                    var dRow = [];
                    $(this)
                        .find('td')
                        .each(function () {
                            var ad = $(this).attr('aria-describedby');
                            var isVarianceDifference = isVariance && ad == grid.config.id + '_InstanceDifference';
                            if (($(this).css('display') != 'none' || isVarianceDifference)
                                && (!skipDefaults || defaultColumnIds.indexOf(ad) === -1))
                                dRow.push(self._formatData($(this).html()));
                            else if (ad == grid.config.id + '_Id') {
                                var rowId = $(this).html();
                                if (self.detokenize) {
                                    for (var t = 0; t < self.tokens.length; t++) {
                                        var dt = self.tokens[t];
                                        rowId = rowId.replace(dt.token, dt.value);
                                    }
                                }
                                dRow.push(self._formatData(rowId));
                            }
                        });
                    self._rowToWiki(dRow);
                });

            return self._popup();
        },

        _formatData: function (input) {
            //HTML
            var regexp = new RegExp(/\<[^\<]+\>/g);
            var output = input.replace(regexp, "");
            output = output.replace("&nbsp;", "");
            if (output == "") return '';
            if (output == " ") return 'blank';
            return output;
        },

        _rowToWiki: function (row) {
            var tmp = row.join(''); //remove any blank rows
            if (row.length > 0 && tmp != '') {
                var str = row.join('|');
                str += '|';
                this.fitData.push(str);
            }
        },

        _popup: function () {
            var generator = window.open('', 'FitNesse');
            generator.document.write('<html><head><title>FitNesse</title>');
            generator.document.write('</head><body >');
            generator.document.write('<textArea cols=120 rows=40 wrap="off" >');
            generator.document.write(this.fitData.join('\n'));
            generator.document.write('</textArea>');
            generator.document.write('</body></html>');
            generator.document.close();
            return true;
        }
    };

    var selectionCache = grid.selectionCache = {

        instanceLookup: {},
        typeLookup: {},

        //creates instance lookup table to map instances to parent row ids if not loaded in grid, or to row_id if loaded in grid
        //dictionary returns object
        // { rowId, typeRowId, selected, loaded, typeExpanded, 
        //   fauxRow: { id: , TakeoffProperty: , TakeoffQuantity: , TakeoffUnitAbbreviation: , RowType: 'instance', InstanceCount: '1' } }
        initialize: function () {

            this.instanceLookup = {};

            this.typeLookup = {};

            var self = this;

            grid.$grid.getRowData()
                .map(function (row) {
                    var jqRow = row;
                    if (!_.isUndefined(grid.$grid[0])) {
                        var position = grid.$grid[0].p._index[row.Id];
                        jqRow = grid.$grid.isNodeLoaded(grid.$grid[0].p.data[position]);
                    }
                    var loaded = jqRow.tree_loaded;
                    switch (row.RowType) {
                        case "item":
                            self.typeLookup[row.Id] = [];
                            var typeSelected = selection.isSelected(row);                            
                            var instances = self.parseTypeForInstances(row); //guranteed at least one

                            _.each(instances, function (instance) {
                                var fauxRow = self.parseInstanceInfo(instance, row),
                                    id = fauxRow.instanceId;

                                self.typeLookup[row.Id].push(id);
                                if (_.has(self.instanceLookup, id)) {
                                    self.instanceLookup[id].typeRowId = row.Id;
                                    self.instanceLookup[id].loaded = loaded;
                                    self.instanceLookup[id].selected = typeSelected;
                                    self.instanceLookup[id].fauxRow = fauxRow;
                                } else {
                                    self.instanceLookup[id] = {
                                        typeRowId: row.Id,
                                        loaded: loaded, selected: typeSelected, rowId: row.Id + "_" + id,
                                        fauxRow: fauxRow
                                    };
                                }
                            });

                            break;
                        case "instance":
                            var instanceId = self.getSourceIdFromRowId(row.Id);                            
                            if (_.has(self.instanceLookup, instanceId)) {
                                self.instanceLookup[instanceId].rowId = row.Id;
                                self.instanceLookup[instanceId].fauxRow = row;
                            } else {
                                self.instanceLookup[instanceId] = { rowId: row.Id, fauxRow: row };
                            }
                    }
                });
        },

        parseTypeForInstances: function(typeRow){
            return typeRow.ChildSourceIds.split(',');
        },

        parseInstanceInfo: function (instanceInfoString, typeRow) {
            var stringedInfo = instanceInfoString.split(':'),
                instanceData = {
                    instanceId: stringedInfo[0],
                    QuantityProperty: stringedInfo[1],
                    TakeoffQuantity: stringedInfo[2],
                    TakeoffUnitAbbreviation: stringedInfo[3],
                    RowType: 'instance',
                    InstanceCount: '1',
                    Id: typeRow.Id + "_" + stringedInfo[0],
                    tree_parent: typeRow.Id,
                    tree_level: parseInt(typeRow.tree_level) + 1
                };
            
            return instanceData;
        },

        checkIfCacheInitialized: function () {
            var gridHasRows = _.any(grid.$grid.getRowData()),
                eitherCacheIsEmpty = _.isEmpty(this.typeLookup) || _.isEmpty(this.instanceLookup);
            initialized = !(gridHasRows && eitherCacheIsEmpty);

            if (!initialized) {
                throw new Error("Caching not instantiated, please setup cache prior to making this call");
            }

            return initialized;
        },

        //this method will give the viewer instances for selection (grid -> viewer direction)
        //returns array of selected instance ids
        getSelectedInstances: function () {
            this.checkIfCacheInitialized();

            return $.map(this.instanceLookup, function (lp, key) {
                return lp.selected ? key : null;
            });
        },

        //gets all the faux rows for the selected instances, to be used in calculations 
        getSelectedRows: function () {
            this.checkIfCacheInitialized();

            return $.map(this.instanceLookup, function (lp, key) {
                return lp.selected ? lp.fauxRow : null;
            });
        },

        //given an array of instance id's, select or partially select loaded rows in grid, update the state of the instances in lookup 
        //this will synchronize with the grid and the edit pane
        syncGridSelection: function (selectedInstanceIds) {
            this.checkIfCacheInitialized();
            
            var stringedSelectedIds = selectedInstanceIds.map(function (id) {
                return id.toString();
            });

            var selectedCounts = {};

            $.map(this.typeLookup, function (tp, key) {
                selectedCounts[key] = 0;
            });

            var options = { silent: true };
            $.map(this.instanceLookup, function (lp, key) {
                if (lp.selected) {
                    if (!_.contains(stringedSelectedIds, key)) {
                        lp.selected = false;
                        if (lp.loaded)
                            selection.deselectById(lp.rowId, options);
                    } else {
                        selectedCounts[lp.typeRowId]++;
                    }
                } else if (_.contains(stringedSelectedIds, key)) {
                    selectedCounts[lp.typeRowId]++;
                    lp.selected = true;
                    if (lp.loaded) {
                        selection.selectById(lp.rowId, options);
                    }
                }
            });

            $.extend(options, { skipChildren: true });
            //lets handle any items that have been selected by instances not yet loaded
            $.map(this.typeLookup, function (instances, rowId) {
                var rc = grid.$grid.getRowData(rowId);
                var state = selection.getState(rc);
                if (selectedCounts[rowId] == 0) {
                    if (state != "no") {
                        selection.deselectById(rowId, options);
                    }
                }
                else if (selectedCounts[rowId] == instances.length) {
                    if (state != "yes") {
                        selection.selectById(rowId, options);
                    }
                } else if (state != "partial") {
                    selection.partialize(rc, options);
                }
            });
            
            grid.trigger('selectionChanged');
        },

        updateSelected: function (row, selected) {
            var self = this;
            switch (row.RowType) {
                case "item":
                    _.each(this.typeLookup[row.Id], function (id) {
                        self.instanceLookup[id].selected = selected;
                    });
                    break;
                case "instance":
                    var id = this.getSourceIdFromRowId(row.Id);
                    this.instanceLookup[id].selected = selected;
                    break;
            }
        },

        updateData: function (row) {
            var self = this;
            switch (row.RowType) {
                case "item":
                    // let's first check if the instances are loaded, if so move on, we'll get to the instances
                    if (!this.typeLookup[row.Id][0].loaded) {
                        _.each(self.parseTypeForInstances(row), function (instance) {
                            var fauxRow = self.parseInstanceInfo(instance, row);

                            if (this.instanceLookup[fauxRow.instanceId]) {
                                this.instanceLookup[fauxRow.instanceId].fauxRow = fauxRow;
                            }
                        }, this);
                    }
                    break;
                case "instance":
                    var id = this.getSourceIdFromRowId(row.Id);
                    _.extend(this.instanceLookup[id].fauxRow, row);
                    break;
            }
        },

        getSourceIdFromRowId: function (rowId) {
            var idSplit = rowId.split("_");
            return idSplit[idSplit.length - 1];
        },
        
        // structure = <grouping value 1>_<grouping value 2>_...<grouping value n>_<category name>_<type id> where n is the number of groupings
        // when we don't have a type id, we just have <category name> as last component of id.
        getItemIdFromRowId: function(rowId) {            
            var idSplit = rowId.split("_");
            var lastComponent = idSplit[idSplit.length - 1];
            var lastComponentInt = parseInt(lastComponent);
            return isNaN(lastComponentInt) ? lastComponent : rowId[idSplit.length - 1] + "_" + lastComponent;
        },

        getCategoryFromRowId: function(rowId){
            var idSplit = rowId.split("_");
            var lastComponent = idSplit[idSplit.length - 2];
            var lastComponentInt = parseInt(lastComponent);

            // next to last component is category if there is an id, otherwise it's last
            return isNaN(lastComponentInt) ? lastComponent : idSplit[idSplit.length - 3]; 
        },

        //Iterate through all item rows, creating a list of instances so we know who has not been filtered.
        getIncludedInstances: function () {
            var instances = _.flatten(
                $.map(grid.$grid.getRowData(), function (row) {
                    return row.RowType == "item" ? row.ChildSourceIds.split(',') : null;
                }));
            return instances.map(function (i) {                
                return parseInt(i.split(':')[0]);
            });
        }
    };

    /*  
    grid selection model:
    selection states: 'yes', 'no', 'partial'
    row is always the rowData from the jqGrid
    rowEl is the row dom element (the 'tr')
    
    NOTE: we do a few things here to avoid counting the detail rows, like .not('.row-type-detail')
    */
    var selection = grid.selection = {
        validStates: ['yes', 'no', 'partial'],

        findSelectableRows: function () {
            // pass in one or more states to get selectable rows filtered for those state

            var selector,
                states = arguments;

            if (states.length) {
                selector = _.map(states, function (state) {
                    return '[data-selected="' + state + '"]';
                });
                selector = selector.join(', ');
            } else {
                selector = '[data-selected]';
            }
            return grid.$grid.find(selector).not('.row-type-detail');
        },

        getCurrentRow: function () {
            return grid.$grid.find('.current-row');
        },

        isCurrentRow: function (rowInfo) {
            return grid.rowElify(rowInfo).hasClass('current-row');
        },

        setCurrentRow: function (rowInfo) {
            selection.getCurrentRow().removeClass('current-row');
            grid.rowElify(rowInfo).addClass('current-row');
        },

        unsetCurrentRow: function (rowInfo) {
            if (rowInfo) {
                selection.setCurrentRow(selection.findClosestSelected(rowInfo));
            } else {
                selection.getCurrentRow().removeClass('current-row');
            }
        },

        findClosestSelected: function (rowInfo) {
            var rowEl = grid.rowElify(rowInfo),
                nextSelected = rowEl.nextAll('.sel-yes:visible').first();

            return nextSelected.length ? nextSelected : rowEl.prevAll('.sel-yes:visible').first();
        },

        getSelected: function (fullRowData) {
            var selected = selection.findSelectableRows('yes');
            return _.extend(selection.getRowInfoForTRs(selected, fullRowData), { instances: selectionCache.getSelectedRows() });
        },

        getNotDeselected: function (fullRowData) {
            var items = selection.findSelectableRows('yes', 'partial').not('.row-type-detail');
            return selection.getRowInfoForTRs(items, fullRowData);
        },

        getFullSelectionState: function () {
            // to get ids and states for 'yes' and 'partial' selected items
            var rowEls = selection.findSelectableRows('yes', 'partial');
            return rowEls.map(function () {
                return { id: this.id, state: selection.getState(this) };
            });
        },

        getRowInfoForTRs: function (rows, fullRowData) {
            rows = rows.map(function () {
                return this.id;
            });

            if (fullRowData) {
                rows = _.map(rows, function (id) {
                    return grid.$grid.getRowData(id);
                });
            }

            return rows;
        },

        allTo: function (rowEl) {
            // add to the selection all rows from rowEl (the row clicked) to the current row

            var all = selection.findSelectableRows(),
                currentRowIndex = all.index(selection.getCurrentRow()),
                clickedRowIndex = all.index(rowEl),
                targetRow = selection.getRowInfoForTRs(rowEl, true)[0],
                goingDown = clickedRowIndex > currentRowIndex,
                rowsToSelect;

            if (currentRowIndex < 0) {
                rowsToSelect = rowEl;
            } else if (goingDown) {
                rowsToSelect = all.slice(currentRowIndex, clickedRowIndex + 1);
            } else {
                rowsToSelect = all.slice(clickedRowIndex, currentRowIndex + 1);
            }

            selection.select(selection.getRowInfoForTRs(rowsToSelect, true), { silent: true, skipParent: true, skipChildren: true });

            selection.updateParent(targetRow);
            if (goingDown) {
                selection.toggleChildren(targetRow, 'yes', { skipParent: true });
                selection.updateParent(_.first(selection.getSelected(true)));
            } else {
                selection.updateParent(_.last(selection.getSelected(true)), { selectIfAllChildren: true });
            }

            selection.setCurrentRow(rowEl);
            grid.trigger('selectionChanged');
        },

        selectedState: function (row) {
            return selection.getState(grid.rowElify(row));
        },

        toggleState: function (row, options) {
            options = options || {};
            var rowEl = grid.rowElify(row);

            if (selection.getState(rowEl) == 'no') {
                selection.select(row, options);
                selection.setCurrentRow(rowEl);
            } else {
                selection.deselect(row, options);
                if (selection.isCurrentRow(rowEl)) selection.unsetCurrentRow(rowEl); 
            }
        },

        getState: function (rowInfo) {
            var rowEl = grid.rowElify(rowInfo);
            return rowEl.attr('data-selected');
        },


        setState: function (row, state, options) {
            options = options || {};
            if (!_.include(selection.validStates, state)) throw new Error(state + ' is not a valid selection state.');

            selection.setElState(row, state);

            if (row.RowType == 'instance') {
                selection.setVisualStateOfDetailChildren(row, state);
            } else if (!options.skipChildren) {
                selection.toggleChildren(row, state);
            }
            if (!options.skipParent) selection.updateParent(row);
        },

        setElState: function (rowInfo, state) {
            if (!_.include(selection.validStates, state)) throw new Error(state + ' is not a valid selection state.');
            var rowEl = grid.rowElify(rowInfo);
            rowEl.removeClass('sel-no sel-yes sel-partial');
            rowEl.addClass('sel-' + state);
            rowEl.attr('data-selected', state);

            return rowEl;
        },

        setVisualStateOfDetailChildren: function (row, state) {
            var detailChildren = grid.$grid.getNodeChildren(grid.jqGridFriendlyObj(row));

            _.each(detailChildren, function (detailRow) {
                selection.setElState(detailRow, state);
            });
        },

        toggleChildren: function (row, state) {
            var children = selection.children(row);
            if (!children.length) return;

            selection[state == 'yes' ? 'select' : 'deselect'](children, { silent: true, skipParent: true });
        },

        updateParent: function (row, options) {
            options = options || {};
            var parent = selection.parent(row);
            if (!parent) return;
            var children = selection.children(parent);

            var deselectedChildren = _.select(children, function (child) {
                var state = selection.getState(child.Id);
                return state == 'no' || state == undefined;
            });

            // if all children are deselected, uncheck, else partial check
            if (deselectedChildren.length == children.length) {
                selection.deselect(parent, { silent: true, skipChildren: true });
            } else if (options.selectIfAllChildren && deselectedChildren.length == 0) {
                selection.select(parent, { silent: true, skipChildren: true });
            } else {
                selection.partialize(parent, { skipChildren: true });
            }
        },

        parent: function (row) {
            return grid.$grid.getNodeParent(row);
        },

        children: function (row) {
            var children = row.RowType == 'instance' ? [] : grid.$grid.getNodeChildren(grid.jqGridFriendlyObj(row));

            return children;
        },

        select: function (rows, options) {
            options = options || {};
            if (!$.isArray(rows)) rows = [rows];

            _.each(rows, function (row) {
                selection.setState(row, 'yes', options);
                selectionCache.updateSelected(row, true);
            });

            if (!options.silent) {
                grid.trigger('rowSelect', { getSelected: selection.getSelected, rows: rows });
                grid.trigger('selectionChanged');
            }
        },

        selectById: function (rowIds, options) {
            options = options || {};
            if (!$.isArray(rowIds)) rowIds = [rowIds];

            var rows = _.map(rowIds, function (id) {
                return grid.$grid.getRowData(id);
            });

            selection.select(rows, options);
        },

        selectOne: function (row) {
            var selected = _.select(selection.getSelected(true), function (item) {
                return item.Id != row.Id;
            });
            selection.deselect(selected, { silent: true });

            selection.select([row]);
            selection.setCurrentRow(row);
        },

        selectAll: function (options) {
            options = options || {};
            var items = selection.getRowInfoForTRs(selection.findSelectableRows('partial', 'no'), true);
            selection.select(items, _.extend(options, { skipChildren: false, skipParent: true }));
            selection.setCurrentRow(selection.findSelectableRows().first());
        },

        deselect: function (rows, options) {
            options = options || {};
            if (!$.isArray(rows)) rows = [rows];

            _.each(rows, function (row) {
                selection.setState(row, 'no', options);
                selectionCache.updateSelected(row, false);
            });

            if (!options.silent) {
                grid.trigger('rowDeselect', { getSelected: selection.getSelected, rows: rows });
                grid.trigger('selectionChanged');
            }
        },

        deselectById: function (rowIds, options) {
            options = options || {};
            if (!$.isArray(rowIds)) rowIds = [rowIds];

            var rows = _.map(rowIds, function (id) {
                return grid.$grid.getRowData(id);
            });

            selection.deselect(rows, options);
        },

        deselectAll: function (options) {
            options = options || {};
            var items = selection.getRowInfoForTRs(selection.findSelectableRows('yes', 'partial'), true);
            selection.deselect(items, _.extend(options, { skipChildren: false, skipParent: true }));
            selection.unsetCurrentRow();
        },

        partialize: function (row, options) {
            options = options || {};
            selection.setState(row, 'partial', options);
        },

        reselectLastSelection: function () {
            // items: {id: [id], state: 'yes' || 'partial'}
            _.each(grid.lastGridState, function (item) {
                var row = grid.$grid.getRowData(item.id),
                    options = { silent: true, skipParent: true, skipChildren: true };

                if (!$.isEmptyObject(row))
                    selection[item.state == 'yes' ? 'select' : 'partialize'](row, options);
            });

            delete grid.lastGridState;
        },

        isSelected: function (row) {
            return selection.getState(row) == "yes";
        }

    };

    grid.SelectionHeader = Backbone.View.extend({
        initialize: function () {
            this.setElement($('#TakeoffGrid_IsSelected').attr({ 'data-selected': 'no', title: 'Select All/None' }));
        },

        events: {
            'click': 'toggle'
        },

        render: function () {
            this.checkbox = $('<span class="fake-checkbox"></span>');
            this.$el.html(this.checkbox);
            selection.setElState(this.$el, 'no');

            this.selected = 'no';

            return this;
        },

        toggle: function () {
            // part of this logic is that if it's partially selected, we go ahead and deselect, not select
            this.selected = this.selected == 'no' ? 'yes' : 'no';

            selection.setElState(this.$el, this.selected);

            selection[this.selected == 'yes' ? 'selectAll' : 'deselectAll']({ silent: true });
            grid.trigger('selectionChanged', { skipHeaderUpdate: true });
        },

        update: function (memo) {
            memo = memo || {};
            if (memo.skipHeaderUpdate) return;

            //this logic needs to be outside the foreach loop
            var selected = selection.getSelected();            
            
            var hasSelections = !!selected.length || !!selected.instances.length,
                allSelected = !selection.findSelectableRows('no', 'partial').length;

            if (hasSelections && allSelected) {
                this.selected = 'yes';
            } else if (hasSelections) {
                this.selected = 'partial';
            } else {
                this.selected = 'no';
            }

            selection.setElState(this.$el, this.selected);
        },

        set: function (value) {
            this.selected = value;
            selection.setElState(this.$el, this.selected);
        },

        clear: function () {
            this.set('no');
        }
    });

}(window.assemble = window.assemble || {}, jQuery));
