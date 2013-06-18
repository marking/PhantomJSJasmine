(function () {
    assemble.test = test = {};
    assemble.grid.on('loadComplete', function () {
        window.gridLoadedSinceLastCheck = true;
    });

    test.didGridLoadSinceILastChecked = function () {
        var loaded = (typeof window.gridLoadedSinceLastCheck !== 'undefined') ? window.gridLoadedSinceLastCheck : false;
        window.gridLoadedSinceLastCheck = false;
        return loaded;
    };
})();
