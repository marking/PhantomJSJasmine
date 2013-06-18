jQuery.extend(jQuery.jgrid.defaults, { cellLayout: 17, beforeSelectRow: function () {
    return false;
}
});

// jQuery.jgrid.ajaxOptions = { global: false };

function beforeGetData() {
    var grid = $("#TakeoffGrid");
    //TODO: Is this the best way to do this?  These are for cleaning up grid state when variables are no longer present,
    //but still present in the grid's state for post data 'griddom.p.postData'
    var postData = {
        selectedRowIds: [],
        selectedRowLevels: []
    };
    postData = _.extend(postData, assemble.explorer.view.modelView.currentView.postData);
    grid.setGridParam({ postData: postData, ajaxGridOptions: { type: "POST" } });
}

function formatVariance(cellvalue, options, rowObject) {
    //.icon-star
    if (cellvalue == -2147483648)
        return '' + '<i class="icon-comment" title="Multiple Values" /></i>';

    var value = parseFloat(cellvalue), result,
        op = {
            decimalPlaces: 2,
            decimalSeparator: ".",
            thousandsSeparator: ",",
            defaultValue: " "
        };

    var signedRoundedResult = Math.round(value * 100) / 100;
    result = $.fmatter.util.NumberFormat(Math.abs(value), op);

    return isNaN(value) ? cellvalue : signedRoundedResult >= 0 ? result : '(' + result + ')';
}

function unformatVariance(cellvalue, options, rowObject) {
    return cellvalue;
}

function cellattrVariance(rowid, cellvalue, rowObject, colModel) {    
    var value = parseFloat(cellvalue),
        attr = '';

    var classes = initializeClasses(colModel);

    if (value > 0) {
        classes.push("variance-positive");
    } else if (cellvalue.match(/\(\S*\)/)) {
        // have to do a regex for parentheses because we use parentheses to indicate negative
        // parseFloat in this case returns NaN
        classes.push("variance-negative");        
    }

    if (classes.length > 0) {
        attr = ' class="' + classes.join(' ') + '"';
    }
    
    return attr;
}

function formatQuantity(cellvalue, options, rowObject) {
    //.icon-star
    if (cellvalue == -2147483648)
        return '' + '<i class="icon-comment" title="Multiple Values" /></i>';

    var decimalPlaces = 2;
    var unit = rowObject["TakeoffUnitAbbreviation"];    

    if (unit == "" && rowObject["SecondaryTakeoffUnitAbbreviation"] != undefined)
        unit = rowObject["SecondaryTakeoffUnitAbbreviation"];

    if (unit == "EA")
        decimalPlaces = 0;

    var value = parseFloat(cellvalue), result,
        op = {
            decimalPlaces: decimalPlaces,
            decimalSeparator: ".",
            thousandsSeparator: ",",
            defaultValue: " "
        };

    result = $.fmatter.util.NumberFormat(value, op);
    return isNaN(value) ? " " : result;
}

function formatNumeric(cellvalue, options, rowObject) {

    if (cellvalue == -2147483648)
        return '' + '<i class="icon-comment" title="Multiple Values" /></i>';

    var value = parseFloat(cellvalue), result,
        op = {
            decimalPlaces: 2,
            decimalSeparator: ".",
            thousandsSeparator: ",",
            defaultValue: " "
        };

    result = $.fmatter.util.NumberFormat(value, op);
    return isNaN(value) ? " " : result;
}

function formatFakeCheckbox(cellvalue, option, rowObject) {
    return '<span class="fake-checkbox" title="Select"></span>';    
}

function formatMutlipleValues(cellvalue, options, rowObject) {
    if (cellvalue == '<MultipleValues>' ||  cellvalue == -2147483648)
        return '' + '<i class="icon-comment" title="Multiple Values" /></i>';
    return cellvalue;
}

function initializeClasses(colModel) {
    var classes = new Array();
    if (colModel.classes) { //push any css assigned from the server
        classes.push(colModel.classes);
        if (colModel.classes.indexOf('group-edge') > -1) {
            $('#TakeoffGrid_' + colModel.name).addClass('group-edge');
        }
    }
    return classes;
}

function cellattrGeneral(rowid, cellvalue, rowObject, colModel) {
    
    var attr = '';
    var typeProperties = rowObject.TypeProperties.split(',');
    var classes = initializeClasses(colModel);

    if ($.inArray(colModel.name, typeProperties) != -1) {        
        classes.push("type-prop");
    } else {
        classes.push("instance-prop");    
    }

    if (colModel.name == "AssembleName") {
        var instanceDifference = rowObject.InstanceDifference;
        if (instanceDifference) {
            if (instanceDifference == "Omitted")
                classes.push("variance-negative");
            else if (instanceDifference == "New")
                classes.push("variance-positive");                
        }
    }

    if (classes.length > 0) {
        attr = ' class="' + classes.join(' ') + '"';
    }
    
    if (cellvalue.indexOf('Multiple Values') > -1) {
        attr += ' title="Multiple Values"';
    }

    if (cellvalue.indexOf('fake-checkbox') > -1) {
        attr += ' title="Select"';
    }

    return attr;
}


